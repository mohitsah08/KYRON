process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { app } from '../server/index.ts';
import { initDatabase } from '../server/db/database.ts';
import { validateProfileUpdate } from '../server/routes/auth.ts';
import {
  sanitizeRedirect,
  loginPathFor,
  validateEmail,
  validatePassword,
  validateUsername,
  validateAvatarFile,
  friendlyAuthError,
  parseAuthUrlError,
  initialsFor
} from '../client/src/utils/authHelpers.ts';

function requestJson(server: http.Server, path: string, method = 'GET', body?: object, token?: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body) headers['Content-Length'] = String(Buffer.byteLength(bodyStr));
    const req = http.request({ hostname: 'localhost', port: address.port, path, method, headers }, res => {
      let raw = '';
      res.on('data', chunk => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 200, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode || 200, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(bodyStr);
    req.end();
  });
}

describe('Auth helpers', () => {
  it('sanitizeRedirect only allows same-origin paths', () => {
    assert.strictEqual(sanitizeRedirect('/library'), '/library');
    assert.strictEqual(sanitizeRedirect('%2Fsettings%3Ftab%3Dprofile'), '/settings?tab=profile');
    assert.strictEqual(sanitizeRedirect(null), '/dashboard');
    assert.strictEqual(sanitizeRedirect('https://evil.example'), '/dashboard');
    assert.strictEqual(sanitizeRedirect('//evil.example/path'), '/dashboard');
    assert.strictEqual(sanitizeRedirect('/\\evil.example'), '/dashboard');
    assert.strictEqual(sanitizeRedirect('javascript:alert(1)'), '/dashboard');
    assert.strictEqual(sanitizeRedirect('/login?next=/x'), '/dashboard', 'auth pages never become the destination');
    assert.strictEqual(sanitizeRedirect('%E0%A4%A'), '/dashboard', 'malformed encoding falls back');
  });

  it('loginPathFor preserves the intended destination', () => {
    assert.strictEqual(loginPathFor('/creator/submit'), '/login?next=%2Fcreator%2Fsubmit');
    assert.strictEqual(loginPathFor('https://evil.example'), '/login');
  });

  it('validates email, password, username and avatar inputs', () => {
    assert.strictEqual(validateEmail('ada@kyron.dev'), null);
    assert.ok(validateEmail('ada@'));
    assert.ok(validateEmail(''));
    assert.strictEqual(validatePassword('correct horse 9'), null);
    assert.ok(validatePassword('short1'));
    assert.ok(validatePassword('lettersonly'));
    assert.strictEqual(validateUsername('ada_99'), null);
    assert.ok(validateUsername('Ada'));
    assert.ok(validateUsername('ab'));
    assert.strictEqual(validateAvatarFile({ size: 1000, type: 'image/png' }), null);
    assert.ok(validateAvatarFile({ size: 1000, type: 'image/svg+xml' }));
    assert.ok(validateAvatarFile({ size: 3 * 1024 * 1024, type: 'image/jpeg' }));
  });

  it('maps Supabase errors to actionable messages without leaking internals', () => {
    assert.match(friendlyAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' }), /don’t match/);
    assert.match(friendlyAuthError({ code: 'email_not_confirmed' }), /verify your email/);
    assert.match(friendlyAuthError({ status: 429 }), /Too many attempts/);
    assert.match(friendlyAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }), /couldn’t reach/);
    assert.strictEqual(friendlyAuthError({ message: 'pg: relation does not exist' }, 'fallback'), 'fallback');
  });

  it('parses callback errors from the query string or hash', () => {
    const fromHash = parseAuthUrlError('', '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    assert.deepStrictEqual(fromHash, { code: 'otp_expired', description: 'Email link is invalid or has expired' });
    assert.strictEqual(parseAuthUrlError('?code=abc', '#access_token=x'), null);
  });

  it('builds initials for the avatar fallback', () => {
    assert.strictEqual(initialsFor('Ada Lovelace'), 'AL');
    assert.strictEqual(initialsFor('ada'), 'AD');
    assert.strictEqual(initialsFor(''), 'K');
  });
});

describe('Profile update validation', () => {
  it('accepts a normal update', () => {
    assert.strictEqual(validateProfileUpdate({ full_name: 'Ada Lovelace', username: 'ada_l', bio: 'Hi' }), null);
  });

  it('rejects bad usernames, oversized bios and foreign avatar URLs', () => {
    assert.ok(validateProfileUpdate({ username: 'Bad Name' }));
    assert.ok(validateProfileUpdate({ bio: 'x'.repeat(501) }));
    assert.ok(validateProfileUpdate({ avatar_url: 'javascript:alert(1)' }));
    assert.ok(validateProfileUpdate({ avatar_url: 'https://evil.example/a.png' }));
    assert.ok(validateProfileUpdate({ display_name: { $ne: 1 } as unknown as string }));
  });
});

describe('Auth API hardening', () => {
  let server: http.Server;
  let token: string;

  it('starts the test server and registers a test user', async () => {
    await initDatabase();
    server = app.listen(0);
    const res = await requestJson(server, '/api/auth/register', 'POST', {
      email: `auth_${Date.now()}@kyron.test`,
      password: 'testpass123',
      display_name: 'Auth Tester'
    });
    assert.strictEqual(res.status, 201);
    token = res.body.token;
  });

  it('rejects invalid profile updates and ignores privileged fields', async () => {
    const bad = await requestJson(server, '/api/auth/me', 'PUT', { username: 'NOT VALID' }, token);
    assert.strictEqual(bad.status, 400);

    const ok = await requestJson(server, '/api/auth/me', 'PUT', {
      full_name: 'Auth Tester Two',
      bio: 'Testing',
      role: 'admin',
      credit_balance: 9999,
      is_unlimited_credit_user: 1
    }, token);
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(ok.body.user.full_name, 'Auth Tester Two');
    assert.notStrictEqual(ok.body.user.role, 'admin');
    assert.strictEqual(ok.body.user.credit_balance, 10);
    assert.strictEqual(ok.body.user.is_unlimited_credit_user, false);
  });

  it('requires authentication for the profile endpoint', async () => {
    const res = await requestJson(server, '/api/auth/me');
    assert.strictEqual(res.status, 401);
  });

  it('disables legacy password endpoints outside test mode', async () => {
    const saved = { NODE_ENV: process.env.NODE_ENV, TEST_MODE: process.env.TEST_MODE };
    process.env.NODE_ENV = 'production';
    delete process.env.TEST_MODE;
    try {
      const login = await requestJson(server, '/api/auth/login', 'POST', { email: 'admin@kyron.dev', password: 'password123' });
      assert.strictEqual(login.status, 410);
      const register = await requestJson(server, '/api/auth/register', 'POST', { email: 'x@kyron.test', password: 'testpass123', display_name: 'X' });
      assert.strictEqual(register.status, 410);
    } finally {
      process.env.NODE_ENV = saved.NODE_ENV;
      process.env.TEST_MODE = saved.TEST_MODE;
    }
  });

  after(() => {
    server?.close();
  });
});

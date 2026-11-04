process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { app } from '../server/index.ts';
import { db, initDatabase } from '../server/db/database.ts';
import {
  createOAuthState,
  verifyOAuthState,
  getOAuthStatus
} from '../server/services/oauthService.ts';

function requestJson(server: http.Server, path: string, method = 'GET', body?: object, token?: string): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body) headers['Content-Length'] = String(Buffer.byteLength(bodyStr));
    const req = http.request({ hostname: 'localhost', port: address.port, path, method, headers }, res => {
      let raw = '';
      res.on('data', chunk => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 200, body: JSON.parse(raw), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode || 200, body: raw, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(bodyStr);
    req.end();
  });
}

function requestRaw(server: http.Server, path: string): Promise<{ status: number; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const req = http.request({ hostname: 'localhost', port: address.port, path, method: 'GET' }, res => {
      res.resume();
      res.on('end', () => {
        resolve({ status: res.statusCode || 200, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('KYRON OAuth Authentication (Google & GitHub)', () => {
  let server: http.Server;
  let mockOAuthServer: http.Server;
  let mockPort: number;

  before(async () => {
    await initDatabase();
    // Clean any prior run artifacts
    await db.run(`DELETE FROM oauth_accounts WHERE provider IN ('google', 'github') AND provider_user_id IN ('google_user_99991', 'google_user_existing_888', '777666', '888777', '999888')`);
    await db.run(`DELETE FROM profiles WHERE email IN ('google.tester@kyron.dev', 'existing.account@kyron.dev', 'octocat.verified@kyron.dev', 'unverified.target@kyron.dev') OR username IN ('pre_existing_usr', 'octocat_link', 'unverified_hacker')`);

    server = app.listen(0);

    // Mock OAuth external provider server
    mockOAuthServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');

        if (req.url === '/mock-google-token') {
          res.writeHead(200);
          res.end(JSON.stringify({ access_token: 'mock-google-access-token-123', id_token: 'mock-google-id-token' }));
          return;
        }

        if (req.url === '/mock-google-userinfo') {
          res.writeHead(200);
          res.end(JSON.stringify({
            sub: 'google_user_99991',
            email: 'google.tester@kyron.dev',
            email_verified: true,
            name: 'Google Test User',
            picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
          }));
          return;
        }

        if (req.url === '/mock-google-userinfo-existing') {
          res.writeHead(200);
          res.end(JSON.stringify({
            sub: 'google_user_existing_888',
            email: 'existing.account@kyron.dev',
            email_verified: true,
            name: 'Existing Account User',
            picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
          }));
          return;
        }

        if (req.url === '/mock-github-token') {
          res.writeHead(200);
          res.end(JSON.stringify({ access_token: 'mock-github-access-token-456' }));
          return;
        }

        if (req.url === '/mock-github-user') {
          res.writeHead(200);
          res.end(JSON.stringify({
            id: 777666,
            login: 'octocat_verified',
            name: 'Mona Octocat',
            avatar_url: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150',
            email: null // Private email on main profile
          }));
          return;
        }

        if (req.url === '/mock-github-emails') {
          res.writeHead(200);
          res.end(JSON.stringify([
            { email: 'octocat.noreply@users.noreply.github.com', primary: false, verified: true },
            { email: 'octocat.verified@kyron.dev', primary: true, verified: true }
          ]));
          return;
        }

        if (req.url === '/mock-github-user-linking') {
          res.writeHead(200);
          res.end(JSON.stringify({
            id: 888777,
            login: 'octocat_link',
            name: 'Existing Account Linker',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            email: null
          }));
          return;
        }

        if (req.url === '/mock-github-emails-linking') {
          res.writeHead(200);
          res.end(JSON.stringify([
            { email: 'existing.account@kyron.dev', primary: true, verified: true }
          ]));
          return;
        }

        if (req.url === '/mock-github-user-unverified') {
          res.writeHead(200);
          res.end(JSON.stringify({
            id: 999888,
            login: 'unverified_hacker',
            name: 'Unverified Hacker',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            email: 'unverified.target@kyron.dev'
          }));
          return;
        }

        if (req.url === '/mock-github-emails-unverified') {
          res.writeHead(200);
          res.end(JSON.stringify([
            { email: 'unverified.target@kyron.dev', primary: true, verified: false }
          ]));
          return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Mock endpoint not found' }));
      });
    });

    await new Promise<void>(resolve => {
      mockOAuthServer.listen(0, () => {
        mockPort = (mockOAuthServer.address() as any).port;
        resolve();
      });
    });

    // Wire environment to mock endpoints
    process.env.GOOGLE_TOKEN_URL = `http://localhost:${mockPort}/mock-google-token`;
    process.env.GOOGLE_USERINFO_URL = `http://localhost:${mockPort}/mock-google-userinfo`;
    process.env.GITHUB_TOKEN_URL = `http://localhost:${mockPort}/mock-github-token`;
    process.env.GITHUB_USER_URL = `http://localhost:${mockPort}/mock-github-user`;
    process.env.GITHUB_EMAILS_URL = `http://localhost:${mockPort}/mock-github-emails`;
  });

  after(async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    delete process.env.GOOGLE_TOKEN_URL;
    delete process.env.GOOGLE_USERINFO_URL;
    delete process.env.GITHUB_TOKEN_URL;
    delete process.env.GITHUB_USER_URL;
    delete process.env.GITHUB_EMAILS_URL;

    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
    if (mockOAuthServer) {
      await new Promise<void>(resolve => mockOAuthServer.close(() => resolve()));
    }
  });

  it('1. GET /api/auth/oauth/providers reports configuration status accurately', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;

    const unconf = await requestJson(server, '/api/auth/oauth/providers');
    assert.strictEqual(unconf.status, 200);
    assert.strictEqual(unconf.body.google, false);
    assert.strictEqual(unconf.body.github, false);

    // Set credentials
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';

    const conf = await requestJson(server, '/api/auth/oauth/providers');
    assert.strictEqual(conf.status, 200);
    assert.strictEqual(conf.body.google, true);
    assert.strictEqual(conf.body.github, true);
  });

  it('2. Unconfigured provider initiation informs user cleanly without crashing', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    // JSON format
    const jsonRes = await requestJson(server, '/api/auth/oauth/google?format=json');
    assert.strictEqual(jsonRes.status, 503);
    assert.match(jsonRes.body.error, /Google OAuth is not configured/);

    // Browser redirect
    const rawRes = await requestRaw(server, '/api/auth/oauth/google');
    assert.strictEqual(rawRes.status, 302);
    assert.match(String(rawRes.headers.location), /error=provider_not_configured/);

    // Restore credentials
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
  });

  it('3. Google OAuth initiation redirects to Google authorization endpoint with signed state', async () => {
    const rawRes = await requestRaw(server, '/api/auth/oauth/google?next=%2Fskills');
    assert.strictEqual(rawRes.status, 302);
    const location = String(rawRes.headers.location);

    assert.ok(location.startsWith('https://accounts.google.com/o/oauth2/v2/auth'));
    const url = new URL(location);
    assert.strictEqual(url.searchParams.get('client_id'), 'test-google-client-id');
    assert.strictEqual(url.searchParams.get('response_type'), 'code');
    assert.strictEqual(url.searchParams.get('scope'), 'openid email profile');
    assert.ok(url.searchParams.get('state'), 'Must contain state');

    // Verify cryptographic state validity
    const stateVerification = verifyOAuthState(url.searchParams.get('state')!, 'google');
    assert.strictEqual(stateVerification.valid, true);
    assert.strictEqual(stateVerification.next, '/skills');
  });

  it('4. GitHub OAuth initiation redirects to GitHub authorize endpoint with signed state', async () => {
    const rawRes = await requestRaw(server, '/api/auth/oauth/github?next=%2Flibrary');
    assert.strictEqual(rawRes.status, 302);
    const location = String(rawRes.headers.location);

    assert.ok(location.startsWith('https://github.com/login/oauth/authorize'));
    const url = new URL(location);
    assert.strictEqual(url.searchParams.get('client_id'), 'test-github-client-id');
    assert.strictEqual(url.searchParams.get('scope'), 'read:user user:email');
    assert.ok(url.searchParams.get('state'), 'Must contain state');

    const stateVerification = verifyOAuthState(url.searchParams.get('state')!, 'github');
    assert.strictEqual(stateVerification.valid, true);
    assert.strictEqual(stateVerification.next, '/library');
  });

  it('5. Invalid or tampered OAuth state is rejected with clear error', async () => {
    // 1. Missing state
    const noState = await requestRaw(server, '/api/auth/oauth/google/callback?code=mock_code');
    assert.strictEqual(noState.status, 302);
    assert.match(String(noState.headers.location), /error=invalid_state/);

    // 2. Tampered state
    const validState = createOAuthState('google', '/dashboard');
    const tampered = validState.slice(0, -6) + 'xxxxxx';
    const tamperedRes = await requestRaw(server, `/api/auth/oauth/google/callback?code=mock_code&state=${tampered}`);
    assert.strictEqual(tamperedRes.status, 302);
    assert.match(String(tamperedRes.headers.location), /error=invalid_state/);

    // 3. Provider mismatch state (GitHub state passed to Google callback)
    const githubState = createOAuthState('github', '/dashboard');
    const mismatchRes = await requestRaw(server, `/api/auth/oauth/google/callback?code=mock_code&state=${githubState}`);
    assert.strictEqual(mismatchRes.status, 302);
    assert.match(String(mismatchRes.headers.location), /error=invalid_state/);
  });

  it('6. Failed or cancelled OAuth login redirects with cancel message', async () => {
    const state = createOAuthState('google', '/skills');
    const res = await requestRaw(server, `/api/auth/oauth/google/callback?error=access_denied&error_description=User+denied+access&state=${state}`);
    assert.strictEqual(res.status, 302);
    const location = String(res.headers.location);
    assert.match(location, /error=access_denied/);
    assert.match(location, /next=%2Fskills/);
  });

  it('7. Google OAuth callback: Creates new user, awards welcome balance, and issues JWT', async () => {
    const state = createOAuthState('google', '/settings');
    const res = await requestRaw(server, `/api/auth/oauth/google/callback?code=mock_google_code_1&state=${state}`);
    assert.strictEqual(res.status, 302);
    const location = String(res.headers.location);

    assert.ok(location.includes('token='), 'Redirect must include session JWT token');
    assert.ok(location.includes('next=%2Fsettings'));

    // Extract token
    const tokenMatch = location.match(/token=([^&]+)/);
    assert.ok(tokenMatch, 'Must find token in redirect location');
    const token = decodeURIComponent(tokenMatch[1]);

    // Verify user profile exists in database
    const profile = await db.get(`SELECT * FROM profiles WHERE email = ?`, ['google.tester@kyron.dev']) as any;
    assert.ok(profile, 'Profile should have been created in database');
    assert.strictEqual(profile.email, 'google.tester@kyron.dev');
    assert.strictEqual(Number(profile.credit_balance), 10.00);
    assert.strictEqual(profile.role, 'user');

    // Verify oauth_accounts row exists
    const oauthLink = await db.get(`SELECT * FROM oauth_accounts WHERE provider = 'google' AND provider_user_id = 'google_user_99991'`) as any;
    assert.ok(oauthLink, 'OAuth link must be created');
    assert.strictEqual(oauthLink.user_id, profile.id);

    // Verify token can query /api/auth/me
    const meRes = await requestJson(server, '/api/auth/me', 'GET', undefined, token);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.email, 'google.tester@kyron.dev');
    assert.strictEqual(meRes.body.user.credit_balance, 10.00);
  });

  it('8. Existing OAuth user login returns same user account without duplication', async () => {
    const countBefore = (await db.get(`SELECT COUNT(*) as cnt FROM profiles WHERE email = 'google.tester@kyron.dev'`) as any).cnt;

    const state = createOAuthState('google', '/dashboard');
    const res = await requestRaw(server, `/api/auth/oauth/google/callback?code=mock_google_code_existing&state=${state}`);
    assert.strictEqual(res.status, 302);

    const countAfter = (await db.get(`SELECT COUNT(*) as cnt FROM profiles WHERE email = 'google.tester@kyron.dev'`) as any).cnt;
    assert.strictEqual(countAfter, countBefore, 'Duplicate user account must not be created');
  });

  it('9. Safe account linking: Links OAuth to existing email and prevents duplicate accounts', async () => {
    // 1. Pre-register an existing email account
    const existingEmail = 'existing.account@kyron.dev';
    const preExistingId = 'usr_pre_existing_' + Date.now();
    await db.run(`DELETE FROM oauth_accounts WHERE provider = 'google' AND provider_user_id = 'google_user_existing_888'`);
    await db.run(`DELETE FROM profiles WHERE email = ? OR username = 'pre_existing_usr'`, [existingEmail]);
    await db.run(`
      INSERT INTO profiles (id, email, display_name, username, credit_balance, created_at)
      VALUES (?, ?, 'Pre-existing User', 'pre_existing_usr', 45.00, ?)
    `, [preExistingId, existingEmail, new Date().toISOString()]);

    // Point mock to existing userinfo
    process.env.GOOGLE_USERINFO_URL = `http://localhost:${mockPort}/mock-google-userinfo-existing`;

    const state = createOAuthState('google', '/dashboard');
    const res = await requestRaw(server, `/api/auth/oauth/google/callback?code=mock_link_code&state=${state}`);
    assert.strictEqual(res.status, 302);

    // Verify only ONE account exists for that email
    const totalWithEmail = (await db.get(`SELECT COUNT(*) as cnt FROM profiles WHERE email = ?`, [existingEmail]) as any).cnt;
    assert.strictEqual(totalWithEmail, 1, 'Only one profile must exist for this email');

    // Verify oauth_accounts linked to the pre-existing ID
    const link = await db.get(`SELECT * FROM oauth_accounts WHERE provider = 'google' AND provider_user_id = 'google_user_existing_888'`) as any;
    assert.ok(link, 'Link should have been created');
    assert.strictEqual(link.user_id, preExistingId, 'Must link to pre-existing user ID');

    // Restore mock endpoint
    process.env.GOOGLE_USERINFO_URL = `http://localhost:${mockPort}/mock-google-userinfo`;
  });

  it('10. GitHub OAuth callback: Handles private email via user/emails endpoint, creates user & links', async () => {
    const state = createOAuthState('github', '/creators');
    const res = await requestRaw(server, `/api/auth/oauth/github/callback?code=mock_github_code_1&state=${state}`);
    assert.strictEqual(res.status, 302);
    const location = String(res.headers.location);

    assert.ok(location.includes('token='), 'Must include JWT token');
    assert.ok(location.includes('next=%2Fcreators'));

    // Verify GitHub user profile created with primary verified email
    const profile = await db.get(`SELECT * FROM profiles WHERE email = 'octocat.verified@kyron.dev'`) as any;
    assert.ok(profile, 'Profile should have been created with GitHub verified email');
    assert.strictEqual(profile.display_name, 'Mona Octocat');
    assert.strictEqual(Number(profile.credit_balance), 10.00);

    const oauthLink = await db.get(`SELECT * FROM oauth_accounts WHERE provider = 'github' AND provider_user_id = '777666'`) as any;
    assert.ok(oauthLink);
    assert.strictEqual(oauthLink.user_id, profile.id);
  });

  it('11. Session Persistence & Token Authentication: OAuth session token persists across requests', async () => {
    // Fetch profile with GitHub user's token
    const link = await db.get(`SELECT user_id FROM oauth_accounts WHERE provider = 'github' AND provider_user_id = '777666'`) as any;
    const user = await db.get(`SELECT * FROM profiles WHERE id = ?`, [link.user_id]) as any;

    const token = (await import('../server/middleware/auth.ts')).generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      is_unlimited_credit_user: false
    });

    const meRes = await requestJson(server, '/api/auth/me', 'GET', undefined, token);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.id, user.id);
    assert.strictEqual(meRes.body.user.email, user.email);
    assert.strictEqual(meRes.body.user.username, user.username);
  });

  it('12. GitHub OAuth account linking: Safely links to pre-existing account with matching verified email without duplication', async () => {
    // Switch to linking mock endpoints
    process.env.GITHUB_USER_URL = `http://localhost:${mockPort}/mock-github-user-linking`;
    process.env.GITHUB_EMAILS_URL = `http://localhost:${mockPort}/mock-github-emails-linking`;

    const existingUser = await db.get(`SELECT * FROM profiles WHERE email = 'existing.account@kyron.dev'`) as any;
    assert.ok(existingUser, 'Existing user must exist from prior test');

    const state = createOAuthState('github', '/dashboard');
    const res = await requestRaw(server, `/api/auth/oauth/github/callback?code=mock_github_link_code&state=${state}`);
    assert.strictEqual(res.status, 302);

    // Verify only ONE account exists for that email
    const totalWithEmail = (await db.get(`SELECT COUNT(*) as cnt FROM profiles WHERE email = 'existing.account@kyron.dev'`) as any).cnt;
    assert.strictEqual(totalWithEmail, 1, 'Only one profile must exist for this email');

    // Verify oauth_accounts has a GitHub entry linked to existing user ID
    const link = await db.get(`SELECT * FROM oauth_accounts WHERE provider = 'github' AND provider_user_id = '888777'`) as any;
    assert.ok(link, 'GitHub link should have been created');
    assert.strictEqual(link.user_id, existingUser.id, 'Must link to pre-existing user ID');

    // Restore standard mock endpoints
    process.env.GITHUB_USER_URL = `http://localhost:${mockPort}/mock-github-user`;
    process.env.GITHUB_EMAILS_URL = `http://localhost:${mockPort}/mock-github-emails`;
  });

  it('13. GitHub OAuth security: Unverified email from provider does NOT link to existing account', async () => {
    // Seed target account that an attacker tries to link to
    const targetId = 'usr_target_' + Math.random().toString(36).substring(7);
    await db.run(
      `INSERT INTO profiles (id, email, display_name, full_name, username, credit_balance, created_at, updated_at)
       VALUES (?, 'unverified.target@kyron.dev', 'Legitimate Target', 'Legitimate Target', 'legit_target', 50.00, datetime('now'), datetime('now'))`,
      [targetId]
    );

    // Switch to unverified mock endpoints
    process.env.GITHUB_USER_URL = `http://localhost:${mockPort}/mock-github-user-unverified`;
    process.env.GITHUB_EMAILS_URL = `http://localhost:${mockPort}/mock-github-emails-unverified`;

    const state = createOAuthState('github', '/dashboard');
    const res = await requestRaw(server, `/api/auth/oauth/github/callback?code=mock_unverified_code&state=${state}`);
    assert.strictEqual(res.status, 302);
    const location = String(res.headers.location);

    // Verify rejection: redirect contains auth_failed error and mentions not verified
    assert.ok(location.includes('error=auth_failed'), 'Must reject unverified email linking with auth_failed');
    assert.ok(location.includes('not%20verified') || location.includes('not+verified'), 'Error description must mention email is not verified');

    // Verify oauth_accounts was NOT linked to targetId
    const link = await db.get(`SELECT * FROM oauth_accounts WHERE provider = 'github' AND provider_user_id = '999888'`) as any;
    assert.ok(!link, 'Must NOT create link for unverified email attempt');

    // Restore standard mock endpoints
    process.env.GITHUB_USER_URL = `http://localhost:${mockPort}/mock-github-user`;
    process.env.GITHUB_EMAILS_URL = `http://localhost:${mockPort}/mock-github-emails`;
  });
});

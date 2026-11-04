process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { app } from '../server/index.ts';
import { db, initDatabase } from '../server/db/database.ts';
import {
  consumeEmailRateLimit,
  checkEmailRateLimit,
  resetRateLimitsForTesting,
  hashEmail,
  normalizeEmail,
  EMAIL_RATE_LIMIT,
  RATE_LIMIT_EXCEEDED_MESSAGE,
  RateLimitAction
} from '../server/services/emailRateLimiter.ts';

function requestJson(
  server: http.Server,
  path: string,
  method = 'GET',
  body?: object,
  token?: string,
  headers?: Record<string, string>
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const bodyStr = body ? JSON.stringify(body) : '';
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
    if (body) reqHeaders['Content-Length'] = String(Buffer.byteLength(bodyStr));

    const req = http.request(
      {
        hostname: 'localhost',
        port: address.port,
        path,
        method,
        headers: reqHeaders
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 200, body: JSON.parse(raw), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode || 200, body: raw, headers: res.headers });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(bodyStr);
    req.end();
  });
}

describe('KYRON Strict Email Rate Limiting (3 Emails per Rolling 24 Hours)', () => {
  let server: http.Server;

  before(async () => {
    await initDatabase();
    server = app.listen(0);
  });

  after(() => {
    if (server) server.close();
  });

  it('1. First request succeeds (remaining = 2, total attempts = 1)', async () => {
    const email = `test.user.first.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    const res = await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.totalAttempts, 1);
    assert.strictEqual(res.remaining, 2);
  });

  it('2. Second request succeeds (remaining = 1, total attempts = 2)', async () => {
    const email = `test.user.second.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    const res1 = await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.remaining, 2);

    const res2 = await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');
    assert.strictEqual(res2.allowed, true);
    assert.strictEqual(res2.totalAttempts, 2);
    assert.strictEqual(res2.remaining, 1);
  });

  it('3. Third request succeeds (remaining = 0, total attempts = 3)', async () => {
    const email = `test.user.third.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');
    await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');
    const res3 = await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');

    assert.strictEqual(res3.allowed, true);
    assert.strictEqual(res3.totalAttempts, 3);
    assert.strictEqual(res3.remaining, 0);
  });

  it('4. Fourth request is blocked with exact error message and next eligible retry time', async () => {
    const email = `test.user.fourth.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    // 1st, 2nd, 3rd succeed
    for (let i = 0; i < 3; i++) {
      const allowedRes = await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');
      assert.strictEqual(allowedRes.allowed, true);
    }

    // 4th request must be blocked
    const blockedRes = await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');
    assert.strictEqual(blockedRes.allowed, false);
    assert.strictEqual(blockedRes.message, RATE_LIMIT_EXCEEDED_MESSAGE);
    assert.strictEqual(
      blockedRes.message,
      "You've reached the maximum of 3 email requests within 24 hours. Please try again later."
    );
    assert.ok(blockedRes.nextEligibleAt, 'Must provide next eligible retry time');
    assert.ok(blockedRes.retryAfterSeconds && blockedRes.retryAfterSeconds > 0, 'Must provide positive retryAfterSeconds');
    assert.strictEqual(blockedRes.remaining, 0);
  });

  it('5. OTP and link counters are independent (3 reset links exhausted, but OTP request 1 still succeeds)', async () => {
    const email = `test.user.independent.otp.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    // Exhaust 3 reset link requests
    for (let i = 0; i < 3; i++) {
      const res = await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');
      assert.strictEqual(res.allowed, true);
    }

    // 4th reset link is blocked
    const link4 = await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');
    assert.strictEqual(link4.allowed, false);

    // But password_reset_otp is completely independent! Request 1 of OTP must succeed!
    const otp1 = await consumeEmailRateLimit(email, 'password_reset_otp', '127.0.0.1');
    assert.strictEqual(otp1.allowed, true, 'OTP quota must not be consumed by reset link quota');
    assert.strictEqual(otp1.remaining, 2);
    assert.strictEqual(otp1.totalAttempts, 1);

    // OTP request 2 and 3 succeed
    const otp2 = await consumeEmailRateLimit(email, 'password_reset_otp', '127.0.0.1');
    const otp3 = await consumeEmailRateLimit(email, 'password_reset_otp', '127.0.0.1');
    assert.strictEqual(otp2.allowed, true);
    assert.strictEqual(otp3.allowed, true);

    // OTP request 4 is blocked
    const otp4 = await consumeEmailRateLimit(email, 'password_reset_otp', '127.0.0.1');
    assert.strictEqual(otp4.allowed, false);
    assert.strictEqual(otp4.message, RATE_LIMIT_EXCEEDED_MESSAGE);
  });

  it('6. Signup verification has its own independent counter (3 signup links exhausted, but reset link succeeds)', async () => {
    const email = `test.user.independent.signup.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    // Exhaust 3 signup verification links
    for (let i = 0; i < 3; i++) {
      const res = await consumeEmailRateLimit(email, 'signup_verification', '127.0.0.1');
      assert.strictEqual(res.allowed, true);
    }

    // 4th signup verification is blocked
    const signup4 = await consumeEmailRateLimit(email, 'signup_verification', '127.0.0.1');
    assert.strictEqual(signup4.allowed, false);

    // Password reset link counter is unaffected!
    const reset1 = await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');
    assert.strictEqual(reset1.allowed, true, 'Password recovery quota must not be consumed by signup verification');
    assert.strictEqual(reset1.remaining, 2);
  });

  it('7. Requests become eligible again after their respective 24-hour window expires', async () => {
    const email = `test.user.rolling.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    const hashed = hashEmail(email);
    const now = Date.now();
    const twentyFiveHoursAgo = now - 25 * 60 * 60 * 1000;
    const twentySixHoursAgo = now - 26 * 60 * 60 * 1000;
    const twentySevenHoursAgo = now - 27 * 60 * 60 * 1000;

    const id1 = 'old-1-' + Date.now();
    const id2 = 'old-2-' + Date.now();
    const id3 = 'old-3-' + Date.now();

    // Insert 3 attempts that occurred > 24 hours ago directly into database
    await db.run(
      `INSERT INTO auth_email_rate_limits (id, email_hash, action, ip_address, outcome, created_at, created_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id1, hashed, 'password_reset_link', '127.0.0.1', 'success', new Date(twentySevenHoursAgo).toISOString(), twentySevenHoursAgo]
    );
    await db.run(
      `INSERT INTO auth_email_rate_limits (id, email_hash, action, ip_address, outcome, created_at, created_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id2, hashed, 'password_reset_link', '127.0.0.1', 'success', new Date(twentySixHoursAgo).toISOString(), twentySixHoursAgo]
    );
    await db.run(
      `INSERT INTO auth_email_rate_limits (id, email_hash, action, ip_address, outcome, created_at, created_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id3, hashed, 'password_reset_link', '127.0.0.1', 'success', new Date(twentyFiveHoursAgo).toISOString(), twentyFiveHoursAgo]
    );

    // Because all 3 attempts are outside the rolling 24-hour window, the new request must succeed!
    const res = await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');
    assert.strictEqual(res.allowed, true, 'Request should be allowed since older requests expired');
    assert.strictEqual(res.totalAttempts, 1);
    assert.strictEqual(res.remaining, 2);
  });

  it('8. Concurrent requests cannot exceed the limit (10 concurrent requests yield exactly 3 successes, 7 blocked)', async () => {
    const email = `test.user.concurrent.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    // Fire 10 simultaneous concurrent requests
    const promises = Array.from({ length: 10 }, (_, i) =>
      consumeEmailRateLimit(email, 'password_reset_link', `127.0.0.${i + 1}`)
    );

    const results = await Promise.all(promises);
    const allowed = results.filter(r => r.allowed);
    const blocked = results.filter(r => !r.allowed);

    assert.strictEqual(allowed.length, 3, 'Exactly 3 concurrent requests must succeed');
    assert.strictEqual(blocked.length, 7, 'Remaining 7 concurrent requests must be blocked');

    for (const b of blocked) {
      assert.strictEqual(b.message, RATE_LIMIT_EXCEEDED_MESSAGE);
      assert.ok(b.nextEligibleAt);
    }
  });

  it('9. Direct API requests enforce rate limiting and block 4th request with HTTP 429', async () => {
    const email = `test.api.user.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    // 1st request to /api/auth/send-password-reset-link
    const req1 = await requestJson(server, '/api/auth/send-password-reset-link', 'POST', { email });
    assert.strictEqual(req1.status, 200);
    assert.strictEqual(req1.body.remaining, 2);

    // 2nd request
    const req2 = await requestJson(server, '/api/auth/send-password-reset-link', 'POST', { email });
    assert.strictEqual(req2.status, 200);
    assert.strictEqual(req2.body.remaining, 1);

    // 3rd request
    const req3 = await requestJson(server, '/api/auth/send-password-reset-link', 'POST', { email });
    assert.strictEqual(req3.status, 200);
    assert.strictEqual(req3.body.remaining, 0);

    // 4th request MUST return HTTP 429
    const req4 = await requestJson(server, '/api/auth/send-password-reset-link', 'POST', { email });
    assert.strictEqual(req4.status, 429, 'Direct API must return 429 on 4th request');
    assert.strictEqual(req4.body.error, RATE_LIMIT_EXCEEDED_MESSAGE);
    assert.strictEqual(req4.body.code, 'email_rate_limit_exceeded');
    assert.strictEqual(req4.body.limit, 3);
    assert.ok(req4.body.next_eligible_at, 'Must return next_eligible_at');
    assert.ok(req4.body.retry_after_seconds > 0, 'Must return retry_after_seconds');
  });

  it('9b. Direct API send-verification-email enforces rate limiting and blocks 4th request with 429', async () => {
    const email = `test.api.verify.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    for (let i = 0; i < 3; i++) {
      const res = await requestJson(server, '/api/auth/send-verification-email', 'POST', { email });
      assert.strictEqual(res.status, 200);
    }

    const blocked = await requestJson(server, '/api/auth/send-verification-email', 'POST', { email });
    assert.strictEqual(blocked.status, 429);
    assert.strictEqual(blocked.body.error, RATE_LIMIT_EXCEEDED_MESSAGE);
    assert.strictEqual(blocked.body.code, 'email_rate_limit_exceeded');
  });

  it('9c. Direct API send-password-reset-otp enforces rate limiting and blocks 4th request with 429', async () => {
    const email = `test.api.otp.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    for (let i = 0; i < 3; i++) {
      const res = await requestJson(server, '/api/auth/send-password-reset-otp', 'POST', { email });
      assert.strictEqual(res.status, 200);
    }

    const blocked = await requestJson(server, '/api/auth/send-password-reset-otp', 'POST', { email });
    assert.strictEqual(blocked.status, 429);
    assert.strictEqual(blocked.body.error, RATE_LIMIT_EXCEEDED_MESSAGE);
    assert.strictEqual(blocked.body.code, 'email_rate_limit_exceeded');
  });

  it('9d. Rate limit status endpoint returns current counters without consuming quota', async () => {
    const email = `test.api.status.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    // Initial status: remaining 3
    const status1 = await requestJson(
      server,
      `/api/auth/rate-limit-status?email=${encodeURIComponent(email)}&action=password_reset_link`
    );
    assert.strictEqual(status1.status, 200);
    assert.strictEqual(status1.body.remaining, 3);
    assert.strictEqual(status1.body.total_attempts, 0);

    // Consume 1
    await consumeEmailRateLimit(email, 'password_reset_link', '127.0.0.1');

    // Status check again
    const status2 = await requestJson(
      server,
      `/api/auth/rate-limit-status?email=${encodeURIComponent(email)}&action=password_reset_link`
    );
    assert.strictEqual(status2.status, 200);
    assert.strictEqual(status2.body.remaining, 2);
    assert.strictEqual(status2.body.total_attempts, 1);
  });

  it('9e. Pre-signup check blocks when signup limit is already exhausted', async () => {
    const email = `test.pre.signup.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(email);

    // Consume 3 signup verifications
    for (let i = 0; i < 3; i++) {
      await consumeEmailRateLimit(email, 'signup_verification', '127.0.0.1');
    }

    const checkRes = await requestJson(server, '/api/auth/pre-signup-check', 'POST', { email });
    assert.strictEqual(checkRes.status, 429);
    assert.strictEqual(checkRes.body.error, RATE_LIMIT_EXCEEDED_MESSAGE);
    assert.strictEqual(checkRes.body.code, 'email_rate_limit_exceeded');
  });

  it('10. Security: Passwords and OTPs are never stored in rate limit table; emails are hashed', async () => {
    const rawEmail = `  Security.Auditor+TEST@Kyron.Test  `;
    const normalized = normalizeEmail(rawEmail);
    const expectedHash = hashEmail(normalized);

    await consumeEmailRateLimit(rawEmail, 'password_reset_otp', '192.168.1.100');

    // Inspect the actual rows in the auth_email_rate_limits table
    const rows = await db.all(
      `SELECT * FROM auth_email_rate_limits WHERE email_hash = ?`,
      [expectedHash]
    );

    assert.ok(rows.length > 0, 'Must record rate limit entry');
    for (const row of rows) {
      assert.strictEqual(row.email_hash, expectedHash);
      assert.strictEqual((row as any).email, undefined, 'Plain email must not be stored in rate limit record');
      assert.strictEqual((row as any).otp, undefined, 'OTP must not be stored in rate limit record');
      assert.strictEqual((row as any).password, undefined, 'Password must not be stored in rate limit record');
      assert.strictEqual((row as any).token, undefined, 'Token must not be stored in rate limit record');
    }
  });

  it('11. Case and whitespace normalization: variations of the same email share the same quota', async () => {
    const base = `unique.norm.${Date.now()}@kyron.test`;
    await resetRateLimitsForTesting(base);

    // 1st: uppercase
    const res1 = await consumeEmailRateLimit(base.toUpperCase(), 'password_reset_link', '127.0.0.1');
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.remaining, 2);

    // 2nd: leading/trailing whitespace
    const res2 = await consumeEmailRateLimit(`  ${base}  `, 'password_reset_link', '127.0.0.1');
    assert.strictEqual(res2.allowed, true);
    assert.strictEqual(res2.remaining, 1);

    // 3rd: exact base
    const res3 = await consumeEmailRateLimit(base, 'password_reset_link', '127.0.0.1');
    assert.strictEqual(res3.allowed, true);
    assert.strictEqual(res3.remaining, 0);

    // 4th: mixed case + whitespace must be blocked
    const res4 = await consumeEmailRateLimit(`  ${base.toUpperCase()}  `, 'password_reset_link', '127.0.0.1');
    assert.strictEqual(res4.allowed, false);
    assert.strictEqual(res4.message, RATE_LIMIT_EXCEEDED_MESSAGE);
  });
});

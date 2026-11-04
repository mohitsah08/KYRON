process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { app } from '../server/index.ts';
import { db, initDatabase } from '../server/db/database.ts';

function requestJson(
  server: http.Server,
  path: string,
  method = 'GET',
  body?: object,
  token?: string
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
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

describe('KYRON Profile, Account & Settings System', () => {
  let server: http.Server;
  let testUserToken: string;
  let testUserId: string;
  const testEmail = `profile.tester.${Date.now()}@kyron.test`;
  const initialUsername = `prof_user_${Date.now()}`;

  before(async () => {
    await initDatabase();
    server = app.listen(0);

    // Register a test user
    const regRes = await requestJson(server, '/api/auth/register', 'POST', {
      email: testEmail,
      password: 'StrongPassword123',
      display_name: 'Ada Lovelace'
    });
    assert.strictEqual(regRes.status, 201);
    testUserToken = regRes.body.token;
    testUserId = regRes.body.user.id;
  });

  after(() => {
    server?.close();
  });

  it('1. GET /api/auth/me returns complete enhanced profile structure', async () => {
    const res = await requestJson(server, '/api/auth/me', 'GET', undefined, testUserToken);
    assert.strictEqual(res.status, 200);
    const u = res.body.user;

    assert.strictEqual(u.id, testUserId);
    assert.strictEqual(u.email, testEmail);
    assert.strictEqual(u.display_name, 'Ada Lovelace');
    assert.strictEqual(u.first_name, 'Ada');
    assert.strictEqual(u.last_name, 'Lovelace');
    assert.strictEqual(typeof u.social_links, 'object');
    assert.strictEqual(typeof u.notification_preferences, 'object');
    assert.strictEqual(u.creator_mode_enabled, false);
    assert.strictEqual(u.role_type, 'individual');
    assert.strictEqual(u.theme_preference, 'system');
    assert.strictEqual(u.language, 'en');
    assert.strictEqual(u.timezone, 'UTC');
    assert.strictEqual(u.profile_visibility, 'public');
    assert.strictEqual(u.discoverability, true);
    assert.strictEqual(Array.isArray(u.connected_accounts), true);
  });

  it('2. PUT /api/auth/me updates personal identity, location, website & social links', async () => {
    const newUsername = `ada_${Date.now()}`.slice(0, 24);
    const updatePayload = {
      first_name: 'Augusta Ada',
      last_name: 'King-Noel',
      display_name: 'Ada Lovelace, Countess of Lovelace',
      username: newUsername,
      bio: 'Pioneered computational algorithms and analytical engine workflows.',
      location: 'London, United Kingdom',
      website_url: 'https://analytical-engine.org',
      phone: '+44 20 7946 0991',
      social_links: {
        github: 'adalovelace',
        linkedin: 'ada-lovelace',
        twitter: 'ada_computing'
      }
    };

    const res = await requestJson(server, '/api/auth/me', 'PUT', updatePayload, testUserToken);
    assert.strictEqual(res.status, 200);
    const u = res.body.user;

    assert.strictEqual(u.first_name, 'Augusta Ada');
    assert.strictEqual(u.last_name, 'King-Noel');
    assert.strictEqual(u.display_name, 'Ada Lovelace, Countess of Lovelace');
    assert.strictEqual(u.username, newUsername);
    assert.strictEqual(u.location, 'London, United Kingdom');
    assert.strictEqual(u.phone, '+44 20 7946 0991');
    assert.strictEqual(u.social_links.github, 'adalovelace');
    assert.strictEqual(u.social_links.linkedin, 'ada-lovelace');
  });

  it('3. GET /api/auth/check-username validates format and availability', async () => {
    // 3a. Taken username (seeded creator alexvance)
    const checkTaken = await requestJson(server, `/api/auth/check-username?username=alexvance`);
    assert.strictEqual(checkTaken.status, 200);
    assert.strictEqual(checkTaken.body.available, false);
    assert.ok(checkTaken.body.reason);

    // 3b. Invalid username
    const checkInvalid = await requestJson(server, `/api/auth/check-username?username=Invalid!Name`);
    assert.strictEqual(checkInvalid.status, 200);
    assert.strictEqual(checkInvalid.body.available, false);

    // 3c. Free, valid username
    const unique = `avail_${Date.now()}`.slice(0, 20);
    const checkFree = await requestJson(server, `/api/auth/check-username?username=${unique}`);
    assert.strictEqual(checkFree.status, 200);
    assert.strictEqual(checkFree.body.available, true);
  });

  it('4. PUT /api/auth/creator-profile activates Creator Mode and updates storefront data', async () => {
    const creatorPayload = {
      creator_mode_enabled: true,
      creator_display_name: 'Babbage & Lovelace AI Foundry',
      creator_headline: 'Precision mechanical computing & agent instruction engines',
      creator_bio: 'Publishing production-ready SKILL.md and ZIP packages for Claude and Codex.',
      creator_skills: ['Algorithmic Reasoning', 'Analytical Engine', 'Agent Systems'],
      creator_categories: ['Engineering & Architecture', 'Agent Automations']
    };

    const res = await requestJson(server, '/api/auth/creator-profile', 'PUT', creatorPayload, testUserToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const u = res.body.user;

    assert.strictEqual(u.creator_mode_enabled, true);
    assert.strictEqual(u.creator_display_name, 'Babbage & Lovelace AI Foundry');
    assert.strictEqual(u.creator_headline, 'Precision mechanical computing & agent instruction engines');
    assert.deepStrictEqual(u.creator_skills, ['Algorithmic Reasoning', 'Analytical Engine', 'Agent Systems']);

    // Critical constraint: Creator Mode must NEVER grant administrative privileges
    assert.strictEqual(u.role, 'user', 'Creator mode must never elevate user role to admin');
  });

  it('5. PUT /api/auth/role-profile supports Agency Owner & Freelancer profiles', async () => {
    const agencyPayload = {
      role_type: 'agency_owner',
      professional_title: 'Founder & Chief Architect',
      agency_name: 'Axiom Autonomous Systems',
      agency_website: 'https://axiom-autonomous.dev',
      agency_description: 'Premier AI systems integrator for enterprise agent fleets.',
      agency_team_size: '15-25 engineers',
      years_experience: 8,
      skills_expertise: ['Multi-Agent Architecture', 'Autonomous Swarms', 'MCP Protocol']
    };

    const res = await requestJson(server, '/api/auth/role-profile', 'PUT', agencyPayload, testUserToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const u = res.body.user;

    assert.strictEqual(u.role_type, 'agency_owner');
    assert.strictEqual(u.agency_name, 'Axiom Autonomous Systems');
    assert.strictEqual(u.agency_team_size, '15-25 engineers');
    assert.strictEqual(u.years_experience, 8);
    assert.deepStrictEqual(u.skills_expertise, ['Multi-Agent Architecture', 'Autonomous Swarms', 'MCP Protocol']);
  });

  it('6. POST /api/auth/change-email updates email and enforces uniqueness', async () => {
    // 6a. Reject duplicate email
    const duplicateRes = await requestJson(server, '/api/auth/change-email', 'POST', {
      new_email: 'admin@kyron.dev'
    }, testUserToken);
    assert.strictEqual(duplicateRes.status, 409);

    // 6b. Accept valid unique email
    const validEmail = `ada.updated.${Date.now()}@kyron.test`;
    const okRes = await requestJson(server, '/api/auth/change-email', 'POST', {
      new_email: validEmail
    }, testUserToken);
    assert.strictEqual(okRes.status, 200);
    assert.strictEqual(okRes.body.email, validEmail);

    // Verify in /me
    const me = await requestJson(server, '/api/auth/me', 'GET', undefined, testUserToken);
    assert.strictEqual(me.body.user.email, validEmail);
  });

  it('7. PUT /api/auth/phone updates contact phone number', async () => {
    const phoneRes = await requestJson(server, '/api/auth/phone', 'PUT', { phone: '+1 415 555 2671' }, testUserToken);
    assert.strictEqual(phoneRes.status, 200);
    assert.strictEqual(phoneRes.body.phone, '+1 415 555 2671');
  });

  it('8. GET /api/auth/security/activity reports active sessions and login events', async () => {
    const res = await requestJson(server, '/api/auth/security/activity', 'GET', undefined, testUserToken);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.sessions), 'Should return sessions list');
    assert.ok(Array.isArray(res.body.activity), 'Should return activity log');
    assert.ok(res.body.sessions.length >= 1, 'Should contain current session');
  });

  it('9. POST /api/auth/security/logout-all terminates non-current sessions', async () => {
    const res = await requestJson(server, '/api/auth/security/logout-all', 'POST', undefined, testUserToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  it('10. GET /api/purchases/billing-summary returns genuine user balance and invoices', async () => {
    const res = await requestJson(server, '/api/purchases/billing-summary', 'GET', undefined, testUserToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(typeof res.body.credit_balance, 'number');
    assert.strictEqual(res.body.credit_balance, 10.00, 'New user starts with $10 welcome balance');
    assert.ok(Array.isArray(res.body.invoices), 'Should return invoices array');
  });

  it('11. POST /api/auth/export-data generates complete GDPR-compliant JSON archive', async () => {
    const res = await requestJson(server, '/api/auth/export-data', 'POST', undefined, testUserToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.exported_at, 'Must contain export timestamp');
    assert.ok(res.body.account, 'Must contain account metadata');
    assert.ok(res.body.profile, 'Must contain profile');
    assert.ok(Array.isArray(res.body.purchased_skills));
    assert.ok(Array.isArray(res.body.creator_catalog));
  });

  it('12. POST /api/auth/deactivate flags user account as deactivated', async () => {
    const res = await requestJson(server, '/api/auth/deactivate', 'POST', undefined, testUserToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const me = await requestJson(server, '/api/auth/me', 'GET', undefined, testUserToken);
    assert.strictEqual(me.body.user.is_deactivated, true);
  });
});

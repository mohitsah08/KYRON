process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { app } from '../server/index.ts';
import http from 'node:http';
import { db } from '../server/db/database.ts';

function requestJson(server: http.Server, path: string, method = 'GET', body?: object, token?: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
      headers['Content-Length'] = String(Buffer.byteLength(bodyStr));
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: address.port,
        path,
        method,
        headers
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 200, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode || 200, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(bodyStr);
    req.end();
  });
}

describe('KYRON Unified Skill Installation System', () => {
  let server: http.Server;
  let testUserToken: string;
  let testUserId: string;

  before(async () => {
    server = app.listen(0);
    // Register a test user
    const regRes = await requestJson(server, '/api/auth/register', 'POST', {
      email: 'install_tester_' + Date.now() + '@kyron.dev',
      password: 'StrongPassword123!',
      display_name: 'Install QA User',
      username: 'installer_' + Date.now()
    });
    assert.strictEqual(regRes.status, 201);
    testUserToken = regRes.body.token;
    testUserId = regRes.body.user.id;
  });

  after(() => {
    if (server) server.close();
  });

  it('1. POST /api/skills/:id/install requires authentication', async () => {
    const res = await requestJson(server, '/api/skills/skl_code_review_auditor/install', 'POST');
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/skills/:id/install successfully installs free skill', async () => {
    const res = await requestJson(
      server,
      '/api/skills/skl_code_review_auditor/install',
      'POST',
      { targetAgent: 'claude' },
      testUserToken
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.status, 'installed');
    assert.strictEqual(res.body.is_installed, true);
    assert.ok(res.body.license_key);
    assert.ok(res.body.package.download_url);

    // Verify record in user_purchases
    const purchase = await db.get(
      `SELECT * FROM user_purchases WHERE user_id = ? AND skill_id = 'skl_code_review_auditor' AND status = 'completed'`,
      [testUserId]
    ) as any;
    assert.ok(purchase);
    assert.strictEqual(purchase.license_key, res.body.license_key);

    // Verify record in skill_downloads
    const download = await db.get(
      `SELECT * FROM skill_downloads WHERE user_id = ? AND skill_id = 'skl_code_review_auditor'`,
      [testUserId]
    ) as any;
    assert.ok(download);
  });

  it('3. POST /api/skills/:id/install deduplicates already installed skill', async () => {
    const res = await requestJson(
      server,
      '/api/skills/skl_code_review_auditor/install',
      'POST',
      {},
      testUserToken
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.status, 'already_installed');
    assert.strictEqual(res.body.is_installed, true);
    assert.ok(res.body.license_key);
  });

  it('4. GET /api/skills reflects is_installed: true for authenticated user', async () => {
    const res = await requestJson(server, '/api/skills', 'GET', undefined, testUserToken);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.skills));

    const installedSkill = res.body.skills.find((s: any) => s.id === 'skl_code_review_auditor');
    assert.ok(installedSkill);
    assert.strictEqual(installedSkill.is_installed, true);
    assert.strictEqual(installedSkill.is_owned, true);

    const uninstalledSkill = res.body.skills.find((s: any) => s.id !== 'skl_code_review_auditor');
    if (uninstalledSkill) {
      assert.strictEqual(Boolean(uninstalledSkill.is_installed), false);
    }
  });

  it('5. GET /api/purchases/library includes the newly installed skill', async () => {
    const res = await requestJson(server, '/api/purchases/library', 'GET', undefined, testUserToken);
    assert.strictEqual(res.status, 200);
    const library = res.body.purchases || res.body.library;
    assert.ok(Array.isArray(library));
    const match = library.find((p: any) => p.skill_id === 'skl_code_review_auditor');
    assert.ok(match);
  });
});

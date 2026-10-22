process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { app } from '../server/index.ts';
import http from 'node:http';

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

describe('KYRON Full REST API Test Suite', () => {
  let server: http.Server;
  let authToken: string;
  let testUserId: string;

  it('should start test server', () => {
    server = app.listen(0);
  });

  it('GET /api/health should return ok status', async () => {
    const res = await requestJson(server, '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  it('GET /api/skills/categories should return all 32 categories with skill counts', async () => {
    const res = await requestJson(server, '/api/skills/categories');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.categories.length, 32);
    assert.ok(res.body.total > 0);
    const seoCat = res.body.categories.find((c: any) => c.slug === 'marketing-seo');
    assert.ok(seoCat);
    assert.ok(seoCat.count >= 1);
  });

  it('GET /api/skills/deals should return active Skill of the Month deal', async () => {
    const res = await requestJson(server, '/api/skills/deals');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.deals.length > 0);
    const deal = res.body.deals[0];
    assert.strictEqual(deal.discount_percent, 33);
    assert.strictEqual(deal.slug, 'geo-seo-suite-ai-search-optimization');
  });

  it('GET /api/skills should support category, sort, and query filtering', async () => {
    // 1. All skills
    const all = await requestJson(server, '/api/skills');
    assert.strictEqual(all.status, 200);
    assert.ok(all.body.skills.length > 0);

    // 2. Filter by category
    const seo = await requestJson(server, '/api/skills?category=marketing-seo');
    assert.strictEqual(seo.status, 200);
    assert.ok(seo.body.skills.every((s: any) => s.category === 'marketing-seo'));

    // 3. Filter by free pricing
    const free = await requestJson(server, '/api/skills?pricing_type=free');
    assert.strictEqual(free.status, 200);
    assert.ok(free.body.skills.every((s: any) => s.pricing_type === 'free' || s.price === 0));

    // 4. Search query
    const search = await requestJson(server, '/api/skills?q=breakout');
    assert.strictEqual(search.status, 200);
    assert.ok(search.body.skills.some((s: any) => s.slug === 'stock-breakout-picker'));
  });

  it('POST /api/auth/register should create new account with $10 welcome balance', async () => {
    const randomEmail = `test_${Date.now()}@kyron.dev`;
    const res = await requestJson(server, '/api/auth/register', 'POST', {
      email: randomEmail,
      password: 'password123',
      display_name: 'Test Buyer'
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.credit_balance, 10.00);
    authToken = res.body.token;
    testUserId = res.body.user.id;
  });

  it('POST /api/auth/login should authenticate user', async () => {
    const res = await requestJson(server, '/api/auth/login', 'POST', {
      email: 'demo@kyron.dev',
      password: 'password123'
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.email, 'demo@kyron.dev');
  });

  it('POST /api/purchases/free should allow 1-click install of free skill', async () => {
    const res = await requestJson(server, '/api/purchases/free', 'POST', {
      skillId: 'skl_code_review_auditor'
    }, authToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'installed');
    assert.ok(res.body.license_key);
  });

  it('GET /api/skills/:slug/package should BLOCK unauthorized retrieval of paid package', async () => {
    // Attempting to download GEO-SEO Suite (paid $19.99) without having purchased it
    const res = await requestJson(server, '/api/skills/geo-seo-suite-ai-search-optimization/package', 'GET', undefined, authToken);
    assert.strictEqual(res.status, 403);
    assert.ok(res.body.error.includes('Access denied'));
  });

  it('POST /api/purchases/credit should purchase paid skill with credit balance', async () => {
    // User starts with $10.00 credit. Prompt dataset builder is $9.90.
    const res = await requestJson(server, '/api/purchases/credit', 'POST', {
      skillId: 'skl_prompt_dataset_builder'
    }, authToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'purchased');
    assert.ok(res.body.license_key);
    assert.ok(res.body.new_balance < 10.00);
  });

  it('GET /api/skills/:slug/package should ALLOW retrieval once purchased', async () => {
    const res = await requestJson(server, '/api/skills/prompt-dataset-builder-sanitizer/package', 'GET', undefined, authToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.skill_name, 'Prompt Dataset Builder & Sanitizer');
    assert.ok(res.body.skill_md);
  });

  it('GET /api/purchases/library should return authenticated user library of acquired skills', async () => {
    const res = await requestJson(server, '/api/purchases/library', 'GET', undefined, authToken);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.library));
    assert.ok(Array.isArray(res.body.purchases));
    assert.strictEqual(res.body.count, 2);
    assert.strictEqual(res.body.library.length, 2);
    assert.ok(res.body.library[0].license_key);
  });

  it('POST /api/skills/:id/vote should record community upvotes and updates', async () => {
    const res = await requestJson(server, '/api/skills/skl_geo_seo_suite/vote', 'POST', {
      vote_type: 1
    }, authToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user_vote, 1);
  });

  it('POST /api/skills/:id/save should bookmark skill for price drop alerts', async () => {
    const res = await requestJson(server, '/api/skills/skl_geo_seo_suite/save', 'POST', {}, authToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.saved, true);
  });

  it('POST /api/creator/publish should scan and publish a verified skill', async () => {
    const res = await requestJson(server, '/api/creator/publish', 'POST', {
      name: 'Cloud Security Sentinel',
      summary: 'Automated IAM audit and least-privilege policy synthesizer for cloud environments.',
      description: 'Audit cloud permissions and generate minimal IAM policies.',
      category: 'security',
      tags: ['security', 'iam', 'cloud'],
      pricing_type: 'paid',
      price: 14.00,
      skill_md_content: `---
name: cloud-security-sentinel
description: Automated IAM audit and least-privilege policy synthesizer.
metadata:
  version: "1.0"
---

# Cloud Security Sentinel
Audit permissions with least-privilege enforcement.
`
    }, authToken);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.security_status, 'pass');
    assert.strictEqual(res.body.status, 'live');
    assert.strictEqual(res.body.scan_report.passedChecks, 8);
  });

  it('GET /api/creator/analytics should compute sales funnel and 70% payout metrics', async () => {
    const res = await requestJson(server, '/api/creator/analytics', 'GET', undefined, authToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.funnel);
    assert.strictEqual(res.body.funnel.platform_fee_percent, 30);
    assert.ok(Array.isArray(res.body.skills));
  });

  it('should close test server', () => {
    server.close();
  });
});

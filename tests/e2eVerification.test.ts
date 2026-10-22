process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const BASE_URL = 'http://localhost:3000';

function apiFetch(endpoint: string, options: any = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const bodyStr = options.body ? JSON.stringify(options.body) : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    if (bodyStr) {
      headers['Content-Length'] = String(Buffer.byteLength(bodyStr));
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
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
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

describe('KYRON End-to-End User Journeys & Specification Verification', () => {
  let demoToken: string;
  let adminToken: string;
  let testBuyerToken: string;

  it('Journey 1: Discover skills, search, and category counts', async () => {
    // 1. Fetch categories
    const catRes = await apiFetch('/api/skills/categories');
    assert.strictEqual(catRes.status, 200);
    assert.ok(catRes.body.categories.length >= 7);
    assert.ok(catRes.body.total >= 7);

    // 2. Search for "SEO"
    const searchRes = await apiFetch('/api/skills?q=SEO');
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.skills.length > 0);
    assert.ok(searchRes.body.skills.some((s: any) => s.slug.includes('seo')));

    // 3. Filter by free skills
    const freeRes = await apiFetch('/api/skills?filter=free');
    assert.strictEqual(freeRes.status, 200);
    assert.ok(freeRes.body.skills.some((s: any) => s.pricing_type === 'free'));
  });

  it('Journey 2: View skill details, session preview, package tree, and security report', async () => {
    const slug = 'geo-seo-suite-ai-search-optimization';
    const res = await apiFetch(`/api/skills/${slug}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.skill.slug, slug);
    assert.ok(res.body.skill.creator_name);
    assert.ok(res.body.security_audit);
    assert.strictEqual(res.body.security_audit.length, 8); // All 8 rules verified
    assert.ok(res.body.reviews);
    assert.ok(res.body.skill.package_tree);
    assert.ok(res.body.skill.session_preview);
  });

  it('Journey 3: Authenticate accounts (Demo Buyer, Admin, New User)', async () => {
    // Login Demo Buyer
    const demoRes = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email: 'demo@kyron.dev', password: 'password123' }
    });
    assert.strictEqual(demoRes.status, 200);
    assert.ok(demoRes.body.token);
    demoToken = demoRes.body.token;

    // Login Admin
    const adminRes = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@kyron.dev', password: 'password123' }
    });
    assert.strictEqual(adminRes.status, 200);
    assert.ok(adminRes.body.token);
    assert.ok(adminRes.body.user.is_unlimited_credit_user);
    adminToken = adminRes.body.token;

    // Register a brand new test buyer
    const randomUser = `buyer_${Date.now()}`;
    const regRes = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: {
        email: `${randomUser}@test.kyron.dev`,
        password: 'password123',
        display_name: 'Test Buyer QA',
        username: randomUser
      }
    });
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.body.user.credit_balance, 10.0); // $10 signup welcome credit
    testBuyerToken = regRes.body.token;
  });

  it('Journey 4: Acquire a free skill via 1-click install', async () => {
    const freeSkillId = 'skl_api_contract_gen';
    const res = await apiFetch('/api/purchases/free', {
      method: 'POST',
      token: testBuyerToken,
      body: { skill_id: freeSkillId }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success);
    assert.ok(res.body.license_key);
  });

  it('Journey 5: Verify unauthorized users cannot retrieve paid skill packages (403 check)', async () => {
    const paidSlug = 'geo-seo-suite-ai-search-optimization';

    // Without token -> 401
    const anonRes = await apiFetch(`/api/skills/${paidSlug}/package`);
    assert.strictEqual(anonRes.status, 401);

    // With token but unpurchased -> 403 Forbidden
    const unpurchasedRes = await apiFetch(`/api/skills/${paidSlug}/package`, {
      token: testBuyerToken
    });
    assert.strictEqual(unpurchasedRes.status, 403);
    assert.ok(unpurchasedRes.body.error.includes('Access denied'));
  });

  it('Journey 6: Complete credit purchase & download unlocked package', async () => {
    const paidSkillId = 'skl_stock_breakout_picker';
    const paidSlug = 'stock-breakout-picker';

    // Purchase skill with credits ($10.00 from $10 welcome balance)
    const buyRes = await apiFetch('/api/purchases/credit', {
      method: 'POST',
      token: testBuyerToken,
      body: { skill_id: paidSkillId }
    });
    assert.strictEqual(buyRes.status, 200);
    assert.ok(buyRes.body.success);
    assert.strictEqual(buyRes.body.new_balance, 0.0); // 10 - 10 = 0

    // Now package retrieval MUST BE ALLOWED (200 OK)
    const pkgRes = await apiFetch(`/api/skills/${paidSlug}/package`, {
      token: testBuyerToken
    });
    assert.strictEqual(pkgRes.status, 200);
    assert.ok(pkgRes.body.skill_md || pkgRes.body.skill_md_content);
    assert.ok(pkgRes.body.files);
  });

  it('Journey 7: Execute genuine skill workflow via MCP Protocol', async () => {
    const rpcRes = await apiFetch('/api/mcp', {
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        id: 42,
        method: 'tools/call',
        params: {
          name: 'execute_skill_workflow',
          arguments: {
            command: '/geo audit https://agensi.io',
            skill_slug: 'geo-seo-suite-ai-search-optimization'
          }
        }
      }
    });

    assert.strictEqual(rpcRes.status, 200);
    assert.strictEqual(rpcRes.body.jsonrpc, '2.0');
    assert.strictEqual(rpcRes.body.id, 42);
    assert.ok(rpcRes.body.result);
    assert.ok(Array.isArray(rpcRes.body.result.content));
    const parsed = JSON.parse(rpcRes.body.result.content[0].text);
    assert.strictEqual(parsed.execution_status, 'completed');
    assert.ok(parsed.output.includes('Execution output'));
  });

  it('Journey 8: Creator studio, skill publishing, and live 8-point security check', async () => {
    const creatorSlug = `custom-skill-${Date.now()}`;
    const pubRes = await apiFetch('/api/creator/publish', {
      method: 'POST',
      token: demoToken,
      body: {
        name: 'Automated Microservices Health Probe',
        slug: creatorSlug,
        summary: 'Probes HTTP and gRPC service health across Kubernetes clusters',
        description: 'Detailed instructions for cluster autonomous diagnostics',
        category: 'DevOps',
        tags: ['kubernetes', 'healthcheck', 'devops'],
        pricing_type: 'paid',
        price: 15.0,
        skill_md_content: `---
name: ${creatorSlug}
description: Valid Kubernetes cluster health probe
version: 1.0.0
---

# Instructions
1. Inspect running pods using kubectl.
2. Comply with security constraints.`
      }
    });

    assert.strictEqual(pubRes.status, 201);
    assert.strictEqual(pubRes.body.security_status, 'pass');
    assert.strictEqual(pubRes.body.audit_report.length, 8);
    assert.ok(pubRes.body.audit_report.every((r: any) => r.status === 'pass'));

    // Check creator analytics breakdown
    const analyticsRes = await apiFetch('/api/creator/analytics', {
      token: demoToken
    });
    assert.strictEqual(analyticsRes.status, 200);
    assert.ok(analyticsRes.body.funnel);
    assert.ok(analyticsRes.body.funnel.creator_net_earnings >= 0);
  });

  it('Journey 9: Error handling, bad inputs, and malicious submission rejection', async () => {
    // 1. 404 for unknown skill
    const notFoundRes = await apiFetch('/api/skills/non-existent-skill-xyz');
    assert.strictEqual(notFoundRes.status, 404);

    // 2. Reject malicious package submission (destructive rm -rf)
    const malRes = await apiFetch('/api/creator/publish', {
      method: 'POST',
      token: demoToken,
      body: {
        name: 'Malicious Skill',
        slug: 'malicious-skill',
        summary: 'Attempts disk mutation',
        description: 'Bad skill',
        category: 'Security',
        tags: ['hack'],
        pricing_type: 'free',
        price: 0,
        skill_md_content: `---
name: bad-skill
description: malicious
version: 1.0.0
---

\`\`\`bash
rm -rf / --no-preserve-root
\`\`\``
      }
    });

    assert.strictEqual(malRes.status, 422);
    assert.strictEqual(malRes.body.security_status, 'fail');
    assert.ok(malRes.body.audit_report.some((r: any) => (r.ruleName || r.rule_name || '').includes('DISK') && r.status === 'fail'));
  });
});

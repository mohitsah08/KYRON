process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { app } from '../server/index.ts';
import { db, initDatabase } from '../server/db/database.ts';
import { runSeed } from '../server/db/seed.ts';

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

describe('Marketplace Pricing Filter & Model Integrity', () => {
  let server: http.Server;

  before(async () => {
    await initDatabase();
    runSeed();
    server = app.listen(0);
  });

  after(async () => {
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it('1. "All Models" displays both free and paid published skills', async () => {
    const res = await requestJson(server, '/api/skills');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.skills));
    assert.ok(res.body.skills.length > 0);

    const hasFree = res.body.skills.some((s: any) => s.pricing_type === 'free' && s.price === 0);
    const hasPaid = res.body.skills.some((s: any) => s.pricing_type === 'paid' && s.price > 0);

    assert.ok(hasFree, 'All Models must contain free skills');
    assert.ok(hasPaid, 'All Models must contain paid skills');

    // Explicit filter=all should yield identical behavior
    const resAll = await requestJson(server, '/api/skills?filter=all');
    assert.strictEqual(resAll.body.skills.length, res.body.skills.length);
  });

  it('2. "Free (1-Click)" filter displays ONLY genuinely free skills', async () => {
    const res = await requestJson(server, '/api/skills?filter=free');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.skills.length > 0, 'Should find free skills');

    for (const skill of res.body.skills) {
      assert.strictEqual(skill.pricing_type, 'free', `Skill ${skill.name} must have pricing_type === free`);
      assert.strictEqual(skill.price, 0, `Skill ${skill.name} free price must be 0`);
    }

    // Also test pricing_type=free query param synonym
    const resSynonym = await requestJson(server, '/api/skills?pricing_type=free');
    assert.strictEqual(resSynonym.body.skills.length, res.body.skills.length);
    assert.ok(resSynonym.body.skills.every((s: any) => s.pricing_type === 'free' && s.price === 0));
  });

  it('3. "Paid / Credit" filter displays ONLY genuinely paid/credit skills', async () => {
    const res = await requestJson(server, '/api/skills?filter=paid');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.skills.length > 0, 'Should find paid skills');

    for (const skill of res.body.skills) {
      assert.strictEqual(skill.pricing_type, 'paid', `Skill ${skill.name} must have pricing_type === paid`);
      assert.ok(skill.price > 0, `Skill ${skill.name} paid price must be > 0, found ${skill.price}`);
    }

    // Also test pricing_type=paid query param synonym
    const resSynonym = await requestJson(server, '/api/skills?pricing_type=paid');
    assert.strictEqual(resSynonym.body.skills.length, res.body.skills.length);
    assert.ok(resSynonym.body.skills.every((s: any) => s.pricing_type === 'paid' && s.price > 0));
  });

  it('4. Zero overlap: No free skills appear in Paid, and no paid skills appear in Free', async () => {
    const freeRes = await requestJson(server, '/api/skills?filter=free&limit=100');
    const paidRes = await requestJson(server, '/api/skills?filter=paid&limit=100');

    const freeIds = new Set(freeRes.body.skills.map((s: any) => s.id));
    const paidIds = new Set(paidRes.body.skills.map((s: any) => s.id));

    for (const id of freeIds) {
      assert.ok(!paidIds.has(id), `Skill ID ${id} was found in both free and paid result sets!`);
    }

    // Verify card display pricing consistency
    for (const skill of paidRes.body.skills) {
      assert.notStrictEqual(skill.pricing_type, 'free');
      assert.ok(Number(skill.price) > 0, `Paid skill ${skill.name} has non-positive price: ${skill.price}`);
    }

    for (const skill of freeRes.body.skills) {
      assert.strictEqual(skill.pricing_type, 'free');
      assert.strictEqual(Number(skill.price), 0, `Free skill ${skill.name} has non-zero price: ${skill.price}`);
    }
  });

  it('5. Subscription filter is completely removed from API query logic and returns 0 results', async () => {
    const res = await requestJson(server, '/api/skills?filter=subscription');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.skills.length, 0, 'Subscription filter must return 0 results');
    assert.strictEqual(res.body.total, 0);

    const res2 = await requestJson(server, '/api/skills?pricing_type=subscription');
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.skills.length, 0, 'Subscription pricing_type must return 0 results');
  });

  it('6. Former subscription skill (multi-agent-os) is properly mapped to Paid', async () => {
    const res = await requestJson(server, '/api/skills/multi-agent-orchestrator-os');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.skill.pricing_type, 'paid');
    assert.strictEqual(res.body.skill.price, 15.00);

    // Verify it appears in paid filter, but not in free
    const paidList = await requestJson(server, '/api/skills?filter=paid&limit=100');
    assert.ok(paidList.body.skills.some((s: any) => s.slug === 'multi-agent-orchestrator-os'));

    const freeList = await requestJson(server, '/api/skills?filter=free&limit=100');
    assert.ok(!freeList.body.skills.some((s: any) => s.slug === 'multi-agent-orchestrator-os'));
  });

  it('7. Search and category filters work in combination with pricing filters', async () => {
    // 1. Search + Paid
    const searchPaid = await requestJson(server, '/api/skills?q=SEO&filter=paid');
    assert.ok(searchPaid.body.skills.length > 0);
    assert.ok(searchPaid.body.skills.every((s: any) => s.pricing_type === 'paid' && s.price > 0));

    // 2. Category + Free
    const catFree = await requestJson(server, '/api/skills?category=developer&filter=free');
    for (const skill of catFree.body.skills) {
      assert.strictEqual(skill.pricing_type, 'free');
      assert.strictEqual(skill.price, 0);
    }

    // 3. Category + Paid
    const catPaid = await requestJson(server, '/api/skills?category=trading-investing&filter=paid');
    assert.ok(catPaid.body.skills.length > 0);
    for (const skill of catPaid.body.skills) {
      assert.strictEqual(skill.pricing_type, 'paid');
      assert.strictEqual(skill.category, 'trading-investing');
    }
  });

  it('8. Sorting and pagination function correctly with pricing filters and report accurate totals', async () => {
    const paidAll = await requestJson(server, '/api/skills?filter=paid&limit=100');
    const totalPaid = paidAll.body.total;
    assert.ok(totalPaid > 0);

    // Page 1 with limit 2
    const page1 = await requestJson(server, '/api/skills?filter=paid&limit=2&offset=0');
    assert.strictEqual(page1.body.skills.length, 2);
    assert.strictEqual(page1.body.total, totalPaid);

    // Page 2 with limit 2
    const page2 = await requestJson(server, '/api/skills?filter=paid&limit=2&offset=2');
    assert.strictEqual(page2.body.skills.length, Math.min(2, Math.max(0, totalPaid - 2)));
    assert.strictEqual(page2.body.total, totalPaid);
    assert.notStrictEqual(page1.body.skills[0].id, page2.body.skills[0].id);

    // Sort price_desc
    const desc = await requestJson(server, '/api/skills?filter=paid&sort=price_desc&limit=5');
    for (let i = 0; i < desc.body.skills.length - 1; i++) {
      assert.ok(desc.body.skills[i].price >= desc.body.skills[i + 1].price);
    }
  });

  it('9. Unpublished and draft skills remain private and do not appear in catalog filters', async () => {
    // Insert a draft skill
    const timestamp = Date.now();
    const draftId = 'skl_test_draft_' + timestamp;
    const draftSlug = 'draft-secret-skill-' + timestamp;
    await db.run(`
      INSERT INTO skills (
        id, name, slug, summary, description, category, tags,
        pricing_type, price, creator_id, security_status, status, created_at
      ) VALUES (?, 'Draft Secret Skill', ?, 'Secret draft summary', 'Secret description', 'developer', '[]',
        'free', 0.00, 'usr_admin', 'pending', 'draft', ?)
    `, [draftId, draftSlug, new Date().toISOString()]);

    const resAll = await requestJson(server, '/api/skills?q=Secret');
    assert.strictEqual(resAll.body.skills.length, 0);

    const resFree = await requestJson(server, '/api/skills?filter=free&q=Secret');
    assert.strictEqual(resFree.body.skills.length, 0);

    // Clean up
    await db.run('DELETE FROM skills WHERE id = ?', [draftId]);
  });
});


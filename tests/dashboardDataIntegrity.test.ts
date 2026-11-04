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

describe('KYRON Dashboard Data Integrity & Multi-User Isolation', () => {
  let server: http.Server;
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;

  const userAEmail = `dashboard.user.a.${Date.now()}@kyron.test`;
  const userBEmail = `dashboard.user.b.${Date.now()}@kyron.test`;

  before(async () => {
    await initDatabase();
    server = app.listen(0);

    // Register User A
    const regA = await requestJson(server, '/api/auth/register', 'POST', {
      email: userAEmail,
      password: 'StrongPassword123!',
      display_name: 'Developer Alice'
    });
    assert.strictEqual(regA.status, 201);
    userAToken = regA.body.token;
    userAId = regA.body.user.id;

    // Register User B
    const regB = await requestJson(server, '/api/auth/register', 'POST', {
      email: userBEmail,
      password: 'StrongPassword123!',
      display_name: 'Developer Bob'
    });
    assert.strictEqual(regB.status, 201);
    userBToken = regB.body.token;
    userBId = regB.body.user.id;
  });

  after(() => {
    if (server) server.close();
  });

  it('1. New account dashboard returns honest empty state without fake numbers', async () => {
    const res = await requestJson(server, '/api/dashboard', 'GET', undefined, userAToken);
    assert.strictEqual(res.status, 200);

    // Active Skills
    assert.strictEqual(res.body.metrics.active_skills.count, 0);
    assert.strictEqual(res.body.metrics.active_skills.slots_limit, null, 'No unbacked 20-slot limit returned');

    // Monthly Calls
    assert.strictEqual(res.body.metrics.monthly_calls.total, 0);
    assert.strictEqual(res.body.metrics.monthly_calls.tokens, 0);

    // Average Latency
    assert.strictEqual(res.body.metrics.average_latency.value_ms, null);
    assert.strictEqual(res.body.metrics.average_latency.display, '--');

    // System Health
    assert.strictEqual(res.body.metrics.system_health.status, 'Workspace ready');
    assert.strictEqual(res.body.metrics.system_health.has_monitoring, false);

    // Lists
    assert.deepStrictEqual(res.body.frequently_invoked_skills, []);
    assert.deepStrictEqual(res.body.recent_activity, []);
  });

  it('2. User with zero skills does not see marketplace skills as user-owned', async () => {
    const res = await requestJson(server, '/api/dashboard', 'GET', undefined, userBToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.metrics.active_skills.count, 0);
    assert.strictEqual(res.body.frequently_invoked_skills.length, 0);
  });

  it('3. User with two owned skills (one acquired, one authored & published)', async () => {
    // A: Author and publish a skill for User A
    const skillAId = `skl_a_${Date.now()}`;
    await db.run(`
      INSERT INTO skills (
        id, name, slug, summary, description, category, tags, pricing_type, price,
        current_version, creator_id, security_status, status, visibility, install_count,
        view_count, net_votes, average_rating, review_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      skillAId, 'Alice Security Sentinel', `alice-sentinel-${Date.now()}`,
      'Automated AST security scanner', 'Detailed description', 'security-compliance',
      JSON.stringify(['security']), 'free', 0.0, '1.0.0', userAId, 'pass',
      'published', 'public', 0, 0, 0, 5.0, 0, new Date().toISOString()
    ]);

    // B: User A acquires a free marketplace skill from creator
    const creatorSkillId = `skl_mkt_${Date.now()}`;
    await db.run(`
      INSERT INTO skills (
        id, name, slug, summary, description, category, tags, pricing_type, price,
        current_version, creator_id, security_status, status, visibility, install_count,
        view_count, net_votes, average_rating, review_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      creatorSkillId, 'Marketplace Tool', `mkt-tool-${Date.now()}`,
      'Marketplace utility tool', 'Desc', 'code-intelligence',
      JSON.stringify(['tools']), 'free', 0.0, '1.0.0', userBId, 'pass',
      'published', 'public', 1, 1, 0, 4.8, 1, new Date().toISOString()
    ]);

    // Acquire it for User A
    const purchaseId = `pur_a_${Date.now()}`;
    await db.run(`
      INSERT INTO user_purchases (
        id, user_id, skill_id, amount_paid, license_key, purchased_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [purchaseId, userAId, creatorSkillId, 0.0, 'KYRON-LIC-ALICE', new Date().toISOString(), 'completed']);

    const res = await requestJson(server, '/api/dashboard', 'GET', undefined, userAToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.metrics.active_skills.count, 2, 'User A owns 2 active skills');
    assert.strictEqual(res.body.frequently_invoked_skills.length, 2);
  });

  it('4. User with actual execution records calculates correct monthly calls & tokens', async () => {
    // Record two executions for User A
    const exec1 = await requestJson(server, '/api/dashboard/executions', 'POST', {
      skill_name: 'Alice Security Sentinel',
      command: '/sentinel check --strict',
      status: 'completed',
      latency_ms: 60,
      tokens_consumed: 1200
    }, userAToken);
    assert.strictEqual(exec1.status, 201);

    const exec2 = await requestJson(server, '/api/dashboard/executions', 'POST', {
      skill_name: 'Marketplace Tool',
      command: '/tool run',
      status: 'completed',
      latency_ms: 100,
      tokens_consumed: 800
    }, userAToken);
    assert.strictEqual(exec2.status, 201);

    const res = await requestJson(server, '/api/dashboard', 'GET', undefined, userAToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.metrics.monthly_calls.total, 2);
    assert.strictEqual(res.body.metrics.monthly_calls.tokens, 2000);
  });

  it('5. User with no execution history reports null average latency', async () => {
    const res = await requestJson(server, '/api/dashboard', 'GET', undefined, userBToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.metrics.average_latency.value_ms, null);
    assert.strictEqual(res.body.metrics.average_latency.display, '--');
  });

  it('6. Correct monthly usage calculation excludes executions outside current month', async () => {
    // Insert an old execution from 3 months ago directly for User A
    const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await db.run(`
      INSERT INTO skill_executions (
        id, user_id, skill_id, skill_name, command, status, latency_ms, tokens_consumed, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [`exec_old_${Date.now()}`, userAId, null, 'Old Execution', '/old', 'completed', 50, 5000, oldDate]);

    const res = await requestJson(server, '/api/dashboard', 'GET', undefined, userAToken);
    assert.strictEqual(res.status, 200);
    // Should still be only 2 monthly calls for the current calendar month
    assert.strictEqual(res.body.metrics.monthly_calls.total, 2);
    assert.strictEqual(res.body.metrics.monthly_calls.tokens, 2000);
  });

  it('7. Correct latency calculation computes average of completed executions only', async () => {
    // User A has executions with 60ms and 100ms (and the old 50ms).
    // Average across completed: (60 + 100 + 50) / 3 = 70ms.
    // Insert a failed execution with 500ms; it should NOT distort completed latency
    await db.run(`
      INSERT INTO skill_executions (
        id, user_id, skill_id, skill_name, command, status, latency_ms, tokens_consumed, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [`exec_fail_${Date.now()}`, userAId, null, 'Failed Job', '/fail', 'failed', 500, 0, new Date().toISOString()]);

    const res = await requestJson(server, '/api/dashboard', 'GET', undefined, userAToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.metrics.average_latency.value_ms, 70);
    assert.strictEqual(res.body.metrics.average_latency.display, '70 ms');
  });

  it('8. Correct skill ownership: Draft skills are NOT counted as active skills', async () => {
    // Add a draft skill for User A
    const draftSkillId = `skl_draft_${Date.now()}`;
    await db.run(`
      INSERT INTO skills (
        id, name, slug, summary, description, category, tags, pricing_type, price,
        current_version, creator_id, security_status, status, visibility, install_count,
        view_count, net_votes, average_rating, review_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      draftSkillId, 'Draft Unreleased Skill', `draft-skill-${Date.now()}`,
      'Draft summary', 'Draft desc', 'tools', JSON.stringify([]), 'free', 0.0,
      '0.1.0', userAId, 'pending', 'draft', 'private', 0, 0, 0, 0, 0, new Date().toISOString()
    ]);

    const res = await requestJson(server, '/api/dashboard', 'GET', undefined, userAToken);
    assert.strictEqual(res.status, 200);
    // Still 2 active skills (draft excluded)
    assert.strictEqual(res.body.metrics.active_skills.count, 2);
  });

  it('9. Exclusion of global demo records: Fake 142k calls & 84ms never present', async () => {
    const res = await requestJson(server, '/api/dashboard', 'GET', undefined, userAToken);
    assert.strictEqual(res.status, 200);
    assert.notStrictEqual(res.body.metrics.monthly_calls.total, 142890);
    assert.notStrictEqual(res.body.metrics.average_latency.value_ms, 84);
  });

  it('10. Multi-User Data Isolation: User B cannot see User A metrics or activity', async () => {
    const resB = await requestJson(server, '/api/dashboard', 'GET', undefined, userBToken);
    assert.strictEqual(resB.status, 200);

    // User B has 0 calls, null latency, 0 active skills (even though User A has 2 skills & calls)
    assert.strictEqual(resB.body.metrics.monthly_calls.total, 0);
    assert.strictEqual(resB.body.metrics.monthly_calls.tokens, 0);
    assert.strictEqual(resB.body.metrics.average_latency.value_ms, null);
    assert.strictEqual(resB.body.metrics.active_skills.count, 1, 'User B authored 1 marketplace skill in setup');
    assert.strictEqual(resB.body.recent_activity.length, 0, 'User B has zero activity records');
  });

  it('11. MCP connection permissions & execution attribution', async () => {
    // Call MCP tool with user A token
    const mcpRes = await requestJson(server, '/api/mcp', 'POST', {
      jsonrpc: '2.0',
      id: 'test-mcp-1',
      method: 'tools/call',
      params: {
        name: 'execute_skill_workflow',
        arguments: {
          command: '/geo quick https://electron-srl.com'
        }
      }
    }, userAToken);

    assert.strictEqual(mcpRes.status, 200);
    assert.ok(mcpRes.body.result?.content?.[0]?.text);

    // Verify execution was saved and attributed to User A
    const resA = await requestJson(server, '/api/dashboard', 'GET', undefined, userAToken);
    assert.strictEqual(resA.status, 200);
    const mcpExec = resA.body.recent_activity.find((act: any) => act.command === '/geo quick https://electron-srl.com');
    assert.ok(mcpExec, 'MCP execution was recorded in User A dashboard');
    assert.strictEqual(mcpExec.status, 'COMPLETED');
  });

  it('12. API key access control & multi-user isolation', async () => {
    // User A creates an API key
    const createResA = await requestJson(server, '/api/dashboard/api-keys', 'POST', {
      name: 'Alice Private Key'
    }, userAToken);
    assert.strictEqual(createResA.status, 201);
    const keyAId = createResA.body.api_key.id;
    assert.ok(createResA.body.api_key.secret_key.startsWith('ky_live_'));

    // User B lists keys: should NOT see User A key
    const listResB = await requestJson(server, '/api/dashboard/api-keys', 'GET', undefined, userBToken);
    assert.strictEqual(listResB.status, 200);
    assert.strictEqual(listResB.body.keys.some((k: any) => k.id === keyAId), false, 'User B cannot see User A key');

    // User B attempts to revoke User A key: should be 403 Forbidden
    const deleteResB = await requestJson(server, `/api/dashboard/api-keys/${keyAId}`, 'DELETE', undefined, userBToken);
    assert.strictEqual(deleteResB.status, 403);

    // User A revokes own key: should be 200 OK
    const deleteResA = await requestJson(server, `/api/dashboard/api-keys/${keyAId}`, 'DELETE', undefined, userAToken);
    assert.strictEqual(deleteResA.status, 200);

    // Verify revoked key is gone from active list
    const listResA = await requestJson(server, '/api/dashboard/api-keys', 'GET', undefined, userAToken);
    assert.strictEqual(listResA.status, 200);
    assert.strictEqual(listResA.body.keys.some((k: any) => k.id === keyAId), false);
  });
});


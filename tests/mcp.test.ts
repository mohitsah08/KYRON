process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { app } from '../server/index.ts';
import { db, initDatabase } from '../server/db/database.ts';
import { runSeed } from '../server/db/seed.ts';
import jwt from 'jsonwebtoken';
import http from 'node:http';

const JWT_SECRET = process.env.JWT_SECRET || 'kyron-super-secret-jwt-key-2026';

function makeRpcRequest(server: http.Server, payload: object, headers: Record<string, string> = {}): Promise<{ status: number; body: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const bodyStr = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: 'localhost',
        port: address.port,
        path: '/api/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          ...headers
        }
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          try {
            const body = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode || 200, body, raw });
          } catch {
            resolve({ status: res.statusCode || 200, body: raw, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

describe('Model Context Protocol (MCP) JSON-RPC Test Suite', () => {
  let server: http.Server;
  let testUserToken: string;
  let testUserId: string;

  before(async () => {
    await initDatabase();
    runSeed();

    // Ensure active deal fixture
    const future = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    await db.run(
      `INSERT INTO skill_deals (id, skill_id, creator_id, discount_percent, expires_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET expires_at = excluded.expires_at, is_active = excluded.is_active`,
      ['deal_geo_seo_month', 'skl_geo_seo_suite', 'usr_juan_gabriel', 33, future, 1]
    );

    // Create unique test user with $100 balance
    const randId = 'usr_mcp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    testUserId = randId;
    await db.run(
      `INSERT INTO profiles (id, email, display_name, username, credit_balance, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET credit_balance = excluded.credit_balance`,
      [testUserId, `${randId}@kyron.dev`, 'MCP Tester', randId, 100.00, new Date().toISOString()]
    );

    testUserToken = jwt.sign({ id: testUserId, username: randId }, JWT_SECRET, { expiresIn: '1h' });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  after(async () => {
    server?.close();
  });

  it('should handle "initialize" method with protocolVersion and capabilities', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 101,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'Antigravity', version: '2.0' }
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 101);
    assert.ok(res.body.result);
    assert.strictEqual(res.body.result.protocolVersion, '2024-11-05');
    assert.ok(res.body.result.capabilities.tools);
    assert.strictEqual(res.body.result.serverInfo.name, 'kyron-mcp-server');
  });

  it('should ignore notifications/initialized without returning a body (204 No Content)', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });

    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.body, null);
  });

  it('should handle "ping" method returning empty result object', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 102,
      method: 'ping'
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 102);
    assert.deepStrictEqual(res.body.result, {});
  });

  it('should respond to tools/list with all 6 registered MCP tools including ping', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 1);
    assert.ok(res.body.result);
    assert.ok(Array.isArray(res.body.result.tools));
    const toolNames = res.body.result.tools.map((t: any) => t.name);
    assert.ok(toolNames.includes('ping'));
    assert.ok(toolNames.includes('search_skills'));
    assert.ok(toolNames.includes('get_skill_details'));
    assert.ok(toolNames.includes('install_skill'));
    assert.ok(toolNames.includes('get_my_skills'));
    assert.ok(toolNames.includes('execute_skill_workflow'));
  });

  it('should call harmless read-only "ping" tool successfully', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 103,
      method: 'tools/call',
      params: {
        name: 'ping'
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 103);
    assert.ok(res.body.result);
    const parsed = JSON.parse(res.body.result.content[0].text);
    assert.strictEqual(parsed.status, 'pong');
    assert.strictEqual(parsed.server, 'kyron-mcp-server');
    assert.ok(parsed.tools_count >= 6);
  });

  it('should search skills via tools/call search_skills', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_skills',
        arguments: { query: 'SEO', limit: 3 }
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 2);
    assert.ok(res.body.result);
    assert.ok(res.body.result.content);
    const parsed = JSON.parse(res.body.result.content[0].text);
    assert.ok(parsed.skills.length > 0);
    assert.strictEqual(parsed.skills[0].slug, 'geo-seo-suite-ai-search-optimization');
    assert.strictEqual(parsed.skills[0].discount_percent, 33);
  });

  it('should return -32602 when search_skills is called with missing query', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 201,
      method: 'tools/call',
      params: {
        name: 'search_skills',
        arguments: {}
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 201);
    assert.strictEqual(res.body.error.code, -32602);
    assert.ok(res.body.error.message.includes('query'));
  });

  it('should retrieve skill details via tools/call get_skill_details', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_skill_details',
        arguments: { slug_or_id: 'geo-seo-suite-ai-search-optimization' }
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 3);
    const parsed = JSON.parse(res.body.result.content[0].text);
    assert.strictEqual(parsed.slug, 'geo-seo-suite-ai-search-optimization');
    assert.strictEqual(parsed.version, '1.1');
    assert.strictEqual(parsed.security_status, 'pass');
  });

  it('should require payment approval for paid skill via tools/call install_skill when unauthenticated', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'install_skill',
        arguments: { skill_id: 'geo-seo-suite-ai-search-optimization' }
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    const parsed = JSON.parse(res.body.result.content[0].text);
    assert.strictEqual(parsed.status, 'payment_approval_required');
    assert.ok(parsed.price_usd > 0);
  });

  it('should immediately install free skill via tools/call install_skill', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'install_skill',
        arguments: { skill_id: 'code-review-architecture-auditor' }
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    const parsed = JSON.parse(res.body.result.content[0].text);
    assert.strictEqual(parsed.status, 'installed');
    assert.ok(parsed.skill_instructions.includes('# Code Review Auditor'));
  });

  it('should purchase paid skill via tools/call install_skill using Authorization header', async () => {
    const res = await makeRpcRequest(
      server,
      {
        jsonrpc: '2.0',
        id: 104,
        method: 'tools/call',
        params: {
          name: 'install_skill',
          arguments: { skill_id: 'geo-seo-suite-ai-search-optimization' }
        }
      },
      {
        Authorization: `Bearer ${testUserToken}`
      }
    );

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 104);
    const parsed = JSON.parse(res.body.result.content[0].text);
    assert.strictEqual(parsed.status, 'installed');
    assert.ok(parsed.skill_instructions);

    // Verify balance deduction in DB
    const profile = await db.get('SELECT credit_balance FROM profiles WHERE id = ?', [testUserId]) as any;
    assert.ok(profile.credit_balance < 100);

    // Verify purchase record in DB
    const purchase = await db.get('SELECT * FROM user_purchases WHERE user_id = ? AND skill_id = ?', [testUserId, 'skl_geo_seo_suite']);
    assert.ok(purchase);
    assert.strictEqual(purchase.status, 'completed');
  });

  it('should return owned skills via tools/call get_my_skills with Authorization header', async () => {
    const res = await makeRpcRequest(
      server,
      {
        jsonrpc: '2.0',
        id: 105,
        method: 'tools/call',
        params: {
          name: 'get_my_skills',
          arguments: {}
        }
      },
      {
        Authorization: `Bearer ${testUserToken}`
      }
    );

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 105);
    const parsed = JSON.parse(res.body.result.content[0].text);
    assert.ok(Array.isArray(parsed.owned_skills));
    assert.ok(parsed.owned_skills.some((s: any) => s.slug === 'geo-seo-suite-ai-search-optimization'));
  });

  it('should prevent double deduction on duplicate installation of already-owned skill', async () => {
    const profileBefore = await db.get('SELECT credit_balance FROM profiles WHERE id = ?', [testUserId]) as any;

    const res = await makeRpcRequest(
      server,
      {
        jsonrpc: '2.0',
        id: 1042,
        method: 'tools/call',
        params: {
          name: 'install_skill',
          arguments: { skill_id: 'geo-seo-suite-ai-search-optimization' }
        }
      },
      {
        Authorization: `Bearer ${testUserToken}`
      }
    );

    assert.strictEqual(res.body.jsonrpc, '2.0');
    const parsed = JSON.parse(res.body.result.content[0].text);
    assert.strictEqual(parsed.status, 'installed');

    // Verify balance is completely unchanged on duplicate install
    const profileAfter = await db.get('SELECT credit_balance FROM profiles WHERE id = ?', [testUserId]) as any;
    assert.strictEqual(profileAfter.credit_balance, profileBefore.credit_balance);
  });

  it('should reject purchase when credit balance is insufficient (-32002)', async () => {
    const poorUserId = 'usr_poor_' + Date.now();
    await db.run(
      `INSERT INTO profiles (id, email, display_name, username, credit_balance, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [poorUserId, `${poorUserId}@kyron.dev`, 'Poor Tester', poorUserId, 1.00, new Date().toISOString()]
    );
    const poorToken = jwt.sign({ id: poorUserId, username: poorUserId }, JWT_SECRET, { expiresIn: '1h' });

    const res = await makeRpcRequest(
      server,
      {
        jsonrpc: '2.0',
        id: 1043,
        method: 'tools/call',
        params: {
          name: 'install_skill',
          arguments: { skill_id: 'stock-breakout-picker' } // Costs $10.00
        }
      },
      {
        Authorization: `Bearer ${poorToken}`
      }
    );

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.error.code, -32002);
    assert.ok(res.body.error.message.includes('Insufficient KYRON credits'));

    // Verify balance was untouched
    const poorProfile = await db.get('SELECT credit_balance FROM profiles WHERE id = ?', [poorUserId]) as any;
    assert.strictEqual(poorProfile.credit_balance, 1.00);
  });

  it('should rollback atomic transaction on error without balance deduction', async () => {
    const txUserId = 'usr_tx_rollback_' + Date.now();
    await db.run(
      `INSERT INTO profiles (id, email, display_name, username, credit_balance, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [txUserId, `${txUserId}@kyron.dev`, 'TX Tester', txUserId, 50.00, new Date().toISOString()]
    );

    await assert.rejects(async () => {
      await db.withTransaction(async (tx) => {
        await tx.run('UPDATE profiles SET credit_balance = credit_balance - 25.00 WHERE id = ?', [txUserId]);
        throw new Error('Simulated network partition or constraint failure');
      });
    }, /Simulated network partition/);

    // Verify rollback restored full balance
    const profile = await db.get('SELECT credit_balance FROM profiles WHERE id = ?', [txUserId]) as any;
    assert.strictEqual(profile.credit_balance, 50.00);
  });

  it('should reject get_my_skills with expired token', async () => {
    const expiredToken = jwt.sign({ id: testUserId, username: 'mcptester' }, JWT_SECRET, { expiresIn: '-1s' });
    const res = await makeRpcRequest(
      server,
      {
        jsonrpc: '2.0',
        id: 1044,
        method: 'tools/call',
        params: {
          name: 'get_my_skills',
          arguments: {}
        }
      },
      {
        Authorization: `Bearer ${expiredToken}`
      }
    );

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.error.code, -32003);
  });

  it('should reject get_my_skills with malformed signature token', async () => {
    const res = await makeRpcRequest(
      server,
      {
        jsonrpc: '2.0',
        id: 1045,
        method: 'tools/call',
        params: {
          name: 'get_my_skills',
          arguments: {}
        }
      },
      {
        Authorization: `Bearer invalid.signature.token`
      }
    );

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.error.code, -32003);
  });

  it('should reject get_my_skills when token is passed only in arguments without Authorization header', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 1046,
      method: 'tools/call',
      params: {
        name: 'get_my_skills',
        arguments: { auth_token: testUserToken }
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.error.code, -32003);
  });

  it('should require payment approval when install_skill has token in arguments without Authorization header', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 1047,
      method: 'tools/call',
      params: {
        name: 'install_skill',
        arguments: {
          skill_id: 'stock-breakout-picker',
          auth_token: testUserToken
        }
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    const parsed = JSON.parse(res.body.result.content[0].text);
    assert.strictEqual(parsed.status, 'payment_approval_required');
  });

  it('should return -32001 when execute_skill_workflow targets nonexistent skill_slug', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 1048,
      method: 'tools/call',
      params: {
        name: 'execute_skill_workflow',
        arguments: {
          command: '/unknown test',
          skill_slug: 'nonexistent-skill-slug-xyz'
        }
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.error.code, -32001);
  });

  it('should return unsupported_command when execute_skill_workflow runs unrecognized command prefix', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 1049,
      method: 'tools/call',
      params: {
        name: 'execute_skill_workflow',
        arguments: {
          command: '/unsupported_random_cmd --flag'
        }
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    const parsed = JSON.parse(res.body.result.content[0].text);
    assert.strictEqual(parsed.execution_status, 'unsupported_command');
    assert.ok(parsed.message.includes('does not match any registered skill playbook'));
  });

  it('should fail get_my_skills with -32003 when unauthenticated', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 106,
      method: 'tools/call',
      params: {
        name: 'get_my_skills',
        arguments: {}
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 106);
    assert.strictEqual(res.body.error.code, -32003);
  });

  it('should execute skill workflow via tools/call execute_skill_workflow with genuine bounds', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'execute_skill_workflow',
        arguments: { command: '/geo quick https://electron-srl.com', skill_slug: 'geo-seo-suite-ai-search-optimization' }
      }
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    const parsed = JSON.parse(res.body.result.content[0].text);
    assert.strictEqual(parsed.execution_status, 'completed');
    assert.strictEqual(parsed.command, '/geo quick https://electron-srl.com');
    assert.ok(parsed.execution_engine.includes('KYRON Playbook Parser'));
    assert.ok(parsed.execution_bounds);
    assert.strictEqual(parsed.execution_bounds.mode, 'deterministic_playbook_analysis');
  });

  it('should return -32601 for unsupported JSON-RPC methods', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 999,
      method: 'nonexistent/method'
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 999);
    assert.strictEqual(res.body.error.code, -32601);
  });

  it('should return -32600 for invalid jsonrpc version', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '1.0',
      id: 998,
      method: 'ping'
    });

    assert.strictEqual(res.body.jsonrpc, '2.0');
    assert.strictEqual(res.body.id, 998);
    assert.strictEqual(res.body.error.code, -32600);
  });

  it('should handle notification requests without IDs by returning 204 No Content with empty body', async () => {
    const address = server.address() as any;
    const postBody = JSON.stringify({
      jsonrpc: '2.0',
      method: 'ping'
    });

    const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: address.port,
          path: '/api/mcp',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postBody)
          }
        },
        response => {
          let body = '';
          response.on('data', chunk => { body += chunk.toString(); });
          response.on('end', () => resolve({ status: response.statusCode || 200, body }));
        }
      );
      req.on('error', reject);
      req.write(postBody);
      req.end();
    });

    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.body, '');
  });

  it('should prevent double-spending and negative balances on concurrent purchase attempts', async () => {
    const concurrentUserId = 'usr_concurrent_' + Date.now();
    await db.run(
      `INSERT INTO profiles (id, email, display_name, username, credit_balance, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [concurrentUserId, `${concurrentUserId}@kyron.dev`, 'Concurrent Tester', concurrentUserId, 10.00, new Date().toISOString()]
    );
    const concurrentToken = jwt.sign({ id: concurrentUserId, username: concurrentUserId }, JWT_SECRET, { expiresIn: '1h' });

    // Attempt to concurrently purchase two different $10 skills with only $10 total balance
    const [res1, res2] = await Promise.all([
      makeRpcRequest(
        server,
        {
          jsonrpc: '2.0',
          id: 1101,
          method: 'tools/call',
          params: {
            name: 'install_skill',
            arguments: { skill_id: 'stock-breakout-picker' }
          }
        },
        { Authorization: `Bearer ${concurrentToken}` }
      ),
      makeRpcRequest(
        server,
        {
          jsonrpc: '2.0',
          id: 1102,
          method: 'tools/call',
          params: {
            name: 'install_skill',
            arguments: { skill_id: 'sec-filing-financial-synthesis-mcp' }
          }
        },
        { Authorization: `Bearer ${concurrentToken}` }
      )
    ]);

    const results = [res1.body, res2.body];
    const successes = results.filter(r => r.result && JSON.parse(r.result.content[0].text).status === 'installed');
    const failures = results.filter(r => r.error && r.error.code === -32002);

    assert.strictEqual(successes.length, 1, 'Exactly one concurrent purchase must succeed');
    assert.strictEqual(failures.length, 1, 'Exactly one concurrent purchase must fail due to insufficient funds');

    // Verify balance never went negative and is exactly $0.00
    const profile = await db.get('SELECT credit_balance FROM profiles WHERE id = ?', [concurrentUserId]) as any;
    assert.strictEqual(profile.credit_balance, 0.00);

    // Verify exactly one purchase record was created
    const purchases = await db.all('SELECT * FROM user_purchases WHERE user_id = ?', [concurrentUserId]);
    assert.strictEqual(purchases.length, 1);
  });

  it('should establish SSE connection and receive endpoint event', async () => {
    const address = server.address() as any;
    const endpointEventPromise = new Promise<{ endpoint: string; req: http.ClientRequest }>((resolve, reject) => {
      const sseReq = http.request(
        {
          hostname: 'localhost',
          port: address.port,
          path: '/api/mcp/sse',
          method: 'GET',
          headers: {
            Accept: 'text/event-stream'
          }
        },
        sseRes => {
          let buffer = '';
          sseRes.on('data', chunk => {
            buffer += chunk.toString();
            if (buffer.includes('event: endpoint\ndata: ')) {
              const lines = buffer.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const endpoint = line.substring(6).trim();
                  resolve({ endpoint, req: sseReq });
                  return;
                }
              }
            }
          });
        }
      );
      sseReq.on('error', reject);
      sseReq.end();
    });

    const { endpoint, req: sseReq } = await endpointEventPromise;
    assert.ok(endpoint.includes('/api/mcp/messages?sessionId='));

    // Post message to the returned endpoint
    const postBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 501,
      method: 'ping'
    });

    const postPromise = new Promise<{ status: number }>((resolve, reject) => {
      const postReq = http.request(
        {
          hostname: 'localhost',
          port: address.port,
          path: endpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postBody)
          }
        },
        postRes => {
          resolve({ status: postRes.statusCode || 200 });
        }
      );
      postReq.on('error', reject);
      postReq.write(postBody);
      postReq.end();
    });

    const postRes = await postPromise;
    assert.strictEqual(postRes.status, 202);

    sseReq.destroy();
  });
});

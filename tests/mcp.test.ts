process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { app } from '../server/index.ts';
import http from 'node:http';

function makeRpcRequest(server: http.Server, payload: object): Promise<any> {
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
          'Content-Length': Buffer.byteLength(bodyStr)
        }
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(e);
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

  it('should start test server', () => {
    server = app.listen(0);
  });

  it('should respond to tools/list with all 5 registered MCP tools', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    });

    assert.strictEqual(res.jsonrpc, '2.0');
    assert.strictEqual(res.id, 1);
    assert.ok(res.result);
    assert.ok(Array.isArray(res.result.tools));
    const toolNames = res.result.tools.map((t: any) => t.name);
    assert.ok(toolNames.includes('search_skills'));
    assert.ok(toolNames.includes('get_skill_details'));
    assert.ok(toolNames.includes('install_skill'));
    assert.ok(toolNames.includes('get_my_skills'));
    assert.ok(toolNames.includes('execute_skill_workflow'));
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

    assert.strictEqual(res.jsonrpc, '2.0');
    assert.strictEqual(res.id, 2);
    assert.ok(res.result);
    assert.ok(res.result.content);
    const parsed = JSON.parse(res.result.content[0].text);
    assert.ok(parsed.skills.length > 0);
    assert.strictEqual(parsed.skills[0].slug, 'geo-seo-suite-ai-search-optimization');
    assert.strictEqual(parsed.skills[0].discount_percent, 33);
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

    assert.strictEqual(res.jsonrpc, '2.0');
    assert.strictEqual(res.id, 3);
    const parsed = JSON.parse(res.result.content[0].text);
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

    assert.strictEqual(res.jsonrpc, '2.0');
    const parsed = JSON.parse(res.result.content[0].text);
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

    assert.strictEqual(res.jsonrpc, '2.0');
    const parsed = JSON.parse(res.result.content[0].text);
    assert.strictEqual(parsed.status, 'installed');
    assert.ok(parsed.skill_instructions.includes('# Code Review Auditor'));
  });

  it('should execute skill workflow via tools/call execute_skill_workflow', async () => {
    const res = await makeRpcRequest(server, {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'execute_skill_workflow',
        arguments: { command: '/geo quick https://electron-srl.com', skill_slug: 'geo-seo-suite-ai-search-optimization' }
      }
    });

    assert.strictEqual(res.jsonrpc, '2.0');
    const parsed = JSON.parse(res.result.content[0].text);
    assert.strictEqual(parsed.execution_status, 'completed');
    assert.strictEqual(parsed.command, '/geo quick https://electron-srl.com');
  });

  it('should close test server', () => {
    server.close();
  });
});

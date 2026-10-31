#!/usr/bin/env node
import readline from 'node:readline';
import { initDatabase } from './db/database.ts';
import { processMcpMessage, extractUserFromToken } from './routes/mcp.ts';

async function main() {
  await initDatabase();

  const token = process.env.KYRON_AUTH_TOKEN || process.env.KYRON_API_KEY || null;
  const user = extractUserFromToken(token);

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let msg: any;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error: Invalid JSON' }
        }) + '\n'
      );
      return;
    }

    try {
      const { response, isNotification } = await processMcpMessage(msg, {
        user,
        reqHeaders: {
          authorization: token ? `Bearer ${token}` : undefined
        }
      });

      if (!isNotification && response) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (err: any) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg?.id ?? null,
          error: { code: -32603, message: err.message || 'Internal MCP processing error' }
        }) + '\n'
      );
    }
  });

  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}

main().catch((err) => {
  process.stderr.write(`KYRON MCP Stdio Bridge error: ${err.message}\n`);
  process.exit(1);
});

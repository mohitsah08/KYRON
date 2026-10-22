import { app } from './app.ts';
import { initDatabase } from './db/database.ts';

const PORT = process.env.PORT || 3000;

let serverInstance: any = null;

// Initialize DB schema asynchronously
initDatabase().then(() => {
  if (process.env.NODE_ENV !== 'test' && !process.env.TEST_MODE && !process.env.VERCEL) {
    serverInstance = app.listen(PORT, () => {
      console.log(`KYRON Server listening on http://localhost:${PORT}`);
      console.log(`MCP Endpoint active on http://localhost:${PORT}/api/mcp and /mcp`);
    });
  }
}).catch(err => {
  console.error('Database initialization failed:', err);
});

export { app, serverInstance };
export default app;

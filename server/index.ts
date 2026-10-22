import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { initDatabase } from './db/database.ts';

import skillsRouter from './routes/skills.ts';
import votesRouter from './routes/votes.ts';
import purchasesRouter from './routes/purchases.ts';
import creatorRouter from './routes/creator.ts';
import authRouter from './routes/auth.ts';
import mcpRouter from './routes/mcp.ts';

// Initialize DB schema
initDatabase();

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'KYRON AI Agent Skill Gateway',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/skills', skillsRouter);
app.use('/api', votesRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/credits', purchasesRouter);
app.use('/api/creator', creatorRouter);
app.use('/api/auth', authRouter);

// Model Context Protocol (MCP) endpoints
app.use('/api/mcp', mcpRouter);
app.use('/mcp', mcpRouter);

// Serve built frontend assets in production
const distClientPath = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(distClientPath)) {
  app.use(express.static(distClientPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distClientPath, 'index.html'));
  });
}

let serverInstance: any = null;
if (process.env.NODE_ENV !== 'test' && !process.env.TEST_MODE) {
  serverInstance = app.listen(PORT, () => {
    console.log(`KYRON Server listening on http://localhost:${PORT}`);
    console.log(`MCP Endpoint active on http://localhost:${PORT}/api/mcp and /mcp`);
  });
}
export { serverInstance };


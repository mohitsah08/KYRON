import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';

import skillsRouter from './routes/skills.ts';
import votesRouter from './routes/votes.ts';
import purchasesRouter from './routes/purchases.ts';
import creatorRouter from './routes/creator.ts';
import authRouter from './routes/auth.ts';
import mcpRouter from './routes/mcp.ts';

export const app = express();

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

app.get('/health', (_req, res) => {
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

// Serve built frontend assets in standalone production mode
const distClientPath = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(distClientPath)) {
  app.use(express.static(distClientPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/mcp')) {
      return next();
    }
    res.sendFile(path.join(distClientPath, 'index.html'));
  });
}

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

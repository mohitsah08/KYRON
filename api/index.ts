import { app } from '../server/app.ts';
import { initDatabase } from '../server/db/database.ts';

let initialized = false;

export default async function handler(req: any, res: any) {
  if (!initialized) {
    try {
      await initDatabase();
    } catch (err: any) {
      console.warn('Database initialization notice in serverless handler:', err.message);
    }
    initialized = true;
  }
  return app(req, res);
}

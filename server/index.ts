import dotenv from 'dotenv';
import fs from 'node:fs';

if (process.env.NODE_ENV !== 'test' && !process.env.TEST_MODE) {
  if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
  }
  dotenv.config();
}

import { app } from './app.ts';
import { initDatabase } from './db/database.ts';

const PORT = process.env.PORT || 3000;

let serverInstance: any = null;

// Initialize DB schema asynchronously
initDatabase().then(() => {
  if (process.env.NODE_ENV !== 'test' && !process.env.TEST_MODE && !process.env.VERCEL) {
    serverInstance = app.listen(PORT, () => {
      console.log(`KYRON AI Skills Marketplace listening on http://localhost:${PORT}`);
    });
  }
}).catch(err => {
  console.error('Database initialization failed:', err);
});

export { app, serverInstance };
export default app;

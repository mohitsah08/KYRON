import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test' && !process.env.TEST_MODE) {
  if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
  }
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool, types } = pg;

// Parse PostgreSQL numeric types (oid 1700) as floats
types.setTypeParser(1700, val => (val === null ? null : parseFloat(val)));

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

export interface DatabaseExecutor {
  get<T = any>(sql: string, params?: any | any[]): Promise<T | null>;
  all<T = any>(sql: string, params?: any | any[]): Promise<T[]>;
  run(sql: string, params?: any | any[]): Promise<{ changes: number; lastInsertRowid?: any }>;
  exec(sql: string): Promise<void>;
}

export function translateSqlForPostgres(sql: string): string {
  let paramIndex = 1;
  let inString = false;
  let quoteChar = '';
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if ((char === "'" || char === '"') && (i === 0 || sql[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inString = false;
      }
      result += char;
    } else if (char === '?' && !inString) {
      result += `$${paramIndex++}`;
    } else {
      result += char;
    }
  }

  return result;
}

export class AsyncMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}

class UniversalDatabase {
  public isPostgres: boolean;
  private pool: pg.Pool | null = null;
  private sqlite: DatabaseSync | null = null;
  private txMutex = new AsyncMutex();

  constructor() {
    this.isPostgres = process.env.NODE_ENV !== 'test' && !process.env.TEST_MODE && !!process.env.DATABASE_URL && process.env.USE_SQLITE !== 'true';

    if (this.isPostgres) {
      const connectionString = process.env.DATABASE_URL!;
      const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

      this.pool = new Pool({
        connectionString,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });

      this.pool.on('error', (err) => {
        console.error('Unexpected PostgreSQL pool error:', err.message);
      });
    } else {
      const DB_PATH = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data/kyron.sqlite');
      const dbDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.sqlite = new DatabaseSync(DB_PATH);
      this.sqlite.exec('PRAGMA journal_mode = WAL;');
      this.sqlite.exec('PRAGMA foreign_keys = ON;');
      this.sqlite.exec('PRAGMA busy_timeout = 5000;');
    }
  }

  private normalizeParams(params?: any | any[]): any[] {
    if (params === undefined || params === null) return [];
    const list = Array.isArray(params) ? params : [params];
    return list.map(v => (v === undefined ? null : v));
  }

  async get<T = any>(sql: string, params?: any | any[]): Promise<T | null> {
    const norm = this.normalizeParams(params);
    if (this.isPostgres) {
      const pgSql = translateSqlForPostgres(sql);
      const res = await this.pool!.query(pgSql, norm);
      return (res.rows[0] as T) || null;
    } else {
      const stmt = this.sqlite!.prepare(sql);
      const row = stmt.get(...norm);
      return (row as T) || null;
    }
  }

  async all<T = any>(sql: string, params?: any | any[]): Promise<T[]> {
    const norm = this.normalizeParams(params);
    if (this.isPostgres) {
      const pgSql = translateSqlForPostgres(sql);
      const res = await this.pool!.query(pgSql, norm);
      return res.rows as T[];
    } else {
      const stmt = this.sqlite!.prepare(sql);
      return stmt.all(...norm) as T[];
    }
  }

  async run(sql: string, params?: any | any[]): Promise<{ changes: number; lastInsertRowid?: any }> {
    const norm = this.normalizeParams(params);
    if (this.isPostgres) {
      const pgSql = translateSqlForPostgres(sql);
      const res = await this.pool!.query(pgSql, norm);
      return { changes: res.rowCount || 0 };
    } else {
      const stmt = this.sqlite!.prepare(sql);
      const res = stmt.run(...norm);
      return { changes: res.changes, lastInsertRowid: res.lastInsertRowid };
    }
  }

  async exec(sql: string): Promise<void> {
    if (this.isPostgres) {
      await this.pool!.query(sql);
    } else {
      this.sqlite!.exec(sql);
    }
  }

  async withTransaction<T>(callback: (tx: DatabaseExecutor) => Promise<T>): Promise<T> {
    const unlock = await this.txMutex.acquire();
    try {
      if (this.isPostgres) {
        const client = await this.pool!.connect();
        try {
          await client.query('BEGIN');
          const txExecutor: DatabaseExecutor = {
            get: async <R = any>(sql: string, params?: any | any[]): Promise<R | null> => {
              const norm = this.normalizeParams(params);
              const pgSql = translateSqlForPostgres(sql);
              const res = await client.query(pgSql, norm);
              return (res.rows[0] as R) || null;
            },
            all: async <R = any>(sql: string, params?: any | any[]): Promise<R[]> => {
              const norm = this.normalizeParams(params);
              const pgSql = translateSqlForPostgres(sql);
              const res = await client.query(pgSql, norm);
              return res.rows as R[];
            },
            run: async (sql: string, params?: any | any[]): Promise<{ changes: number; lastInsertRowid?: any }> => {
              const norm = this.normalizeParams(params);
              const pgSql = translateSqlForPostgres(sql);
              const res = await client.query(pgSql, norm);
              return { changes: res.rowCount || 0 };
            },
            exec: async (sql: string): Promise<void> => {
              await client.query(sql);
            }
          };
          const result = await callback(txExecutor);
          await client.query('COMMIT');
          return result;
        } catch (err) {
          try { await client.query('ROLLBACK'); } catch {}
          throw err;
        } finally {
          client.release();
        }
      } else {
        this.sqlite!.exec('BEGIN IMMEDIATE;');
        try {
          const result = await callback(this);
          this.sqlite!.exec('COMMIT;');
          return result;
        } catch (err) {
          try { this.sqlite!.exec('ROLLBACK;'); } catch {}
          throw err;
        }
      }
    } finally {
      unlock();
    }
  }

  prepare(sql: string) {
    return {
      get: async (...args: any[]) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return this.get(sql, params);
      },
      all: async (...args: any[]) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return this.all(sql, params);
      },
      run: async (...args: any[]) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return this.run(sql, params);
      }
    };
  }

  async initDatabase(): Promise<void> {
    if (this.isPostgres) {
      const schemaPath = path.resolve(__dirname, 'schema.postgres.sql');
      if (fs.existsSync(schemaPath)) {
        try {
          const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
          await this.exec(schemaSql);
        } catch (err: any) {
          console.warn('PostgreSQL schema initialization note:', err.message);
        }
      }
    } else {
      const schemaPath = path.resolve(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        this.sqlite!.exec(schemaSql);
      }
      try {
        const tableDef = this.sqlite!.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='skills'").get() as any;
        if (tableDef && tableDef.sql && !tableDef.sql.includes('submitted')) {
          this.sqlite!.exec(`
            PRAGMA foreign_keys=off;
            CREATE TABLE IF NOT EXISTS skills_mig_bak AS SELECT * FROM skills;
            DROP TABLE skills;
          `);
          const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
          this.sqlite!.exec(schemaSql);
          this.sqlite!.exec(`
            INSERT INTO skills (
              id, name, slug, summary, description, category, tags, logo_url,
              pricing_type, price, subscription_price_monthly, compatibility_type,
              current_version, creator_id, security_status, status, visibility,
              rejection_feedback, install_count, view_count, net_votes, average_rating,
              review_count, package_tree, session_preview, license, created_at
            )
            SELECT 
              id, name, slug, summary, description, category, tags, logo_url,
              pricing_type, price, subscription_price_monthly, compatibility_type,
              current_version, creator_id, security_status, status,
              'public', NULL, install_count, view_count,
              net_votes, average_rating, review_count, package_tree, session_preview,
              'MIT', created_at
            FROM skills_mig_bak;
            DROP TABLE skills_mig_bak;
            PRAGMA foreign_keys=on;
          `);
        }
      } catch (err: any) {
        console.warn('SQLite skills schema upgrade note:', err.message);
      }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN full_name TEXT;'); } catch { }
      try { this.sqlite!.exec("ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';"); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN updated_at TEXT;'); } catch { }
      try { this.sqlite!.exec("ALTER TABLE skills ADD COLUMN license TEXT DEFAULT 'MIT';"); } catch { }
      try { this.sqlite!.exec("ALTER TABLE skill_packages ADD COLUMN storage_path TEXT;"); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN website_url TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN onboarding_completed INTEGER DEFAULT 0;'); } catch { }
      try { this.sqlite!.exec("ALTER TABLE skills ADD COLUMN visibility TEXT DEFAULT 'public';"); } catch { }
      try { this.sqlite!.exec('ALTER TABLE skills ADD COLUMN rejection_feedback TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN first_name TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN last_name TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN cover_image_url TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN location TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN phone TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN social_links TEXT;'); } catch { }

      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_mode_enabled INTEGER DEFAULT 0;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_display_name TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_avatar_url TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_cover_image_url TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_headline TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_bio TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_skills TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_categories TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_portfolio TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_links TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_verified INTEGER DEFAULT 0;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN creator_storefront_slug TEXT;'); } catch { }

      try { this.sqlite!.exec("ALTER TABLE profiles ADD COLUMN role_type TEXT DEFAULT 'individual';"); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN professional_title TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN skills_expertise TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN years_experience INTEGER DEFAULT 0;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN portfolio_items TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN services_offered TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN agency_name TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN agency_logo_url TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN agency_description TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN agency_website TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN agency_team_size TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN agency_designation TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN agency_permissions TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN company_name TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN company_industry TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN company_size TEXT;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN hiring_preferences TEXT;'); } catch { }

      try { this.sqlite!.exec("ALTER TABLE profiles ADD COLUMN theme_preference TEXT DEFAULT 'system';"); } catch { }
      try { this.sqlite!.exec("ALTER TABLE profiles ADD COLUMN language TEXT DEFAULT 'en';"); } catch { }
      try { this.sqlite!.exec("ALTER TABLE profiles ADD COLUMN timezone TEXT DEFAULT 'UTC';"); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN notification_preferences TEXT;'); } catch { }
      try { this.sqlite!.exec("ALTER TABLE profiles ADD COLUMN profile_visibility TEXT DEFAULT 'public';"); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN discoverability INTEGER DEFAULT 1;'); } catch { }
      try { this.sqlite!.exec("ALTER TABLE profiles ADD COLUMN messaging_preference TEXT DEFAULT 'anyone';"); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN is_deactivated INTEGER DEFAULT 0;'); } catch { }
      try { this.sqlite!.exec('ALTER TABLE profiles ADD COLUMN deactivated_at TEXT;'); } catch { }

      try {
        this.sqlite!.exec(`
          CREATE TABLE IF NOT EXISTS oauth_accounts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            provider TEXT NOT NULL,
            provider_user_id TEXT NOT NULL,
            email TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(provider, provider_user_id)
          );
          CREATE TABLE IF NOT EXISTS login_activity (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            ip_address TEXT,
            user_agent TEXT,
            device_type TEXT,
            location TEXT,
            logged_in_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS active_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            token_hash TEXT,
            device_name TEXT,
            ip_address TEXT,
            last_active TEXT NOT NULL,
            is_current INTEGER DEFAULT 0
          );
          CREATE TABLE IF NOT EXISTS auth_email_rate_limits (
            id TEXT PRIMARY KEY,
            email_hash TEXT NOT NULL,
            action TEXT NOT NULL,
            ip_address TEXT,
            outcome TEXT NOT NULL,
            created_at TEXT NOT NULL,
            created_at_ms INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_rate_limits_email_action ON auth_email_rate_limits(email_hash, action, created_at_ms);
          CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON auth_email_rate_limits(ip_address, created_at_ms);
        `);
      } catch { }
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
    if (this.sqlite) {
      this.sqlite.close();
    }
  }
}

export const db = new UniversalDatabase();

export async function initDatabase(): Promise<void> {
  await db.initDatabase();
}

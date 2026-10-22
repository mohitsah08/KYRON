import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool, types } = pg;

// Parse PostgreSQL numeric types (oid 1700) as floats
types.setTypeParser(1700, val => (val === null ? null : parseFloat(val)));

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
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

class UniversalDatabase {
  public isPostgres: boolean;
  private pool: pg.Pool | null = null;
  private sqlite: DatabaseSync | null = null;

  constructor() {
    this.isPostgres = !!process.env.DATABASE_URL;

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
    if (Array.isArray(params)) return params;
    return [params];
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
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        await this.exec(schemaSql);
      }
    } else {
      const schemaPath = path.resolve(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        this.sqlite!.exec(schemaSql);
      }
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

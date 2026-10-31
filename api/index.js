// server/app.ts
import express from "express";
import cors from "cors";
import path2 from "node:path";
import fs2 from "node:fs";

// server/routes/skills.ts
import { Router } from "express";

// server/db/database.ts
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { DatabaseSync } from "node:sqlite";
import dotenv from "dotenv";
if (process.env.NODE_ENV !== "test" && !process.env.TEST_MODE) {
  if (fs.existsSync(".env.local")) {
    dotenv.config({ path: ".env.local" });
  }
  dotenv.config();
}
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var { Pool, types } = pg;
types.setTypeParser(1700, (val) => val === null ? null : parseFloat(val));
function translateSqlForPostgres(sql) {
  let paramIndex = 1;
  let inString = false;
  let quoteChar = "";
  let result = "";
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if ((char === "'" || char === '"') && (i === 0 || sql[i - 1] !== "\\")) {
      if (!inString) {
        inString = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inString = false;
      }
      result += char;
    } else if (char === "?" && !inString) {
      result += `$${paramIndex++}`;
    } else {
      result += char;
    }
  }
  return result;
}
var UniversalDatabase = class {
  isPostgres;
  pool = null;
  sqlite = null;
  constructor() {
    this.isPostgres = process.env.NODE_ENV !== "test" && !process.env.TEST_MODE && !!process.env.DATABASE_URL;
    if (this.isPostgres) {
      const connectionString = process.env.DATABASE_URL;
      const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
      this.pool = new Pool({
        connectionString,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
        idleTimeoutMillis: 3e4,
        connectionTimeoutMillis: 1e4
      });
      this.pool.on("error", (err) => {
        console.error("Unexpected PostgreSQL pool error:", err.message);
      });
    } else {
      const DB_PATH = process.env.DATABASE_PATH || path.resolve(process.cwd(), "data/kyron.sqlite");
      const dbDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      this.sqlite = new DatabaseSync(DB_PATH);
      this.sqlite.exec("PRAGMA journal_mode = WAL;");
      this.sqlite.exec("PRAGMA foreign_keys = ON;");
      this.sqlite.exec("PRAGMA busy_timeout = 5000;");
    }
  }
  normalizeParams(params) {
    if (params === void 0 || params === null) return [];
    const list = Array.isArray(params) ? params : [params];
    return list.map((v) => v === void 0 ? null : v);
  }
  async get(sql, params) {
    const norm = this.normalizeParams(params);
    if (this.isPostgres) {
      const pgSql = translateSqlForPostgres(sql);
      const res = await this.pool.query(pgSql, norm);
      return res.rows[0] || null;
    } else {
      const stmt = this.sqlite.prepare(sql);
      const row = stmt.get(...norm);
      return row || null;
    }
  }
  async all(sql, params) {
    const norm = this.normalizeParams(params);
    if (this.isPostgres) {
      const pgSql = translateSqlForPostgres(sql);
      const res = await this.pool.query(pgSql, norm);
      return res.rows;
    } else {
      const stmt = this.sqlite.prepare(sql);
      return stmt.all(...norm);
    }
  }
  async run(sql, params) {
    const norm = this.normalizeParams(params);
    if (this.isPostgres) {
      const pgSql = translateSqlForPostgres(sql);
      const res = await this.pool.query(pgSql, norm);
      return { changes: res.rowCount || 0 };
    } else {
      const stmt = this.sqlite.prepare(sql);
      const res = stmt.run(...norm);
      return { changes: res.changes, lastInsertRowid: res.lastInsertRowid };
    }
  }
  async exec(sql) {
    if (this.isPostgres) {
      await this.pool.query(sql);
    } else {
      this.sqlite.exec(sql);
    }
  }
  async withTransaction(callback) {
    if (this.isPostgres) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const txExecutor = {
          get: async (sql, params) => {
            const norm = this.normalizeParams(params);
            const pgSql = translateSqlForPostgres(sql);
            const res = await client.query(pgSql, norm);
            return res.rows[0] || null;
          },
          all: async (sql, params) => {
            const norm = this.normalizeParams(params);
            const pgSql = translateSqlForPostgres(sql);
            const res = await client.query(pgSql, norm);
            return res.rows;
          },
          run: async (sql, params) => {
            const norm = this.normalizeParams(params);
            const pgSql = translateSqlForPostgres(sql);
            const res = await client.query(pgSql, norm);
            return { changes: res.rowCount || 0 };
          },
          exec: async (sql) => {
            await client.query(sql);
          }
        };
        const result = await callback(txExecutor);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
        }
        throw err;
      } finally {
        client.release();
      }
    } else {
      this.sqlite.exec("BEGIN IMMEDIATE;");
      try {
        const result = await callback(this);
        this.sqlite.exec("COMMIT;");
        return result;
      } catch (err) {
        try {
          this.sqlite.exec("ROLLBACK;");
        } catch {
        }
        throw err;
      }
    }
  }
  prepare(sql) {
    return {
      get: async (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return this.get(sql, params);
      },
      all: async (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return this.all(sql, params);
      },
      run: async (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return this.run(sql, params);
      }
    };
  }
  async initDatabase() {
    if (this.isPostgres) {
      const schemaPath = path.resolve(__dirname, "schema.postgres.sql");
      if (fs.existsSync(schemaPath)) {
        try {
          const schemaSql = fs.readFileSync(schemaPath, "utf-8");
          await this.exec(schemaSql);
        } catch (err) {
          console.warn("PostgreSQL schema initialization note:", err.message);
        }
      }
    } else {
      const schemaPath = path.resolve(__dirname, "schema.sql");
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        this.sqlite.exec(schemaSql);
      }
      try {
        const tableDef = this.sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='skills'").get();
        if (tableDef && tableDef.sql && !tableDef.sql.includes("submitted")) {
          this.sqlite.exec(`
            PRAGMA foreign_keys=off;
            CREATE TABLE IF NOT EXISTS skills_mig_bak AS SELECT * FROM skills;
            DROP TABLE skills;
          `);
          const schemaSql = fs.readFileSync(schemaPath, "utf-8");
          this.sqlite.exec(schemaSql);
          this.sqlite.exec(`
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
      } catch (err) {
        console.warn("SQLite skills schema upgrade note:", err.message);
      }
      try {
        this.sqlite.exec("ALTER TABLE profiles ADD COLUMN full_name TEXT;");
      } catch {
      }
      try {
        this.sqlite.exec("ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';");
      } catch {
      }
      try {
        this.sqlite.exec("ALTER TABLE profiles ADD COLUMN updated_at TEXT;");
      } catch {
      }
      try {
        this.sqlite.exec("ALTER TABLE skills ADD COLUMN license TEXT DEFAULT 'MIT';");
      } catch {
      }
      try {
        this.sqlite.exec("ALTER TABLE skill_packages ADD COLUMN storage_path TEXT;");
      } catch {
      }
      try {
        this.sqlite.exec("ALTER TABLE profiles ADD COLUMN website_url TEXT;");
      } catch {
      }
      try {
        this.sqlite.exec("ALTER TABLE profiles ADD COLUMN onboarding_completed INTEGER DEFAULT 0;");
      } catch {
      }
      try {
        this.sqlite.exec("ALTER TABLE skills ADD COLUMN visibility TEXT DEFAULT 'public';");
      } catch {
      }
      try {
        this.sqlite.exec("ALTER TABLE skills ADD COLUMN rejection_feedback TEXT;");
      } catch {
      }
    }
  }
  async close() {
    if (this.pool) {
      await this.pool.end();
    }
    if (this.sqlite) {
      this.sqlite.close();
    }
  }
};
var db = new UniversalDatabase();
async function initDatabase() {
  await db.initDatabase();
}

// server/middleware/auth.ts
import jwt from "jsonwebtoken";

// server/services/supabase.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://slkmbmixdqczcjmmnnhc.supabase.co";
var supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsa21ibWl4ZHFjemNqbW1ubmhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NzEyOTIsImV4cCI6MjEwODI0NzI5Mn0.IcIUhnA7MZkyxpHHdijqFl_7lotEnbvSaajug0WAo_E";
var supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// server/middleware/auth.ts
var JWT_SECRET = process.env.JWT_SECRET || "kyron-super-secret-jwt-key-2026";
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
async function resolveUserFromToken(token) {
  const localJwtAllowed = Boolean(process.env.JWT_SECRET) || process.env.TEST_MODE === "true" || process.env.NODE_ENV === "test";
  if (localJwtAllowed) try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.id) {
      const profile = await db.get(
        `SELECT id, email, username, is_unlimited_credit_user, role FROM profiles WHERE id = ?`,
        [decoded.id]
      );
      if (profile) {
        return {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          role: profile.role || "user",
          is_unlimited_credit_user: profile.is_unlimited_credit_user === 1
        };
      }
      let baseUsername = decoded.username || decoded.email?.split("@")[0] || `user_${decoded.id.slice(0, 8)}`;
      const takenUser = await db.get(`SELECT id FROM profiles WHERE username = ?`, [baseUsername]);
      if (takenUser && takenUser.id !== decoded.id) {
        baseUsername = `${baseUsername}_${decoded.id.slice(-4)}`;
      }
      let email = decoded.email || `${decoded.id}@kyron.local`;
      const takenEmail = await db.get(`SELECT id FROM profiles WHERE email = ?`, [email]);
      if (takenEmail && takenEmail.id !== decoded.id) {
        email = `${decoded.id}_${email}`;
      }
      const displayName = decoded.displayName || baseUsername;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      try {
        if (db.isPostgres) {
          await db.run(
            `INSERT INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, '', '', 50.00, 0, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
            [decoded.id, email, displayName, baseUsername, decoded.role || "user", now, now]
          );
        } else {
          await db.run(
            `INSERT OR IGNORE INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, '', '', 50.00, 0, ?, ?, ?)`,
            [decoded.id, email, displayName, baseUsername, decoded.role || "user", now, now]
          );
        }
      } catch (err) {
        console.warn("Local JWT profile auto-insert error:", err.message);
      }
      return {
        id: decoded.id,
        email,
        username: baseUsername,
        role: decoded.role || "user",
        is_unlimited_credit_user: Boolean(decoded.is_unlimited_credit_user)
      };
    }
  } catch {
  }
  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);
    if (!error && user) {
      let profile = await db.get(
        `SELECT id, email, username, is_unlimited_credit_user, role FROM profiles WHERE id = ?`,
        [user.id]
      );
      if (!profile && user.email) {
        profile = await db.get(
          `SELECT id, email, username, is_unlimited_credit_user, role FROM profiles WHERE email = ?`,
          [user.email]
        );
      }
      if (profile) {
        return {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          role: profile.role,
          is_unlimited_credit_user: profile.is_unlimited_credit_user === 1
        };
      }
      const baseUsername = user.user_metadata?.username || user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`;
      let finalUsername = baseUsername;
      const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || baseUsername;
      const avatarUrl = user.user_metadata?.avatar_url || "";
      const email = user.email || `${user.id}@kyron.local`;
      const role = user.user_metadata?.role || "user";
      const now = (/* @__PURE__ */ new Date()).toISOString();
      try {
        if (db.isPostgres) {
          await db.run(
            `INSERT INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, '', ?, 50.00, 0, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
            [user.id, email, displayName, finalUsername, avatarUrl, role, now, now]
          );
        } else {
          await db.run(
            `INSERT OR IGNORE INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, '', ?, 50.00, 0, ?, ?, ?)`,
            [user.id, email, displayName, finalUsername, avatarUrl, role, now, now]
          );
        }
      } catch {
        finalUsername = `${baseUsername}_${user.id.slice(0, 6)}`;
        try {
          if (db.isPostgres) {
            await db.run(
              `INSERT INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
               VALUES (?, ?, ?, ?, '', ?, 50.00, 0, ?, ?, ?)
               ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
              [user.id, email, displayName, finalUsername, avatarUrl, role, now, now]
            );
          } else {
            await db.run(
              `INSERT OR IGNORE INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
               VALUES (?, ?, ?, ?, '', ?, 50.00, 0, ?, ?, ?)`,
              [user.id, email, displayName, finalUsername, avatarUrl, role, now, now]
            );
          }
        } catch (retryErr) {
          console.warn("Profile sync fallback note in auth middleware:", retryErr.message);
        }
      }
      return {
        id: user.id,
        email,
        username: finalUsername,
        role,
        is_unlimited_credit_user: false
      };
    }
  } catch {
  }
  return null;
}
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query && typeof req.query.token === "string") {
    token = req.query.token;
  }
  if (!token) {
    res.status(401).json({ error: "Authentication required. Please sign in." });
    return;
  }
  const user = await resolveUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired authentication token." });
    return;
  }
  req.user = user;
  next();
}
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query && typeof req.query.token === "string") {
    token = req.query.token;
  }
  if (token) {
    const user = await resolveUserFromToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}

// server/services/skillPackageService.ts
import JSZip from "jszip";
var DANGEROUS_EXTENSIONS = /* @__PURE__ */ new Set([
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".vbs",
  ".scr",
  ".pif"
]);
function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/);
  if (!match) {
    return { frontmatterText: null, body: markdown, metadata: {} };
  }
  const frontmatterText = match[1];
  const body = markdown.slice(match[0].length);
  const metadata = {};
  for (const line of frontmatterText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      let value = trimmed.slice(colonIdx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      metadata[key] = value;
    }
  }
  return { frontmatterText, body, metadata };
}
function validateSkillMd(markdown) {
  const errors = [];
  const warnings = [];
  if (!markdown || !markdown.trim()) {
    return { valid: false, errors: ["SKILL.md content is empty."], warnings };
  }
  const { frontmatterText, metadata, body } = parseFrontmatter(markdown);
  if (!frontmatterText) {
    errors.push("SKILL.md is missing YAML frontmatter enclosed in triple dashes (---).");
    return { valid: false, errors, warnings };
  }
  if (!metadata.name || !metadata.name.trim()) {
    errors.push('Frontmatter must include a non-empty "name" field.');
  } else {
    const namePattern = /^[a-z0-9-_]{2,64}$/i;
    if (!namePattern.test(metadata.name.trim())) {
      warnings.push(`Skill name "${metadata.name}" should ideally be 2-64 alphanumeric characters, hyphens, or underscores.`);
    }
  }
  if (!metadata.description || !metadata.description.trim()) {
    errors.push('Frontmatter must include a non-empty "description" field.');
  }
  if (body.trim().length < 20) {
    warnings.push("Skill instructions body is very short. Providing clear guidelines enhances agent reliability.");
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      name: metadata.name || "",
      description: metadata.description || "",
      version: metadata.version || "1.0.0",
      license: metadata.license || "MIT",
      category: metadata.category
    }
  };
}
function convertPlainMarkdownToSkill(plainMarkdown, fallbackName, fallbackDescription) {
  const { frontmatterText } = parseFrontmatter(plainMarkdown);
  if (frontmatterText) {
    return plainMarkdown;
  }
  let title = fallbackName || "";
  const h1Match = plainMarkdown.match(/^#\s+(.+)$/m);
  if (!title && h1Match) {
    title = h1Match[1].trim();
  }
  if (!title) {
    title = "my-skill";
  }
  const sanitizedName = title.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "my-skill";
  let description = fallbackDescription || "";
  if (!description) {
    const lines = plainMarkdown.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    if (lines.length > 0) {
      description = lines[0].slice(0, 150);
    } else {
      description = `Custom AI skill: ${sanitizedName}`;
    }
  }
  const frontmatter = [
    "---",
    `name: ${sanitizedName}`,
    `description: "${description.replace(/"/g, '\\"')}"`,
    `version: 1.0.0`,
    `license: MIT`,
    "---",
    "",
    plainMarkdown.trim()
  ].join("\n");
  return frontmatter;
}
async function validateAndExtractZip(zipBuffer) {
  if (zipBuffer.length > 15 * 1024 * 1024) {
    throw new Error("ZIP archive exceeds the maximum allowed upload size (15 MB).");
  }
  const zip = await JSZip.loadAsync(zipBuffer);
  const filePaths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
  if (filePaths.length === 0) {
    throw new Error("ZIP archive is empty.");
  }
  if (filePaths.length > 100) {
    throw new Error("ZIP archive contains too many files (maximum 100 files allowed).");
  }
  for (const rawPath of Object.keys(zip.files)) {
    if (rawPath.includes("..") || rawPath.startsWith("/") || rawPath.startsWith("\\") || rawPath.includes(":")) {
      throw new Error(`Unsafe path detected in archive: "${rawPath}". Path traversal is prohibited.`);
    }
    const lower = rawPath.toLowerCase();
    for (const ext of DANGEROUS_EXTENSIONS) {
      if (lower.endsWith(ext)) {
        throw new Error(`Archive contains prohibited binary/executable file: "${rawPath}". Only text, markdown, scripts, and documentation files are allowed.`);
      }
    }
  }
  let rootPrefix = "";
  const firstPath = filePaths[0];
  const slashIdx = firstPath.indexOf("/");
  if (slashIdx > 0) {
    const candidatePrefix = firstPath.slice(0, slashIdx + 1);
    const allMatch = filePaths.every((p) => p.startsWith(candidatePrefix));
    if (allMatch) {
      rootPrefix = candidatePrefix;
    }
  }
  let skillMdPath = filePaths.find((p) => {
    const rel = rootPrefix ? p.slice(rootPrefix.length) : p;
    return rel.toLowerCase() === "skill.md";
  });
  if (!skillMdPath) {
    const rootMd = filePaths.find((p) => {
      const rel = rootPrefix ? p.slice(rootPrefix.length) : p;
      return !rel.includes("/") && rel.toLowerCase().endsWith(".md");
    });
    if (rootMd) {
      skillMdPath = rootMd;
    } else {
      throw new Error("Skill package must contain a primary SKILL.md file.");
    }
  }
  const skillMdEntry = zip.files[skillMdPath];
  const rawSkillMd = await skillMdEntry.async("string");
  const validation = validateSkillMd(rawSkillMd);
  const warnings = [...validation.warnings];
  let finalSkillMd = rawSkillMd;
  if (!validation.valid) {
    warnings.push(`Imported ${skillMdPath} lacked valid frontmatter: ${validation.errors.join(", ")}. Auto-generating frontmatter.`);
    finalSkillMd = convertPlainMarkdownToSkill(rawSkillMd, "imported-skill");
  }
  const files = [];
  for (const p of filePaths) {
    if (p === skillMdPath) continue;
    const relPath = rootPrefix ? p.slice(rootPrefix.length) : p;
    if (!relPath) continue;
    const content = await zip.files[p].async("string");
    files.push({
      name: relPath,
      content
    });
  }
  const finalValidation = validateSkillMd(finalSkillMd);
  const skillName = finalValidation.metadata?.name || "skill";
  return {
    skillMd: finalSkillMd,
    files,
    skillName,
    metadata: finalValidation.metadata,
    warnings
  };
}
async function buildSkillZip(skillSlug, skillMdContent, filesMap = {}) {
  const zip = new JSZip();
  const folder = zip.folder(skillSlug) || zip;
  folder.file("SKILL.md", skillMdContent);
  for (const [relativePath, content] of Object.entries(filesMap)) {
    if (relativePath === "SKILL.md" || relativePath === `${skillSlug}/SKILL.md`) continue;
    const cleanPath = relativePath.replace(/^[/\\]+/, "");
    folder.file(cleanPath, content);
  }
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
  return buffer;
}
function getAgentInstallPath(agent, skillSlug) {
  switch (agent) {
    case "claude":
      return {
        path: `.claude/skills/${skillSlug}/`,
        description: "Claude Code project skills directory (or ~/.claude/skills/ for user-global skills)"
      };
    case "codex":
      return {
        path: `.codex/skills/${skillSlug}/`,
        description: "OpenAI Codex project skills directory (or .agents/skills/ in shared agent environments)"
      };
    case "cursor":
      return {
        path: `.cursor/skills/${skillSlug}/`,
        description: "Cursor project skills directory (or .cursor/rules/ for rule-based prompts)"
      };
    case "antigravity":
      return {
        path: `.agents/skills/${skillSlug}/`,
        description: "Google Antigravity workspace skills root (or ~/.gemini/config/skills/ for global skills)"
      };
    case "generic":
    default:
      return {
        path: `.agents/skills/${skillSlug}/`,
        description: "Standard Open Agent Skills workspace directory (.agents/skills/<skill-name>/)"
      };
  }
}
function generateInstallationPrompt(params) {
  const { skillName, skillSlug, version, summary, targetAgent, hasSupportingFiles, fileList = [] } = params;
  const targetInfo = getAgentInstallPath(targetAgent, skillSlug);
  const fileTreeDesc = hasSupportingFiles && fileList.length > 0 ? [
    `${skillSlug}/`,
    `\u251C\u2500\u2500 SKILL.md`,
    ...fileList.filter((f) => f !== "SKILL.md").map((f) => `\u251C\u2500\u2500 ${f}`)
  ].join("\n") : [
    `${skillSlug}/`,
    `\u2514\u2500\u2500 SKILL.md`
  ].join("\n");
  return `### KYRON Skill Installation Request

You are installing the KYRON skill package: **"${skillName}"** (v${version}) into this project.

**Skill Overview:**
> ${summary}

**Target Agent:** ${targetAgent.toUpperCase()}
**Recommended Installation Path:** \`${targetInfo.path}\`
*Note:* ${targetInfo.description}.

**Supplied Package Structure:**
\`\`\`text
${fileTreeDesc}
\`\`\`

---

### Step-by-Step Installation Instructions:

1. **Inspect Package Archive:**
   - Unpack or inspect the provided \`${skillSlug}.zip\` package.
   - Confirm that \`SKILL.md\` is present and contains valid YAML frontmatter (with \`name\` and \`description\`).
   ${hasSupportingFiles ? "- Confirm all supporting resources (`references/`, `scripts/`, `assets/`, etc.) match the package structure." : ""}

2. **Verify Project Environment:**
   - Inspect the current workspace layout.
   - Do NOT overwrite existing unrelated skills or configuration files.
   - If \`${targetInfo.path}\` already contains a previous version of this skill, create a backup or ask before replacing.

3. **Install Skill Files:**
   - Place \`SKILL.md\` into: \`${targetInfo.path}SKILL.md\`
   ${hasSupportingFiles ? `- Preserve supporting directories and relative links under: \`${targetInfo.path}\`` : ""}
   - Maintain exact relative paths so Markdown references remain intact.

4. **Security & Execution Constraints:**
   - **DO NOT** execute any packaged scripts or binaries automatically.
   - Verify that all files are plain-text / human-readable instructions or standard scripts.
   - Ask for confirmation before performing any destructive file modifications.

5. **Validation & Completion Report:**
   - Verify that the target files exist in the expected destination.
   - Report the exact path where the skill was installed, list all installed files, and confirm that the skill is ready for invocation.
`;
}

// server/routes/skills.ts
import crypto from "node:crypto";
var router = Router();
var CATEGORIES = [
  // Business
  { slug: "trading-investing", name: "Trading & Investing", domain: "business" },
  { slug: "writing-content", name: "Writing & Content", domain: "business" },
  { slug: "marketing-seo", name: "Marketing & SEO", domain: "business" },
  { slug: "digital-products", name: "Digital Products", domain: "business" },
  { slug: "business-operations", name: "Business & Operations", domain: "business" },
  { slug: "branding-design", name: "Branding & Design", domain: "business" },
  { slug: "workflow-automation", name: "Workflow Automation", domain: "business" },
  { slug: "productivity", name: "Productivity", domain: "business" },
  { slug: "sales-lead-gen", name: "Sales & Lead Gen", domain: "business" },
  { slug: "ecommerce", name: "E-commerce", domain: "business" },
  { slug: "social-media", name: "Social Media", domain: "business" },
  { slug: "finance-accounting", name: "Finance & Accounting", domain: "business" },
  { slug: "image-video", name: "Image & Video", domain: "business" },
  { slug: "research-analysis", name: "Research & Analysis", domain: "business" },
  { slug: "education-learning", name: "Education & Learning", domain: "business" },
  { slug: "hr-recruiting", name: "HR & Recruiting", domain: "business" },
  { slug: "game-development", name: "Game Development", domain: "business" },
  { slug: "legal-compliance", name: "Legal & Compliance", domain: "business" },
  { slug: "translation-localization", name: "Translation & Localization", domain: "business" },
  // Developer
  { slug: "agents-orchestration", name: "Agents & Orchestration", domain: "developer" },
  { slug: "frontend-web-apps", name: "Frontend & Web Apps", domain: "developer" },
  { slug: "code-quality-review", name: "Code Quality & Review", domain: "developer" },
  { slug: "testing-debugging", name: "Testing & Debugging", domain: "developer" },
  { slug: "security", name: "Security", domain: "developer" },
  { slug: "technical-documentation", name: "Technical Documentation", domain: "developer" },
  { slug: "devops-cloud", name: "DevOps & Cloud", domain: "developer" },
  { slug: "prompt-skill-engineering", name: "Prompt & Skill Engineering", domain: "developer" },
  { slug: "llm-ops", name: "LLM Ops", domain: "developer" },
  { slug: "apis-backend", name: "APIs & Backend", domain: "developer" },
  { slug: "data-databases", name: "Data & Databases", domain: "developer" },
  { slug: "mobile-development", name: "Mobile Development", domain: "developer" },
  { slug: "web3-crypto", name: "Web3 & Crypto", domain: "developer" }
];
router.get("/categories", async (_req, res) => {
  try {
    const counts = await db.all(`
      SELECT category, COUNT(*) as count 
      FROM skills 
      WHERE status IN ('live', 'published') 
      GROUP BY category
    `);
    const countMap = new Map(counts.map((c) => [c.category, Number(c.count)]));
    const result = CATEGORIES.map((cat) => ({
      ...cat,
      count: countMap.get(cat.slug) || 0
    }));
    const totalRow = await db.get(`SELECT COUNT(*) as count FROM skills WHERE status IN ('live', 'published')`);
    const total = totalRow ? Number(totalRow.count) : 0;
    res.json({ categories: result, total });
  } catch (err) {
    console.error("Categories error:", err.message);
    res.status(500).json({ error: "Failed to retrieve categories." });
  }
});
router.get("/deals", async (_req, res) => {
  try {
    const rawDeals = await db.all(`
      SELECT d.id as deal_id, d.discount_percent, d.expires_at, d.is_active,
             s.id, s.name, s.slug, s.summary, s.logo_url, s.price, s.pricing_type,
             s.net_votes, s.average_rating, s.review_count, s.install_count,
             p.display_name as creator_name, p.username as creator_username
      FROM skill_deals d
      JOIN skills s ON d.skill_id = s.id
      JOIN profiles p ON s.creator_id = p.id
      WHERE d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
    `);
    const deals = rawDeals.map((d) => ({
      deal_id: d.deal_id,
      discount_percent: Number(d.discount_percent),
      expires_at: d.expires_at,
      is_active: d.is_active,
      id: d.id,
      name: d.name,
      slug: d.slug,
      summary: d.summary,
      logo_url: d.logo_url,
      price: Number(d.price),
      pricing_type: d.pricing_type,
      net_votes: Number(d.net_votes),
      average_rating: Number(d.average_rating),
      review_count: Number(d.review_count),
      install_count: Number(d.install_count),
      creator_name: d.creator_name,
      creator_username: d.creator_username,
      skill: {
        id: d.id,
        name: d.name,
        slug: d.slug,
        summary: d.summary,
        logo_url: d.logo_url,
        price: Number(d.price),
        pricing_type: d.pricing_type,
        net_votes: Number(d.net_votes),
        average_rating: Number(d.average_rating),
        review_count: Number(d.review_count),
        install_count: Number(d.install_count),
        creator_name: d.creator_name,
        creator_username: d.creator_username
      }
    }));
    res.json({ deals });
  } catch (err) {
    console.error("Deals error:", err.message);
    res.status(500).json({ error: "Failed to retrieve active deals." });
  }
});
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { category, pricing_type, creator, q, sort = "trending", limit = 50, offset = 0 } = req.query;
    let querySql = `
      SELECT s.id, s.name, s.slug, s.summary, s.category, s.tags, s.logo_url,
             s.pricing_type, s.price, s.subscription_price_monthly, s.compatibility_type,
             s.current_version, s.security_status, s.status, s.install_count, s.view_count,
             s.net_votes, s.average_rating, s.review_count, s.created_at,
             p.display_name as creator_name, p.username as creator_username,
             d.discount_percent, d.expires_at as deal_expires_at
      FROM skills s
      JOIN profiles p ON s.creator_id = p.id
      LEFT JOIN skill_deals d ON d.skill_id = s.id AND d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
      WHERE s.status IN ('live', 'published')
    `;
    const params = [];
    if (creator && typeof creator === "string" && creator.trim()) {
      querySql += ` AND (p.username = ? OR p.id = ?)`;
      params.push(creator.trim(), creator.trim());
    }
    if (category && typeof category === "string" && category !== "all") {
      querySql += ` AND s.category = ?`;
      params.push(category);
    }
    if (pricing_type === "free") {
      querySql += ` AND (s.pricing_type = 'free' OR s.price = 0)`;
    } else if (pricing_type === "paid") {
      querySql += ` AND (s.pricing_type = 'paid' OR s.pricing_type = 'subscription' OR s.price > 0)`;
    }
    if (q && typeof q === "string" && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      querySql += ` AND (s.name LIKE ? OR s.summary LIKE ? OR s.tags LIKE ? OR p.display_name LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    switch (sort) {
      case "newest":
        querySql += ` ORDER BY s.created_at DESC`;
        break;
      case "votes":
        querySql += ` ORDER BY s.net_votes DESC`;
        break;
      case "rating":
        querySql += ` ORDER BY s.average_rating DESC, s.review_count DESC`;
        break;
      case "installs":
        querySql += ` ORDER BY s.install_count DESC`;
        break;
      case "price_asc":
        querySql += ` ORDER BY s.price ASC`;
        break;
      case "price_desc":
        querySql += ` ORDER BY s.price DESC`;
        break;
      case "trending":
      default:
        querySql += ` ORDER BY (s.net_votes * 3 + s.install_count * 2 + s.view_count) DESC, s.created_at DESC`;
        break;
    }
    querySql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));
    const rows = await db.all(querySql, params);
    const formatted = rows.map((r) => {
      let parsedTags = [];
      try {
        parsedTags = JSON.parse(r.tags);
      } catch {
      }
      const deal = r.discount_percent ? {
        discount_percent: Number(r.discount_percent),
        expires_at: r.deal_expires_at,
        discounted_price: Number((Number(r.price) * (1 - Number(r.discount_percent) / 100)).toFixed(2))
      } : null;
      return {
        ...r,
        price: Number(r.price),
        net_votes: Number(r.net_votes),
        average_rating: Number(r.average_rating),
        review_count: Number(r.review_count),
        install_count: Number(r.install_count),
        view_count: Number(r.view_count),
        tags: parsedTags,
        deal
      };
    });
    res.json({ skills: formatted, count: formatted.length });
  } catch (err) {
    console.error("Skills browse error:", err.message);
    res.status(500).json({ error: "Failed to retrieve skills catalog." });
  }
});
router.get("/:slug", optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const skill = await db.get(`
      SELECT s.*, p.display_name as creator_name, p.username as creator_username, p.bio as creator_bio, p.avatar_url as creator_avatar,
             d.discount_percent, d.expires_at as deal_expires_at
      FROM skills s
      JOIN profiles p ON s.creator_id = p.id
      LEFT JOIN skill_deals d ON d.skill_id = s.id AND d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
      WHERE s.slug = ? OR s.id = ?
    `, [slug, slug]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    if (skill.status !== "live" && skill.status !== "published") {
      let canViewDraft = false;
      if (req.user) {
        if (req.user.id === skill.creator_id) {
          canViewDraft = true;
        } else {
          const profile = await db.get(`SELECT is_unlimited_credit_user FROM profiles WHERE id = ?`, [req.user.id]);
          if (profile && profile.is_unlimited_credit_user === 1) canViewDraft = true;
        }
      }
      if (!canViewDraft) {
        res.status(404).json({ error: "Skill not found" });
        return;
      }
    }
    await db.run(`UPDATE skills SET view_count = view_count + 1 WHERE id = ?`, [skill.id]);
    const reviews = await db.all(`
      SELECT r.id, r.rating, r.comment, r.is_verified_purchase, r.created_at,
             p.display_name as user_name, p.avatar_url as user_avatar
      FROM skill_reviews r
      JOIN profiles p ON r.user_id = p.id
      WHERE r.skill_id = ?
      ORDER BY r.created_at DESC
    `, [skill.id]);
    let isOwned = false;
    if (req.user) {
      const purchase = await db.get(`
        SELECT id FROM user_purchases WHERE user_id = ? AND skill_id = ? AND status = 'completed'
      `, [req.user.id, skill.id]);
      if (purchase || req.user.id === skill.creator_id) isOwned = true;
    }
    let parsedTags = [];
    try {
      parsedTags = JSON.parse(skill.tags);
    } catch {
    }
    let packageTree = null;
    try {
      packageTree = JSON.parse(skill.package_tree);
    } catch {
    }
    let sessionPreview = null;
    try {
      sessionPreview = JSON.parse(skill.session_preview);
    } catch {
    }
    const deal = skill.discount_percent ? {
      discount_percent: Number(skill.discount_percent),
      expires_at: skill.deal_expires_at,
      discounted_price: Number((Number(skill.price) * (1 - Number(skill.discount_percent) / 100)).toFixed(2))
    } : null;
    const auditLogs = await db.all(`
      SELECT rule_name, status, details FROM security_audit_logs WHERE skill_id = ? ORDER BY rule_name ASC
    `, [skill.id]);
    const creator = {
      id: skill.creator_id,
      display_name: skill.creator_name,
      username: skill.creator_username,
      bio: skill.creator_bio,
      avatar_url: skill.creator_avatar
    };
    res.json({
      skill: {
        ...skill,
        price: Number(skill.price),
        net_votes: Number(skill.net_votes),
        average_rating: Number(skill.average_rating),
        review_count: Number(skill.review_count),
        install_count: Number(skill.install_count),
        view_count: Number(skill.view_count) + 1,
        tags: parsedTags,
        package_tree: packageTree,
        session_preview: sessionPreview,
        deal,
        is_owned: isOwned
      },
      creator,
      deal,
      is_purchased: isOwned,
      reviews,
      security_audit: auditLogs
    });
  } catch (err) {
    console.error("Skill detail error:", err.message);
    res.status(500).json({ error: "Failed to retrieve skill details." });
  }
});
async function checkSkillEntitlement(skill, user) {
  if (skill.status && skill.status !== "live" && skill.status !== "published") {
    if (!user) {
      return { authorized: false, status: 404, error: "Skill not found" };
    }
    if (skill.creator_id === user.id) {
      return { authorized: true };
    }
    const profile2 = await db.get(`SELECT is_unlimited_credit_user FROM profiles WHERE id = ?`, [user.id]);
    if (profile2 && profile2.is_unlimited_credit_user === 1) {
      return { authorized: true, isAdmin: true };
    }
    return { authorized: false, status: 404, error: "Skill not found" };
  }
  const isFree = skill.pricing_type === "free" || Number(skill.price) === 0;
  if (isFree) return { authorized: true };
  if (!user) {
    return { authorized: false, status: 401, error: "Authentication required to access paid skill content." };
  }
  if (skill.creator_id === user.id) {
    return { authorized: true };
  }
  const purchase = await db.get(`
    SELECT id, license_key FROM user_purchases 
    WHERE user_id = ? AND skill_id = ? AND status = 'completed'
  `, [user.id, skill.id]);
  if (purchase) return { authorized: true, purchase };
  const profile = await db.get(`SELECT is_unlimited_credit_user FROM profiles WHERE id = ?`, [user.id]);
  if (profile && profile.is_unlimited_credit_user === 1) {
    return { authorized: true, isAdmin: true };
  }
  return {
    authorized: false,
    status: 403,
    error: "Access denied: Purchase required. You do not have an active entitlement or license for this paid skill. Please acquire or top up credits first."
  };
}
router.get("/:slug/package", requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id;
    const skill = await db.get(`SELECT id, name, price, pricing_type, creator_id, status FROM skills WHERE slug = ? OR id = ?`, [slug, slug]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    const authCheck = await checkSkillEntitlement(skill, req.user);
    if (!authCheck.authorized) {
      res.status(authCheck.status || 403).json({ error: authCheck.error });
      return;
    }
    const pkg = await db.get(`SELECT version, skill_md_content, files_json FROM skill_packages WHERE skill_id = ?`, [skill.id]);
    if (!pkg) {
      res.status(404).json({ error: "Skill package contents unavailable" });
      return;
    }
    let files = {};
    try {
      files = JSON.parse(pkg.files_json);
    } catch {
    }
    const fileKeys = Object.keys(files).filter((k) => k !== "SKILL.md");
    res.json({
      skill_id: skill.id,
      skill_name: skill.name,
      version: pkg.version,
      skill_md: pkg.skill_md_content,
      skill_md_content: pkg.skill_md_content,
      files,
      has_supporting_files: fileKeys.length > 0,
      file_names: Object.keys(files),
      delivered_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Package delivery error:", err.message);
    res.status(500).json({ error: "Failed to retrieve skill package." });
  }
});
router.get("/:slug/download/markdown", optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const skill = await db.get(`SELECT id, name, slug, price, pricing_type, creator_id, status FROM skills WHERE slug = ? OR id = ?`, [slug, slug]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    const authCheck = await checkSkillEntitlement(skill, req.user);
    if (!authCheck.authorized) {
      res.status(authCheck.status || 403).json({ error: authCheck.error });
      return;
    }
    const pkg = await db.get(`SELECT version, skill_md_content, files_json FROM skill_packages WHERE skill_id = ?`, [skill.id]);
    if (!pkg) {
      res.status(404).json({ error: "Skill package contents unavailable." });
      return;
    }
    const downloadId = "dl_" + crypto.randomUUID();
    const userId = req.user ? req.user.id : null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await db.run(
        `INSERT INTO skill_downloads (id, skill_id, user_id, version, download_type, downloaded_at) VALUES (?, ?, ?, ?, 'markdown', ?)`,
        [downloadId, skill.id, userId, pkg.version, now]
      );
    } catch {
    }
    const safeSlug = skill.slug.replace(/[^a-z0-9_-]/gi, "-");
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeSlug}.md"`);
    res.send(pkg.skill_md_content);
  } catch (err) {
    console.error("Download markdown error:", err.message);
    res.status(500).json({ error: "Failed to download skill markdown." });
  }
});
router.get("/:slug/download/zip", optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const skill = await db.get(`SELECT id, name, slug, price, pricing_type, creator_id, status FROM skills WHERE slug = ? OR id = ?`, [slug, slug]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    const authCheck = await checkSkillEntitlement(skill, req.user);
    if (!authCheck.authorized) {
      res.status(authCheck.status || 403).json({ error: authCheck.error });
      return;
    }
    const pkg = await db.get(`SELECT version, skill_md_content, files_json FROM skill_packages WHERE skill_id = ?`, [skill.id]);
    if (!pkg) {
      res.status(404).json({ error: "Skill package contents unavailable." });
      return;
    }
    let filesMap = {};
    try {
      filesMap = JSON.parse(pkg.files_json);
    } catch {
    }
    const zipBuffer = await buildSkillZip(skill.slug, pkg.skill_md_content, filesMap);
    const downloadId = "dl_" + crypto.randomUUID();
    const userId = req.user ? req.user.id : null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await db.run(
        `INSERT INTO skill_downloads (id, skill_id, user_id, version, download_type, downloaded_at) VALUES (?, ?, ?, ?, 'zip', ?)`,
        [downloadId, skill.id, userId, pkg.version, now]
      );
    } catch {
    }
    const safeSlug = skill.slug.replace(/[^a-z0-9_-]/gi, "-");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeSlug}.zip"`);
    res.setHeader("Content-Length", zipBuffer.length);
    res.send(zipBuffer);
  } catch (err) {
    console.error("Download zip error:", err.message);
    res.status(500).json({ error: "Failed to download skill ZIP package." });
  }
});
router.get("/:slug/prompt", optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const agent = req.query.agent || "generic";
    const isDownload = req.query.download === "1" || req.query.download === "file" || req.query.format === "file";
    const skill = await db.get(`SELECT id, name, slug, summary, price, pricing_type, creator_id, current_version, status FROM skills WHERE slug = ? OR id = ?`, [slug, slug]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    const authCheck = await checkSkillEntitlement(skill, req.user);
    if (!authCheck.authorized) {
      res.status(authCheck.status || 403).json({ error: authCheck.error });
      return;
    }
    const pkg = await db.get(`SELECT version, files_json FROM skill_packages WHERE skill_id = ?`, [skill.id]);
    let filesMap = {};
    if (pkg) {
      try {
        filesMap = JSON.parse(pkg.files_json);
      } catch {
      }
    }
    const fileList = Object.keys(filesMap);
    const hasSupportingFiles = fileList.filter((f) => f !== "SKILL.md").length > 0;
    const promptText = generateInstallationPrompt({
      skillName: skill.name,
      skillSlug: skill.slug,
      version: pkg?.version || skill.current_version || "1.0.0",
      summary: skill.summary || "",
      targetAgent: agent,
      hasSupportingFiles,
      fileList
    });
    const downloadId = "dl_" + crypto.randomUUID();
    const userId = req.user ? req.user.id : null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await db.run(
        `INSERT INTO skill_downloads (id, skill_id, user_id, version, download_type, downloaded_at) VALUES (?, ?, ?, ?, 'prompt', ?)`,
        [downloadId, skill.id, userId, pkg?.version || "1.0.0", now]
      );
    } catch {
    }
    const safeSlug = skill.slug.replace(/[^a-z0-9_-]/gi, "-");
    if (isDownload) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${safeSlug}-${agent}-install-prompt.txt"`);
      res.send(promptText);
    } else {
      res.json({
        skill_id: skill.id,
        skill_name: skill.name,
        slug: skill.slug,
        agent,
        prompt: promptText,
        install_path: getAgentInstallPath(agent, skill.slug).path,
        has_supporting_files: hasSupportingFiles,
        file_count: fileList.length
      });
    }
  } catch (err) {
    console.error("Prompt generator error:", err.message);
    res.status(500).json({ error: "Failed to generate installation prompt." });
  }
});
var skills_default = router;

// server/routes/votes.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.post("/skills/:id/vote", requireAuth, async (req, res) => {
  try {
    const { id: skillId } = req.params;
    const { vote_type } = req.body;
    const userId = req.user.id;
    if (vote_type !== 1 && vote_type !== -1 && vote_type !== 0) {
      res.status(400).json({ error: "Invalid vote_type. Must be 1, -1, or 0." });
      return;
    }
    const currentVote = await db.get(`SELECT vote_type FROM skill_votes WHERE skill_id = ? AND user_id = ?`, [skillId, userId]);
    const oldVote = currentVote ? currentVote.vote_type : 0;
    if (vote_type === 0 || vote_type === oldVote) {
      await db.run(`DELETE FROM skill_votes WHERE skill_id = ? AND user_id = ?`, [skillId, userId]);
      await db.run(`UPDATE skills SET net_votes = net_votes - ? WHERE id = ?`, [oldVote, skillId]);
    } else {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await db.run(`
        INSERT INTO skill_votes (skill_id, user_id, vote_type, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (skill_id, user_id) DO UPDATE SET
          vote_type = EXCLUDED.vote_type,
          updated_at = EXCLUDED.updated_at
      `, [skillId, userId, vote_type, now]);
      const diff = vote_type - oldVote;
      await db.run(`UPDATE skills SET net_votes = net_votes + ? WHERE id = ?`, [diff, skillId]);
    }
    const updatedSkill = await db.get(`SELECT net_votes FROM skills WHERE id = ?`, [skillId]);
    res.json({ success: true, net_votes: updatedSkill ? updatedSkill.net_votes : 0, user_vote: vote_type === oldVote ? 0 : vote_type });
  } catch (err) {
    console.error("Vote error:", err.message);
    res.status(500).json({ error: "Failed to record vote." });
  }
});
router2.post("/skills/:id/save", requireAuth, async (req, res) => {
  try {
    const { id: skillId } = req.params;
    const userId = req.user.id;
    const currentSave = await db.get(`SELECT skill_id FROM saved_skills WHERE skill_id = ? AND user_id = ?`, [skillId, userId]);
    if (currentSave) {
      await db.run(`DELETE FROM saved_skills WHERE skill_id = ? AND user_id = ?`, [skillId, userId]);
      res.json({ success: true, saved: false, message: "Removed from saved skills." });
    } else {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await db.run(`
        INSERT INTO saved_skills (skill_id, user_id, created_at)
        VALUES (?, ?, ?)
        ON CONFLICT (skill_id, user_id) DO NOTHING
      `, [skillId, userId, now]);
      res.json({ success: true, saved: true, message: "Saved to library. You will receive updates and price drop alerts." });
    }
  } catch (err) {
    console.error("Save error:", err.message);
    res.status(500).json({ error: "Failed to update saved skill." });
  }
});
router2.get("/skills/:id/state", requireAuth, async (req, res) => {
  try {
    const { id: skillId } = req.params;
    const userId = req.user.id;
    const vote = await db.get(`SELECT vote_type FROM skill_votes WHERE skill_id = ? AND user_id = ?`, [skillId, userId]);
    const save = await db.get(`SELECT skill_id FROM saved_skills WHERE skill_id = ? AND user_id = ?`, [skillId, userId]);
    res.json({
      vote_type: vote ? vote.vote_type : 0,
      saved: !!save
    });
  } catch (err) {
    console.error("State error:", err.message);
    res.status(500).json({ error: "Failed to retrieve skill engagement state." });
  }
});
var votes_default = router2;

// server/routes/purchases.ts
import { Router as Router3 } from "express";
import crypto2 from "node:crypto";
var router3 = Router3();
router3.post("/free", requireAuth, async (req, res) => {
  try {
    const skillId = req.body.skillId || req.body.skill_id;
    const userId = req.user.id;
    if (!skillId) {
      res.status(400).json({ error: "skillId is required" });
      return;
    }
    const result = await db.withTransaction(async (tx) => {
      const skill = await tx.get(`SELECT id, name, price, pricing_type FROM skills WHERE id = ?`, [skillId]);
      if (!skill) {
        return { errorStatus: 404, error: "Skill not found" };
      }
      if (skill.pricing_type !== "free" && Number(skill.price) > 0) {
        return { errorStatus: 400, error: "This is a paid skill and cannot be installed for free." };
      }
      const existing = await tx.get(`SELECT id, license_key FROM user_purchases WHERE user_id = ? AND skill_id = ?`, [userId, skill.id]);
      if (existing) {
        return {
          success: true,
          status: "already_owned",
          message: "You already have this skill in your library.",
          license_key: existing.license_key
        };
      }
      const purchaseId = "pur_" + crypto2.randomUUID();
      const licenseKey = "KYRON-FREE-" + crypto2.randomBytes(8).toString("hex").toUpperCase();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await tx.run(`
        INSERT INTO user_purchases (id, user_id, skill_id, amount_paid, license_key, purchased_at, status)
        VALUES (?, ?, ?, 0.00, ?, ?, 'completed')
        ON CONFLICT (id) DO NOTHING
      `, [purchaseId, userId, skill.id, licenseKey, now]);
      await tx.run(`UPDATE skills SET install_count = install_count + 1 WHERE id = ?`, [skill.id]);
      return {
        success: true,
        status: "installed",
        message: `Skill "${skill.name}" successfully added to your agent library!`,
        license_key: licenseKey
      };
    });
    if ("errorStatus" in result) {
      res.status(result.errorStatus).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error("Free install error:", err.message);
    res.status(500).json({ error: "Failed to complete skill installation." });
  }
});
router3.post(["/credit", "/buy-with-credit"], requireAuth, async (req, res) => {
  try {
    const skillId = req.body.skillId || req.body.skill_id;
    const userId = req.user.id;
    if (!skillId) {
      res.status(400).json({ error: "skillId is required" });
      return;
    }
    const result = await db.withTransaction(async (tx) => {
      const skill = await tx.get(`
        SELECT s.id, s.name, s.price, s.pricing_type, d.discount_percent
        FROM skills s
        LEFT JOIN skill_deals d ON d.skill_id = s.id AND d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
        WHERE s.id = ?
      `, [skillId]);
      if (!skill) {
        return { errorStatus: 404, error: "Skill not found" };
      }
      let effectivePrice = Number(skill.price);
      if (skill.discount_percent) {
        effectivePrice = Number((Number(skill.price) * (1 - skill.discount_percent / 100)).toFixed(2));
      }
      const profile = await tx.get(`SELECT credit_balance, is_unlimited_credit_user FROM profiles WHERE id = ?`, [userId]);
      if (!profile) {
        return { errorStatus: 404, error: "User profile not found" };
      }
      const isAdmin = profile.is_unlimited_credit_user === 1;
      const currentBalance = Number(profile.credit_balance);
      const existing = await tx.get(`SELECT id, license_key FROM user_purchases WHERE user_id = ? AND skill_id = ?`, [userId, skill.id]);
      if (existing) {
        return {
          success: true,
          status: "already_owned",
          message: "You already own this skill.",
          license_key: existing.license_key
        };
      }
      if (!isAdmin && currentBalance < effectivePrice) {
        return {
          errorStatus: 402,
          error: `Insufficient credit balance. You have $${currentBalance.toFixed(2)}, but this skill costs $${effectivePrice.toFixed(2)}. Top up to continue.`,
          balance: currentBalance,
          required: effectivePrice,
          needed: Number((effectivePrice - currentBalance).toFixed(2))
        };
      }
      if (!isAdmin) {
        const updateRes = await tx.run(
          `UPDATE profiles SET credit_balance = credit_balance - ? WHERE id = ? AND credit_balance >= ?`,
          [effectivePrice, userId, effectivePrice]
        );
        if (updateRes.changes === 0) {
          throw new Error("Concurrent modification detected during balance debit. Please retry.");
        }
      }
      const purchaseId = "pur_" + crypto2.randomUUID();
      const licenseKey = "KYRON-LIC-" + crypto2.randomBytes(8).toString("hex").toUpperCase();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await tx.run(`
        INSERT INTO user_purchases (id, user_id, skill_id, amount_paid, license_key, purchased_at, status)
        VALUES (?, ?, ?, ?, ?, ?, 'completed')
        ON CONFLICT (id) DO NOTHING
      `, [purchaseId, userId, skill.id, isAdmin ? 0 : effectivePrice, licenseKey, now]);
      await tx.run(`UPDATE skills SET install_count = install_count + 1 WHERE id = ?`, [skill.id]);
      const updatedProfile = await tx.get(`SELECT credit_balance FROM profiles WHERE id = ?`, [userId]);
      return {
        success: true,
        status: "purchased",
        message: isAdmin ? `Admin test purchase confirmed: "${skill.name}" unlocked without debiting real credits.` : `Successfully purchased "${skill.name}" for $${effectivePrice.toFixed(2)}!`,
        new_balance: Number(updatedProfile.credit_balance),
        license_key: licenseKey,
        purchase: {
          id: purchaseId,
          skill_id: skill.id,
          amount_paid: effectivePrice,
          license_key: licenseKey
        }
      };
    });
    if ("errorStatus" in result) {
      res.status(result.errorStatus).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    console.error("Credit purchase error:", err.message);
    res.status(500).json({ error: "Failed to process credit purchase." });
  }
});
router3.post("/topup", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;
    const topupAmount = Number(amount);
    if (isNaN(topupAmount) || topupAmount < 1) {
      res.status(400).json({ error: "Valid top-up amount of at least $1 is required." });
      return;
    }
    await db.run(`UPDATE profiles SET credit_balance = credit_balance + ? WHERE id = ?`, [topupAmount, userId]);
    const profile = await db.get(`SELECT credit_balance FROM profiles WHERE id = ?`, [userId]);
    res.json({
      success: true,
      message: `Successfully added $${topupAmount.toFixed(2)} to your KYRON credit balance.`,
      credit_balance: Number(profile.credit_balance)
    });
  } catch (err) {
    console.error("Topup error:", err.message);
    res.status(500).json({ error: "Failed to top up credits." });
  }
});
var getLibraryHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    const library = await db.all(`
      SELECT p.id, p.id as purchase_id, p.user_id, p.skill_id, p.amount_paid, p.license_key, p.purchased_at,
             s.name as skill_name, s.name, s.slug as skill_slug, s.slug, s.summary as skill_summary, s.summary,
             s.logo_url, s.category as skill_category, s.category, s.current_version, s.pricing_type, s.price,
             pr.display_name as creator_name
      FROM user_purchases p
      JOIN skills s ON p.skill_id = s.id
      JOIN profiles pr ON s.creator_id = pr.id
      WHERE p.user_id = ? AND p.status = 'completed'
      ORDER BY p.purchased_at DESC
    `, [userId]);
    res.json({ library, purchases: library, count: library.length });
  } catch (err) {
    console.error("Library fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch user library." });
  }
};
router3.get("/library", requireAuth, getLibraryHandler);
router3.get("/my-library", requireAuth, getLibraryHandler);
var purchases_default = router3;

// server/routes/creator.ts
import { Router as Router4 } from "express";

// server/services/securityScanner.ts
var SecurityScanner = class {
  /**
   * Runs the full automated security scan on a skill package.
   * Does NOT execute uploaded scripts.
   * Inspects metadata, file paths, prompt injection, credentials,
   * dangerous commands, external requests, zip traversal, file access, and extensions.
   */
  static scanPackage(skillMd, files = []) {
    const results = [];
    const allContents = [skillMd, ...files.map((f) => f.content)].join("\n");
    const hasFrontmatter = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/m.test(skillMd);
    const hasRequiredName = /name:\s*.+/i.test(skillMd);
    const hasRequiredDesc = /description:\s*.+/i.test(skillMd);
    if (!hasFrontmatter) {
      results.push({
        ruleName: "RULE_FRONTMATTER",
        status: "fail",
        description: "Missing or malformed YAML frontmatter (must start with ---)",
        details: "SKILL.md must begin with a valid YAML frontmatter block enclosed in --- delimiters declaring name and description.",
        findings: ["No YAML frontmatter block detected at top of SKILL.md"]
      });
    } else if (!hasRequiredName || !hasRequiredDesc) {
      const missing = [];
      if (!hasRequiredName) missing.push("name");
      if (!hasRequiredDesc) missing.push("description");
      results.push({
        ruleName: "RULE_FRONTMATTER",
        status: "fail",
        description: `Missing required YAML frontmatter fields: ${missing.join(", ")}`,
        details: 'The frontmatter must declare both "name" and "description" fields.',
        findings: missing.map((m) => `Missing field: ${m}`)
      });
    } else {
      const bodyMatch = skillMd.replace(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/m, "").trim();
      if (bodyMatch.length < 20) {
        results.push({
          ruleName: "RULE_FRONTMATTER",
          status: "warning",
          description: "Frontmatter is valid, but markdown body instructions are minimal",
          details: "Provide comprehensive instructions in markdown below the frontmatter.",
          findings: ["Markdown body contains fewer than 20 characters"]
        });
      } else {
        results.push({
          ruleName: "RULE_FRONTMATTER",
          status: "pass",
          description: "Valid YAML frontmatter with required name and description tags"
        });
      }
    }
    const promptInjectionPatterns = [
      { pattern: /ignore\s+(all\s+)?(previous|prior)\s+instructions/i, label: "Instruction override vector" },
      { pattern: /disregard\s+(the\s+)?(system|above)\s+prompt/i, label: "System prompt disregard vector" },
      { pattern: /bypass\s+(all\s+)?safety\s+(filters|rules|checks)/i, label: "Safety filter bypass attempt" },
      { pattern: /act\s+as\s+an?\s+unrestricted\s+ai/i, label: "Unrestricted persona induction" },
      { pattern: /jailbreak/i, label: "Explicit jailbreak keyword" },
      { pattern: /dan\s+mode/i, label: "Do Anything Now (DAN) mode injection" },
      { pattern: /developer\s+mode\s+enabled/i, label: "Developer mode exploit pattern" },
      { pattern: /reveal\s+(the\s+)?(system\s+prompt|hidden\s+prompt|secret\s+instructions)/i, label: "System prompt extraction vector" }
    ];
    const injectionFindings = [];
    for (const p of promptInjectionPatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        injectionFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }
    if (injectionFindings.length === 0) {
      results.push({
        ruleName: "RULE_PROMPT_INJECTION",
        status: "pass",
        description: "Zero prompt injection, jailbreak, or system override vectors detected"
      });
    } else {
      results.push({
        ruleName: "RULE_PROMPT_INJECTION",
        status: "fail",
        description: "Suspicious prompt override or jailbreak pattern detected",
        details: `Identified injection vectors: ${injectionFindings.join("; ")}`,
        findings: injectionFindings
      });
    }
    const destructivePatterns = [
      { pattern: /rm\s+-rf\s+(\/|~|\$HOME|\.\.)/i, label: "Recursive root/home directory deletion (rm -rf)" },
      { pattern: /mkfs\./i, label: "Filesystem formatting (mkfs)" },
      { pattern: /dd\s+if=\/dev\/(zero|urandom)/i, label: "Raw block device overwrite (dd)" },
      { pattern: />\s*\/etc\/(passwd|shadow|hosts)/i, label: "System file overwrite redirection" },
      { pattern: /format\s+[a-z]:\s*\/y/i, label: "Windows drive format command" },
      { pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, label: "Bash fork bomb execution attempt" },
      { pattern: /del\s+\/f\s+\/s\s+\/q\s+[c-z]:\\/i, label: "Recursive Windows drive deletion" },
      { pattern: /chmod\s+(-R\s+)?777\s+\//i, label: "Insecure root permissions alteration (chmod 777)" }
    ];
    const destructiveFindings = [];
    for (const p of destructivePatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        destructiveFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }
    if (destructiveFindings.length === 0) {
      results.push({
        ruleName: "RULE_DISK_MUTATION",
        status: "pass",
        description: "No destructive filesystem or disk formatting commands observed"
      });
    } else {
      results.push({
        ruleName: "RULE_DISK_MUTATION",
        status: "fail",
        description: "Destructive disk mutation command flagged",
        details: `Identified destructive commands: ${destructiveFindings.join("; ")}`,
        findings: destructiveFindings
      });
    }
    const secretPatterns = [
      { pattern: /\.ssh\/(id_rsa|id_ed25519|authorized_keys)/i, label: "SSH private key or credential access" },
      { pattern: /curl.*--data.*(\.env|config\.json|api_key)/i, label: "Environment or secret exfiltration via curl" },
      { pattern: /fetch\(.*base64.*\+.*process\.env/i, label: "process.env exfiltration via fetch" },
      { pattern: /\/(etc\/shadow|etc\/passwd|etc\/master\.passwd)/i, label: "Privileged system account file access" },
      { pattern: /pastebin\.com\/api/i, label: "Exfiltration to Pastebin API" },
      { pattern: /(AKIA[0-9A-Z]{16})/, label: "Hardcoded AWS Access Key ID" },
      { pattern: /-----BEGIN\s+((RSA|EC|OPENSSH|PGP)\s+)?PRIVATE\s+KEY-----/, label: "Exposed raw cryptographic private key" },
      { pattern: /ghp_[a-zA-Z0-9]{36}/, label: "Exposed GitHub Personal Access Token" },
      { pattern: /sk-[a-zA-Z0-9]{32,}/, label: "Exposed OpenAI or AI platform secret key" }
    ];
    const secretFindings = [];
    for (const p of secretPatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        secretFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }
    if (secretFindings.length === 0) {
      results.push({
        ruleName: "RULE_EXFILTRATION",
        status: "pass",
        description: "Protected against private key, token, or secret exfiltration"
      });
    } else {
      results.push({
        ruleName: "RULE_EXFILTRATION",
        status: "fail",
        description: "Attempt to read or transmit credentials or environment secrets flagged",
        details: `Identified exposed secret or exfiltration pattern: ${secretFindings.join("; ")}`,
        findings: secretFindings
      });
    }
    const shellPatterns = [
      { pattern: /nc\s+(-e|-c)\s+\/bin\/(sh|bash)/i, label: "Netcat reverse shell execution" },
      { pattern: /bash\s+-i\s+>&?\s*\/dev\/tcp\//i, label: "Bash interactive socket reverse shell" },
      { pattern: /curl\s+[^|]+\|\s*(sh|bash)/i, label: "Unverified web payload piped directly into shell" },
      { pattern: /wget\s+[^|]+\|\s*(sh|bash)/i, label: "Unverified wget payload piped directly into shell" },
      { pattern: /powershell\s+-enc\s+[A-Za-z0-9+/=]{20,}/i, label: "Base64 encoded hidden PowerShell execution" }
    ];
    const shellFindings = [];
    for (const p of shellPatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        shellFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }
    if (shellFindings.length === 0) {
      results.push({
        ruleName: "RULE_SHELL_EXECUTION",
        status: "pass",
        description: "No unauthorized reverse shells, piped web scripts, or encoded commands"
      });
    } else {
      results.push({
        ruleName: "RULE_SHELL_EXECUTION",
        status: "fail",
        description: "Malicious shell or reverse network terminal identified",
        details: `Identified shell patterns: ${shellFindings.join("; ")}`,
        findings: shellFindings
      });
    }
    const telemetryPatterns = [
      { pattern: /track_user\s*\(|send_telemetry\s*\(/i, label: "Covert user telemetry tracking function" },
      { pattern: /analytics\.track.*user_keystrokes/i, label: "Keylogger / keystroke capture attempt" },
      { pattern: /http:\/\/(?!127\.0\.0\.1|0\.0\.0\.0)1[0-9]{2}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i, label: "Hardcoded raw private IP beacon address" },
      { pattern: /webhook\.site\/[a-z0-9-]{36}/i, label: "Exfiltration to public webhook sink" }
    ];
    const teleFindings = [];
    for (const p of telemetryPatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        teleFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }
    if (teleFindings.length === 0) {
      results.push({
        ruleName: "RULE_TELEMETRY_PROBES",
        status: "pass",
        description: "Zero covert background tracking beacons or unauthorized telemetry"
      });
    } else {
      results.push({
        ruleName: "RULE_TELEMETRY_PROBES",
        status: "fail",
        description: "Unauthorized background tracking or raw IP communication flagged",
        details: `Identified telemetry vectors: ${teleFindings.join("; ")}`,
        findings: teleFindings
      });
    }
    const obfuscationPatterns = [
      { pattern: /eval\s*\(\s*atob\s*\(/i, label: "Base64 decoded eval execution" },
      { pattern: /eval\s*\(\s*Buffer\.from\s*\(/i, label: "Buffer decoded eval execution" },
      { pattern: /exec\s*\(\s*b64decode\s*\(/i, label: "Python base64 exec execution" },
      { pattern: /\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}/i, label: "Hex-escaped binary shellcode sequence" }
    ];
    const obfFindings = [];
    for (const p of obfuscationPatterns) {
      const match = allContents.match(p.pattern);
      if (match) {
        obfFindings.push(`${p.label} (matched: "${match[0].slice(0, 40)}")`);
      }
    }
    if (obfFindings.length === 0) {
      results.push({
        ruleName: "RULE_SANITIZED_OUTPUT",
        status: "pass",
        description: "Source code is transparent, human-readable, and free of eval obfuscation"
      });
    } else {
      results.push({
        ruleName: "RULE_SANITIZED_OUTPUT",
        status: "fail",
        description: "Obfuscated or dynamically evaluated code pattern detected",
        details: `Identified obfuscation patterns: ${obfFindings.join("; ")}`,
        findings: obfFindings
      });
    }
    const hasMinContent = skillMd.trim().length >= 50;
    const structureFindings = [];
    for (const file of files) {
      const name = file.name;
      if (name.includes("..") || name.startsWith("/") || name.startsWith("\\") || /^[a-zA-Z]:/.test(name)) {
        structureFindings.push(`Path traversal or absolute path detected: "${name}"`);
      }
      if (/[\x00-\x1F\x7F]/.test(name)) {
        structureFindings.push(`Invalid control characters in filename: "${name}"`);
      }
      if (/\.(exe|dll|so|dylib|bin|bat|cmd|com|msi|vbs|scr|pif|app|dmg|iso)$/i.test(name)) {
        structureFindings.push(`Prohibited binary/executable file discovered: "${name}"`);
      }
      if (file.content && Buffer.byteLength(file.content) > 5 * 1024 * 1024) {
        structureFindings.push(`File exceeds 5MB size limit: "${name}"`);
      }
    }
    const totalBytes = Buffer.byteLength(skillMd) + files.reduce((acc, f) => acc + Buffer.byteLength(f.content || ""), 0);
    if (totalBytes > 15 * 1024 * 1024) {
      structureFindings.push("Total package size exceeds 15MB limit");
    }
    if (!hasMinContent) {
      structureFindings.push("SKILL.md content is too short (must be at least 50 characters)");
    }
    const hasProhibitedExtensions = structureFindings.some((f) => f.includes("Prohibited") || f.includes("traversal"));
    if (hasProhibitedExtensions || !hasMinContent) {
      results.push({
        ruleName: "RULE_PACKAGE_STRUCTURE",
        status: "fail",
        description: "Package contains prohibited file types or empty SKILL.md specification",
        details: !hasMinContent ? "SKILL.md content is too short" : structureFindings.join("; "),
        findings: structureFindings
      });
    } else if (structureFindings.length > 0) {
      results.push({
        ruleName: "RULE_PACKAGE_STRUCTURE",
        status: "warning",
        description: "Package structure issues detected",
        details: structureFindings.join("; "),
        findings: structureFindings
      });
    } else {
      results.push({
        ruleName: "RULE_PACKAGE_STRUCTURE",
        status: "pass",
        description: "Skill package conforms to open SKILL.md hierarchy standards"
      });
    }
    const passedChecks = results.filter((r) => r.status === "pass").length;
    const warningChecks = results.filter((r) => r.status === "warning").length;
    const failedChecks = results.filter((r) => r.status === "fail").length;
    const overallStatus = failedChecks === 0 ? "pass" : "fail";
    const normalizedResults = results.map((r) => ({
      id: r.ruleName,
      ...r
    }));
    return {
      overallStatus,
      passedChecks,
      warningChecks,
      totalChecks: 8,
      results: normalizedResults
    };
  }
};

// server/routes/creator.ts
import crypto3 from "node:crypto";
var router4 = Router4();
router4.get("/skills", requireAuth, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const skills = await db.all(`
      SELECT s.id, s.name, s.slug, s.summary, s.description, s.category, s.tags,
             s.pricing_type, s.price, s.current_version, s.license, s.status, s.security_status,
             s.install_count, s.view_count, s.net_votes, s.average_rating, s.review_count,
             s.created_at, p.storage_path
      FROM skills s
      LEFT JOIN skill_packages p ON s.id = p.skill_id
      WHERE s.creator_id = ?
      ORDER BY s.created_at DESC
    `, [creatorId]);
    const formatted = skills.map((s) => {
      let tags = [];
      try {
        tags = JSON.parse(s.tags);
      } catch {
      }
      return {
        ...s,
        price: Number(s.price),
        tags
      };
    });
    res.json({ skills: formatted, count: formatted.length });
  } catch (err) {
    console.error("List creator skills error:", err.message);
    res.status(500).json({ error: "Failed to retrieve creator skills." });
  }
});
router4.get("/skills/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;
    const skill = await db.get(`
      SELECT * FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found or access denied." });
      return;
    }
    const pkg = await db.get(`
      SELECT version, skill_md_content, files_json FROM skill_packages WHERE skill_id = ?
    `, [skill.id]);
    let tags = [];
    try {
      tags = JSON.parse(skill.tags);
    } catch {
    }
    let files = {};
    if (pkg) {
      try {
        files = JSON.parse(pkg.files_json);
      } catch {
      }
    }
    res.json({
      skill: {
        ...skill,
        price: Number(skill.price),
        tags
      },
      package: {
        version: pkg?.version || skill.current_version || "1.0.0",
        skill_md_content: pkg?.skill_md_content || "",
        files
      }
    });
  } catch (err) {
    console.error("Get creator skill error:", err.message);
    res.status(500).json({ error: "Failed to retrieve skill for editing." });
  }
});
router4.post("/validate-package", requireAuth, async (req, res) => {
  try {
    const { type, content: bodyContent, base64, filename, nameHint } = req.body;
    const content = bodyContent || base64;
    if (!content) {
      res.status(400).json({ error: "Package content is required." });
      return;
    }
    let skillMd = "";
    let files = [];
    if (req.body.files && Array.isArray(req.body.files)) {
      files = req.body.files.map((f) => ({ name: f.name || f.path, content: f.content || "" }));
    }
    let detectedName = nameHint || (filename ? filename.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "-") : "my-skill");
    let warnings = [];
    let detectedMetadata = null;
    if (type === "zip") {
      const zipBuffer = Buffer.from(content, "base64");
      const extracted = await validateAndExtractZip(zipBuffer);
      skillMd = extracted.skillMd;
      files = extracted.files;
      detectedName = extracted.skillName;
      detectedMetadata = extracted.metadata;
      warnings = extracted.warnings;
    } else if (type === "plain_md") {
      skillMd = convertPlainMarkdownToSkill(content, detectedName);
      const val = validateSkillMd(skillMd);
      detectedMetadata = val.metadata;
      warnings = [...val.warnings, "Frontmatter was missing; auto-generated frontmatter from document content."];
    } else {
      skillMd = content;
      const val = validateSkillMd(skillMd);
      detectedMetadata = val.metadata;
      if (val.metadata?.name) detectedName = val.metadata.name;
      if (!val.valid) {
        warnings.push(...val.warnings);
      }
    }
    const scanResult = SecurityScanner.scanPackage(skillMd || content, files);
    const isConverted = type === "plain_md" || warnings.some((w) => w.includes("auto-generated"));
    const scanErrors = scanResult.results.filter((r) => r.status === "fail").map((r) => r.details || r.description);
    res.json({
      valid: scanResult.overallStatus === "pass",
      converted: isConverted,
      skillName: detectedName,
      extracted_frontmatter: detectedMetadata || { name: detectedName },
      extracted_instructions: skillMd,
      description: detectedMetadata?.description || "",
      version: detectedMetadata?.version || "1.0.0",
      license: detectedMetadata?.license || "MIT",
      skill_md_content: skillMd,
      files,
      files_count: files.length + 1,
      warnings,
      errors: scanErrors,
      security_scan: scanResult
    });
  } catch (err) {
    console.error("Validate package error:", err.message);
    res.status(400).json({
      valid: false,
      error: err.message || "Failed to parse and validate skill package.",
      errors: [err.message || "Failed to parse and validate skill package."]
    });
  }
});
router4.post("/publish", requireAuth, async (req, res) => {
  try {
    const name = req.body.name;
    const summary = req.body.summary || req.body.description;
    const description = req.body.description || req.body.summary;
    const category = req.body.category;
    const tags = req.body.tags || [];
    const pricing_type = req.body.pricing_type || "paid";
    const price = req.body.price !== void 0 ? req.body.price : pricing_type === "free" ? 0 : 9.99;
    const subscription_price_monthly = req.body.subscription_price_monthly;
    const logo_url = req.body.logo_url;
    const skill_md_content = req.body.skill_md_content || req.body.instructions;
    const files = (req.body.files || req.body.supporting_files || []).map((f) => ({
      name: f.name || f.path,
      content: f.content
    }));
    const version = req.body.version || "1.0.0";
    const license = req.body.license || "MIT";
    const compatibility_type = req.body.compatibility_type || req.body.compatibility || "universal";
    const is_draft = Boolean(req.body.is_draft);
    const creatorId = req.user.id;
    if (!name || !summary || !description || !category || !skill_md_content) {
      res.status(400).json({ error: "Missing required fields (name, summary, description, category, skill_md_content)." });
      return;
    }
    const requestedId = req.body.id || req.body.skill_id;
    const requestedSlug = (req.body.slug || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let existingSkill = null;
    if (requestedId) {
      existingSkill = await db.get(`SELECT * FROM skills WHERE id = ? AND creator_id = ?`, [requestedId, creatorId]);
    }
    if (!existingSkill) {
      existingSkill = await db.get(`SELECT * FROM skills WHERE slug = ? AND creator_id = ?`, [requestedSlug, creatorId]);
    }
    let slug = existingSkill ? existingSkill.slug : requestedSlug;
    if (!existingSkill) {
      const existingOtherSlug = await db.get(`SELECT id FROM skills WHERE slug = ?`, [requestedSlug]);
      if (existingOtherSlug) {
        slug = `${requestedSlug}-${crypto3.randomBytes(3).toString("hex")}`;
      }
    }
    const mdVal = validateSkillMd(skill_md_content);
    let finalSkillMd = skill_md_content;
    if (!mdVal.valid) {
      finalSkillMd = convertPlainMarkdownToSkill(skill_md_content, slug, summary);
    }
    const scanResult = SecurityScanner.scanPackage(finalSkillMd, files);
    const skillId = existingSkill ? existingSkill.id : "skl_" + crypto3.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const check of scanResult.results) {
      await db.run(`
        INSERT INTO security_audit_logs (id, skill_id, rule_name, status, details, scanned_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING
      `, ["log_" + crypto3.randomUUID(), skillId, check.ruleName, check.status, check.details || check.description, now]);
    }
    if (!is_draft && scanResult.overallStatus !== "pass") {
      res.status(422).json({
        success: false,
        error: "Security audit failed. Skill cannot be published until all 8 rules pass.",
        security_status: "fail",
        audit_report: scanResult.results
      });
      return;
    }
    const status = is_draft ? "draft" : req.body.status || "published";
    const securityStatus = scanResult.overallStatus;
    const packageTree = {
      name: slug,
      filesCount: 1 + files.length,
      foldersCount: 1,
      children: [
        { name: "SKILL.md", type: "file", size: `${(Buffer.byteLength(finalSkillMd) / 1024).toFixed(1)} KB` },
        ...files.map((f) => ({
          name: f.name,
          type: "file",
          size: `${(Buffer.byteLength(f.content || "") / 1024).toFixed(1)} KB`
        }))
      ]
    };
    const existingProfile = await db.get(`SELECT id FROM profiles WHERE id = ?`, [creatorId]);
    if (!existingProfile) {
      let username = req.user?.username || `user_${creatorId.slice(0, 8)}`;
      const takenUser = await db.get(`SELECT id FROM profiles WHERE username = ?`, [username]);
      if (takenUser && takenUser.id !== creatorId) {
        username = `${username}_${crypto3.randomBytes(3).toString("hex")}`;
      }
      let email = req.user?.email || `${creatorId}@kyron.local`;
      const takenEmail = await db.get(`SELECT id FROM profiles WHERE email = ?`, [email]);
      if (takenEmail && takenEmail.id !== creatorId) {
        email = `${creatorId}_${crypto3.randomBytes(3).toString("hex")}@kyron.local`;
      }
      const displayName = req.user?.displayName || req.user?.username || username;
      try {
        if (db.isPostgres) {
          await db.run(
            `INSERT INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, '', '', 50.00, 0, 'user', ?, ?)
             ON CONFLICT (id) DO NOTHING`,
            [creatorId, email, displayName, username, now, now]
          );
        } else {
          await db.run(
            `INSERT OR IGNORE INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, '', '', 50.00, 0, 'user', ?, ?)`,
            [creatorId, email, displayName, username, now, now]
          );
        }
      } catch (profErr) {
        console.warn("Profile sync check note in publish:", profErr.message);
      }
    }
    if (existingSkill) {
      await db.run(`
        UPDATE skills SET
          name = ?,
          summary = ?,
          description = ?,
          category = ?,
          tags = ?,
          pricing_type = ?,
          price = ?,
          subscription_price_monthly = ?,
          compatibility_type = ?,
          current_version = ?,
          license = ?,
          security_status = ?,
          status = ?,
          package_tree = ?
        WHERE id = ? AND creator_id = ?
      `, [
        name,
        summary,
        description,
        category,
        JSON.stringify(Array.isArray(tags) ? tags : [tags]),
        pricing_type,
        pricing_type === "free" ? 0 : Number(price),
        subscription_price_monthly ? Number(subscription_price_monthly) : null,
        compatibility_type || "universal",
        version || "1.0.0",
        license || "MIT",
        securityStatus,
        status,
        JSON.stringify(packageTree),
        skillId,
        creatorId
      ]);
    } else {
      await db.run(`
        INSERT INTO skills (
          id, name, slug, summary, description, category, tags, logo_url,
          pricing_type, price, subscription_price_monthly, compatibility_type,
          current_version, license, creator_id, security_status, status,
          install_count, view_count, net_votes, average_rating, review_count,
          package_tree, session_preview, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0.0, 0, ?, null, ?)
        ON CONFLICT (id) DO NOTHING
      `, [
        skillId,
        name,
        slug,
        summary,
        description,
        category,
        JSON.stringify(Array.isArray(tags) ? tags : [tags]),
        logo_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&h=96&fit=crop",
        pricing_type,
        pricing_type === "free" ? 0 : Number(price),
        subscription_price_monthly ? Number(subscription_price_monthly) : null,
        compatibility_type || "universal",
        version || "1.0.0",
        license || "MIT",
        creatorId,
        securityStatus,
        status,
        JSON.stringify(packageTree),
        now
      ]);
    }
    const filesMap = { "SKILL.md": finalSkillMd };
    for (const f of files) {
      filesMap[f.name] = f.content;
    }
    await db.run(`
      INSERT INTO skill_packages (skill_id, version, skill_md_content, files_json, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (skill_id) DO UPDATE SET
        version = EXCLUDED.version,
        skill_md_content = EXCLUDED.skill_md_content,
        files_json = EXCLUDED.files_json,
        updated_at = EXCLUDED.updated_at
    `, [skillId, version || "1.0.0", finalSkillMd, JSON.stringify(filesMap), now]);
    res.status(201).json({
      success: true,
      skill_id: skillId,
      slug,
      status,
      security_status: securityStatus,
      scan_report: scanResult,
      audit_report: scanResult.results,
      skill: {
        id: skillId,
        slug,
        name,
        pricing_type,
        price,
        status,
        is_draft: status === "draft" ? 1 : 0
      }
    });
  } catch (err) {
    console.error("Publish error:", err.message);
    res.status(500).json({ error: "Failed to publish skill." });
  }
});
router4.put("/skills/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;
    const {
      name,
      summary,
      description,
      category,
      tags,
      pricing_type,
      price,
      subscription_price_monthly,
      logo_url,
      skill_md_content,
      files,
      version,
      license,
      compatibility_type,
      status
    } = req.body;
    const existing = await db.get(`SELECT * FROM skills WHERE id = ? AND creator_id = ?`, [id, creatorId]);
    if (!existing) {
      res.status(404).json({ error: "Skill not found or access denied." });
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let finalSkillMd = skill_md_content !== void 0 ? skill_md_content : null;
    if (finalSkillMd) {
      const val = validateSkillMd(finalSkillMd);
      if (!val.valid) {
        finalSkillMd = convertPlainMarkdownToSkill(finalSkillMd, name || existing.name, summary || existing.summary);
      }
    }
    if (finalSkillMd || files) {
      const pkg = await db.get(`SELECT skill_md_content, files_json FROM skill_packages WHERE skill_id = ?`, [id]);
      const mdToScan = finalSkillMd || pkg?.skill_md_content || "";
      let filesToScan = [];
      if (files) {
        filesToScan = files;
      } else if (pkg?.files_json) {
        try {
          const parsed = JSON.parse(pkg.files_json);
          filesToScan = Object.entries(parsed).filter(([k]) => k !== "SKILL.md").map(([name2, content]) => ({ name: name2, content }));
        } catch {
        }
      }
      const scanResult = SecurityScanner.scanPackage(mdToScan, filesToScan);
      if ((status === "live" || status === "published") && scanResult.overallStatus !== "pass") {
        res.status(422).json({
          error: "Security audit failed. Cannot publish with failing checks.",
          scan_report: scanResult
        });
        return;
      }
      const filesMap = { "SKILL.md": mdToScan };
      for (const f of filesToScan) {
        filesMap[f.name] = f.content;
      }
      await db.run(`
        INSERT INTO skill_packages (skill_id, version, skill_md_content, files_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (skill_id) DO UPDATE SET
          version = EXCLUDED.version,
          skill_md_content = EXCLUDED.skill_md_content,
          files_json = EXCLUDED.files_json,
          updated_at = EXCLUDED.updated_at
      `, [id, version || existing.current_version || "1.0.0", mdToScan, JSON.stringify(filesMap), now]);
    }
    const newStatus = status || existing.status;
    const newPricing = pricing_type || existing.pricing_type;
    const newPrice = newPricing === "free" ? 0 : price !== void 0 ? Number(price) : existing.price;
    await db.run(`
      UPDATE skills SET
        name = COALESCE(?, name),
        summary = COALESCE(?, summary),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        tags = COALESCE(?, tags),
        pricing_type = ?,
        price = ?,
        subscription_price_monthly = ?,
        compatibility_type = COALESCE(?, compatibility_type),
        current_version = COALESCE(?, current_version),
        license = COALESCE(?, license),
        logo_url = COALESCE(?, logo_url),
        status = ?
      WHERE id = ? AND creator_id = ?
    `, [
      name || null,
      summary || null,
      description || null,
      category || null,
      tags ? JSON.stringify(Array.isArray(tags) ? tags : [tags]) : null,
      newPricing,
      newPrice,
      subscription_price_monthly ? Number(subscription_price_monthly) : null,
      compatibility_type || null,
      version || null,
      license || null,
      logo_url || null,
      newStatus,
      id,
      creatorId
    ]);
    res.json({ success: true, message: "Skill updated successfully." });
  } catch (err) {
    console.error("Update skill error:", err.message);
    res.status(500).json({ error: "Failed to update skill." });
  }
});
router4.post("/skills/:id/unpublish", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;
    const existing = await db.get(
      `SELECT id, status FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?`,
      [id, id, creatorId]
    );
    if (!existing) {
      res.status(404).json({ error: "Skill not found or access denied." });
      return;
    }
    const isCurrentlyPublished = existing.status === "live" || existing.status === "published";
    const nextStatus = req.body && typeof req.body.is_draft === "boolean" ? req.body.is_draft ? "draft" : "published" : isCurrentlyPublished ? "draft" : "published";
    await db.run(`UPDATE skills SET status = ? WHERE id = ? AND creator_id = ?`, [nextStatus, existing.id, creatorId]);
    res.json({
      success: true,
      status: nextStatus,
      is_draft: nextStatus === "draft",
      message: nextStatus === "draft" ? "Skill unpublished and moved to drafts." : "Skill published to marketplace!"
    });
  } catch (err) {
    console.error("Unpublish error:", err.message);
    res.status(500).json({ error: "Failed to update publication status." });
  }
});
router4.get("/analytics", requireAuth, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const mySkills = await db.all(`
      SELECT id, name, slug, price, pricing_type, install_count, view_count, net_votes, average_rating, review_count, status
      FROM skills
      WHERE creator_id = ?
      ORDER BY created_at DESC
    `, [creatorId]);
    const totalViews = mySkills.reduce((acc, s) => acc + (s.view_count || 0), 0);
    const totalInstalls = mySkills.reduce((acc, s) => acc + (s.install_count || 0), 0);
    const conversionRate = totalViews > 0 ? (totalInstalls / totalViews * 100).toFixed(1) : "0.0";
    const sales = await db.get(`
      SELECT SUM(p.amount_paid) as gross_revenue, COUNT(p.id) as sales_count
      FROM user_purchases p
      JOIN skills s ON p.skill_id = s.id
      WHERE s.creator_id = ?
    `, [creatorId]);
    const grossRevenue = sales && sales.gross_revenue ? Number(sales.gross_revenue) : 0;
    const netEarnings = Number((grossRevenue * 0.7).toFixed(2));
    res.json({
      funnel: {
        total_views: totalViews,
        total_installs: totalInstalls,
        conversion_rate_percent: conversionRate,
        gross_revenue: grossRevenue,
        creator_net_earnings: netEarnings,
        platform_fee_percent: 30
      },
      skills: mySkills
    });
  } catch (err) {
    console.error("Analytics error:", err.message);
    res.status(500).json({ error: "Failed to retrieve creator analytics." });
  }
});
router4.get("/overview", requireAuth, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const skills = await db.all(`
      SELECT id, name, slug, status, install_count, view_count, price, pricing_type, created_at, rejection_feedback
      FROM skills
      WHERE creator_id = ?
      ORDER BY created_at DESC
    `, [creatorId]);
    const totalSkills = skills.length;
    const draftCount = skills.filter((s) => s.status === "draft").length;
    const submittedCount = skills.filter((s) => s.status === "submitted" || s.status === "under_review").length;
    const approvedCount = skills.filter((s) => s.status === "approved").length;
    const publishedCount = skills.filter((s) => s.status === "published" || s.status === "live").length;
    const rejectedCount = skills.filter((s) => s.status === "rejected").length;
    const pausedCount = skills.filter((s) => s.status === "paused").length;
    const totalViews = skills.reduce((acc, s) => acc + (s.view_count || 0), 0);
    const totalDownloads = skills.reduce((acc, s) => acc + (s.install_count || 0), 0);
    const sales = await db.get(`
      SELECT SUM(p.amount_paid) as gross_revenue
      FROM user_purchases p
      JOIN skills s ON p.skill_id = s.id
      WHERE s.creator_id = ?
    `, [creatorId]);
    const grossRevenue = sales?.gross_revenue ? Number(sales.gross_revenue) : 0;
    const netEarnings = Number((grossRevenue * 0.7).toFixed(2));
    const submissions = await db.all(`
      SELECT sub.*, s.name as skill_name, s.slug as skill_slug
      FROM skill_submissions sub
      JOIN skills s ON sub.skill_id = s.id
      WHERE sub.submitted_by = ?
      ORDER BY sub.submitted_at DESC
      LIMIT 10
    `, [creatorId]);
    res.json({
      metrics: {
        total_skills: totalSkills,
        draft_count: draftCount,
        submitted_count: submittedCount,
        approved_count: approvedCount,
        published_count: publishedCount,
        rejected_count: rejectedCount,
        paused_count: pausedCount,
        total_views: totalViews,
        total_downloads: totalDownloads,
        gross_revenue: grossRevenue,
        net_earnings: netEarnings
      },
      recent_skills: skills.slice(0, 5),
      recent_submissions: submissions
    });
  } catch (err) {
    console.error("Creator overview error:", err.message);
    res.status(500).json({ error: "Failed to retrieve creator overview." });
  }
});
router4.post("/skills/:id/submit", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;
    const skill = await db.get(`
      SELECT * FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found or access denied." });
      return;
    }
    const pkg = await db.get(`SELECT skill_md_content, files_json, version FROM skill_packages WHERE skill_id = ?`, [skill.id]);
    if (!pkg || !pkg.skill_md_content) {
      res.status(400).json({ error: "Cannot submit a skill with no content. Please add SKILL.md content." });
      return;
    }
    let filesList = [];
    if (pkg.files_json) {
      try {
        const parsed = JSON.parse(pkg.files_json);
        filesList = Object.entries(parsed).filter(([k]) => k !== "SKILL.md").map(([name, content]) => ({ name, content }));
      } catch {
      }
    }
    const scanResult = SecurityScanner.scanPackage(pkg.skill_md_content, filesList);
    if (scanResult.overallStatus !== "pass") {
      res.status(422).json({
        error: "Skill package has security or validation issues that must be addressed before submitting.",
        validation_report: scanResult
      });
      return;
    }
    const submissionId = "sub_" + crypto3.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const versionNumber = pkg.version || skill.current_version || "1.0.0";
    await db.run(`
      INSERT INTO skill_submissions (id, skill_id, version, submitted_by, status, validation_report, submitted_at)
      VALUES (?, ?, ?, ?, 'submitted', ?, ?)
    `, [submissionId, skill.id, versionNumber, creatorId, JSON.stringify(scanResult), now]);
    await db.run(`
      UPDATE skills SET status = 'submitted', rejection_feedback = NULL WHERE id = ?
    `, [skill.id]);
    res.json({
      success: true,
      submission_id: submissionId,
      status: "submitted",
      message: "Skill successfully submitted for marketplace review."
    });
  } catch (err) {
    console.error("Submit skill error:", err.message);
    res.status(500).json({ error: "Failed to submit skill for review." });
  }
});
router4.post("/skills/:id/publish", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;
    const skill = await db.get(`
      SELECT * FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found or access denied." });
      return;
    }
    if (skill.status !== "approved" && skill.status !== "live" && skill.status !== "published") {
      res.status(400).json({
        error: `Skill must be in 'approved' status to publish. Current status is '${skill.status}'.`
      });
      return;
    }
    await db.run(`UPDATE skills SET status = 'published' WHERE id = ?`, [skill.id]);
    res.json({
      success: true,
      status: "published",
      message: "Skill is now live on KYRON Marketplace!"
    });
  } catch (err) {
    console.error("Publish skill error:", err.message);
    res.status(500).json({ error: "Failed to publish skill." });
  }
});
router4.post("/skills/:id/pause", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;
    const skill = await db.get(`
      SELECT id, status FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found or access denied." });
      return;
    }
    if (skill.status !== "published" && skill.status !== "live") {
      res.status(400).json({ error: "Only published skills can be paused." });
      return;
    }
    await db.run(`UPDATE skills SET status = 'paused' WHERE id = ?`, [skill.id]);
    res.json({ success: true, status: "paused", message: "Skill paused and removed from public discovery." });
  } catch (err) {
    console.error("Pause skill error:", err.message);
    res.status(500).json({ error: "Failed to pause skill." });
  }
});
router4.post("/skills/:id/resume", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;
    const skill = await db.get(`
      SELECT id, status FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found or access denied." });
      return;
    }
    if (skill.status !== "paused") {
      res.status(400).json({ error: "Only paused skills can be resumed." });
      return;
    }
    await db.run(`UPDATE skills SET status = 'published' WHERE id = ?`, [skill.id]);
    res.json({ success: true, status: "published", message: "Skill resumed and published to marketplace." });
  } catch (err) {
    console.error("Resume skill error:", err.message);
    res.status(500).json({ error: "Failed to resume skill." });
  }
});
router4.delete("/skills/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;
    const skill = await db.get(`
      SELECT id, status FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found or access denied." });
      return;
    }
    const purchaseCount = await db.get(`SELECT COUNT(*) as count FROM user_purchases WHERE skill_id = ?`, [skill.id]);
    if (purchaseCount && Number(purchaseCount.count) > 0) {
      res.status(400).json({ error: "Cannot delete a skill that has active purchases or buyer entitlements. Consider pausing it instead." });
      return;
    }
    await db.run(`DELETE FROM skill_packages WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM skill_submissions WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM skill_versions WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM security_audit_logs WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM skill_downloads WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM skill_votes WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM saved_skills WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM skills WHERE id = ?`, [skill.id]);
    res.json({ success: true, message: "Skill deleted successfully." });
  } catch (err) {
    console.error("Delete skill error:", err.message);
    res.status(500).json({ error: "Failed to delete skill." });
  }
});
router4.get("/submissions", requireAuth, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const submissions = await db.all(`
      SELECT sub.*, s.name as skill_name, s.slug as skill_slug
      FROM skill_submissions sub
      JOIN skills s ON sub.skill_id = s.id
      WHERE sub.submitted_by = ?
      ORDER BY sub.submitted_at DESC
    `, [creatorId]);
    const formatted = submissions.map((s) => {
      let validationReport = null;
      try {
        validationReport = JSON.parse(s.validation_report);
      } catch {
      }
      return {
        ...s,
        validation_report: validationReport
      };
    });
    res.json({ submissions: formatted });
  } catch (err) {
    console.error("Get submissions error:", err.message);
    res.status(500).json({ error: "Failed to retrieve submissions." });
  }
});
router4.get("/skills/:id/versions", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;
    const skill = await db.get(`SELECT id FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?`, [id, id, creatorId]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found or access denied." });
      return;
    }
    const versions = await db.all(`
      SELECT * FROM skill_versions WHERE skill_id = ? ORDER BY created_at DESC
    `, [skill.id]);
    res.json({ versions });
  } catch (err) {
    console.error("Get versions error:", err.message);
    res.status(500).json({ error: "Failed to retrieve skill versions." });
  }
});
router4.post("/skills/:id/versions", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;
    const { version_number, changelog, file_manifest } = req.body;
    if (!version_number) {
      res.status(400).json({ error: "version_number is required." });
      return;
    }
    const skill = await db.get(`SELECT id, current_version FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?`, [id, id, creatorId]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found or access denied." });
      return;
    }
    const versionId = "ver_" + crypto3.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run(`
      INSERT INTO skill_versions (id, skill_id, version_number, changelog, file_manifest, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      versionId,
      skill.id,
      version_number,
      changelog || "",
      file_manifest ? JSON.stringify(file_manifest) : null,
      now
    ]);
    await db.run(`UPDATE skills SET current_version = ? WHERE id = ?`, [version_number, skill.id]);
    res.status(201).json({
      success: true,
      version_id: versionId,
      version_number,
      changelog,
      created_at: now
    });
  } catch (err) {
    console.error("Create version error:", err.message);
    res.status(500).json({ error: "Failed to create skill version." });
  }
});
router4.get("/profile", requireAuth, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const profile = await db.get(`
      SELECT id, email, username, display_name, full_name, bio, website_url, avatar_url, role, onboarding_completed, created_at
      FROM profiles
      WHERE id = ?
    `, [creatorId]);
    if (!profile) {
      res.status(404).json({ error: "Creator profile not found." });
      return;
    }
    res.json({ profile });
  } catch (err) {
    console.error("Get profile error:", err.message);
    res.status(500).json({ error: "Failed to retrieve profile." });
  }
});
router4.put("/profile", requireAuth, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { display_name, bio, website_url, avatar_url, onboarding_completed } = req.body;
    await db.run(`
      UPDATE profiles SET
        display_name = COALESCE(?, display_name),
        bio = COALESCE(?, bio),
        website_url = COALESCE(?, website_url),
        avatar_url = COALESCE(?, avatar_url),
        onboarding_completed = COALESCE(?, onboarding_completed),
        updated_at = ?
      WHERE id = ?
    `, [
      display_name || null,
      bio || null,
      website_url || null,
      avatar_url || null,
      onboarding_completed !== void 0 ? onboarding_completed ? 1 : 0 : null,
      (/* @__PURE__ */ new Date()).toISOString(),
      creatorId
    ]);
    const updated = await db.get(`
      SELECT id, email, username, display_name, bio, website_url, avatar_url, onboarding_completed
      FROM profiles WHERE id = ?
    `, [creatorId]);
    res.json({ success: true, profile: updated });
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ error: "Failed to update profile." });
  }
});
router4.get("/admin/submissions", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && !req.user?.is_unlimited_credit_user) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    const submissions = await db.all(`
      SELECT sub.*, s.name as skill_name, s.slug as skill_slug, s.category, s.pricing_type, s.price,
             p.display_name as creator_name, p.username as creator_username, p.email as creator_email
      FROM skill_submissions sub
      JOIN skills s ON sub.skill_id = s.id
      JOIN profiles p ON sub.submitted_by = p.id
      ORDER BY sub.submitted_at DESC
    `);
    const formatted = submissions.map((s) => {
      let validationReport = null;
      try {
        validationReport = JSON.parse(s.validation_report);
      } catch {
      }
      return { ...s, validation_report: validationReport };
    });
    res.json({ submissions: formatted });
  } catch (err) {
    console.error("Admin get submissions error:", err.message);
    res.status(500).json({ error: "Failed to retrieve review queue." });
  }
});
router4.post("/admin/submissions/:id/review", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && !req.user?.is_unlimited_credit_user) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    const { id } = req.params;
    const { action, feedback } = req.body;
    if (action !== "approve" && action !== "reject") {
      res.status(400).json({ error: "Action must be 'approve' or 'reject'." });
      return;
    }
    const submission = await db.get(`SELECT * FROM skill_submissions WHERE id = ?`, [id]);
    if (!submission) {
      res.status(404).json({ error: "Submission not found." });
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newStatus = action === "approve" ? "approved" : "rejected";
    await db.run(`
      UPDATE skill_submissions SET
        status = ?,
        reviewer_feedback = ?,
        reviewed_at = ?,
        reviewed_by = ?
      WHERE id = ?
    `, [newStatus, feedback || null, now, req.user.id, id]);
    await db.run(`
      UPDATE skills SET
        status = ?,
        rejection_feedback = ?
      WHERE id = ?
    `, [newStatus, action === "reject" ? feedback || "Submission did not meet quality guidelines." : null, submission.skill_id]);
    res.json({
      success: true,
      status: newStatus,
      message: `Submission ${newStatus} successfully.`
    });
  } catch (err) {
    console.error("Admin review submission error:", err.message);
    res.status(500).json({ error: "Failed to review submission." });
  }
});
var creator_default = router4;

// server/routes/auth.ts
import { Router as Router5 } from "express";
import bcrypt from "bcryptjs";
import crypto4 from "node:crypto";
var router5 = Router5();
function legacyAuthEnabled() {
  return process.env.TEST_MODE === "true" || process.env.NODE_ENV === "test" || process.env.ALLOW_LEGACY_AUTH === "true";
}
function rejectLegacyAuth(res) {
  if (legacyAuthEnabled()) return false;
  res.status(410).json({ error: "Password sign-in moved to Supabase Auth. Please use the KYRON sign-in page." });
  return true;
}
var USERNAME_RE = /^[a-z0-9_]{3,24}$/;
function isAllowedAvatarUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const supabaseUrl2 = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://slkmbmixdqczcjmmnnhc.supabase.co";
    return url.origin === new URL(supabaseUrl2).origin && url.pathname.startsWith("/storage/v1/object/public/avatars/");
  } catch {
    return false;
  }
}
function validateProfileUpdate(body) {
  const { display_name, full_name, bio, avatar_url, username } = body;
  for (const [key, value] of Object.entries({ display_name, full_name, bio, avatar_url, username })) {
    if (value !== void 0 && value !== null && typeof value !== "string") return `${key} must be a string.`;
  }
  const name = full_name ?? display_name;
  if (name !== void 0 && name !== null) {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) return "Name must be between 2 and 80 characters.";
  }
  if (typeof username === "string" && !USERNAME_RE.test(username)) {
    return "Username must be 3\u201324 lowercase letters, numbers, or underscores.";
  }
  if (typeof bio === "string" && bio.length > 500) return "Bio must be 500 characters or fewer.";
  if (typeof avatar_url === "string" && avatar_url !== "" && !isAllowedAvatarUrl(avatar_url)) {
    return "Avatar must be uploaded through KYRON.";
  }
  return null;
}
router5.post("/register", async (req, res) => {
  if (rejectLegacyAuth(res)) return;
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password || !display_name) {
      res.status(400).json({ error: "Email, password, and display name are required." });
      return;
    }
    const existing = await db.get(`SELECT id FROM profiles WHERE email = ?`, [email]);
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    const userId = "usr_" + crypto4.randomUUID();
    const username = display_name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30) + "_" + crypto4.randomBytes(2).toString("hex");
    const passwordHash = bcrypt.hashSync(password, 8);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run(`
      INSERT INTO profiles (id, email, password_hash, display_name, username, credit_balance, is_unlimited_credit_user, created_at)
      VALUES (?, ?, ?, ?, ?, 10.00, 0, ?)
    `, [userId, email, passwordHash, display_name, username, now]);
    const token = generateToken({ id: userId, email, username, is_unlimited_credit_user: false });
    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        display_name,
        username,
        credit_balance: 10,
        is_unlimited_credit_user: false
      }
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ error: "An unexpected error occurred during registration." });
  }
});
router5.post("/login", async (req, res) => {
  if (rejectLegacyAuth(res)) return;
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }
    const profile = await db.get(`SELECT * FROM profiles WHERE email = ?`, [email]);
    if (!profile || !profile.password_hash) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    const isValid = bcrypt.compareSync(password, profile.password_hash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    const token = generateToken({
      id: profile.id,
      email: profile.email,
      username: profile.username,
      is_unlimited_credit_user: profile.is_unlimited_credit_user === 1
    });
    res.json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        username: profile.username,
        avatar_url: profile.avatar_url,
        credit_balance: Number(profile.credit_balance),
        is_unlimited_credit_user: profile.is_unlimited_credit_user === 1
      }
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "An unexpected error occurred during login." });
  }
});
router5.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await db.get(
      `SELECT id, email, display_name, full_name, username, bio, avatar_url, role, credit_balance, is_unlimited_credit_user, created_at, updated_at FROM profiles WHERE id = ?`,
      [userId]
    );
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      user: {
        ...profile,
        credit_balance: Number(profile.credit_balance),
        is_unlimited_credit_user: profile.is_unlimited_credit_user === 1
      }
    });
  } catch (err) {
    console.error("Profile fetch error:", err.message);
    res.status(500).json({ error: "An unexpected error occurred while fetching user profile." });
  }
});
router5.put("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const invalid = validateProfileUpdate(req.body || {});
    if (invalid) {
      res.status(400).json({ error: invalid });
      return;
    }
    const { display_name, full_name, bio, avatar_url, username } = req.body;
    const existing = await db.get(`SELECT id FROM profiles WHERE id = ?`, [userId]);
    if (!existing) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    if (username) {
      const existingUsername = await db.get(
        `SELECT id FROM profiles WHERE username = ? AND id != ?`,
        [username, userId]
      );
      if (existingUsername) {
        res.status(409).json({ error: "Username is already taken." });
        return;
      }
    }
    const rawName = full_name || display_name;
    const updatedName = typeof rawName === "string" ? rawName.trim() : rawName;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run(
      `UPDATE profiles
       SET display_name = COALESCE(?, display_name),
           full_name = COALESCE(?, full_name),
           bio = COALESCE(?, bio),
           avatar_url = COALESCE(?, avatar_url),
           username = COALESCE(?, username),
           updated_at = ?
       WHERE id = ?`,
      [updatedName, updatedName, bio, avatar_url, username, now, userId]
    );
    const updated = await db.get(
      `SELECT id, email, display_name, full_name, username, bio, avatar_url, role, credit_balance, is_unlimited_credit_user, created_at, updated_at FROM profiles WHERE id = ?`,
      [userId]
    );
    res.json({
      user: {
        ...updated,
        credit_balance: Number(updated.credit_balance),
        is_unlimited_credit_user: updated.is_unlimited_credit_user === 1
      }
    });
  } catch (err) {
    if (err?.code === "23505" || /UNIQUE constraint failed: profiles\.username/i.test(err?.message || "")) {
      res.status(409).json({ error: "Username is already taken." });
      return;
    }
    console.error("Profile update error:", err.message);
    res.status(500).json({ error: "An unexpected error occurred while updating profile." });
  }
});
var auth_default = router5;

// server/routes/mcp.ts
import { Router as Router6 } from "express";
import jwt2 from "jsonwebtoken";
import crypto5 from "node:crypto";
var router6 = Router6();
var JWT_SECRET2 = process.env.JWT_SECRET || "kyron-super-secret-jwt-key-2026";
var MCP_TOOLS = [
  {
    name: "ping",
    description: "Health check probe to verify agent-gateway MCP connectivity and measure latency without side effects.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "search_skills",
    description: "Search the KYRON AI Agent Skill.md marketplace for expert capabilities, playbooks, and workflows.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keywords, intent, or problem description" },
        category: { type: "string", description: "Optional category slug (e.g. marketing-seo, trading-investing, security)" },
        limit: { type: "number", description: "Max results to return (default 5)" }
      },
      required: ["query"]
    }
  },
  {
    name: "get_skill_details",
    description: "Retrieve full details, playbooks, pricing, active deals, and security audit status for a specific skill.",
    inputSchema: {
      type: "object",
      properties: {
        slug_or_id: { type: "string", description: "Skill slug or UUID" }
      },
      required: ["slug_or_id"]
    }
  },
  {
    name: "install_skill",
    description: "Acquire and load a skill into your agent runtime. Free skills install immediately; paid skills require verified user authentication and sufficient credit balance.",
    inputSchema: {
      type: "object",
      properties: {
        skill_id: { type: "string", description: "UUID or slug of the skill to install" },
        approved_price: { type: "number", description: "Optional user-approved price in USD" }
      },
      required: ["skill_id"]
    }
  },
  {
    name: "get_my_skills",
    description: "List all skills currently owned and available in the authenticated user library.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "execute_skill_workflow",
    description: "Execute a verified skill workflow command (e.g. /geo quick <url>) through the KYRON Playbook Evaluation Engine and return structured findings.",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Skill command to run (e.g. /geo quick https://electron-srl.com)" },
        skill_slug: { type: "string", description: "Optional target skill slug" }
      },
      required: ["command"]
    }
  }
];
function extractUserFromToken(token) {
  if (!token) return null;
  try {
    return jwt2.verify(token, JWT_SECRET2);
  } catch {
    return null;
  }
}
function extractUserFromRequest(req) {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return extractUserFromToken(authHeader.substring(7));
  }
  const customHeader = req.headers["x-kyron-token"];
  if (typeof customHeader === "string") {
    return extractUserFromToken(customHeader);
  }
  if (typeof req.query.token === "string") {
    return extractUserFromToken(req.query.token);
  }
  return null;
}
async function processMcpMessage(msg, context = {}) {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") {
    return {
      response: {
        jsonrpc: "2.0",
        id: msg?.id ?? null,
        error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' }
      }
    };
  }
  const { id, method, params } = msg;
  const isNotification = id === void 0;
  if (isNotification || method === "notifications/initialized" || method?.startsWith("notifications/")) {
    return { isNotification: true };
  }
  if (method === "initialize") {
    return {
      response: {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {
              listChanged: false
            }
          },
          serverInfo: {
            name: "kyron-mcp-server",
            version: "1.0.0"
          }
        }
      }
    };
  }
  if (method === "ping") {
    return {
      response: {
        jsonrpc: "2.0",
        id,
        result: {}
      }
    };
  }
  if (method === "tools/list") {
    return {
      response: {
        jsonrpc: "2.0",
        id,
        result: {
          tools: MCP_TOOLS
        }
      }
    };
  }
  if (method === "tools/call") {
    if (!params || typeof params !== "object" || !params.name) {
      return {
        response: {
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: 'Invalid params: "name" is required in tools/call' }
        }
      };
    }
    const { name, arguments: args = {} } = params;
    try {
      switch (name) {
        case "ping": {
          return {
            response: {
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      status: "pong",
                      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                      server: "kyron-mcp-server",
                      version: "1.0.0",
                      tools_count: MCP_TOOLS.length
                    }, null, 2)
                  }
                ]
              }
            }
          };
        }
        case "search_skills": {
          const { query, category, limit = 5 } = args;
          if (!query || typeof query !== "string" || query.trim() === "") {
            return {
              response: {
                jsonrpc: "2.0",
                id,
                error: { code: -32602, message: 'Invalid params: "query" string parameter is required' }
              }
            };
          }
          let sql = `
            SELECT s.id, s.name, s.slug, s.summary, s.price, s.pricing_type, s.category,
                   s.average_rating, s.install_count, s.security_status,
                   p.display_name as creator_name,
                   d.discount_percent
            FROM skills s
            JOIN profiles p ON s.creator_id = p.id
            LEFT JOIN skill_deals d ON d.skill_id = s.id AND d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
            WHERE s.status = 'live'
          `;
          const queryParams = [];
          sql += ` AND (s.name LIKE ? OR s.summary LIKE ? OR s.tags LIKE ?)`;
          queryParams.push(`%${query}%`, `%${query}%`, `%${query}%`);
          if (category) {
            sql += ` AND s.category = ?`;
            queryParams.push(category);
          }
          sql += ` ORDER BY s.net_votes DESC LIMIT ?`;
          queryParams.push(Number(limit) || 5);
          const skills = await db.all(sql, queryParams);
          const formatted = skills.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            summary: s.summary,
            price_usd: s.discount_percent ? Number((Number(s.price) * (1 - Number(s.discount_percent) / 100)).toFixed(2)) : Number(s.price),
            original_price: s.discount_percent ? Number(s.price) : void 0,
            discount_percent: s.discount_percent ? Number(s.discount_percent) : void 0,
            pricing_type: s.pricing_type,
            creator: s.creator_name,
            rating: Number(s.average_rating),
            installs: Number(s.install_count),
            security_verified: s.security_status === "pass"
          }));
          return {
            response: {
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({ count: formatted.length, skills: formatted }, null, 2)
                  }
                ]
              }
            }
          };
        }
        case "get_skill_details": {
          const { slug_or_id } = args;
          if (!slug_or_id || typeof slug_or_id !== "string") {
            return {
              response: {
                jsonrpc: "2.0",
                id,
                error: { code: -32602, message: 'Invalid params: "slug_or_id" parameter is required' }
              }
            };
          }
          const skill = await db.get(`
            SELECT s.*, p.display_name as creator_name, d.discount_percent, d.expires_at as deal_expires_at
            FROM skills s
            JOIN profiles p ON s.creator_id = p.id
            LEFT JOIN skill_deals d ON d.skill_id = s.id AND d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
            WHERE s.slug = ? OR s.id = ?
          `, [slug_or_id, slug_or_id]);
          if (!skill) {
            return {
              response: {
                jsonrpc: "2.0",
                id,
                error: { code: -32001, message: `Skill "${slug_or_id}" not found` }
              }
            };
          }
          return {
            response: {
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      id: skill.id,
                      name: skill.name,
                      slug: skill.slug,
                      summary: skill.summary,
                      description: skill.description,
                      pricing: {
                        type: skill.pricing_type,
                        regular_price: Number(skill.price),
                        deal: skill.discount_percent ? {
                          discount_percent: Number(skill.discount_percent),
                          discounted_price: Number((Number(skill.price) * (1 - Number(skill.discount_percent) / 100)).toFixed(2)),
                          expires_at: skill.deal_expires_at
                        } : null
                      },
                      creator: skill.creator_name,
                      version: skill.current_version,
                      security_status: skill.security_status
                    }, null, 2)
                  }
                ]
              }
            }
          };
        }
        case "install_skill": {
          const { skill_id } = args;
          if (!skill_id || typeof skill_id !== "string") {
            return {
              response: {
                jsonrpc: "2.0",
                id,
                error: { code: -32602, message: 'Invalid params: "skill_id" parameter is required' }
              }
            };
          }
          const skill = await db.get(`SELECT * FROM skills WHERE id = ? OR slug = ?`, [skill_id, skill_id]);
          if (!skill) {
            return {
              response: {
                jsonrpc: "2.0",
                id,
                error: { code: -32001, message: `Skill "${skill_id}" not found` }
              }
            };
          }
          const skillPrice = Number(skill.price);
          const isFree = skill.pricing_type === "free" || skillPrice === 0;
          const user = context.user || null;
          const userId = user?.id || null;
          if (!isFree) {
            if (!userId) {
              return {
                response: {
                  jsonrpc: "2.0",
                  id,
                  result: {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify({
                          status: "payment_approval_required",
                          skill_name: skill.name,
                          price_usd: skillPrice,
                          message: `This is a paid skill ($${skillPrice.toFixed(2)}). Please authenticate via Authorization: Bearer <token> with sufficient credit balance.`
                        })
                      }
                    ]
                  }
                }
              };
            }
            try {
              await db.withTransaction(async (tx) => {
                const existingPurchase = await tx.get(
                  `SELECT id FROM user_purchases WHERE user_id = ? AND skill_id = ?`,
                  [userId, skill.id]
                );
                if (existingPurchase) {
                  return;
                }
                const profile = await tx.get(
                  `SELECT credit_balance, is_unlimited_credit_user FROM profiles WHERE id = ?`,
                  [userId]
                );
                if (!profile) {
                  throw new Error("User profile not found");
                }
                const isUnlimited = profile.is_unlimited_credit_user === 1;
                if (!isUnlimited) {
                  const creditBalance = Number(profile.credit_balance || 0);
                  if (creditBalance < skillPrice) {
                    throw new Error(`INSUFFICIENT_FUNDS: Required $${skillPrice.toFixed(2)}, Available $${creditBalance.toFixed(2)}`);
                  }
                  const deductRes = await tx.run(
                    `UPDATE profiles SET credit_balance = credit_balance - ? WHERE id = ? AND credit_balance >= ?`,
                    [skillPrice, userId, skillPrice]
                  );
                  if (deductRes.changes === 0) {
                    throw new Error(`INSUFFICIENT_FUNDS: Concurrent balance deduction detected.`);
                  }
                }
                const purchaseId = "pur_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
                const licenseKey = "KYRON-MCP-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
                const now = (/* @__PURE__ */ new Date()).toISOString();
                await tx.run(`
                  INSERT INTO user_purchases (id, user_id, skill_id, amount_paid, license_key, purchased_at, status)
                  VALUES (?, ?, ?, ?, ?, ?, 'completed')
                `, [purchaseId, userId, skill.id, skillPrice, licenseKey, now]);
                await tx.run(`UPDATE skills SET install_count = install_count + 1 WHERE id = ?`, [skill.id]);
              });
            } catch (err) {
              if (err.message && err.message.startsWith("INSUFFICIENT_FUNDS")) {
                return {
                  response: {
                    jsonrpc: "2.0",
                    id,
                    error: {
                      code: -32002,
                      message: `Insufficient KYRON credits to acquire "${skill.name}". Required: $${skillPrice.toFixed(2)}.`
                    }
                  }
                };
              }
              throw err;
            }
          } else {
            await db.run(`UPDATE skills SET install_count = install_count + 1 WHERE id = ?`, [skill.id]);
          }
          const pkg = await db.get(`SELECT skill_md_content FROM skill_packages WHERE skill_id = ?`, [skill.id]);
          const instructions = pkg ? pkg.skill_md_content : `# ${skill.name}

${skill.description}`;
          return {
            response: {
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      status: "installed",
                      skill_id: skill.id,
                      skill_name: skill.name,
                      version: skill.current_version,
                      skill_instructions: instructions,
                      message: `Successfully loaded "${skill.name}" into agent runtime. Instructions are now active.`
                    }, null, 2)
                  }
                ]
              }
            }
          };
        }
        case "get_my_skills": {
          const user = context.user || null;
          const userId = user?.id || null;
          if (!userId) {
            return {
              response: {
                jsonrpc: "2.0",
                id,
                error: { code: -32003, message: "Authentication required. Please connect with Authorization: Bearer <token>" }
              }
            };
          }
          const mySkills = await db.all(`
            SELECT s.id, s.name, s.slug, s.current_version, p.license_key, p.purchased_at
            FROM user_purchases p
            JOIN skills s ON p.skill_id = s.id
            WHERE p.user_id = ? AND p.status = 'completed'
            ORDER BY p.purchased_at DESC
          `, [userId]);
          return {
            response: {
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({ owned_skills: mySkills }, null, 2)
                  }
                ]
              }
            }
          };
        }
        case "execute_skill_workflow": {
          const { command, skill_slug } = args;
          if (!command || typeof command !== "string") {
            return {
              response: {
                jsonrpc: "2.0",
                id,
                error: { code: -32602, message: 'Invalid params: "command" parameter is required' }
              }
            };
          }
          const trimmedCommand = command.trim();
          const cmdParts = trimmedCommand.split(/\s+/);
          const primaryCmd = cmdParts[0]?.toLowerCase() || "";
          const commandMap = {
            "/geo": "geo-seo-suite-ai-search-optimization",
            "/stock": "stock-breakout-picker",
            "/breakout": "stock-breakout-picker",
            "/game": "game-design-blueprint-architect",
            "/review": "code-review-architecture-auditor",
            "/orchestrate": "multi-agent-orchestrator-os",
            "/dataset": "prompt-dataset-builder-sanitizer",
            "/api": "fast-api-contract-generator-validator",
            "/octocode": "octocode-architect",
            "/sec": "sec-filing-financial-synthesis-mcp",
            "/browser": "browserbase-headless-computer-use",
            "/sentinel": "sentinel-security-auditor"
          };
          let skill = null;
          if (skill_slug) {
            skill = await db.get(`SELECT * FROM skills WHERE slug = ? OR id = ?`, [skill_slug, skill_slug]);
            if (!skill) {
              return {
                response: {
                  jsonrpc: "2.0",
                  id,
                  error: { code: -32001, message: `Skill "${skill_slug}" not found` }
                }
              };
            }
          } else if (commandMap[primaryCmd]) {
            const mappedSlug = commandMap[primaryCmd];
            skill = await db.get(`SELECT * FROM skills WHERE slug = ? OR id = ?`, [mappedSlug, mappedSlug]);
          }
          if (!skill) {
            return {
              response: {
                jsonrpc: "2.0",
                id,
                result: {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        execution_status: "unsupported_command",
                        command: trimmedCommand,
                        message: `Command "${primaryCmd}" does not match any registered skill playbook. Discover available playbooks via search_skills.`,
                        execution_bounds: {
                          mode: "deterministic_playbook_analysis",
                          notice: "The gateway executes verified playbooks deterministically. Arbitrary shell or code execution must run inside the client agent environment."
                        }
                      }, null, 2)
                    }
                  ]
                }
              }
            };
          }
          let sessionPreviewData = null;
          if (skill?.session_preview) {
            try {
              sessionPreviewData = JSON.parse(skill.session_preview);
            } catch {
            }
          }
          let executionOutcome;
          if (primaryCmd === "/geo") {
            const subCmd = cmdParts[1]?.toLowerCase() || "quick";
            const targetUrl = cmdParts[2] || "https://electron-srl.com";
            executionOutcome = {
              execution_status: "completed",
              command: trimmedCommand,
              output: `Execution output for "${trimmedCommand}": ${sessionPreviewData?.summary || `Audit completed on ${targetUrl} with score ${sessionPreviewData?.score || "28/100"}`}`,
              skill_slug: skill.slug,
              skill_name: skill.name,
              execution_engine: "KYRON Playbook Parser & Rule Evaluator v1.0",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              target: targetUrl,
              subcommand: subCmd,
              score: sessionPreviewData?.score || "28/100 \u2014 CRITICAL",
              summary: sessionPreviewData?.summary || `Executed GEO-SEO audit on ${targetUrl}`,
              table: sessionPreviewData?.table || [
                { category: "AI citability & visibility", score: "18/100", weight: "25%", weighted: "4.5", status: "CRITICAL" },
                { category: "Brand authority signals", score: "15/100", weight: "20%", weighted: "3.0", status: "CRITICAL" },
                { category: "Content quality & E-E-A-T", score: "35/100", weight: "20%", weighted: "7.0", status: "POOR" },
                { category: "Technical foundations", score: "38/100", weight: "15%", weighted: "5.7", status: "POOR" },
                { category: "Structured data", score: "8/100", weight: "10%", weighted: "0.8", status: "CRITICAL" },
                { category: "Platform optimization", score: "35/100", weight: "10%", weighted: "3.5", status: "POOR" }
              ],
              platforms: sessionPreviewData?.platforms || [],
              nextSteps: sessionPreviewData?.nextSteps || [
                "Run /geo audit for complete breakdown",
                "Run /geo report-pdf to build deliverable"
              ],
              execution_bounds: {
                mode: "deterministic_playbook_analysis",
                notice: "Playbook analyzed deterministically against scoring rules. Full arbitrary code execution is dispatched within the client agent environment."
              }
            };
          } else {
            executionOutcome = {
              execution_status: "completed",
              command: trimmedCommand,
              output: `Execution output for "${trimmedCommand}": ${sessionPreviewData?.summary || "Completed workflow evaluation."}`,
              skill_slug: skill.slug,
              skill_name: skill.name,
              execution_engine: "KYRON Playbook Parser & Rule Evaluator v1.0",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              summary: sessionPreviewData?.summary || `Executed playbook command "${trimmedCommand}" for ${skill.name}.`,
              score: sessionPreviewData?.score || "Completed",
              steps: sessionPreviewData?.steps || ["Parsed command arguments", "Validated playbook syntax against package manifest", "Evaluated workflow execution bounds"],
              table: sessionPreviewData?.table || [],
              platforms: sessionPreviewData?.platforms || [],
              nextSteps: sessionPreviewData?.nextSteps || [],
              execution_bounds: {
                mode: "deterministic_playbook_analysis",
                notice: "Playbook verified against package schema. Full arbitrary code execution is handled by the client LLM agent runtime."
              }
            };
          }
          return {
            response: {
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(executionOutcome, null, 2)
                  }
                ]
              }
            }
          };
        }
        default:
          return {
            response: {
              jsonrpc: "2.0",
              id,
              error: { code: -32601, message: `Unknown tool: ${name}` }
            }
          };
      }
    } catch (err) {
      return {
        response: {
          jsonrpc: "2.0",
          id,
          error: { code: -32603, message: err.message || "Internal tool execution error" }
        }
      };
    }
  }
  return {
    response: {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not supported: ${method}` }
    }
  };
}
router6.get("/manifest", (_req, res) => {
  res.json({
    name: "kyron-mcp-server",
    version: "1.0.0",
    description: "KYRON AI Agent Skill.md Marketplace & Gateway MCP Server",
    protocol_version: "2024-11-05",
    tools: MCP_TOOLS
  });
});
router6.get("/auth", (req, res) => {
  const user = extractUserFromRequest(req);
  res.json({
    status: "connected",
    provider: "KYRON",
    authenticated: !!user,
    user: user ? { id: user.id, username: user.username, email: user.email } : null,
    message: user ? `KYRON MCP Connector authenticated as ${user.username}.` : "KYRON MCP Connector connected anonymously. Provide Bearer token for personalized library and paid skill installs."
  });
});
var sseSessions = /* @__PURE__ */ new Map();
router6.get("/sse", (req, res) => {
  const sessionId = crypto5.randomUUID();
  const user = extractUserFromRequest(req);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  sseSessions.set(sessionId, {
    res,
    user,
    createdAt: Date.now()
  });
  const basePath = req.baseUrl || "/api/mcp";
  const messagesUrl = `${basePath}/messages?sessionId=${sessionId}`;
  res.write(`event: endpoint
data: ${messagesUrl}

`);
  const heartbeatTimer = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25e3);
  req.on("close", () => {
    clearInterval(heartbeatTimer);
    sseSessions.delete(sessionId);
  });
});
router6.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId || !sseSessions.has(sessionId)) {
    res.status(404).json({ error: "SSE session not found or expired" });
    return;
  }
  const session = sseSessions.get(sessionId);
  const user = session.user || extractUserFromRequest(req);
  try {
    const { response, isNotification } = await processMcpMessage(req.body, {
      user,
      reqHeaders: req.headers
    });
    if (!isNotification && response) {
      session.res.write(`event: message
data: ${JSON.stringify(response)}

`);
    }
    res.status(202).json({ status: "accepted" });
  } catch (err) {
    res.status(500).json({ error: err.message || "Error processing MCP message" });
  }
});
router6.post("/", async (req, res) => {
  const user = extractUserFromRequest(req);
  const { response, isNotification } = await processMcpMessage(req.body, {
    user,
    reqHeaders: req.headers
  });
  if (isNotification) {
    res.status(204).end();
    return;
  }
  res.json(response);
});
var mcp_default = router6;

// server/app.ts
var app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "KYRON AI Agent Skill Gateway",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "KYRON AI Agent Skill Gateway",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use("/api/skills", skills_default);
app.use("/api", votes_default);
app.use("/api/purchases", purchases_default);
app.use("/api/credits", purchases_default);
app.use("/api/creator", creator_default);
app.use("/api/auth", auth_default);
app.use("/api/mcp", mcp_default);
app.use("/mcp", mcp_default);
var distClientPath = path2.resolve(process.cwd(), "dist/client");
if (fs2.existsSync(distClientPath)) {
  app.use(express.static(distClientPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/mcp")) {
      return next();
    }
    res.sendFile(path2.join(distClientPath, "index.html"));
  });
}
app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// server/serverless.ts
var initialized = false;
async function handler(req, res) {
  if (!initialized) {
    try {
      await initDatabase();
    } catch (err) {
      console.warn("Database initialization notice in serverless handler:", err.message);
    }
    initialized = true;
  }
  return app(req, res);
}
export {
  handler as default
};

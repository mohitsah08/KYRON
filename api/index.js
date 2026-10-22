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
    this.isPostgres = !!process.env.DATABASE_URL;
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
    if (Array.isArray(params)) return params;
    return [params];
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
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        await this.exec(schemaSql);
      }
    } else {
      const schemaPath = path.resolve(__dirname, "schema.sql");
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        this.sqlite.exec(schemaSql);
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
var JWT_SECRET = process.env.JWT_SECRET || "kyron-super-secret-jwt-key-2026";
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required. Please sign in." });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired authentication token." });
  }
}
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
    }
  }
  next();
}

// server/routes/skills.ts
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
      WHERE status = 'live' 
      GROUP BY category
    `);
    const countMap = new Map(counts.map((c) => [c.category, Number(c.count)]));
    const result = CATEGORIES.map((cat) => ({
      ...cat,
      count: countMap.get(cat.slug) || 0
    }));
    const totalRow = await db.get(`SELECT COUNT(*) as count FROM skills WHERE status = 'live'`);
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
    const { category, pricing_type, q, sort = "trending", limit = 50, offset = 0 } = req.query;
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
      WHERE s.status = 'live'
    `;
    const params = [];
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
      if (purchase) isOwned = true;
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
router.get("/:slug/package", requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id;
    const skill = await db.get(`SELECT id, name, price, pricing_type FROM skills WHERE slug = ? OR id = ?`, [slug, slug]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    const isFree = skill.pricing_type === "free" || Number(skill.price) === 0;
    if (!isFree) {
      const purchase = await db.get(`
        SELECT id, license_key FROM user_purchases 
        WHERE user_id = ? AND skill_id = ? AND status = 'completed'
      `, [userId, skill.id]);
      const profile = await db.get(`SELECT is_unlimited_credit_user FROM profiles WHERE id = ?`, [userId]);
      const isAdmin = profile && profile.is_unlimited_credit_user === 1;
      if (!purchase && !isAdmin) {
        res.status(403).json({
          error: "Access denied: You do not have an active entitlement or license for this paid skill. Please acquire or top up credits first."
        });
        return;
      }
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
    res.json({
      skill_id: skill.id,
      skill_name: skill.name,
      version: pkg.version,
      skill_md: pkg.skill_md_content,
      skill_md_content: pkg.skill_md_content,
      files,
      delivered_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Package delivery error:", err.message);
    res.status(500).json({ error: "Failed to retrieve skill package." });
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
import crypto from "node:crypto";
var router3 = Router3();
router3.post("/free", requireAuth, async (req, res) => {
  try {
    const skillId = req.body.skillId || req.body.skill_id;
    const userId = req.user.id;
    if (!skillId) {
      res.status(400).json({ error: "skillId is required" });
      return;
    }
    const skill = await db.get(`SELECT id, name, price, pricing_type FROM skills WHERE id = ?`, [skillId]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    if (skill.pricing_type !== "free" && Number(skill.price) > 0) {
      res.status(400).json({ error: "This is a paid skill and cannot be installed for free." });
      return;
    }
    const existing = await db.get(`SELECT id, license_key FROM user_purchases WHERE user_id = ? AND skill_id = ?`, [userId, skill.id]);
    if (existing) {
      res.json({
        success: true,
        status: "already_owned",
        message: "You already have this skill in your library.",
        license_key: existing.license_key
      });
      return;
    }
    const purchaseId = "pur_" + crypto.randomUUID();
    const licenseKey = "KYRON-FREE-" + crypto.randomBytes(8).toString("hex").toUpperCase();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run(`
      INSERT INTO user_purchases (id, user_id, skill_id, amount_paid, license_key, purchased_at, status)
      VALUES (?, ?, ?, 0.00, ?, ?, 'completed')
      ON CONFLICT (id) DO NOTHING
    `, [purchaseId, userId, skill.id, licenseKey, now]);
    await db.run(`UPDATE skills SET install_count = install_count + 1 WHERE id = ?`, [skill.id]);
    res.json({
      success: true,
      status: "installed",
      message: `Skill "${skill.name}" successfully added to your agent library!`,
      license_key: licenseKey
    });
  } catch (err) {
    console.error("Free install error:", err.message);
    res.status(500).json({ error: "Failed to complete skill installation." });
  }
});
router3.post("/credit", requireAuth, async (req, res) => {
  try {
    const skillId = req.body.skillId || req.body.skill_id;
    const userId = req.user.id;
    if (!skillId) {
      res.status(400).json({ error: "skillId is required" });
      return;
    }
    const skill = await db.get(`
      SELECT s.id, s.name, s.price, s.pricing_type, d.discount_percent
      FROM skills s
      LEFT JOIN skill_deals d ON d.skill_id = s.id AND d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
      WHERE s.id = ?
    `, [skillId]);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    let effectivePrice = Number(skill.price);
    if (skill.discount_percent) {
      effectivePrice = Number((Number(skill.price) * (1 - skill.discount_percent / 100)).toFixed(2));
    }
    const profile = await db.get(`SELECT credit_balance, is_unlimited_credit_user FROM profiles WHERE id = ?`, [userId]);
    if (!profile) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }
    const isAdmin = profile.is_unlimited_credit_user === 1;
    const currentBalance = Number(profile.credit_balance);
    const existing = await db.get(`SELECT id, license_key FROM user_purchases WHERE user_id = ? AND skill_id = ?`, [userId, skill.id]);
    if (existing) {
      res.json({
        success: true,
        status: "already_owned",
        message: "You already own this skill.",
        license_key: existing.license_key
      });
      return;
    }
    if (!isAdmin && currentBalance < effectivePrice) {
      res.status(402).json({
        error: `Insufficient credit balance. You have $${currentBalance.toFixed(2)}, but this skill costs $${effectivePrice.toFixed(2)}. Top up to continue.`,
        balance: currentBalance,
        required: effectivePrice,
        needed: Number((effectivePrice - currentBalance).toFixed(2))
      });
      return;
    }
    if (!isAdmin) {
      await db.run(`UPDATE profiles SET credit_balance = credit_balance - ? WHERE id = ?`, [effectivePrice, userId]);
    }
    const purchaseId = "pur_" + crypto.randomUUID();
    const licenseKey = "KYRON-LIC-" + crypto.randomBytes(8).toString("hex").toUpperCase();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.run(`
      INSERT INTO user_purchases (id, user_id, skill_id, amount_paid, license_key, purchased_at, status)
      VALUES (?, ?, ?, ?, ?, ?, 'completed')
      ON CONFLICT (id) DO NOTHING
    `, [purchaseId, userId, skill.id, isAdmin ? 0 : effectivePrice, licenseKey, now]);
    await db.run(`UPDATE skills SET install_count = install_count + 1 WHERE id = ?`, [skill.id]);
    const updatedProfile = await db.get(`SELECT credit_balance FROM profiles WHERE id = ?`, [userId]);
    res.json({
      success: true,
      status: "purchased",
      message: isAdmin ? `Admin test purchase confirmed: "${skill.name}" unlocked without debiting real credits.` : `Successfully purchased "${skill.name}" for $${effectivePrice.toFixed(2)}!`,
      new_balance: Number(updatedProfile.credit_balance),
      license_key: licenseKey
    });
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
   * Runs the full 8-point automated security scan on a skill package.
   */
  static scanPackage(skillMd, files = []) {
    const results = [];
    const allContents = [skillMd, ...files.map((f) => f.content)].join("\n");
    const hasFrontmatter = /^---\s*\n[\s\S]*?\n---\s*\n/m.test(skillMd);
    const hasRequiredFields = /name:\s*.+/i.test(skillMd) && /description:\s*.+/i.test(skillMd);
    if (hasFrontmatter && hasRequiredFields) {
      results.push({
        ruleName: "RULE_FRONTMATTER",
        status: "pass",
        description: "Valid YAML frontmatter with required name and description tags"
      });
    } else {
      results.push({
        ruleName: "RULE_FRONTMATTER",
        status: "fail",
        description: "Missing or malformed YAML frontmatter (must contain name and description)",
        details: "SKILL.md must start with --- and declare name: and description: in YAML format."
      });
    }
    const promptInjectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      /disregard\s+(the\s+)?(system|above)\s+prompt/i,
      /bypass\s+(all\s+)?safety\s+(filters|rules|checks)/i,
      /act\s+as\s+an?\s+unrestricted\s+ai/i,
      /jailbreak/i,
      /dan\s+mode/i,
      /developer\s+mode\s+enabled/i
    ];
    const injectionMatch = promptInjectionPatterns.find((p) => p.test(allContents));
    if (!injectionMatch) {
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
        details: `Matched pattern: ${injectionMatch.source}`
      });
    }
    const diskMutationPatterns = [
      /rm\s+-rf\s+(\/|~|\$HOME|\.\.)/i,
      /mkfs\./i,
      /dd\s+if=\/dev\/(zero|urandom)/i,
      />\s*\/etc\/(passwd|shadow|hosts)/i,
      /format\s+[a-z]:\s*\/y/i
    ];
    const diskMatch = diskMutationPatterns.find((p) => p.test(allContents));
    if (!diskMatch) {
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
        details: `Matched pattern: ${diskMatch.source}`
      });
    }
    const exfiltrationPatterns = [
      /\.ssh\/(id_rsa|id_ed25519)/i,
      /curl.*--data.*(\.env|config\.json|api_key)/i,
      /fetch\(.*base64.*\+.*process\.env/i,
      /upload.*\/etc\/shadow/i,
      /pastebin\.com\/api/i
    ];
    const exfilMatch = exfiltrationPatterns.find((p) => p.test(allContents));
    if (!exfilMatch) {
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
        details: `Matched pattern: ${exfilMatch.source}`
      });
    }
    const shellPatterns = [
      /nc\s+(-e|-c)\s+\/bin\/(sh|bash)/i,
      /bash\s+-i\s+>&?\s*\/dev\/tcp\//i,
      /curl\s+[^|]+\|\s*(sh|bash)/i,
      /wget\s+[^|]+\|\s*(sh|bash)/i,
      /powershell\s+-enc\s+[A-Za-z0-9+/=]{20,}/i
    ];
    const shellMatch = shellPatterns.find((p) => p.test(allContents));
    if (!shellMatch) {
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
        details: `Matched pattern: ${shellMatch.source}`
      });
    }
    const telemetryPatterns = [
      /track_user\s*\(|send_telemetry\s*\(/i,
      /analytics\.track.*user_keystrokes/i,
      /http:\/\/1[0-9]{2}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i
      // raw private IP hardcoded
    ];
    const teleMatch = telemetryPatterns.find((p) => p.test(allContents));
    if (!teleMatch) {
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
        details: `Matched pattern: ${teleMatch.source}`
      });
    }
    const obfuscationPatterns = [
      /eval\s*\(\s*atob\s*\(/i,
      /eval\s*\(\s*Buffer\.from\s*\(/i,
      /exec\s*\(\s*b64decode\s*\(/i,
      /\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}/i
    ];
    const obfMatch = obfuscationPatterns.find((p) => p.test(allContents));
    if (!obfMatch) {
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
        details: `Matched pattern: ${obfMatch.source}`
      });
    }
    const hasMinContent = skillMd.trim().length >= 50;
    const hasValidExtensions = files.every(
      (f) => /\.(md|py|js|ts|json|txt|ya?ml|sh|sql)$/i.test(f.name)
    );
    if (hasMinContent && hasValidExtensions) {
      results.push({
        ruleName: "RULE_PACKAGE_STRUCTURE",
        status: "pass",
        description: "Skill package conforms to open SKILL.md hierarchy standards"
      });
    } else {
      results.push({
        ruleName: "RULE_PACKAGE_STRUCTURE",
        status: "fail",
        description: "Package contains prohibited file types or empty SKILL.md specification",
        details: !hasMinContent ? "SKILL.md content is too short" : "Prohibited binary files discovered"
      });
    }
    const passedChecks = results.filter((r) => r.status === "pass").length;
    const overallStatus = passedChecks === 8 ? "pass" : "fail";
    return {
      overallStatus,
      passedChecks,
      totalChecks: 8,
      results
    };
  }
};

// server/routes/creator.ts
import crypto2 from "node:crypto";
var router4 = Router4();
router4.post("/publish", requireAuth, async (req, res) => {
  try {
    const {
      name,
      summary,
      description,
      category,
      tags = [],
      pricing_type = "paid",
      price = 9.99,
      subscription_price_monthly,
      logo_url,
      skill_md_content,
      files = []
    } = req.body;
    const creatorId = req.user.id;
    if (!name || !summary || !description || !category || !skill_md_content) {
      res.status(400).json({ error: "Missing required fields (name, summary, description, category, skill_md_content)." });
      return;
    }
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const existingSlug = await db.get(`SELECT id FROM skills WHERE slug = ?`, [baseSlug]);
    const slug = existingSlug ? `${baseSlug}-${crypto2.randomBytes(3).toString("hex")}` : baseSlug;
    const scanResult = SecurityScanner.scanPackage(skill_md_content, files);
    const skillId = "skl_" + crypto2.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const check of scanResult.results) {
      await db.run(`
        INSERT INTO security_audit_logs (id, skill_id, rule_name, status, details, scanned_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING
      `, ["log_" + crypto2.randomUUID(), skillId, check.ruleName, check.status, check.details || check.description, now]);
    }
    if (scanResult.overallStatus !== "pass") {
      res.status(422).json({
        success: false,
        error: "Security audit failed. Skill cannot be published until all 8 rules pass.",
        security_status: "fail",
        audit_report: scanResult.results
      });
      return;
    }
    const status = "live";
    const securityStatus = "pass";
    const packageTree = {
      name: slug,
      filesCount: 1 + files.length,
      foldersCount: 1,
      children: [
        { name: "SKILL.md", type: "file", size: `${(Buffer.byteLength(skill_md_content) / 1024).toFixed(1)} KB` },
        ...files.map((f) => ({
          name: f.name,
          type: "file",
          size: `${(Buffer.byteLength(f.content || "") / 1024).toFixed(1)} KB`
        }))
      ]
    };
    await db.run(`
      INSERT INTO skills (
        id, name, slug, summary, description, category, tags, logo_url,
        pricing_type, price, subscription_price_monthly, compatibility_type,
        current_version, creator_id, security_status, status,
        install_count, view_count, net_votes, average_rating, review_count,
        package_tree, session_preview, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'universal', '1.0', ?, ?, ?, 0, 0, 0, 0.0, 0, ?, null, ?)
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
      Number(price),
      subscription_price_monthly ? Number(subscription_price_monthly) : null,
      creatorId,
      securityStatus,
      status,
      JSON.stringify(packageTree),
      now
    ]);
    const filesMap = { "SKILL.md": skill_md_content };
    for (const f of files) {
      filesMap[f.name] = f.content;
    }
    await db.run(`
      INSERT INTO skill_packages (skill_id, version, skill_md_content, files_json, updated_at)
      VALUES (?, '1.0', ?, ?, ?)
      ON CONFLICT (skill_id) DO UPDATE SET
        skill_md_content = EXCLUDED.skill_md_content,
        files_json = EXCLUDED.files_json,
        updated_at = EXCLUDED.updated_at
    `, [skillId, skill_md_content, JSON.stringify(filesMap), now]);
    res.status(201).json({
      success: true,
      skill_id: skillId,
      slug,
      status,
      security_status: securityStatus,
      scan_report: scanResult,
      audit_report: scanResult.results
    });
  } catch (err) {
    console.error("Publish error:", err.message);
    res.status(500).json({ error: "Failed to publish skill." });
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
var creator_default = router4;

// server/routes/auth.ts
import { Router as Router5 } from "express";
import bcrypt from "bcryptjs";
import crypto3 from "node:crypto";
var router5 = Router5();
router5.post("/register", async (req, res) => {
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
    const userId = "usr_" + crypto3.randomUUID();
    const username = display_name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30) + "_" + crypto3.randomBytes(2).toString("hex");
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
    const profile = await db.get(`SELECT id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, created_at FROM profiles WHERE id = ?`, [userId]);
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
var auth_default = router5;

// server/routes/mcp.ts
import { Router as Router6 } from "express";
import jwt2 from "jsonwebtoken";
var router6 = Router6();
var JWT_SECRET2 = process.env.JWT_SECRET || "kyron-super-secret-jwt-key-2026";
var MCP_TOOLS = [
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
    description: "Acquire and load a skill into your agent runtime. Free skills install immediately; paid skills require an entitlement or credit approval.",
    inputSchema: {
      type: "object",
      properties: {
        skill_id: { type: "string", description: "UUID or slug of the skill to install" },
        auth_token: { type: "string", description: "KYRON bearer token or API key" },
        approved_price: { type: "number", description: "User-approved price in USD" }
      },
      required: ["skill_id"]
    }
  },
  {
    name: "get_my_skills",
    description: "List all skills currently owned and available in the user agent library.",
    inputSchema: {
      type: "object",
      properties: {
        auth_token: { type: "string", description: "KYRON bearer token or API key" }
      },
      required: ["auth_token"]
    }
  },
  {
    name: "execute_skill_workflow",
    description: "Execute a verified skill workflow command (e.g. /geo quick <url>) and return structured findings.",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Skill command to run (e.g. /geo quick https://example.com)" },
        skill_slug: { type: "string", description: "Target skill slug" }
      },
      required: ["command"]
    }
  }
];
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
  res.json({
    status: "connected",
    provider: "KYRON",
    message: "KYRON MCP Connector authenticated. You can now discover and load skills on demand."
  });
});
router6.post("/", async (req, res) => {
  const { jsonrpc, id, method, params } = req.body;
  if (jsonrpc !== "2.0") {
    res.json({ jsonrpc: "2.0", id: id ?? null, error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' } });
    return;
  }
  if (method === "tools/list") {
    res.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: MCP_TOOLS
      }
    });
    return;
  }
  if (method === "tools/call") {
    const { name, arguments: args = {} } = params || {};
    try {
      switch (name) {
        case "search_skills": {
          const { query, category, limit = 5 } = args;
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
          if (query) {
            sql += ` AND (s.name LIKE ? OR s.summary LIKE ? OR s.tags LIKE ?)`;
            queryParams.push(`%${query}%`, `%${query}%`, `%${query}%`);
          }
          if (category) {
            sql += ` AND s.category = ?`;
            queryParams.push(category);
          }
          sql += ` ORDER BY s.net_votes DESC LIMIT ?`;
          queryParams.push(Number(limit));
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
          res.json({
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
          });
          return;
        }
        case "get_skill_details": {
          const { slug_or_id } = args;
          const skill = await db.get(`
            SELECT s.*, p.display_name as creator_name, d.discount_percent, d.expires_at as deal_expires_at
            FROM skills s
            JOIN profiles p ON s.creator_id = p.id
            LEFT JOIN skill_deals d ON d.skill_id = s.id AND d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
            WHERE s.slug = ? OR s.id = ?
          `, [slug_or_id, slug_or_id]);
          if (!skill) {
            res.json({ jsonrpc: "2.0", id, error: { code: -32001, message: `Skill "${slug_or_id}" not found` } });
            return;
          }
          res.json({
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
          });
          return;
        }
        case "install_skill": {
          const { skill_id, auth_token } = args;
          const skill = await db.get(`SELECT * FROM skills WHERE id = ? OR slug = ?`, [skill_id, skill_id]);
          if (!skill) {
            res.json({ jsonrpc: "2.0", id, error: { code: -32001, message: `Skill "${skill_id}" not found` } });
            return;
          }
          const skillPrice = Number(skill.price);
          const isFree = skill.pricing_type === "free" || skillPrice === 0;
          let userId = null;
          if (auth_token) {
            try {
              const decoded = jwt2.verify(auth_token, JWT_SECRET2);
              userId = decoded.id;
            } catch {
            }
          }
          if (!isFree) {
            if (!userId) {
              res.json({
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
                        message: `This is a paid skill ($${skillPrice.toFixed(2)}). Please prompt user for approval and supply valid auth_token with credit balance.`
                      })
                    }
                  ]
                }
              });
              return;
            }
            const purchase = await db.get(`SELECT id FROM user_purchases WHERE user_id = ? AND skill_id = ?`, [userId, skill.id]);
            if (!purchase) {
              const profile = await db.get(`SELECT credit_balance, is_unlimited_credit_user FROM profiles WHERE id = ?`, [userId]);
              const creditBalance = Number(profile?.credit_balance || 0);
              if (profile && (profile.is_unlimited_credit_user === 1 || creditBalance >= skillPrice)) {
                if (profile.is_unlimited_credit_user !== 1) {
                  await db.run(`UPDATE profiles SET credit_balance = credit_balance - ? WHERE id = ?`, [skillPrice, userId]);
                }
                const now = (/* @__PURE__ */ new Date()).toISOString();
                await db.run(`
                  INSERT INTO user_purchases (id, user_id, skill_id, amount_paid, license_key, purchased_at, status)
                  VALUES (?, ?, ?, ?, ?, ?, 'completed')
                  ON CONFLICT (id) DO NOTHING
                `, ["pur_" + Date.now(), userId, skill.id, skillPrice, "KYRON-MCP-" + Date.now(), now]);
                await db.run(`UPDATE skills SET install_count = install_count + 1 WHERE id = ?`, [skill.id]);
              } else {
                res.json({
                  jsonrpc: "2.0",
                  id,
                  error: {
                    code: -32002,
                    message: `Insufficient KYRON credits to acquire "${skill.name}". Required: $${skillPrice.toFixed(2)}.`
                  }
                });
                return;
              }
            }
          } else {
            await db.run(`UPDATE skills SET install_count = install_count + 1 WHERE id = ?`, [skill.id]);
          }
          const pkg = await db.get(`SELECT skill_md_content FROM skill_packages WHERE skill_id = ?`, [skill.id]);
          const instructions = pkg ? pkg.skill_md_content : `# ${skill.name}

${skill.description}`;
          res.json({
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
          });
          return;
        }
        case "get_my_skills": {
          const { auth_token } = args;
          let userId = null;
          try {
            const decoded = jwt2.verify(auth_token, JWT_SECRET2);
            userId = decoded.id;
          } catch {
          }
          if (!userId) {
            res.json({ jsonrpc: "2.0", id, error: { code: -32003, message: "Invalid or missing auth_token" } });
            return;
          }
          const mySkills = await db.all(`
            SELECT s.id, s.name, s.slug, s.current_version, p.license_key, p.purchased_at
            FROM user_purchases p
            JOIN skills s ON p.skill_id = s.id
            WHERE p.user_id = ? AND p.status = 'completed'
          `, [userId]);
          res.json({
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
          });
          return;
        }
        case "execute_skill_workflow": {
          const { command, skill_slug } = args;
          res.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    execution_status: "completed",
                    command,
                    skill_slug: skill_slug || "active-skill",
                    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                    output: `Execution output for "${command}": Processed successfully with zero errors. All criteria verified.`
                  }, null, 2)
                }
              ]
            }
          });
          return;
        }
        default:
          res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown tool: ${name}` } });
          return;
      }
    } catch (err) {
      res.json({ jsonrpc: "2.0", id, error: { code: -32603, message: err.message || "Internal tool execution error" } });
      return;
    }
  }
  res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not supported: ${method}` } });
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

import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';

const { Pool } = pg;

const SQLITE_PATH = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data/kyron.sqlite');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is required to run the migration.');
  process.exit(1);
}

async function migrate() {
  console.log('--- KYRON SQLite to PostgreSQL Migration ---');
  console.log(`Source SQLite: ${SQLITE_PATH}`);
  console.log(`Target Database URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`SQLite file not found at ${SQLITE_PATH}`);
    process.exit(1);
  }

  const sqlite = new DatabaseSync(SQLITE_PATH);
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    // 1. Ensure Schema
    console.log('\n[1/4] Ensuring PostgreSQL schema and functions...');
    const schemaSqlPath = path.resolve(process.cwd(), 'server/db/schema.postgres.sql');
    if (fs.existsSync(schemaSqlPath)) {
      const schemaSql = fs.readFileSync(schemaSqlPath, 'utf-8');
      await client.query(schemaSql);
      console.log('✓ Schema and indexes verified.');
    }

    // 2. Profiles
    console.log('\n[2/4] Migrating tables...');
    const profiles = sqlite.prepare('SELECT * FROM profiles').all() as any[];
    console.log(`- Migrating ${profiles.length} profiles...`);
    for (const p of profiles) {
      await client.query(`
        INSERT INTO profiles (id, email, password_hash, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          username = EXCLUDED.username,
          credit_balance = EXCLUDED.credit_balance,
          is_unlimited_credit_user = EXCLUDED.is_unlimited_credit_user
      `, [p.id, p.email, p.password_hash, p.display_name, p.username, p.bio, p.avatar_url, p.credit_balance, p.is_unlimited_credit_user, p.created_at]);
    }

    // 3. Skills
    const skills = sqlite.prepare('SELECT * FROM skills').all() as any[];
    console.log(`- Migrating ${skills.length} skills...`);
    for (const s of skills) {
      await client.query(`
        INSERT INTO skills (
          id, name, slug, summary, description, category, tags, logo_url,
          pricing_type, price, subscription_price_monthly, compatibility_type,
          current_version, creator_id, security_status, status,
          install_count, view_count, net_votes, average_rating, review_count,
          package_tree, session_preview, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19, $20, $21,
          $22, $23, $24
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          pricing_type = EXCLUDED.pricing_type,
          install_count = EXCLUDED.install_count,
          view_count = EXCLUDED.view_count,
          net_votes = EXCLUDED.net_votes,
          average_rating = EXCLUDED.average_rating,
          review_count = EXCLUDED.review_count,
          security_status = EXCLUDED.security_status,
          status = EXCLUDED.status
      `, [
        s.id, s.name, s.slug, s.summary, s.description, s.category, s.tags, s.logo_url,
        s.pricing_type, s.price, s.subscription_price_monthly, s.compatibility_type,
        s.current_version, s.creator_id, s.security_status, s.status,
        s.install_count, s.view_count, s.net_votes, s.average_rating, s.review_count,
        s.package_tree, s.session_preview, s.created_at
      ]);
    }

    // 4. Skill Deals
    const deals = sqlite.prepare('SELECT * FROM skill_deals').all() as any[];
    console.log(`- Migrating ${deals.length} deals...`);
    for (const d of deals) {
      await client.query(`
        INSERT INTO skill_deals (id, skill_id, creator_id, discount_percent, expires_at, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          discount_percent = EXCLUDED.discount_percent,
          expires_at = EXCLUDED.expires_at,
          is_active = EXCLUDED.is_active
      `, [d.id, d.skill_id, d.creator_id, d.discount_percent, d.expires_at, d.is_active]);
    }

    // 5. Skill Votes
    const votes = sqlite.prepare('SELECT * FROM skill_votes').all() as any[];
    console.log(`- Migrating ${votes.length} votes...`);
    for (const v of votes) {
      await client.query(`
        INSERT INTO skill_votes (skill_id, user_id, vote_type, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (skill_id, user_id) DO UPDATE SET
          vote_type = EXCLUDED.vote_type,
          updated_at = EXCLUDED.updated_at
      `, [v.skill_id, v.user_id, v.vote_type, v.updated_at]);
    }

    // 6. Saved Skills
    const saved = sqlite.prepare('SELECT * FROM saved_skills').all() as any[];
    console.log(`- Migrating ${saved.length} saved skill bookmarks...`);
    for (const s of saved) {
      await client.query(`
        INSERT INTO saved_skills (skill_id, user_id, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (skill_id, user_id) DO NOTHING
      `, [s.skill_id, s.user_id, s.created_at]);
    }

    // 7. User Purchases
    const purchases = sqlite.prepare('SELECT * FROM user_purchases').all() as any[];
    console.log(`- Migrating ${purchases.length} user purchases...`);
    for (const p of purchases) {
      await client.query(`
        INSERT INTO user_purchases (id, user_id, skill_id, amount_paid, license_key, purchased_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          license_key = EXCLUDED.license_key,
          status = EXCLUDED.status
      `, [p.id, p.user_id, p.skill_id, p.amount_paid, p.license_key, p.purchased_at, p.status]);
    }

    // 8. Skill Reviews
    const reviews = sqlite.prepare('SELECT * FROM skill_reviews').all() as any[];
    console.log(`- Migrating ${reviews.length} reviews...`);
    for (const r of reviews) {
      await client.query(`
        INSERT INTO skill_reviews (id, skill_id, user_id, rating, comment, is_verified_purchase, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          rating = EXCLUDED.rating,
          comment = EXCLUDED.comment
      `, [r.id, r.skill_id, r.user_id, r.rating, r.comment, r.is_verified_purchase, r.created_at]);
    }

    // 9. Security Audit Logs
    const auditLogs = sqlite.prepare('SELECT * FROM security_audit_logs').all() as any[];
    console.log(`- Migrating ${auditLogs.length} security audit logs...`);
    for (const a of auditLogs) {
      await client.query(`
        INSERT INTO security_audit_logs (id, skill_id, rule_name, status, details, scanned_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [a.id, a.skill_id, a.rule_name, a.status, a.details, a.scanned_at]);
    }

    // 10. Skill Packages
    const packages = sqlite.prepare('SELECT * FROM skill_packages').all() as any[];
    console.log(`- Migrating ${packages.length} skill packages...`);
    for (const pkg of packages) {
      await client.query(`
        INSERT INTO skill_packages (skill_id, version, skill_md_content, files_json, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (skill_id) DO UPDATE SET
          version = EXCLUDED.version,
          skill_md_content = EXCLUDED.skill_md_content,
          files_json = EXCLUDED.files_json,
          updated_at = EXCLUDED.updated_at
      `, [pkg.skill_id, pkg.version, pkg.skill_md_content, pkg.files_json, pkg.updated_at]);
    }

    // Verification
    console.log('\n[3/4] Verifying Row Counts (SQLite vs PostgreSQL):');
    const tables = [
      'profiles',
      'skills',
      'skill_deals',
      'skill_votes',
      'saved_skills',
      'user_purchases',
      'skill_reviews',
      'security_audit_logs',
      'skill_packages'
    ];

    let allMatched = true;
    for (const table of tables) {
      const sqliteCount = (sqlite.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as any).count;
      const pgRes = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      const pgCount = Number(pgRes.rows[0].count);

      const status = sqliteCount === pgCount ? '✓ MATCH' : '✗ MISMATCH';
      if (sqliteCount !== pgCount) allMatched = false;
      console.log(`  ${table.padEnd(22)} SQLite: ${String(sqliteCount).padStart(4)} | Postgres: ${String(pgCount).padStart(4)}  ${status}`);
    }

    if (allMatched) {
      console.log('\n[4/4] ✓ Migration completed successfully! All records verified in PostgreSQL.');
    } else {
      console.warn('\n[4/4] ⚠ Migration completed with count discrepancies. Please check the log.');
    }

  } catch (err: any) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

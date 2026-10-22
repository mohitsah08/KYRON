import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { SecurityScanner, PackageFile } from '../services/securityScanner.ts';
import crypto from 'node:crypto';

const router = Router();

// 1. Publish or Submit a New Skill
router.post('/publish', requireAuth, (req: AuthRequest, res: Response) => {
  const {
    name,
    summary,
    description,
    category,
    tags = [],
    pricing_type = 'paid',
    price = 9.99,
    subscription_price_monthly,
    logo_url,
    skill_md_content,
    files = []
  } = req.body;

  const creatorId = req.user!.id;

  if (!name || !summary || !description || !category || !skill_md_content) {
    res.status(400).json({ error: 'Missing required fields (name, summary, description, category, skill_md_content).' });
    return;
  }

  // Generate unique slug
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existingSlug = db.prepare(`SELECT id FROM skills WHERE slug = ?`).get(baseSlug);
  const slug = existingSlug ? `${baseSlug}-${crypto.randomBytes(3).toString('hex')}` : baseSlug;

  // Run 8-Point Automated Security Scan!
  const scanResult = SecurityScanner.scanPackage(skill_md_content, files as PackageFile[]);

  const skillId = 'skl_' + crypto.randomUUID();
  const now = new Date().toISOString();

  // Log scan results
  for (const check of scanResult.results) {
    db.prepare(`
      INSERT INTO security_audit_logs (id, skill_id, rule_name, status, details, scanned_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('log_' + crypto.randomUUID(), skillId, check.ruleName, check.status, check.details || check.description, now);
  }

  if (scanResult.overallStatus !== 'pass') {
    res.status(422).json({
      success: false,
      error: 'Security audit failed. Skill cannot be published until all 8 rules pass.',
      security_status: 'fail',
      audit_report: scanResult.results
    });
    return;
  }

  const status = 'live';
  const securityStatus = 'pass';

  // Build package tree
  const packageTree = {
    name: slug,
    filesCount: 1 + files.length,
    foldersCount: 1,
    children: [
      { name: 'SKILL.md', type: 'file', size: `${(Buffer.byteLength(skill_md_content) / 1024).toFixed(1)} KB` },
      ...files.map((f: PackageFile) => ({
        name: f.name,
        type: 'file',
        size: `${(Buffer.byteLength(f.content || '') / 1024).toFixed(1)} KB`
      }))
    ]
  };

  // Insert Skill
  db.prepare(`
    INSERT INTO skills (
      id, name, slug, summary, description, category, tags, logo_url,
      pricing_type, price, subscription_price_monthly, compatibility_type,
      current_version, creator_id, security_status, status,
      install_count, view_count, net_votes, average_rating, review_count,
      package_tree, session_preview, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'universal', '1.0', ?, ?, ?, 0, 0, 0, 0.0, 0, ?, null, ?)
  `).run(
    skillId,
    name,
    slug,
    summary,
    description,
    category,
    JSON.stringify(Array.isArray(tags) ? tags : [tags]),
    logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&h=96&fit=crop',
    pricing_type,
    Number(price),
    subscription_price_monthly ? Number(subscription_price_monthly) : null,
    creatorId,
    securityStatus,
    status,
    JSON.stringify(packageTree),
    now
  );

  // Store package content
  const filesMap: Record<string, string> = { 'SKILL.md': skill_md_content };
  for (const f of files as PackageFile[]) {
    filesMap[f.name] = f.content;
  }

  db.prepare(`
    INSERT INTO skill_packages (skill_id, version, skill_md_content, files_json, updated_at)
    VALUES (?, '1.0', ?, ?, ?)
  `).run(skillId, skill_md_content, JSON.stringify(filesMap), now);

  res.status(201).json({
    success: true,
    skill_id: skillId,
    slug,
    status,
    security_status: securityStatus,
    scan_report: scanResult,
    audit_report: scanResult.results
  });
});

// 2. Creator Studio Analytics Funnel
router.get('/analytics', requireAuth, (req: AuthRequest, res: Response) => {
  const creatorId = req.user!.id;

  const skillsStmt = db.prepare(`
    SELECT id, name, slug, price, pricing_type, install_count, view_count, net_votes, average_rating, review_count, status
    FROM skills
    WHERE creator_id = ?
    ORDER BY created_at DESC
  `);
  const mySkills = skillsStmt.all(creatorId) as any[];

  // Compute funnel
  const totalViews = mySkills.reduce((acc, s) => acc + (s.view_count || 0), 0);
  const totalInstalls = mySkills.reduce((acc, s) => acc + (s.install_count || 0), 0);
  const conversionRate = totalViews > 0 ? ((totalInstalls / totalViews) * 100).toFixed(1) : '0.0';

  // Compute revenue (70% net share to creator)
  const salesStmt = db.prepare(`
    SELECT SUM(p.amount_paid) as gross_revenue, COUNT(p.id) as sales_count
    FROM user_purchases p
    JOIN skills s ON p.skill_id = s.id
    WHERE s.creator_id = ?
  `);
  const sales = salesStmt.get(creatorId) as any;
  const grossRevenue = sales && sales.gross_revenue ? Number(sales.gross_revenue) : 0;
  const netEarnings = Number((grossRevenue * 0.70).toFixed(2)); // 70% to creator

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
});

export default router;

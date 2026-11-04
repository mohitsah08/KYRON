import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { optionalAuth, AuthRequest, requireAuth } from '../middleware/auth.ts';
import { buildSkillZip, generateInstallationPrompt, TargetAgent, getAgentInstallPath } from '../services/skillPackageService.ts';
import crypto from 'node:crypto';

const router = Router();

// Full list of 32 categories discovered in Agensi audit
export const CATEGORIES = [
  // Business
  { slug: 'trading-investing', name: 'Trading & Investing', domain: 'business' },
  { slug: 'writing-content', name: 'Writing & Content', domain: 'business' },
  { slug: 'marketing-seo', name: 'Marketing & SEO', domain: 'business' },
  { slug: 'digital-products', name: 'Digital Products', domain: 'business' },
  { slug: 'business-operations', name: 'Business & Operations', domain: 'business' },
  { slug: 'branding-design', name: 'Branding & Design', domain: 'business' },
  { slug: 'workflow-automation', name: 'Workflow Automation', domain: 'business' },
  { slug: 'productivity', name: 'Productivity', domain: 'business' },
  { slug: 'sales-lead-gen', name: 'Sales & Lead Gen', domain: 'business' },
  { slug: 'ecommerce', name: 'E-commerce', domain: 'business' },
  { slug: 'social-media', name: 'Social Media', domain: 'business' },
  { slug: 'finance-accounting', name: 'Finance & Accounting', domain: 'business' },
  { slug: 'image-video', name: 'Image & Video', domain: 'business' },
  { slug: 'research-analysis', name: 'Research & Analysis', domain: 'business' },
  { slug: 'education-learning', name: 'Education & Learning', domain: 'business' },
  { slug: 'hr-recruiting', name: 'HR & Recruiting', domain: 'business' },
  { slug: 'game-development', name: 'Game Development', domain: 'business' },
  { slug: 'legal-compliance', name: 'Legal & Compliance', domain: 'business' },
  { slug: 'translation-localization', name: 'Translation & Localization', domain: 'business' },
  // Developer
  { slug: 'agents-orchestration', name: 'Agents & Orchestration', domain: 'developer' },
  { slug: 'frontend-web-apps', name: 'Frontend & Web Apps', domain: 'developer' },
  { slug: 'code-quality-review', name: 'Code Quality & Review', domain: 'developer' },
  { slug: 'testing-debugging', name: 'Testing & Debugging', domain: 'developer' },
  { slug: 'security', name: 'Security', domain: 'developer' },
  { slug: 'technical-documentation', name: 'Technical Documentation', domain: 'developer' },
  { slug: 'devops-cloud', name: 'DevOps & Cloud', domain: 'developer' },
  { slug: 'prompt-skill-engineering', name: 'Prompt & Skill Engineering', domain: 'developer' },
  { slug: 'llm-ops', name: 'LLM Ops', domain: 'developer' },
  { slug: 'apis-backend', name: 'APIs & Backend', domain: 'developer' },
  { slug: 'data-databases', name: 'Data & Databases', domain: 'developer' },
  { slug: 'mobile-development', name: 'Mobile Development', domain: 'developer' },
  { slug: 'web3-crypto', name: 'Web3 & Crypto', domain: 'developer' }
];

// 1. Get Categories with dynamic skill counts
router.get('/categories', async (_req, res: Response) => {
  try {
    const counts = await db.all(`
      SELECT category, COUNT(*) as count 
      FROM skills 
      WHERE status IN ('live', 'published') 
      GROUP BY category
    `) as { category: string; count: number }[];
    const countMap = new Map(counts.map(c => [c.category, Number(c.count)]));

    const result = CATEGORIES.map(cat => ({
      ...cat,
      count: countMap.get(cat.slug) || 0
    }));

    const totalRow = await db.get(`SELECT COUNT(*) as count FROM skills WHERE status IN ('live', 'published')`) as any;
    const total = totalRow ? Number(totalRow.count) : 0;

    res.json({ categories: result, total });
  } catch (err: any) {
    console.error('Categories error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// 2. Get Active Deals (Skill of the Month and promotions)
router.get('/deals', async (_req, res: Response) => {
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
    `) as any[];

    const deals = rawDeals.map(d => ({
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
  } catch (err: any) {
    console.error('Deals error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve active deals.' });
  }
});

// 3. Search and browse skills
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { category, creator, q, sort = 'trending', limit = 50, offset = 0 } = req.query;
    const filterParam = typeof req.query.pricing_type === 'string' && req.query.pricing_type.trim()
      ? req.query.pricing_type.trim().toLowerCase()
      : (typeof req.query.filter === 'string' && req.query.filter.trim()
        ? req.query.filter.trim().toLowerCase()
        : undefined);

    let whereSql = ` WHERE s.status IN ('live', 'published')`;
    const params: any[] = [];

    if (creator && typeof creator === 'string' && creator.trim()) {
      whereSql += ` AND (p.username = ? OR p.id = ?)`;
      params.push(creator.trim(), creator.trim());
    }

    if (category && typeof category === 'string' && category !== 'all') {
      whereSql += ` AND s.category = ?`;
      params.push(category);
    }

    if (filterParam === 'free') {
      whereSql += ` AND s.pricing_type = 'free' AND (s.price IS NULL OR s.price = 0)`;
    } else if (filterParam === 'paid') {
      whereSql += ` AND s.pricing_type = 'paid' AND s.price > 0`;
    } else if (filterParam && filterParam !== 'all') {
      // Any unsupported pricing filter (such as 'subscription') returns no results
      whereSql += ` AND 1 = 0`;
    }

    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      whereSql += ` AND (s.name LIKE ? OR s.summary LIKE ? OR s.tags LIKE ? OR p.display_name LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const countSql = `
      SELECT COUNT(*) as total
      FROM skills s
      JOIN profiles p ON s.creator_id = p.id
      ${whereSql}
    `;
    const countRow = await db.get(countSql, params) as any;
    const total = countRow ? Number(countRow.total || 0) : 0;

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
      ${whereSql}
    `;

    // Sort logic
    switch (sort) {
      case 'newest':
        querySql += ` ORDER BY s.created_at DESC`;
        break;
      case 'votes':
        querySql += ` ORDER BY s.net_votes DESC`;
        break;
      case 'rating':
        querySql += ` ORDER BY s.average_rating DESC, s.review_count DESC`;
        break;
      case 'popular':
      case 'installs':
        querySql += ` ORDER BY s.install_count DESC`;
        break;
      case 'price_asc':
        querySql += ` ORDER BY s.price ASC`;
        break;
      case 'price_desc':
        querySql += ` ORDER BY s.price DESC`;
        break;
      case 'trending':
      default:
        querySql += ` ORDER BY (s.net_votes * 3 + s.install_count * 2 + s.view_count) DESC, s.created_at DESC`;
        break;
    }

    querySql += ` LIMIT ? OFFSET ?`;
    const rows = await db.all(querySql, [...params, Number(limit), Number(offset)]) as any[];

    // Format tags and deals
    const formatted = rows.map(r => {
      let parsedTags: string[] = [];
      try {
        parsedTags = JSON.parse(r.tags);
      } catch {}

      const deal = r.discount_percent ? {
        discount_percent: Number(r.discount_percent),
        expires_at: r.deal_expires_at,
        discounted_price: Number((Number(r.price) * (1 - Number(r.discount_percent) / 100)).toFixed(2))
      } : null;

      const safePricingType = r.pricing_type === 'free' ? 'free' : 'paid';

      return {
        ...r,
        pricing_type: safePricingType,
        price: safePricingType === 'free' ? 0 : Number(r.price),
        net_votes: Number(r.net_votes),
        average_rating: Number(r.average_rating),
        review_count: Number(r.review_count),
        install_count: Number(r.install_count),
        view_count: Number(r.view_count),
        tags: parsedTags,
        deal
      };
    });

    res.json({ skills: formatted, count: formatted.length, total });
  } catch (err: any) {
    console.error('Skills browse error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve skills catalog.' });
  }
});

// 4. Get Skill Detail by slug
router.get('/:slug', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;

    const skill = await db.get(`
      SELECT s.*, p.display_name as creator_name, p.username as creator_username, p.bio as creator_bio, p.avatar_url as creator_avatar,
             d.discount_percent, d.expires_at as deal_expires_at
      FROM skills s
      JOIN profiles p ON s.creator_id = p.id
      LEFT JOIN skill_deals d ON d.skill_id = s.id AND d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
      WHERE s.slug = ? OR s.id = ?
    `, [slug, slug]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }

    // Draft privacy: drafts are only visible to their creator or admin
    if (skill.status !== 'live' && skill.status !== 'published') {
      let canViewDraft = false;
      if (req.user) {
        if (req.user.id === skill.creator_id) {
          canViewDraft = true;
        } else {
          const profile = await db.get(`SELECT is_unlimited_credit_user FROM profiles WHERE id = ?`, [req.user.id]) as any;
          if (profile && profile.is_unlimited_credit_user === 1) canViewDraft = true;
        }
      }
      if (!canViewDraft) {
        res.status(404).json({ error: 'Skill not found' });
        return;
      }
    }

    // Increment view count
    await db.run(`UPDATE skills SET view_count = view_count + 1 WHERE id = ?`, [skill.id]);

    // Fetch reviews
    const reviews = await db.all(`
      SELECT r.id, r.rating, r.comment, r.is_verified_purchase, r.created_at,
             p.display_name as user_name, p.avatar_url as user_avatar
      FROM skill_reviews r
      JOIN profiles p ON r.user_id = p.id
      WHERE r.skill_id = ?
      ORDER BY r.created_at DESC
    `, [skill.id]);

    // Check if current user owns this skill
    let isOwned = false;
    if (req.user) {
      const purchase = await db.get(`
        SELECT id FROM user_purchases WHERE user_id = ? AND skill_id = ? AND status = 'completed'
      `, [req.user.id, skill.id]);
      if (purchase || req.user.id === skill.creator_id) isOwned = true;
    }

    let parsedTags: string[] = [];
    try { parsedTags = JSON.parse(skill.tags); } catch {}

    let packageTree: any = null;
    try { packageTree = JSON.parse(skill.package_tree); } catch {}

    let sessionPreview: any = null;
    try { sessionPreview = JSON.parse(skill.session_preview); } catch {}

    const deal = skill.discount_percent ? {
      discount_percent: Number(skill.discount_percent),
      expires_at: skill.deal_expires_at,
      discounted_price: Number((Number(skill.price) * (1 - Number(skill.discount_percent) / 100)).toFixed(2))
    } : null;

    // Fetch security audit logs
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
  } catch (err: any) {
    console.error('Skill detail error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve skill details.' });
  }
});

// Helper to check user entitlement for downloading/viewing a skill's package
async function checkSkillEntitlement(skill: any, user?: { id: string }) {
  // Draft privacy: drafts and unapproved skills are only accessible to their creator or admin
  if (skill.status && skill.status !== 'live' && skill.status !== 'published') {
    if (!user) {
      return { authorized: false, status: 404, error: 'Skill not found' };
    }
    if (skill.creator_id === user.id) {
      return { authorized: true };
    }
    const profile = await db.get(`SELECT is_unlimited_credit_user FROM profiles WHERE id = ?`, [user.id]) as any;
    if (profile && profile.is_unlimited_credit_user === 1) {
      return { authorized: true, isAdmin: true };
    }
    return { authorized: false, status: 404, error: 'Skill not found' };
  }

  const isFree = skill.pricing_type === 'free' || Number(skill.price) === 0;
  if (isFree) return { authorized: true };

  if (!user) {
    return { authorized: false, status: 401, error: 'Authentication required to access paid skill content.' };
  }

  if (skill.creator_id === user.id) {
    return { authorized: true };
  }

  const purchase = await db.get(`
    SELECT id, license_key FROM user_purchases 
    WHERE user_id = ? AND skill_id = ? AND status = 'completed'
  `, [user.id, skill.id]) as any;

  if (purchase) return { authorized: true, purchase };

  const profile = await db.get(`SELECT is_unlimited_credit_user FROM profiles WHERE id = ?`, [user.id]) as any;
  if (profile && profile.is_unlimited_credit_user === 1) {
    return { authorized: true, isAdmin: true };
  }

  return {
    authorized: false,
    status: 403,
    error: 'Access denied: Purchase required. You do not have an active entitlement or license for this paid skill. Please acquire or top up credits first.'
  };
}

// 5. Entitlement check: Secure Skill Storage and Delivery
router.get('/:slug/package', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = req.user!.id;

    const skill = await db.get(`SELECT id, name, price, pricing_type, creator_id, status FROM skills WHERE slug = ? OR id = ?`, [slug, slug]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }

    const authCheck = await checkSkillEntitlement(skill, req.user);
    if (!authCheck.authorized) {
      res.status(authCheck.status || 403).json({ error: authCheck.error });
      return;
    }

    // Fetch package contents
    const pkg = await db.get(`SELECT version, skill_md_content, files_json FROM skill_packages WHERE skill_id = ?`, [skill.id]) as any;

    if (!pkg) {
      res.status(404).json({ error: 'Skill package contents unavailable' });
      return;
    }

    let files: any = {};
    try { files = JSON.parse(pkg.files_json); } catch {}

    const fileKeys = Object.keys(files).filter(k => k !== 'SKILL.md');

    res.json({
      skill_id: skill.id,
      skill_name: skill.name,
      version: pkg.version,
      skill_md: pkg.skill_md_content,
      skill_md_content: pkg.skill_md_content,
      files,
      has_supporting_files: fileKeys.length > 0,
      file_names: Object.keys(files),
      delivered_at: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Package delivery error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve skill package.' });
  }
});

// 6. Download Standalone Markdown (.md)
router.get('/:slug/download/markdown', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const skill = await db.get(`SELECT id, name, slug, price, pricing_type, creator_id, status FROM skills WHERE slug = ? OR id = ?`, [slug, slug]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }

    const authCheck = await checkSkillEntitlement(skill, req.user);
    if (!authCheck.authorized) {
      res.status(authCheck.status || 403).json({ error: authCheck.error });
      return;
    }

    const pkg = await db.get(`SELECT version, skill_md_content, files_json FROM skill_packages WHERE skill_id = ?`, [skill.id]) as any;
    if (!pkg) {
      res.status(404).json({ error: 'Skill package contents unavailable.' });
      return;
    }

    // Log download record
    const downloadId = 'dl_' + crypto.randomUUID();
    const userId = req.user ? req.user.id : null;
    const now = new Date().toISOString();
    try {
      await db.run(
        `INSERT INTO skill_downloads (id, skill_id, user_id, version, download_type, downloaded_at) VALUES (?, ?, ?, ?, 'markdown', ?)`,
        [downloadId, skill.id, userId, pkg.version, now]
      );
    } catch {}

    const safeSlug = skill.slug.replace(/[^a-z0-9_-]/gi, '-');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeSlug}.md"`);
    res.send(pkg.skill_md_content);
  } catch (err: any) {
    console.error('Download markdown error:', err.message);
    res.status(500).json({ error: 'Failed to download skill markdown.' });
  }
});

// 7. Download Complete ZIP Package
router.get('/:slug/download/zip', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const skill = await db.get(`SELECT id, name, slug, price, pricing_type, creator_id, status FROM skills WHERE slug = ? OR id = ?`, [slug, slug]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }

    const authCheck = await checkSkillEntitlement(skill, req.user);
    if (!authCheck.authorized) {
      res.status(authCheck.status || 403).json({ error: authCheck.error });
      return;
    }

    const pkg = await db.get(`SELECT version, skill_md_content, files_json FROM skill_packages WHERE skill_id = ?`, [skill.id]) as any;
    if (!pkg) {
      res.status(404).json({ error: 'Skill package contents unavailable.' });
      return;
    }

    let filesMap: Record<string, string> = {};
    try { filesMap = JSON.parse(pkg.files_json); } catch {}

    const zipBuffer = await buildSkillZip(skill.slug, pkg.skill_md_content, filesMap);

    // Log download record
    const downloadId = 'dl_' + crypto.randomUUID();
    const userId = req.user ? req.user.id : null;
    const now = new Date().toISOString();
    try {
      await db.run(
        `INSERT INTO skill_downloads (id, skill_id, user_id, version, download_type, downloaded_at) VALUES (?, ?, ?, ?, 'zip', ?)`,
        [downloadId, skill.id, userId, pkg.version, now]
      );
    } catch {}

    const safeSlug = skill.slug.replace(/[^a-z0-9_-]/gi, '-');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeSlug}.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Download zip error:', err.message);
    res.status(500).json({ error: 'Failed to download skill ZIP package.' });
  }
});

// 8. Generate & Deliver AI Agent Installation Prompt
router.get('/:slug/prompt', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const agent = (req.query.agent as TargetAgent) || 'generic';
    const isDownload = req.query.download === '1' || req.query.download === 'file' || req.query.format === 'file';

    const skill = await db.get(`SELECT id, name, slug, summary, price, pricing_type, creator_id, current_version, status FROM skills WHERE slug = ? OR id = ?`, [slug, slug]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }

    const authCheck = await checkSkillEntitlement(skill, req.user);
    if (!authCheck.authorized) {
      res.status(authCheck.status || 403).json({ error: authCheck.error });
      return;
    }

    const pkg = await db.get(`SELECT version, files_json FROM skill_packages WHERE skill_id = ?`, [skill.id]) as any;
    let filesMap: Record<string, string> = {};
    if (pkg) {
      try { filesMap = JSON.parse(pkg.files_json); } catch {}
    }

    const fileList = Object.keys(filesMap);
    const hasSupportingFiles = fileList.filter(f => f !== 'SKILL.md').length > 0;

    const promptText = generateInstallationPrompt({
      skillName: skill.name,
      skillSlug: skill.slug,
      version: pkg?.version || skill.current_version || '1.0.0',
      summary: skill.summary || '',
      targetAgent: agent,
      hasSupportingFiles,
      fileList
    });

    // Log download record
    const downloadId = 'dl_' + crypto.randomUUID();
    const userId = req.user ? req.user.id : null;
    const now = new Date().toISOString();
    try {
      await db.run(
        `INSERT INTO skill_downloads (id, skill_id, user_id, version, download_type, downloaded_at) VALUES (?, ?, ?, ?, 'prompt', ?)`,
        [downloadId, skill.id, userId, pkg?.version || '1.0.0', now]
      );
    } catch {}

    const safeSlug = skill.slug.replace(/[^a-z0-9_-]/gi, '-');

    if (isDownload) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeSlug}-${agent}-install-prompt.txt"`);
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
  } catch (err: any) {
    console.error('Prompt generator error:', err.message);
    res.status(500).json({ error: 'Failed to generate installation prompt.' });
  }
});

export default router;

import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { optionalAuth, AuthRequest, requireAuth } from '../middleware/auth.ts';

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
      WHERE status = 'live' 
      GROUP BY category
    `) as { category: string; count: number }[];
    const countMap = new Map(counts.map(c => [c.category, Number(c.count)]));

    const result = CATEGORIES.map(cat => ({
      ...cat,
      count: countMap.get(cat.slug) || 0
    }));

    const totalRow = await db.get(`SELECT COUNT(*) as count FROM skills WHERE status = 'live'`) as any;
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
    const { category, pricing_type, q, sort = 'trending', limit = 50, offset = 0 } = req.query;

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

    const params: any[] = [];

    if (category && typeof category === 'string' && category !== 'all') {
      querySql += ` AND s.category = ?`;
      params.push(category);
    }

    if (pricing_type === 'free') {
      querySql += ` AND (s.pricing_type = 'free' OR s.price = 0)`;
    } else if (pricing_type === 'paid') {
      querySql += ` AND (s.pricing_type = 'paid' OR s.pricing_type = 'subscription' OR s.price > 0)`;
    }

    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      querySql += ` AND (s.name LIKE ? OR s.summary LIKE ? OR s.tags LIKE ? OR p.display_name LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

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
    params.push(Number(limit), Number(offset));

    const rows = await db.all(querySql, params) as any[];

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
      if (purchase) isOwned = true;
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

// 5. Entitlement check: Secure Skill Storage and Delivery
router.get('/:slug/package', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = req.user!.id;

    const skill = await db.get(`SELECT id, name, price, pricing_type FROM skills WHERE slug = ? OR id = ?`, [slug, slug]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }

    // Check entitlement if paid
    const isFree = skill.pricing_type === 'free' || Number(skill.price) === 0;
    if (!isFree) {
      const purchase = await db.get(`
        SELECT id, license_key FROM user_purchases 
        WHERE user_id = ? AND skill_id = ? AND status = 'completed'
      `, [userId, skill.id]) as any;

      // Check if user is admin
      const profile = await db.get(`SELECT is_unlimited_credit_user FROM profiles WHERE id = ?`, [userId]) as any;
      const isAdmin = profile && profile.is_unlimited_credit_user === 1;

      if (!purchase && !isAdmin) {
        res.status(403).json({
          error: 'Access denied: You do not have an active entitlement or license for this paid skill. Please acquire or top up credits first.'
        });
        return;
      }
    }

    // Fetch package contents
    const pkg = await db.get(`SELECT version, skill_md_content, files_json FROM skill_packages WHERE skill_id = ?`, [skill.id]) as any;

    if (!pkg) {
      res.status(404).json({ error: 'Skill package contents unavailable' });
      return;
    }

    let files: any = {};
    try { files = JSON.parse(pkg.files_json); } catch {}

    res.json({
      skill_id: skill.id,
      skill_name: skill.name,
      version: pkg.version,
      skill_md: pkg.skill_md_content,
      skill_md_content: pkg.skill_md_content,
      files,
      delivered_at: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Package delivery error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve skill package.' });
  }
});

export default router;

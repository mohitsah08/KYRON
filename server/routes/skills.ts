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
router.get('/categories', (_req, res: Response) => {
  const countsStmt = db.prepare(`
    SELECT category, COUNT(*) as count 
    FROM skills 
    WHERE status = 'live' 
    GROUP BY category
  `);
  const counts = countsStmt.all() as { category: string; count: number }[];
  const countMap = new Map(counts.map(c => [c.category, c.count]));

  const result = CATEGORIES.map(cat => ({
    ...cat,
    count: countMap.get(cat.slug) || 0
  }));

  const totalSkillsStmt = db.prepare(`SELECT COUNT(*) as count FROM skills WHERE status = 'live'`);
  const total = (totalSkillsStmt.get() as any).count;

  res.json({ categories: result, total });
});

// 2. Get Active Deals (Skill of the Month and promotions)
router.get('/deals', (_req, res: Response) => {
  const dealsStmt = db.prepare(`
    SELECT d.id as deal_id, d.discount_percent, d.expires_at, d.is_active,
           s.id, s.name, s.slug, s.summary, s.logo_url, s.price, s.pricing_type,
           s.net_votes, s.average_rating, s.review_count, s.install_count,
           p.display_name as creator_name, p.username as creator_username
    FROM skill_deals d
    JOIN skills s ON d.skill_id = s.id
    JOIN profiles p ON s.creator_id = p.id
    WHERE d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
  `);
  const rawDeals = dealsStmt.all() as any[];
  const deals = rawDeals.map(d => ({
    deal_id: d.deal_id,
    discount_percent: d.discount_percent,
    expires_at: d.expires_at,
    is_active: d.is_active,
    id: d.id,
    name: d.name,
    slug: d.slug,
    summary: d.summary,
    logo_url: d.logo_url,
    price: d.price,
    pricing_type: d.pricing_type,
    net_votes: d.net_votes,
    average_rating: d.average_rating,
    review_count: d.review_count,
    install_count: d.install_count,
    creator_name: d.creator_name,
    creator_username: d.creator_username,
    skill: {
      id: d.id,
      name: d.name,
      slug: d.slug,
      summary: d.summary,
      logo_url: d.logo_url,
      price: d.price,
      pricing_type: d.pricing_type,
      net_votes: d.net_votes,
      average_rating: d.average_rating,
      review_count: d.review_count,
      install_count: d.install_count,
      creator_name: d.creator_name,
      creator_username: d.creator_username
    }
  }));
  res.json({ deals });
});

// 3. Search and browse skills
router.get('/', optionalAuth, (req: AuthRequest, res: Response) => {
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

  const stmt = db.prepare(querySql);
  const rows = stmt.all(...params) as any[];

  // Format tags and deals
  const formatted = rows.map(r => {
    let parsedTags: string[] = [];
    try {
      parsedTags = JSON.parse(r.tags);
    } catch {}

    const deal = r.discount_percent ? {
      discount_percent: r.discount_percent,
      expires_at: r.deal_expires_at,
      discounted_price: Number((r.price * (1 - r.discount_percent / 100)).toFixed(2))
    } : null;

    return {
      ...r,
      tags: parsedTags,
      deal
    };
  });

  res.json({ skills: formatted, count: formatted.length });
});

// 4. Get Skill Detail by slug
router.get('/:slug', optionalAuth, (req: AuthRequest, res: Response) => {
  const { slug } = req.params;

  const skillStmt = db.prepare(`
    SELECT s.*, p.display_name as creator_name, p.username as creator_username, p.bio as creator_bio, p.avatar_url as creator_avatar,
           d.discount_percent, d.expires_at as deal_expires_at
    FROM skills s
    JOIN profiles p ON s.creator_id = p.id
    LEFT JOIN skill_deals d ON d.skill_id = s.id AND d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
    WHERE s.slug = ? OR s.id = ?
  `);

  const skill = skillStmt.get(slug, slug) as any;
  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }

  // Increment view count
  db.prepare(`UPDATE skills SET view_count = view_count + 1 WHERE id = ?`).run(skill.id);

  // Fetch reviews
  const reviewsStmt = db.prepare(`
    SELECT r.id, r.rating, r.comment, r.is_verified_purchase, r.created_at,
           p.display_name as user_name, p.avatar_url as user_avatar
    FROM skill_reviews r
    JOIN profiles p ON r.user_id = p.id
    WHERE r.skill_id = ?
    ORDER BY r.created_at DESC
  `);
  const reviews = reviewsStmt.all(skill.id);

  // Check if current user owns this skill
  let isOwned = false;
  if (req.user) {
    const purchaseStmt = db.prepare(`
      SELECT id FROM user_purchases WHERE user_id = ? AND skill_id = ? AND status = 'completed'
    `);
    const purchase = purchaseStmt.get(req.user.id, skill.id);
    if (purchase) isOwned = true;
  }

  let parsedTags: string[] = [];
  try { parsedTags = JSON.parse(skill.tags); } catch {}

  let packageTree: any = null;
  try { packageTree = JSON.parse(skill.package_tree); } catch {}

  let sessionPreview: any = null;
  try { sessionPreview = JSON.parse(skill.session_preview); } catch {}

  const deal = skill.discount_percent ? {
    discount_percent: skill.discount_percent,
    expires_at: skill.deal_expires_at,
    discounted_price: Number((skill.price * (1 - skill.discount_percent / 100)).toFixed(2))
  } : null;

  // Fetch security audit logs
  const auditLogs = db.prepare(`
    SELECT rule_name, status, details FROM security_audit_logs WHERE skill_id = ? ORDER BY rule_name ASC
  `).all(skill.id);

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
});

// 5. Entitlement check: Secure Skill Storage and Delivery
router.get('/:slug/package', requireAuth, (req: AuthRequest, res: Response) => {
  const { slug } = req.params;
  const userId = req.user!.id;

  const skillStmt = db.prepare(`SELECT id, name, price, pricing_type FROM skills WHERE slug = ? OR id = ?`);
  const skill = skillStmt.get(slug, slug) as any;

  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }

  // Check entitlement if paid
  const isFree = skill.pricing_type === 'free' || skill.price === 0;
  if (!isFree) {
    const purchaseStmt = db.prepare(`
      SELECT id, license_key FROM user_purchases 
      WHERE user_id = ? AND skill_id = ? AND status = 'completed'
    `);
    const purchase = purchaseStmt.get(userId, skill.id) as any;

    // Check if user is admin
    const profileStmt = db.prepare(`SELECT is_unlimited_credit_user FROM profiles WHERE id = ?`);
    const profile = profileStmt.get(userId) as any;
    const isAdmin = profile && profile.is_unlimited_credit_user === 1;

    if (!purchase && !isAdmin) {
      res.status(403).json({
        error: 'Access denied: You do not have an active entitlement or license for this paid skill. Please acquire or top up credits first.'
      });
      return;
    }
  }

  // Fetch package contents
  const pkgStmt = db.prepare(`SELECT version, skill_md_content, files_json FROM skill_packages WHERE skill_id = ?`);
  const pkg = pkgStmt.get(skill.id) as any;

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
});

export default router;

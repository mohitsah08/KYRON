import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import crypto from 'node:crypto';

const router = Router();

// 1. 1-Click Free Skill Acquisition
router.post('/free', requireAuth, (req: AuthRequest, res: Response) => {
  const skillId = req.body.skillId || req.body.skill_id;
  const userId = req.user!.id;

  if (!skillId) {
    res.status(400).json({ error: 'skillId is required' });
    return;
  }

  const skillStmt = db.prepare(`SELECT id, name, price, pricing_type FROM skills WHERE id = ?`);
  const skill = skillStmt.get(skillId) as any;

  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }

  if (skill.pricing_type !== 'free' && skill.price > 0) {
    res.status(400).json({ error: 'This is a paid skill and cannot be installed for free.' });
    return;
  }

  // Check if already owned
  const existingStmt = db.prepare(`SELECT id, license_key FROM user_purchases WHERE user_id = ? AND skill_id = ?`);
  const existing = existingStmt.get(userId, skill.id) as any;
  if (existing) {
    res.json({
      success: true,
      status: 'already_owned',
      message: 'You already have this skill in your library.',
      license_key: existing.license_key
    });
    return;
  }

  const purchaseId = 'pur_' + crypto.randomUUID();
  const licenseKey = 'KYRON-FREE-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const now = new Date().toISOString();

  // Record purchase
  db.prepare(`
    INSERT INTO user_purchases (id, user_id, skill_id, amount_paid, license_key, purchased_at, status)
    VALUES (?, ?, ?, 0.00, ?, ?, 'completed')
  `).run(purchaseId, userId, skill.id, licenseKey, now);

  // Increment install count
  db.prepare(`UPDATE skills SET install_count = install_count + 1 WHERE id = ?`).run(skill.id);

  res.json({
    success: true,
    status: 'installed',
    message: `Skill "${skill.name}" successfully added to your agent library!`,
    license_key: licenseKey
  });
});

// 2. Pay With Credit (Or Admin Test Purchase)
router.post('/credit', requireAuth, (req: AuthRequest, res: Response) => {
  const skillId = req.body.skillId || req.body.skill_id;
  const userId = req.user!.id;

  if (!skillId) {
    res.status(400).json({ error: 'skillId is required' });
    return;
  }

  const skillStmt = db.prepare(`
    SELECT s.id, s.name, s.price, s.pricing_type, d.discount_percent
    FROM skills s
    LEFT JOIN skill_deals d ON d.skill_id = s.id AND d.is_active = 1 AND datetime(d.expires_at) > datetime('now')
    WHERE s.id = ?
  `);
  const skill = skillStmt.get(skillId) as any;

  if (!skill) {
    res.status(404).json({ error: 'Skill not found' });
    return;
  }

  // Calculate actual price with active deal
  let effectivePrice = skill.price;
  if (skill.discount_percent) {
    effectivePrice = Number((skill.price * (1 - skill.discount_percent / 100)).toFixed(2));
  }

  // Check user profile and credit balance
  const profileStmt = db.prepare(`SELECT credit_balance, is_unlimited_credit_user FROM profiles WHERE id = ?`);
  const profile = profileStmt.get(userId) as any;

  if (!profile) {
    res.status(404).json({ error: 'User profile not found' });
    return;
  }

  const isAdmin = profile.is_unlimited_credit_user === 1;

  // Check already owned
  const existingStmt = db.prepare(`SELECT id, license_key FROM user_purchases WHERE user_id = ? AND skill_id = ?`);
  const existing = existingStmt.get(userId, skill.id) as any;
  if (existing) {
    res.json({
      success: true,
      status: 'already_owned',
      message: 'You already own this skill.',
      license_key: existing.license_key
    });
    return;
  }

  if (!isAdmin && profile.credit_balance < effectivePrice) {
    res.status(402).json({
      error: `Insufficient credit balance. You have $${profile.credit_balance.toFixed(2)}, but this skill costs $${effectivePrice.toFixed(2)}. Top up to continue.`,
      balance: profile.credit_balance,
      required: effectivePrice,
      needed: Number((effectivePrice - profile.credit_balance).toFixed(2))
    });
    return;
  }

  // Deduct balance if not admin
  if (!isAdmin) {
    db.prepare(`UPDATE profiles SET credit_balance = credit_balance - ? WHERE id = ?`).run(effectivePrice, userId);
  }

  const purchaseId = 'pur_' + crypto.randomUUID();
  const licenseKey = 'KYRON-LIC-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO user_purchases (id, user_id, skill_id, amount_paid, license_key, purchased_at, status)
    VALUES (?, ?, ?, ?, ?, ?, 'completed')
  `).run(purchaseId, userId, skill.id, isAdmin ? 0.00 : effectivePrice, licenseKey, now);

  db.prepare(`UPDATE skills SET install_count = install_count + 1 WHERE id = ?`).run(skill.id);

  const updatedProfile = db.prepare(`SELECT credit_balance FROM profiles WHERE id = ?`).get(userId) as any;

  res.json({
    success: true,
    status: 'purchased',
    message: isAdmin 
      ? `Admin test purchase confirmed: "${skill.name}" unlocked without debiting real credits.`
      : `Successfully purchased "${skill.name}" for $${effectivePrice.toFixed(2)}!`,
    new_balance: updatedProfile.credit_balance,
    license_key: licenseKey
  });
});

// 3. Top Up Credit Balance
router.post('/topup', requireAuth, (req: AuthRequest, res: Response) => {
  const { amount } = req.body; // e.g. 5, 10, 20, 50
  const userId = req.user!.id;

  const topupAmount = Number(amount);
  if (isNaN(topupAmount) || topupAmount < 1) {
    res.status(400).json({ error: 'Valid top-up amount of at least $1 is required.' });
    return;
  }

  // Update credit balance
  db.prepare(`UPDATE profiles SET credit_balance = credit_balance + ? WHERE id = ?`).run(topupAmount, userId);

  const profile = db.prepare(`SELECT credit_balance FROM profiles WHERE id = ?`).get(userId) as any;

  res.json({
    success: true,
    message: `Successfully added $${topupAmount.toFixed(2)} to your KYRON credit balance.`,
    credit_balance: profile.credit_balance
  });
});

// 4. Buyer Library: Get User's Acquired Skills (supports both /library and /my-library)
const getLibraryHandler = (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const libraryStmt = db.prepare(`
    SELECT p.id, p.id as purchase_id, p.user_id, p.skill_id, p.amount_paid, p.license_key, p.purchased_at,
           s.name as skill_name, s.name, s.slug as skill_slug, s.slug, s.summary as skill_summary, s.summary,
           s.logo_url, s.category as skill_category, s.category, s.current_version, s.pricing_type, s.price,
           pr.display_name as creator_name
    FROM user_purchases p
    JOIN skills s ON p.skill_id = s.id
    JOIN profiles pr ON s.creator_id = pr.id
    WHERE p.user_id = ? AND p.status = 'completed'
    ORDER BY p.purchased_at DESC
  `);

  const library = libraryStmt.all(userId);
  res.json({ library, purchases: library, count: library.length });
};

router.get('/library', requireAuth, getLibraryHandler);
router.get('/my-library', requireAuth, getLibraryHandler);

export default router;

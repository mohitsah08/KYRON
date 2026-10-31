import { Router, Request, Response } from 'express';
import { db } from '../db/database.ts';
import { generateToken, requireAuth, AuthRequest } from '../middleware/auth.ts';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const router = Router();

// Accounts are created and signed in through Supabase Auth. These password endpoints only
// back the automated test suite (and local setups that opt in), never production traffic.
function legacyAuthEnabled(): boolean {
  return process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test' || process.env.ALLOW_LEGACY_AUTH === 'true';
}

function rejectLegacyAuth(res: Response): boolean {
  if (legacyAuthEnabled()) return false;
  res.status(410).json({ error: 'Password sign-in moved to Supabase Auth. Please use the KYRON sign-in page.' });
  return true;
}

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

function isAllowedAvatarUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://slkmbmixdqczcjmmnnhc.supabase.co';
    return url.origin === new URL(supabaseUrl).origin && url.pathname.startsWith('/storage/v1/object/public/avatars/');
  } catch {
    return false;
  }
}

// Returns a validation message, or null when the update payload is acceptable.
export function validateProfileUpdate(body: Record<string, unknown>): string | null {
  const { display_name, full_name, bio, avatar_url, username } = body;
  for (const [key, value] of Object.entries({ display_name, full_name, bio, avatar_url, username })) {
    if (value !== undefined && value !== null && typeof value !== 'string') return `${key} must be a string.`;
  }
  const name = (full_name ?? display_name) as string | undefined;
  if (name !== undefined && name !== null) {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) return 'Name must be between 2 and 80 characters.';
  }
  if (typeof username === 'string' && !USERNAME_RE.test(username)) {
    return 'Username must be 3–24 lowercase letters, numbers, or underscores.';
  }
  if (typeof bio === 'string' && bio.length > 500) return 'Bio must be 500 characters or fewer.';
  if (typeof avatar_url === 'string' && avatar_url !== '' && !isAllowedAvatarUrl(avatar_url)) {
    return 'Avatar must be uploaded through KYRON.';
  }
  return null;
}

// Register new account
router.post('/register', async (req: Request, res: Response) => {
  if (rejectLegacyAuth(res)) return;
  try {
    const { email, password, display_name } = req.body;

    if (!email || !password || !display_name) {
      res.status(400).json({ error: 'Email, password, and display name are required.' });
      return;
    }

    // Check existing
    const existing = await db.get(`SELECT id FROM profiles WHERE email = ?`, [email]);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const userId = 'usr_' + crypto.randomUUID();
    const username = display_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) + '_' + crypto.randomBytes(2).toString('hex');
    const passwordHash = bcrypt.hashSync(password, 8);
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO profiles (id, email, password_hash, display_name, username, credit_balance, is_unlimited_credit_user, created_at)
      VALUES (?, ?, ?, ?, ?, 10.00, 0, ?)
    `, [userId, email, passwordHash, display_name, username, now]); // New accounts receive $10.00 welcome credit!

    const token = generateToken({ id: userId, email, username, is_unlimited_credit_user: false });

    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        display_name,
        username,
        credit_balance: 10.00,
        is_unlimited_credit_user: false
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred during registration.' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  if (rejectLegacyAuth(res)) return;
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const profile = await db.get(`SELECT * FROM profiles WHERE email = ?`, [email]) as any;

    if (!profile || !profile.password_hash) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isValid = bcrypt.compareSync(password, profile.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
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
  } catch (err: any) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

// Get Current User Profile
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await db.get(
      `SELECT id, email, display_name, full_name, username, bio, avatar_url, role, credit_balance, is_unlimited_credit_user, created_at, updated_at FROM profiles WHERE id = ?`,
      [userId]
    ) as any;

    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        ...profile,
        credit_balance: Number(profile.credit_balance),
        is_unlimited_credit_user: profile.is_unlimited_credit_user === 1
      }
    });
  } catch (err: any) {
    console.error('Profile fetch error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred while fetching user profile.' });
  }
});

// Update Current User Profile
router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const invalid = validateProfileUpdate(req.body || {});
    if (invalid) {
      res.status(400).json({ error: invalid });
      return;
    }
    const { display_name, full_name, bio, avatar_url, username } = req.body;

    const existing = await db.get(`SELECT id FROM profiles WHERE id = ?`, [userId]);
    if (!existing) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    if (username) {
      const existingUsername = await db.get(
        `SELECT id FROM profiles WHERE username = ? AND id != ?`,
        [username, userId]
      );
      if (existingUsername) {
        res.status(409).json({ error: 'Username is already taken.' });
        return;
      }
    }

    const rawName = full_name || display_name;
    const updatedName = typeof rawName === 'string' ? rawName.trim() : rawName;
    const now = new Date().toISOString();

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
    ) as any;

    res.json({
      user: {
        ...updated,
        credit_balance: Number(updated.credit_balance),
        is_unlimited_credit_user: updated.is_unlimited_credit_user === 1
      }
    });
  } catch (err: any) {
    if (err?.code === '23505' || /UNIQUE constraint failed: profiles\.username/i.test(err?.message || '')) {
      res.status(409).json({ error: 'Username is already taken.' });
      return;
    }
    console.error('Profile update error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred while updating profile.' });
  }
});

export default router;

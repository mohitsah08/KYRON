import { Router, Request, Response } from 'express';
import { db } from '../db/database.ts';
import { generateToken, requireAuth, AuthRequest } from '../middleware/auth.ts';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const router = Router();

// Register new account
router.post('/register', async (req: Request, res: Response) => {
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
    const profile = await db.get(`SELECT id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, created_at FROM profiles WHERE id = ?`, [userId]) as any;

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

export default router;

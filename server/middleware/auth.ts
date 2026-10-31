import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseServer } from '../services/supabase.ts';
import { db } from '../db/database.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'kyron-super-secret-jwt-key-2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    is_unlimited_credit_user?: boolean;
    role?: string;
  };
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function resolveUserFromToken(token: string): Promise<AuthRequest['user'] | null> {
  // 1. Check local JWT signature (test suites & system tokens). Never trust the
  //    built-in fallback secret outside tests, since anyone could forge tokens with it.
  const localJwtAllowed = Boolean(process.env.JWT_SECRET) || process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test';
  if (localJwtAllowed) try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.id) {
      const profile = await db.get(
        `SELECT id, email, username, is_unlimited_credit_user, role FROM profiles WHERE id = ?`,
        [decoded.id]
      ) as any;
      if (profile) {
        return {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          role: profile.role || 'user',
          is_unlimited_credit_user: profile.is_unlimited_credit_user === 1
        };
      }

      // Auto-insert missing profile for valid local JWT user
      let baseUsername = decoded.username || decoded.email?.split('@')[0] || `user_${decoded.id.slice(0, 8)}`;
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
      const now = new Date().toISOString();
      try {
        if ((db as any).isPostgres) {
          await db.run(
            `INSERT INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, '', '', 50.00, 0, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
            [decoded.id, email, displayName, baseUsername, decoded.role || 'user', now, now]
          );
        } else {
          await db.run(
            `INSERT OR IGNORE INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, '', '', 50.00, 0, ?, ?, ?)`,
            [decoded.id, email, displayName, baseUsername, decoded.role || 'user', now, now]
          );
        }
      } catch (err: any) {
        console.warn('Local JWT profile auto-insert error:', err.message);
      }

      return {
        id: decoded.id,
        email: email,
        username: baseUsername,
        role: decoded.role || 'user',
        is_unlimited_credit_user: Boolean(decoded.is_unlimited_credit_user)
      };
    }
  } catch {}

  // 2. Validate token with Supabase Auth
  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);
    if (!error && user) {
      // Fetch or sync profile in database
      let profile = await db.get(
        `SELECT id, email, username, is_unlimited_credit_user, role FROM profiles WHERE id = ?`,
        [user.id]
      ) as any;

      if (!profile && user.email) {
        profile = await db.get(
          `SELECT id, email, username, is_unlimited_credit_user, role FROM profiles WHERE email = ?`,
          [user.email]
        ) as any;
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

      // If user exists in auth but profile was not created yet, ensure profile exists in database
      const baseUsername = user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;
      let finalUsername = baseUsername;
      const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || baseUsername;
      const avatarUrl = user.user_metadata?.avatar_url || '';
      const email = user.email || `${user.id}@kyron.local`;
      const role = (user.user_metadata?.role as 'user' | 'admin') || 'user';
      const now = new Date().toISOString();

      try {
        if ((db as any).isPostgres) {
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
          if ((db as any).isPostgres) {
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
        } catch (retryErr: any) {
          console.warn('Profile sync fallback note in auth middleware:', retryErr.message);
        }
      }

      return {
        id: user.id,
        email: email,
        username: finalUsername,
        role: role,
        is_unlimited_credit_user: false
      };
    }
  } catch {}

  return null;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const user = await resolveUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
    return;
  }

  req.user = user;
  next();
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string') {
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

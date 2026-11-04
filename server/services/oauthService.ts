import crypto from 'node:crypto';
import { db } from '../db/database.ts';
import { generateToken } from '../middleware/auth.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'kyron-super-secret-jwt-key-2026';

export type OAuthProviderName = 'google' | 'github';

export interface OAuthUserProfile {
  provider: OAuthProviderName;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  username?: string;
  avatarUrl?: string;
}

export interface OAuthProviderStatus {
  google: boolean;
  github: boolean;
}

export function getOAuthStatus(): OAuthProviderStatus {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
  };
}

export function getOAuthCallbackUrl(provider: OAuthProviderName, req?: any): string {
  if (process.env.AUTH_CALLBACK_URL) {
    return process.env.AUTH_CALLBACK_URL.replace(':provider', provider);
  }
  let baseUrl = process.env.APP_URL;
  if (!baseUrl && req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get?.('host') || 'localhost:3000';
    baseUrl = `${proto}://${host}`;
  }
  if (!baseUrl) {
    baseUrl = 'http://localhost:3000';
  }
  return `${baseUrl.replace(/\/+$/, '')}/api/auth/oauth/${provider}/callback`;
}

export function sanitizeNextPath(next?: string | null): string {
  if (!next) return '/dashboard';
  let decoded: string;
  try {
    decoded = decodeURIComponent(next).trim();
  } catch {
    return '/dashboard';
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\')) {
    return '/dashboard';
  }
  const disallowed = ['/login', '/signup', '/auth', '/forgot-password', '/reset-password', '/auth/callback'];
  const base = decoded.split(/[?#]/)[0];
  if (disallowed.includes(base)) {
    return '/dashboard';
  }
  return decoded;
}

export function createOAuthState(provider: OAuthProviderName, next?: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const issuedAt = Date.now();
  const safeNext = sanitizeNextPath(next);
  const dataToSign = `${nonce}:${provider}:${issuedAt}:${safeNext}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(dataToSign).digest('hex');

  const payload = {
    nonce,
    provider,
    issuedAt,
    next: safeNext,
    sig
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function verifyOAuthState(
  stateStr: string | undefined | null,
  expectedProvider: OAuthProviderName
): { valid: boolean; next: string; error?: string } {
  if (!stateStr || typeof stateStr !== 'string') {
    return { valid: false, next: '/dashboard', error: 'Missing OAuth state parameter' };
  }

  let payload: any;
  try {
    const json = Buffer.from(stateStr, 'base64url').toString('utf-8');
    payload = JSON.parse(json);
  } catch {
    return { valid: false, next: '/dashboard', error: 'Malformed OAuth state parameter' };
  }

  const { nonce, provider, issuedAt, next, sig } = payload || {};
  if (!nonce || !provider || !issuedAt || !sig) {
    return { valid: false, next: '/dashboard', error: 'Incomplete OAuth state structure' };
  }

  if (provider !== expectedProvider) {
    return { valid: false, next: '/dashboard', error: 'Provider mismatch in OAuth state' };
  }

  // Check 15-minute expiration
  const ageMs = Date.now() - Number(issuedAt);
  if (isNaN(ageMs) || ageMs < 0 || ageMs > 15 * 60 * 1000) {
    return { valid: false, next: sanitizeNextPath(next), error: 'OAuth state has expired. Please try again.' };
  }

  // Verify HMAC signature
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${nonce}:${provider}:${issuedAt}:${next}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
    return { valid: false, next: '/dashboard', error: 'Invalid OAuth state signature' };
  }

  return { valid: true, next: sanitizeNextPath(next) };
}

export function buildOAuthAuthorizationUrl(
  provider: OAuthProviderName,
  state: string,
  callbackUrl: string
): string {
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Google OAuth is not configured: GOOGLE_CLIENT_ID is missing.');
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  if (provider === 'github') {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      throw new Error('GitHub OAuth is not configured: GITHUB_CLIENT_ID is missing.');
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'read:user user:email',
      state
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  throw new Error(`Unsupported OAuth provider: ${provider}`);
}

export async function exchangeOAuthCode(
  provider: OAuthProviderName,
  code: string,
  callbackUrl: string
): Promise<{ accessToken: string; idToken?: string }> {
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials missing.');
    }

    const tokenUrl = process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code'
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      const errMsg = data.error_description || data.error || `HTTP ${res.status}`;
      throw new Error(`Google token exchange failed: ${errMsg}`);
    }

    return {
      accessToken: data.access_token,
      idToken: data.id_token
    };
  }

  if (provider === 'github') {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth credentials missing.');
    }

    const tokenUrl = process.env.GITHUB_TOKEN_URL || 'https://github.com/login/oauth/access_token';
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      const errMsg = data.error_description || data.error || `HTTP ${res.status}`;
      throw new Error(`GitHub token exchange failed: ${errMsg}`);
    }

    return {
      accessToken: data.access_token
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export async function fetchOAuthUserProfile(
  provider: OAuthProviderName,
  accessToken: string
): Promise<OAuthUserProfile> {
  if (provider === 'google') {
    const userinfoUrl = process.env.GOOGLE_USERINFO_URL || 'https://www.googleapis.com/oauth2/v3/userinfo';
    const res = await fetch(userinfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.sub) {
      throw new Error(`Failed to retrieve Google profile: ${data.error || res.status}`);
    }

    return {
      provider: 'google',
      providerUserId: String(data.sub),
      email: (data.email || '').trim().toLowerCase(),
      emailVerified: Boolean(data.email_verified),
      displayName: data.name || data.given_name || (data.email ? data.email.split('@')[0] : 'Google User'),
      avatarUrl: data.picture || ''
    };
  }

  if (provider === 'github') {
    const userUrl = process.env.GITHUB_USER_URL || 'https://api.github.com/user';
    const res = await fetch(userUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'KYRON-Agent-Marketplace',
        Accept: 'application/vnd.github+json'
      }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      throw new Error(`Failed to retrieve GitHub profile: ${data.message || res.status}`);
    }

    let email = '';
    let emailVerified = false;

    // Fetch verified emails from GitHub /user/emails
    try {
      const emailsUrl = process.env.GITHUB_EMAILS_URL || 'https://api.github.com/user/emails';
      const emailRes = await fetch(emailsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'KYRON-Agent-Marketplace',
          Accept: 'application/vnd.github+json'
        }
      });
      if (emailRes.ok) {
        const emails = await emailRes.json();
        if (Array.isArray(emails) && emails.length > 0) {
          const primaryVerified = emails.find((e: any) => e.primary && e.verified);
          const anyVerified = emails.find((e: any) => e.verified);
          if (primaryVerified?.email) {
            email = String(primaryVerified.email).trim().toLowerCase();
            emailVerified = true;
          } else if (anyVerified?.email) {
            email = String(anyVerified.email).trim().toLowerCase();
            emailVerified = true;
          } else {
            const candidate = emails.find((e: any) => e.primary) || emails[0];
            if (candidate?.email) {
              email = String(candidate.email).trim().toLowerCase();
              emailVerified = Boolean(candidate.verified);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch GitHub user/emails:', err.message);
    }

    // Fallback to public profile email if /user/emails was unavailable
    if (!email && data.email) {
      email = String(data.email).trim().toLowerCase();
      emailVerified = false;
    }

    // Safe fallback if GitHub user has completely hidden emails
    if (!email) {
      email = `gh_${data.id}@users.noreply.github.com`;
      emailVerified = false;
    }

    return {
      provider: 'github',
      providerUserId: String(data.id),
      email,
      emailVerified,
      displayName: data.name || data.login || `gh_${data.id}`,
      username: data.login ? String(data.login).toLowerCase() : undefined,
      avatarUrl: data.avatar_url || ''
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export async function syncOAuthAccount(profile: OAuthUserProfile): Promise<{
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  credit_balance: number;
  is_unlimited_credit_user: boolean;
  role: string;
}> {
  const now = new Date().toISOString();

  // 1. Check existing link in oauth_accounts
  const existingLink = await db.get(
    `SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?`,
    [profile.provider, profile.providerUserId]
  ) as any;

  if (existingLink?.user_id) {
    const existingUser = await db.get(
      `SELECT id, email, display_name, username, avatar_url, credit_balance, is_unlimited_credit_user, role FROM profiles WHERE id = ?`,
      [existingLink.user_id]
    ) as any;

    if (existingUser) {
      return {
        id: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        display_name: existingUser.display_name,
        avatar_url: existingUser.avatar_url,
        credit_balance: Number(existingUser.credit_balance),
        is_unlimited_credit_user: existingUser.is_unlimited_credit_user === 1,
        role: existingUser.role || 'user'
      };
    }
  }

  // 2. Check if a user with this email already exists in profiles
  // (Safe account linking: ONLY if provider verified the email ownership)
  if (profile.email && !profile.email.includes('users.noreply.github.com')) {
    const userByEmail = await db.get(
      `SELECT id, email, display_name, username, avatar_url, credit_balance, is_unlimited_credit_user, role FROM profiles WHERE email = ?`,
      [profile.email]
    ) as any;

    if (userByEmail) {
      if (!profile.emailVerified) {
        throw new Error(
          `This email is already registered, but your ${profile.provider === 'github' ? 'GitHub' : 'Google'} email address is not verified. Please verify your email on ${profile.provider === 'github' ? 'GitHub' : 'Google'} or sign in with your email and password.`
        );
      }

      // Link this provider account to the existing profile
      const linkId = 'oacc_' + crypto.randomUUID();
      try {
        await db.run(
          `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [linkId, userByEmail.id, profile.provider, profile.providerUserId, profile.email, now]
        );
      } catch (err: any) {
        console.warn('OAuth link insertion note:', err.message);
      }

      // If user has no avatar yet and OAuth provides one, backfill it
      if (!userByEmail.avatar_url && profile.avatarUrl) {
        await db.run(`UPDATE profiles SET avatar_url = ?, updated_at = ? WHERE id = ?`, [profile.avatarUrl, now, userByEmail.id]);
      }

      return {
        id: userByEmail.id,
        email: userByEmail.email,
        username: userByEmail.username,
        display_name: userByEmail.display_name,
        avatar_url: userByEmail.avatar_url || profile.avatarUrl,
        credit_balance: Number(userByEmail.credit_balance),
        is_unlimited_credit_user: userByEmail.is_unlimited_credit_user === 1,
        role: userByEmail.role || 'user'
      };
    }
  }

  // 3. New user creation
  const userId = 'usr_' + crypto.randomUUID();
  let candidateUsername = (profile.username || profile.displayName || profile.email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .slice(0, 20);

  if (candidateUsername.length < 3) {
    candidateUsername = `${candidateUsername}_${crypto.randomBytes(2).toString('hex')}`;
  }

  // Ensure unique username
  let finalUsername = candidateUsername;
  let attempts = 0;
  while (attempts < 5) {
    const taken = await db.get(`SELECT id FROM profiles WHERE username = ?`, [finalUsername]);
    if (!taken) break;
    finalUsername = `${candidateUsername.slice(0, 18)}_${crypto.randomBytes(2).toString('hex')}`;
    attempts++;
  }

  const welcomeCredit = 10.00; // Matches standard KYRON registration welcome balance
  const isPostgres = Boolean((db as any).isPostgres);

  if (isPostgres) {
    await db.run(
      `INSERT INTO profiles (
        id, email, display_name, full_name, username, avatar_url,
        credit_balance, is_unlimited_credit_user, role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'user', ?, ?)
      ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
      [
        userId,
        profile.email,
        profile.displayName,
        profile.displayName,
        finalUsername,
        profile.avatarUrl || '',
        welcomeCredit,
        now,
        now
      ]
    );
  } else {
    await db.run(
      `INSERT INTO profiles (
        id, email, display_name, full_name, username, avatar_url,
        credit_balance, is_unlimited_credit_user, role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'user', ?, ?)`,
      [
        userId,
        profile.email,
        profile.displayName,
        profile.displayName,
        finalUsername,
        profile.avatarUrl || '',
        welcomeCredit,
        now,
        now
      ]
    );
  }

  // Insert OAuth link
  const linkId = 'oacc_' + crypto.randomUUID();
  await db.run(
    `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [linkId, userId, profile.provider, profile.providerUserId, profile.email, now]
  );

  return {
    id: userId,
    email: profile.email,
    username: finalUsername,
    display_name: profile.displayName,
    avatarUrl: profile.avatarUrl,
    credit_balance: welcomeCredit,
    is_unlimited_credit_user: false,
    role: 'user'
  };
}

export async function processOAuthCallback(
  provider: OAuthProviderName,
  code: string,
  callbackUrl: string
): Promise<{ user: any; token: string }> {
  const tokens = await exchangeOAuthCode(provider, code, callbackUrl);
  const profile = await fetchOAuthUserProfile(provider, tokens.accessToken);
  const user = await syncOAuthAccount(profile);
  const token = generateToken({
    id: user.id,
    email: user.email,
    username: user.username,
    is_unlimited_credit_user: user.is_unlimited_credit_user
  });

  return { user, token };
}


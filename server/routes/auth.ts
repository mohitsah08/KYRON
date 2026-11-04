import { Router, Request, Response } from 'express';
import { db } from '../db/database.ts';
import { generateToken, requireAuth, AuthRequest } from '../middleware/auth.ts';
import { supabaseServer } from '../services/supabase.ts';
import {
  AuthEmailAction,
  consumeEmailRateLimit,
  checkEmailRateLimit,
  markEmailRateLimitSuccess,
  markEmailRateLimitError,
  normalizeEmail,
  RATE_LIMIT_EXCEEDED_MESSAGE,
  VALID_AUTH_EMAIL_ACTIONS
} from '../services/emailRateLimiter.ts';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {
  getOAuthStatus,
  getOAuthCallbackUrl,
  createOAuthState,
  verifyOAuthState,
  buildOAuthAuthorizationUrl,
  processOAuthCallback,
  OAuthProviderName
} from '../services/oauthService.ts';

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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

export function formatUserProfile(profile: any, connectedAccounts: any[] = []): any {
  let social_links: Record<string, string> = {};
  try {
    if (profile.social_links) {
      social_links = typeof profile.social_links === 'string' ? JSON.parse(profile.social_links) : profile.social_links;
    }
  } catch {}

  let creator_skills: string[] = [];
  try {
    if (profile.creator_skills) {
      creator_skills = typeof profile.creator_skills === 'string' ? JSON.parse(profile.creator_skills) : profile.creator_skills;
    }
  } catch {}

  let creator_categories: string[] = [];
  try {
    if (profile.creator_categories) {
      creator_categories = typeof profile.creator_categories === 'string' ? JSON.parse(profile.creator_categories) : profile.creator_categories;
    }
  } catch {}

  let creator_portfolio: any[] = [];
  try {
    if (profile.creator_portfolio) {
      creator_portfolio = typeof profile.creator_portfolio === 'string' ? JSON.parse(profile.creator_portfolio) : profile.creator_portfolio;
    }
  } catch {}

  let creator_links: Record<string, string> = {};
  try {
    if (profile.creator_links) {
      creator_links = typeof profile.creator_links === 'string' ? JSON.parse(profile.creator_links) : profile.creator_links;
    }
  } catch {}

  let skills_expertise: string[] = [];
  try {
    if (profile.skills_expertise) {
      skills_expertise = typeof profile.skills_expertise === 'string' ? JSON.parse(profile.skills_expertise) : profile.skills_expertise;
    }
  } catch {}

  let portfolio_items: any[] = [];
  try {
    if (profile.portfolio_items) {
      portfolio_items = typeof profile.portfolio_items === 'string' ? JSON.parse(profile.portfolio_items) : profile.portfolio_items;
    }
  } catch {}

  let services_offered: string[] = [];
  try {
    if (profile.services_offered) {
      services_offered = typeof profile.services_offered === 'string' ? JSON.parse(profile.services_offered) : profile.services_offered;
    }
  } catch {}

  let agency_permissions: string[] = [];
  try {
    if (profile.agency_permissions) {
      agency_permissions = typeof profile.agency_permissions === 'string' ? JSON.parse(profile.agency_permissions) : profile.agency_permissions;
    }
  } catch {}

  let hiring_preferences: Record<string, any> = {};
  try {
    if (profile.hiring_preferences) {
      hiring_preferences = typeof profile.hiring_preferences === 'string' ? JSON.parse(profile.hiring_preferences) : profile.hiring_preferences;
    }
  } catch {}

  let notification_preferences = {
    email_security: true,
    email_product: true,
    email_marketing: false,
    in_app: true,
    new_ratings: true,
    skill_sales: true
  };
  try {
    if (profile.notification_preferences) {
      const parsed = typeof profile.notification_preferences === 'string' ? JSON.parse(profile.notification_preferences) : profile.notification_preferences;
      notification_preferences = { ...notification_preferences, ...parsed };
    }
  } catch {}

  const fullName = profile.full_name || profile.display_name || '';
  const firstName = profile.first_name || (fullName.split(' ')[0] || '');
  const lastName = profile.last_name || (fullName.split(' ').slice(1).join(' ') || '');

  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name || fullName,
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    username: profile.username,
    bio: profile.bio || '',
    avatar_url: profile.avatar_url || null,
    cover_image_url: profile.cover_image_url || null,
    location: profile.location || '',
    phone: profile.phone || '',
    website_url: profile.website_url || '',
    social_links,
    role: profile.role || 'user',
    credit_balance: Number(profile.credit_balance || 0),
    is_unlimited_credit_user: profile.is_unlimited_credit_user === 1,
    created_at: profile.created_at,
    updated_at: profile.updated_at,

    // Creator Profile
    creator_mode_enabled: profile.creator_mode_enabled === 1,
    creator_display_name: profile.creator_display_name || profile.display_name || fullName,
    creator_avatar_url: profile.creator_avatar_url || profile.avatar_url,
    creator_cover_image_url: profile.creator_cover_image_url || profile.cover_image_url,
    creator_headline: profile.creator_headline || '',
    creator_bio: profile.creator_bio || profile.bio || '',
    creator_skills,
    creator_categories,
    creator_portfolio,
    creator_links,
    creator_verified: profile.creator_verified === 1,
    creator_storefront_slug: profile.creator_storefront_slug || profile.username,

    // Role-based profile info
    role_type: profile.role_type || 'individual',
    professional_title: profile.professional_title || '',
    skills_expertise,
    years_experience: Number(profile.years_experience || 0),
    portfolio_items,
    services_offered,
    agency_name: profile.agency_name || '',
    agency_logo_url: profile.agency_logo_url || null,
    agency_description: profile.agency_description || '',
    agency_website: profile.agency_website || '',
    agency_team_size: profile.agency_team_size || '',
    agency_designation: profile.agency_designation || '',
    agency_permissions,
    company_name: profile.company_name || '',
    company_industry: profile.company_industry || '',
    company_size: profile.company_size || '',
    hiring_preferences,

    // Preferences & Privacy
    theme_preference: profile.theme_preference || 'system',
    language: profile.language || 'en',
    timezone: profile.timezone || 'UTC',
    notification_preferences,
    profile_visibility: profile.profile_visibility || 'public',
    discoverability: profile.discoverability !== 0,
    messaging_preference: profile.messaging_preference || 'anyone',
    is_deactivated: profile.is_deactivated === 1,
    deactivated_at: profile.deactivated_at || null,

    // Connected Accounts
    connected_accounts: connectedAccounts.map(a => ({
      id: a.id,
      provider: a.provider,
      provider_user_id: a.provider_user_id,
      email: a.email,
      created_at: a.created_at
    })),
    email_verified: true
  };
}

// Get Current User Profile
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await db.get(
      `SELECT * FROM profiles WHERE id = ?`,
      [userId]
    ) as any;

    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const connected = await db.all(
      `SELECT id, provider, provider_user_id, email, created_at FROM oauth_accounts WHERE user_id = ?`,
      [userId]
    ) as any[];

    res.json({
      user: formatUserProfile(profile, connected)
    });
  } catch (err: any) {
    console.error('Profile fetch error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred while fetching user profile.' });
  }
});

// Check Username Availability
router.get('/check-username', async (req: Request, res: Response) => {
  try {
    const rawUsername = (req.query.username as string || '').trim().toLowerCase();
    const currentUserId = req.query.current_user_id as string | undefined;

    if (!rawUsername) {
      res.status(400).json({ available: false, reason: 'Username cannot be empty.' });
      return;
    }

    if (!USERNAME_RE.test(rawUsername)) {
      res.status(200).json({ available: false, reason: 'Username must be 3–24 lowercase letters, numbers, or underscores.' });
      return;
    }

    const existing = await db.get(
      `SELECT id FROM profiles WHERE username = ? ${currentUserId ? 'AND id != ?' : ''}`,
      currentUserId ? [rawUsername, currentUserId] : [rawUsername]
    );

    if (existing) {
      res.json({ available: false, reason: 'Username is already taken.' });
    } else {
      res.json({ available: true });
    }
  } catch (err: any) {
    console.error('Check username error:', err.message);
    res.status(500).json({ error: 'Failed to verify username availability.' });
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

    const {
      display_name,
      full_name,
      first_name,
      last_name,
      bio,
      avatar_url,
      cover_image_url,
      location,
      phone,
      website_url,
      social_links,
      username,
      theme_preference,
      language,
      timezone,
      notification_preferences,
      profile_visibility,
      discoverability,
      messaging_preference
    } = req.body;

    const existing = await db.get(`SELECT id, username FROM profiles WHERE id = ?`, [userId]);
    if (!existing) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    if (username && username !== existing.username) {
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

    const socialLinksStr = social_links !== undefined ? (typeof social_links === 'string' ? social_links : JSON.stringify(social_links)) : null;
    const notifStr = notification_preferences !== undefined ? (typeof notification_preferences === 'string' ? notification_preferences : JSON.stringify(notification_preferences)) : null;

    await db.run(
      `UPDATE profiles
       SET display_name = COALESCE(?, display_name),
           full_name = COALESCE(?, full_name),
           first_name = COALESCE(?, first_name),
           last_name = COALESCE(?, last_name),
           bio = COALESCE(?, bio),
           avatar_url = COALESCE(?, avatar_url),
           cover_image_url = COALESCE(?, cover_image_url),
           location = COALESCE(?, location),
           phone = COALESCE(?, phone),
           website_url = COALESCE(?, website_url),
           social_links = COALESCE(?, social_links),
           username = COALESCE(?, username),
           theme_preference = COALESCE(?, theme_preference),
           language = COALESCE(?, language),
           timezone = COALESCE(?, timezone),
           notification_preferences = COALESCE(?, notification_preferences),
           profile_visibility = COALESCE(?, profile_visibility),
           discoverability = COALESCE(?, discoverability),
           messaging_preference = COALESCE(?, messaging_preference),
           updated_at = ?
       WHERE id = ?`,
      [
        updatedName,
        updatedName,
        first_name || null,
        last_name || null,
        bio !== undefined ? bio : null,
        avatar_url !== undefined ? avatar_url : null,
        cover_image_url !== undefined ? cover_image_url : null,
        location !== undefined ? location : null,
        phone !== undefined ? phone : null,
        website_url !== undefined ? website_url : null,
        socialLinksStr,
        username || null,
        theme_preference || null,
        language || null,
        timezone || null,
        notifStr,
        profile_visibility || null,
        discoverability !== undefined ? (discoverability ? 1 : 0) : null,
        messaging_preference || null,
        now,
        userId
      ]
    );

    const updated = await db.get(`SELECT * FROM profiles WHERE id = ?`, [userId]) as any;
    const connected = await db.all(`SELECT id, provider, provider_user_id, email, created_at FROM oauth_accounts WHERE user_id = ?`, [userId]) as any[];

    res.json({
      user: formatUserProfile(updated, connected)
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

// Update Creator Profile
router.put('/creator-profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      creator_mode_enabled,
      creator_display_name,
      creator_avatar_url,
      creator_cover_image_url,
      creator_headline,
      creator_bio,
      creator_skills,
      creator_categories,
      creator_portfolio,
      creator_links,
      creator_storefront_slug
    } = req.body;

    const skillsStr = creator_skills !== undefined ? (typeof creator_skills === 'string' ? creator_skills : JSON.stringify(creator_skills)) : null;
    const categoriesStr = creator_categories !== undefined ? (typeof creator_categories === 'string' ? creator_categories : JSON.stringify(creator_categories)) : null;
    const portfolioStr = creator_portfolio !== undefined ? (typeof creator_portfolio === 'string' ? creator_portfolio : JSON.stringify(creator_portfolio)) : null;
    const linksStr = creator_links !== undefined ? (typeof creator_links === 'string' ? creator_links : JSON.stringify(creator_links)) : null;

    const now = new Date().toISOString();

    await db.run(
      `UPDATE profiles
       SET creator_mode_enabled = COALESCE(?, creator_mode_enabled),
           creator_display_name = COALESCE(?, creator_display_name),
           creator_avatar_url = COALESCE(?, creator_avatar_url),
           creator_cover_image_url = COALESCE(?, creator_cover_image_url),
           creator_headline = COALESCE(?, creator_headline),
           creator_bio = COALESCE(?, creator_bio),
           creator_skills = COALESCE(?, creator_skills),
           creator_categories = COALESCE(?, creator_categories),
           creator_portfolio = COALESCE(?, creator_portfolio),
           creator_links = COALESCE(?, creator_links),
           creator_storefront_slug = COALESCE(?, creator_storefront_slug),
           updated_at = ?
       WHERE id = ?`,
      [
        creator_mode_enabled !== undefined ? (creator_mode_enabled ? 1 : 0) : null,
        creator_display_name || null,
        creator_avatar_url || null,
        creator_cover_image_url || null,
        creator_headline || null,
        creator_bio || null,
        skillsStr,
        categoriesStr,
        portfolioStr,
        linksStr,
        creator_storefront_slug || null,
        now,
        userId
      ]
    );

    const updated = await db.get(`SELECT * FROM profiles WHERE id = ?`, [userId]) as any;
    const connected = await db.all(`SELECT id, provider, provider_user_id, email, created_at FROM oauth_accounts WHERE user_id = ?`, [userId]) as any[];

    res.json({
      success: true,
      user: formatUserProfile(updated, connected)
    });
  } catch (err: any) {
    console.error('Creator profile update error:', err.message);
    res.status(500).json({ error: 'Failed to update creator profile.' });
  }
});

// Update Role Profile (Individual, Agency, Client)
router.put('/role-profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      role_type,
      professional_title,
      skills_expertise,
      years_experience,
      portfolio_items,
      services_offered,
      agency_name,
      agency_logo_url,
      agency_description,
      agency_website,
      agency_team_size,
      agency_designation,
      agency_permissions,
      company_name,
      company_industry,
      company_size,
      hiring_preferences
    } = req.body;

    const skillsStr = skills_expertise !== undefined ? (typeof skills_expertise === 'string' ? skills_expertise : JSON.stringify(skills_expertise)) : null;
    const portfolioStr = portfolio_items !== undefined ? (typeof portfolio_items === 'string' ? portfolio_items : JSON.stringify(portfolio_items)) : null;
    const servicesStr = services_offered !== undefined ? (typeof services_offered === 'string' ? services_offered : JSON.stringify(services_offered)) : null;
    const permissionsStr = agency_permissions !== undefined ? (typeof agency_permissions === 'string' ? agency_permissions : JSON.stringify(agency_permissions)) : null;
    const hiringStr = hiring_preferences !== undefined ? (typeof hiring_preferences === 'string' ? hiring_preferences : JSON.stringify(hiring_preferences)) : null;

    const now = new Date().toISOString();

    await db.run(
      `UPDATE profiles
       SET role_type = COALESCE(?, role_type),
           professional_title = COALESCE(?, professional_title),
           skills_expertise = COALESCE(?, skills_expertise),
           years_experience = COALESCE(?, years_experience),
           portfolio_items = COALESCE(?, portfolio_items),
           services_offered = COALESCE(?, services_offered),
           agency_name = COALESCE(?, agency_name),
           agency_logo_url = COALESCE(?, agency_logo_url),
           agency_description = COALESCE(?, agency_description),
           agency_website = COALESCE(?, agency_website),
           agency_team_size = COALESCE(?, agency_team_size),
           agency_designation = COALESCE(?, agency_designation),
           agency_permissions = COALESCE(?, agency_permissions),
           company_name = COALESCE(?, company_name),
           company_industry = COALESCE(?, company_industry),
           company_size = COALESCE(?, company_size),
           hiring_preferences = COALESCE(?, hiring_preferences),
           updated_at = ?
       WHERE id = ?`,
      [
        role_type || null,
        professional_title || null,
        skillsStr,
        years_experience !== undefined ? Number(years_experience) : null,
        portfolioStr,
        servicesStr,
        agency_name || null,
        agency_logo_url || null,
        agency_description || null,
        agency_website || null,
        agency_team_size || null,
        agency_designation || null,
        permissionsStr,
        company_name || null,
        company_industry || null,
        company_size || null,
        hiringStr,
        now,
        userId
      ]
    );

    const updated = await db.get(`SELECT * FROM profiles WHERE id = ?`, [userId]) as any;
    const connected = await db.all(`SELECT id, provider, provider_user_id, email, created_at FROM oauth_accounts WHERE user_id = ?`, [userId]) as any[];

    res.json({
      success: true,
      user: formatUserProfile(updated, connected)
    });
  } catch (err: any) {
    console.error('Role profile update error:', err.message);
    res.status(500).json({ error: 'Failed to update role profile.' });
  }
});

// Change Email
router.post('/change-email', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { new_email } = req.body;

    if (!new_email || !EMAIL_RE.test(new_email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const cleanEmail = new_email.trim().toLowerCase();

    // Check if taken
    const existing = await db.get(`SELECT id FROM profiles WHERE email = ? AND id != ?`, [cleanEmail, userId]);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    await db.run(`UPDATE profiles SET email = ?, updated_at = ? WHERE id = ?`, [cleanEmail, new Date().toISOString(), userId]);

    res.json({
      success: true,
      email: cleanEmail,
      message: 'Your email address has been successfully updated.'
    });
  } catch (err: any) {
    console.error('Change email error:', err.message);
    res.status(500).json({ error: 'Failed to update email address.' });
  }
});

// Update Phone
router.put('/phone', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { phone } = req.body;

    await db.run(`UPDATE profiles SET phone = ?, updated_at = ? WHERE id = ?`, [phone || '', new Date().toISOString(), userId]);

    res.json({ success: true, phone: phone || '' });
  } catch (err: any) {
    console.error('Update phone error:', err.message);
    res.status(500).json({ error: 'Failed to update phone number.' });
  }
});

// Get Connected OAuth Accounts
router.get('/connected-accounts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const accounts = await db.all(
      `SELECT id, provider, provider_user_id, email, created_at FROM oauth_accounts WHERE user_id = ?`,
      [userId]
    ) as any[];

    res.json({ accounts });
  } catch (err: any) {
    console.error('Get connected accounts error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve connected accounts.' });
  }
});

// Disconnect OAuth Account
router.delete('/connected-accounts/:provider', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const provider = req.params.provider?.toLowerCase();

    // Check if user has password or other providers
    const profile = await db.get(`SELECT password_hash FROM profiles WHERE id = ?`, [userId]) as any;
    const otherProviders = await db.all(
      `SELECT id FROM oauth_accounts WHERE user_id = ? AND provider != ?`,
      [userId, provider]
    ) as any[];

    if (!profile?.password_hash && otherProviders.length === 0) {
      res.status(400).json({ error: 'Cannot disconnect your only sign-in method. Please set a password or connect another provider first.' });
      return;
    }

    await db.run(`DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?`, [userId, provider]);

    res.json({ success: true, message: `Successfully disconnected ${provider}.` });
  } catch (err: any) {
    console.error('Disconnect account error:', err.message);
    res.status(500).json({ error: 'Failed to disconnect account.' });
  }
});

// Security Activity & Sessions
router.get('/security/activity', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    let activities = await db.all(
      `SELECT * FROM login_activity WHERE user_id = ? ORDER BY logged_in_at DESC LIMIT 10`,
      [userId]
    ) as any[];

    let sessions = await db.all(
      `SELECT * FROM active_sessions WHERE user_id = ? ORDER BY last_active DESC`,
      [userId]
    ) as any[];

    // If no records yet, seed the current session and activity record
    if (sessions.length === 0) {
      const sessionId = 'ses_' + crypto.randomUUID();
      const now = new Date().toISOString();
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Chrome / macOS';
      const deviceName = /Mac/i.test(userAgent) ? 'MacBook Pro / macOS' : (/Windows/i.test(userAgent) ? 'Windows PC' : (/iPhone|Android/i.test(userAgent) ? 'Mobile Device' : 'Desktop Browser'));

      await db.run(`
        INSERT INTO active_sessions (id, user_id, device_name, ip_address, last_active, is_current)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [sessionId, userId, deviceName, ip, now]);

      await db.run(`
        INSERT INTO login_activity (id, user_id, ip_address, user_agent, device_type, location, logged_in_at)
        VALUES (?, ?, ?, ?, ?, 'Local Workspace (Verified)', ?)
      `, ['act_' + crypto.randomUUID(), userId, ip, userAgent, deviceName, now]);

      activities = await db.all(`SELECT * FROM login_activity WHERE user_id = ? ORDER BY logged_in_at DESC LIMIT 10`, [userId]);
      sessions = await db.all(`SELECT * FROM active_sessions WHERE user_id = ? ORDER BY last_active DESC`, [userId]);
    }

    res.json({
      activity: activities,
      sessions: sessions.map(s => ({ ...s, is_current: s.is_current === 1 }))
    });
  } catch (err: any) {
    console.error('Security activity error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve security activity.' });
  }
});

// Logout from All Devices / Other Sessions
router.post('/security/logout-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await db.run(`DELETE FROM active_sessions WHERE user_id = ? AND is_current = 0`, [userId]);
    res.json({ success: true, message: 'Successfully signed out of all other active sessions.' });
  } catch (err: any) {
    console.error('Logout all error:', err.message);
    res.status(500).json({ error: 'Failed to sign out of other sessions.' });
  }
});

// Download Personal Data Export (Privacy & GDPR compliance)
router.post('/export-data', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await db.get(`SELECT * FROM profiles WHERE id = ?`, [userId]) as any;
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const purchases = await db.all(`SELECT * FROM user_purchases WHERE user_id = ?`, [userId]);
    const skills = await db.all(`SELECT * FROM skills WHERE creator_id = ?`, [userId]);
    const reviews = await db.all(`SELECT * FROM skill_reviews WHERE user_id = ?`, [userId]);
    const votes = await db.all(`SELECT * FROM skill_votes WHERE user_id = ?`, [userId]);
    const connectedAccounts = await db.all(`SELECT provider, email, created_at FROM oauth_accounts WHERE user_id = ?`, [userId]);
    const activity = await db.all(`SELECT * FROM login_activity WHERE user_id = ?`, [userId]);

    const exportPayload = {
      exported_at: new Date().toISOString(),
      account: {
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        username: profile.username,
        created_at: profile.created_at
      },
      profile: formatUserProfile(profile, connectedAccounts),
      creator_catalog: skills,
      purchased_skills: purchases,
      reviews,
      community_votes: votes,
      login_history: activity
    };

    res.json(exportPayload);
  } catch (err: any) {
    console.error('Export data error:', err.message);
    res.status(500).json({ error: 'Failed to generate personal data export.' });
  }
});

// Deactivate Account
router.post('/deactivate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date().toISOString();

    await db.run(`UPDATE profiles SET is_deactivated = 1, deactivated_at = ? WHERE id = ?`, [now, userId]);

    res.json({ success: true, message: 'Your account has been deactivated.' });
  } catch (err: any) {
    console.error('Deactivate account error:', err.message);
    res.status(500).json({ error: 'Failed to deactivate account.' });
  }
});

// Delete Account (Permanent)
router.delete('/account', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Remove user records
    await db.run(`DELETE FROM active_sessions WHERE user_id = ?`, [userId]);
    await db.run(`DELETE FROM login_activity WHERE user_id = ?`, [userId]);
    await db.run(`DELETE FROM oauth_accounts WHERE user_id = ?`, [userId]);
    await db.run(`DELETE FROM saved_skills WHERE user_id = ?`, [userId]);
    await db.run(`DELETE FROM skill_votes WHERE user_id = ?`, [userId]);
    await db.run(`DELETE FROM skill_reviews WHERE user_id = ?`, [userId]);
    await db.run(`DELETE FROM user_purchases WHERE user_id = ?`, [userId]);
    await db.run(`DELETE FROM profiles WHERE id = ?`, [userId]);

    res.json({ success: true, message: 'Account permanently deleted.' });
  } catch (err: any) {
    console.error('Delete account error:', err.message);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

// ==========================================
// OAuth 2.0 Provider Endpoints (Google & GitHub)
// ==========================================

// Get configured status of OAuth providers
router.get('/oauth/providers', (_req: Request, res: Response) => {
  res.json(getOAuthStatus());
});

// Initiate OAuth flow
router.get('/oauth/:provider', (req: Request, res: Response) => {
  const provider = req.params.provider?.toLowerCase() as OAuthProviderName;
  if (provider !== 'google' && provider !== 'github') {
    res.status(400).json({ error: `Unsupported OAuth provider: ${provider}` });
    return;
  }

  const status = getOAuthStatus();
  const next = (req.query.next as string) || '/dashboard';

  if (!status[provider]) {
    const isJson = req.query.format === 'json' || req.headers.accept?.includes('application/json');
    const msg = `${provider === 'google' ? 'Google' : 'GitHub'} OAuth is not configured. Missing client ID or secret in environment.`;
    if (isJson) {
      res.status(503).json({ error: msg, provider });
      return;
    }
    res.redirect(`/auth/callback?flow=oauth&error=provider_not_configured&error_description=${encodeURIComponent(msg)}&next=${encodeURIComponent(next)}`);
    return;
  }

  try {
    const state = createOAuthState(provider, next);
    const callbackUrl = getOAuthCallbackUrl(provider, req);
    const authUrl = buildOAuthAuthorizationUrl(provider, state, callbackUrl);

    if (req.query.format === 'json') {
      res.json({ url: authUrl, state, provider });
      return;
    }

    res.redirect(authUrl);
  } catch (err: any) {
    console.error(`OAuth initiation error for ${provider}:`, err.message);
    res.status(500).json({ error: `Failed to initiate ${provider} OAuth: ${err.message}` });
  }
});

// OAuth Callback handling (GET from browser redirect)
router.get('/oauth/:provider/callback', async (req: Request, res: Response) => {
  const provider = req.params.provider?.toLowerCase() as OAuthProviderName;
  if (provider !== 'google' && provider !== 'github') {
    res.status(400).json({ error: `Unsupported OAuth provider: ${provider}` });
    return;
  }

  const rawState = req.query.state as string | undefined;

  // Check for error returned by provider (e.g. user cancelled)
  if (req.query.error) {
    const { next = '/dashboard' } = verifyOAuthState(rawState, provider);
    const errCode = String(req.query.error);
    const errDesc = String(req.query.error_description || 'Sign-in was cancelled or denied');
    res.redirect(
      `/auth/callback?flow=oauth&error=${encodeURIComponent(errCode)}&error_description=${encodeURIComponent(errDesc)}&next=${encodeURIComponent(next)}`
    );
    return;
  }

  // Verify OAuth state token
  const stateCheck = verifyOAuthState(rawState, provider);
  if (!stateCheck.valid) {
    res.redirect(
      `/auth/callback?flow=oauth&error=invalid_state&error_description=${encodeURIComponent(stateCheck.error || 'Invalid or expired OAuth state')}&next=${encodeURIComponent(stateCheck.next)}`
    );
    return;
  }

  const code = req.query.code as string | undefined;
  if (!code) {
    res.redirect(
      `/auth/callback?flow=oauth&error=missing_code&error_description=${encodeURIComponent('No authorization code was returned')}&next=${encodeURIComponent(stateCheck.next)}`
    );
    return;
  }

  try {
    const callbackUrl = getOAuthCallbackUrl(provider, req);
    const { token } = await processOAuthCallback(provider, code, callbackUrl);
    res.redirect(
      `/auth/callback?flow=oauth&token=${encodeURIComponent(token)}&next=${encodeURIComponent(stateCheck.next)}`
    );
  } catch (err: any) {
    console.error(`OAuth callback processing error for ${provider}:`, err.message);
    res.redirect(
      `/auth/callback?flow=oauth&error=auth_failed&error_description=${encodeURIComponent(err.message || 'OAuth authentication failed')}&next=${encodeURIComponent(stateCheck.next)}`
    );
  }
});

// OAuth Callback handling (POST for programmatic API/testing)
router.post('/oauth/:provider/callback', async (req: Request, res: Response) => {
  const provider = req.params.provider?.toLowerCase() as OAuthProviderName;
  if (provider !== 'google' && provider !== 'github') {
    res.status(400).json({ error: `Unsupported OAuth provider: ${provider}` });
    return;
  }

  const { code, state, redirect_uri } = req.body || {};

  if (!code) {
    res.status(400).json({ error: 'Authorization code is required' });
    return;
  }

  if (state) {
    const stateCheck = verifyOAuthState(state, provider);
    if (!stateCheck.valid) {
      res.status(400).json({ error: stateCheck.error || 'Invalid or expired OAuth state' });
      return;
    }
  }

  try {
    const callbackUrl = redirect_uri || getOAuthCallbackUrl(provider, req);
    const { user, token } = await processOAuthCallback(provider, code, callbackUrl);
    res.json({ user, token });
  } catch (err: any) {
    console.error(`OAuth POST callback error for ${provider}:`, err.message);
    res.status(400).json({ error: err.message || 'OAuth authentication failed' });
  }
});

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
}

function getAppRedirectUrl(req: Request, targetPath: string): string {
  const origin = req.headers.origin || (req.headers.host ? `${req.protocol || 'http'}://${req.headers.host}` : null) || process.env.APP_URL || 'http://localhost:3000';
  const cleanPath = targetPath.startsWith('/') ? targetPath : '/' + targetPath;
  return `${origin}${cleanPath}`;
}

// -----------------------------------------------------------------------------
// STRICT EMAIL RATE LIMITING & DISPATCH ENDPOINTS (3 per rolling 24 hours)
// -----------------------------------------------------------------------------

/**
 * Check rate limit status for an email and action without consuming quota.
 */
router.get('/rate-limit-status', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    const action = req.query.action as AuthEmailAction;
    if (!email || !action) {
      res.status(400).json({ error: 'email and action parameters are required.' });
      return;
    }
    if (!VALID_AUTH_EMAIL_ACTIONS.includes(action)) {
      res.status(400).json({ error: `Invalid action. Must be one of: ${VALID_AUTH_EMAIL_ACTIONS.join(', ')}` });
      return;
    }
    const cleanEmail = normalizeEmail(email);
    const status = await checkEmailRateLimit(cleanEmail, action);
    res.json({
      action,
      allowed: status.allowed,
      remaining: status.remaining,
      limit: status.limit,
      total_attempts: status.totalAttemptsInWindow,
      total_attempts_in_window: status.totalAttemptsInWindow,
      next_eligible_at: status.nextEligibleAt ? status.nextEligibleAt.toISOString() : null,
      retry_after_seconds: status.retryAfterSeconds
    });
  } catch (err: any) {
    console.error('Rate limit status check error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve rate limit status.' });
  }
});

/**
 * Pre-signup rate limit verification to prevent registration flood abuse.
 */
router.post('/pre-signup-check', async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const cleanEmail = normalizeEmail(email);
    const clientIp = getClientIp(req);

    const limitResult = await consumeEmailRateLimit(cleanEmail, 'signup_verification', clientIp);
    if (!limitResult.allowed) {
      res.status(429).json({
        error: limitResult.reason || RATE_LIMIT_EXCEEDED_MESSAGE,
        code: 'email_rate_limit_exceeded',
        action: 'signup_verification',
        limit: 3,
        next_eligible_at: limitResult.nextEligibleAt?.toISOString(),
        retry_after_seconds: limitResult.retryAfterSeconds
      });
      return;
    }

    res.json({
      allowed: true,
      remaining: limitResult.remaining,
      attempt_id: limitResult.attemptId
    });
  } catch (err: any) {
    console.error('Pre-signup check error:', err.message);
    res.status(500).json({ error: 'Failed to check signup rate limit.' });
  }
});

/**
 * Send / Resend Signup Verification Email Link (Max 3 per rolling 24 hours)
 */
async function handleSendVerificationEmail(req: Request, res: Response) {
  try {
    const { email } = req.body || {};
    if (!email || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const cleanEmail = normalizeEmail(email);
    const clientIp = getClientIp(req);

    // Atomically consume 1 rate limit slot before touching Supabase
    const limitResult = await consumeEmailRateLimit(cleanEmail, 'signup_verification', clientIp);
    if (!limitResult.allowed) {
      res.status(429).json({
        error: limitResult.reason || RATE_LIMIT_EXCEEDED_MESSAGE,
        code: 'email_rate_limit_exceeded',
        action: 'signup_verification',
        limit: 3,
        next_eligible_at: limitResult.nextEligibleAt?.toISOString(),
        retry_after_seconds: limitResult.retryAfterSeconds
      });
      return;
    }

    // Call Supabase Auth to dispatch the confirmation link
    try {
      if (process.env.TEST_MODE !== 'true' && process.env.NODE_ENV !== 'test') {
        const { error } = await supabaseServer.auth.resend({
          type: 'signup',
          email: cleanEmail,
          options: {
            emailRedirectTo: getAppRedirectUrl(req, '/auth/callback')
          }
        });
        if (error) {
          console.warn('Supabase signup verification email note:', error.message);
          await markEmailRateLimitError(limitResult.attemptId!);
        } else {
          await markEmailRateLimitSuccess(limitResult.attemptId!);
        }
      } else {
        await markEmailRateLimitSuccess(limitResult.attemptId!);
      }
    } catch (err: any) {
      console.warn('Supabase resend exception:', err.message);
      await markEmailRateLimitError(limitResult.attemptId!);
    }

    // Never disclose if account exists
    res.json({
      success: true,
      message: 'If that address is waiting for verification, a new link is on its way.',
      action: 'signup_verification',
      remaining: limitResult.remaining
    });
  } catch (err: any) {
    console.error('Send verification email error:', err.message);
    res.status(500).json({ error: 'Failed to dispatch verification email.' });
  }
}

router.post('/send-verification-email', handleSendVerificationEmail);
router.post('/resend-verification', handleSendVerificationEmail);

/**
 * Send Password Reset Email Link (Max 3 per rolling 24 hours)
 */
router.post('/send-password-reset-link', async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const cleanEmail = normalizeEmail(email);
    const clientIp = getClientIp(req);

    // Atomically consume 1 rate limit slot before touching Supabase
    const limitResult = await consumeEmailRateLimit(cleanEmail, 'password_reset_link', clientIp);
    if (!limitResult.allowed) {
      res.status(429).json({
        error: limitResult.reason || RATE_LIMIT_EXCEEDED_MESSAGE,
        code: 'email_rate_limit_exceeded',
        action: 'password_reset_link',
        limit: 3,
        next_eligible_at: limitResult.nextEligibleAt?.toISOString(),
        retry_after_seconds: limitResult.retryAfterSeconds
      });
      return;
    }

    // Call Supabase Auth to dispatch reset link
    try {
      if (process.env.TEST_MODE !== 'true' && process.env.NODE_ENV !== 'test') {
        const { error } = await supabaseServer.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: getAppRedirectUrl(req, '/reset-password')
        });
        if (error) {
          console.warn('Supabase resetPasswordForEmail note:', error.message);
          await markEmailRateLimitError(limitResult.attemptId!);
        } else {
          await markEmailRateLimitSuccess(limitResult.attemptId!);
        }
      } else {
        await markEmailRateLimitSuccess(limitResult.attemptId!);
      }
    } catch (err: any) {
      console.warn('Supabase reset password exception:', err.message);
      await markEmailRateLimitError(limitResult.attemptId!);
    }

    // Never disclose if account exists
    res.json({
      success: true,
      message: `If an account exists for ${cleanEmail}, you'll receive a password reset link shortly.`,
      action: 'password_reset_link',
      remaining: limitResult.remaining
    });
  } catch (err: any) {
    console.error('Send password reset link error:', err.message);
    res.status(500).json({ error: 'Failed to dispatch password reset link.' });
  }
});

/**
 * Send Password Reset 6-Digit OTP Code (Max 3 per rolling 24 hours)
 */
router.post('/send-password-reset-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const cleanEmail = normalizeEmail(email);
    const clientIp = getClientIp(req);

    // Atomically consume 1 rate limit slot for OTP before touching Supabase
    const limitResult = await consumeEmailRateLimit(cleanEmail, 'password_reset_otp', clientIp);
    if (!limitResult.allowed) {
      res.status(429).json({
        error: limitResult.reason || RATE_LIMIT_EXCEEDED_MESSAGE,
        code: 'email_rate_limit_exceeded',
        action: 'password_reset_otp',
        limit: 3,
        next_eligible_at: limitResult.nextEligibleAt?.toISOString(),
        retry_after_seconds: limitResult.retryAfterSeconds
      });
      return;
    }

    // Call Supabase Auth signInWithOtp or recovery OTP
    try {
      if (process.env.TEST_MODE !== 'true' && process.env.NODE_ENV !== 'test') {
        const { error } = await supabaseServer.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: getAppRedirectUrl(req, '/reset-password')
          }
        });
        if (error) {
          console.warn('Supabase signInWithOtp note:', error.message);
          await markEmailRateLimitError(limitResult.attemptId!);
        } else {
          await markEmailRateLimitSuccess(limitResult.attemptId!);
        }
      } else {
        await markEmailRateLimitSuccess(limitResult.attemptId!);
      }
    } catch (err: any) {
      console.warn('Supabase signInWithOtp exception:', err.message);
      await markEmailRateLimitError(limitResult.attemptId!);
    }

    // Never disclose if account exists
    res.json({
      success: true,
      message: `If an account exists for ${cleanEmail}, we sent a 6-digit recovery code to your inbox.`,
      action: 'password_reset_otp',
      remaining: limitResult.remaining
    });
  } catch (err: any) {
    console.error('Send password reset OTP error:', err.message);
    res.status(500).json({ error: 'Failed to dispatch password recovery code.' });
  }
});

/**
 * Verify Password Reset 6-Digit OTP Code & Update Password
 */
router.post('/verify-password-reset-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp, new_password } = req.body || {};
    if (!email || !otp || !new_password) {
      res.status(400).json({ error: 'Email, 6-digit recovery code, and new password are required.' });
      return;
    }
    const cleanEmail = normalizeEmail(email);
    const cleanOtp = String(otp).trim();

    if (new_password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    let verified = false;

    if (process.env.TEST_MODE !== 'true' && process.env.NODE_ENV !== 'test') {
      const { data, error } = await supabaseServer.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: 'recovery'
      });
      if (error) {
        res.status(400).json({ error: 'Invalid or expired recovery code. Please request a new code.' });
        return;
      }
      verified = Boolean(data.user);
    } else {
      // In test mode, accept standard test recovery codes '123456' or '654321'
      if (cleanOtp !== '123456' && cleanOtp !== '654321') {
        res.status(400).json({ error: 'Invalid or expired recovery code. Please request a new code.' });
        return;
      }
      verified = true;
    }

    if (verified) {
      const passwordHash = bcrypt.hashSync(new_password, 8);
      await db.run(
        `UPDATE profiles SET password_hash = ?, updated_at = ? WHERE email = ?`,
        [passwordHash, new Date().toISOString(), cleanEmail]
      );
    }

    res.json({
      success: true,
      message: 'Password successfully updated! You can now sign in with your new password.'
    });
  } catch (err: any) {
    console.error('Verify reset OTP error:', err.message);
    res.status(500).json({ error: 'Failed to verify recovery code.' });
  }
});

export default router;

// Pure helpers shared by the auth screens. No browser or Supabase imports so they can be unit tested.

export const DEFAULT_AUTH_REDIRECT = '/dashboard';

const AUTH_PATHS = ['/login', '/signup', '/auth', '/forgot-password', '/reset-password', '/auth/callback'];

// Only same-origin, absolute paths are allowed as post-login destinations.
export function sanitizeRedirect(next: string | null | undefined, fallback = DEFAULT_AUTH_REDIRECT): string {
  if (!next) return fallback;
  let value: string;
  try {
    value = decodeURIComponent(next).trim();
  } catch {
    return fallback;
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (/[\u0000-\u001F]/.test(value)) return fallback;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;
  const pathOnly = value.split(/[?#]/)[0];
  if (AUTH_PATHS.includes(pathOnly)) return fallback;
  return value;
}

export function loginPathFor(destination: string): string {
  const safe = sanitizeRedirect(destination, '');
  return safe ? `/login?next=${encodeURIComponent(safe)}` : '/login';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Enter your email address.';
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address, like name@company.com.';
  return null;
}

export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (!password) return 'Enter a password.';
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > 72) return 'Use 72 characters or fewer.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Include at least one letter and one number.';
  return null;
}

export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score++;
  if (password.length >= 12 && /[^A-Za-z0-9]/.test(password)) score++;
  return score as 0 | 1 | 2 | 3;
}

export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function validateUsername(username: string): string | null {
  const value = username.trim();
  if (!value) return 'Choose a username.';
  if (!USERNAME_RE.test(value)) return 'Use 3–24 lowercase letters, numbers, or underscores.';
  return null;
}

export function validateFullName(name: string): string | null {
  const value = name.trim();
  if (!value) return 'Enter your full name.';
  if (value.length < 2) return 'Name is too short.';
  if (value.length > 80) return 'Use 80 characters or fewer.';
  return null;
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export function validateAvatarFile(file: { size: number; type: string }): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return 'Upload a PNG, JPG, WebP, or GIF image.';
  if (file.size > AVATAR_MAX_BYTES) return 'Images must be 2 MB or smaller.';
  return null;
}

export interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

// Translate Supabase Auth errors into messages a person can act on.
export function friendlyAuthError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = (err || {}) as AuthErrorLike;
  const code = e.code || '';
  const msg = (e.message || '').toLowerCase();

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'That email and password don’t match. Check them and try again.';
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Please verify your email before signing in. We can resend the link.';
  }
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code === 'weak_password' || msg.includes('password should')) {
    return 'That password is too weak. Use at least 8 characters with letters and numbers.';
  }
  if (code === 'same_password' || msg.includes('should be different')) {
    return 'Your new password must be different from your current one.';
  }
  if (code === 'email_rate_limit_exceeded' || msg.includes('maximum of 3 email requests')) {
    return e.message || "You've reached the maximum of 3 email requests within 24 hours. Please try again later.";
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || e.status === 429 || msg.includes('rate limit')) {
    return e.message || 'Too many attempts. Please wait a minute and try again.';
  }
  if (code === 'otp_expired' || msg.includes('expired')) {
    return 'This link has expired. Request a new one to continue.';
  }
  if (code === 'session_not_found' || code === 'session_expired' || msg.includes('auth session missing')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (code === 'signup_disabled') {
    return 'New sign-ups are currently disabled.';
  }
  if (msg.includes('database error saving new user')) {
    return 'We couldn’t create your profile. Please try a different username or try again shortly.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network') || e.name === 'AuthRetryableFetchError' || e.status === 0) {
    return 'We couldn’t reach the authentication service. Check your connection and try again.';
  }
  if (e.status && e.status >= 500) {
    return 'The authentication service is unavailable right now. Please try again shortly.';
  }
  return fallback;
}

export interface AuthUrlError {
  code: string;
  description: string;
}

// Supabase reports callback failures in the query string or the URL hash.
export function parseAuthUrlError(search: string, hash: string): AuthUrlError | null {
  const sources = [new URLSearchParams(search), new URLSearchParams(hash.replace(/^#/, ''))];
  for (const params of sources) {
    const error = params.get('error') || params.get('error_code');
    if (error) {
      return {
        code: params.get('error_code') || error,
        description: params.get('error_description') || ''
      };
    }
  }
  return null;
}

export function initialsFor(name: string | null | undefined, fallback = 'K'): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

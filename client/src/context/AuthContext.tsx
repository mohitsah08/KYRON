import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { Profile } from '../types.ts';
import { api, setAuthToken, getAuthToken } from '../utils/api.ts';
import { supabase, supabaseUrl, supabaseAnonKey } from '../utils/supabase.ts';
import { friendlyAuthError, validateAvatarFile, sanitizeRedirect } from '../utils/authHelpers.ts';

export interface RegisterResult {
  needsEmailVerification: boolean;
  user?: Profile;
}

// Error thrown by auth actions: `message` is safe to show, `code` lets screens branch (e.g. resend verification).
export class AuthActionError extends Error {
  code?: string;
  nextEligibleAt?: string;
  retryAfterSeconds?: number;
  constructor(message: string, code?: string, nextEligibleAt?: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'AuthActionError';
    this.code = code;
    this.nextEligibleAt = nextEligibleAt;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface AuthContextType {
  user: Profile | null;
  authUser: SupabaseUser | null;
  session: Session | null;
  token: string | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  register: (payload: { email: string; password: string; display_name: string; username: string }) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  uploadCoverImage: (file: File) => Promise<string>;
  resetPassword: (email: string) => Promise<void>;
  sendPasswordResetOtp: (email: string) => Promise<void>;
  verifyPasswordResetOtp: (email: string, otp: string, newPassword: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  signInWithProvider: (provider: OAuthProvider, next?: string) => Promise<void>;
  isCreditModalOpen: boolean;
  setIsCreditModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export type OAuthProvider = 'google' | 'github';

const PROVIDER_LABELS: Record<OAuthProvider, string> = { google: 'Google', github: 'GitHub' };

function toActionError(err: unknown, fallback?: string): AuthActionError {
  const e = (err || {}) as { message?: string; code?: string; next_eligible_at?: string; retry_after_seconds?: number };
  const code = e.code;
  const message = (code === 'email_rate_limit_exceeded' || e.message?.includes('maximum of 3 email requests'))
    ? (e.message || "You've reached the maximum of 3 email requests within 24 hours. Please try again later.")
    : friendlyAuthError(err, fallback);
  return new AuthActionError(message, code, e.next_eligible_at, e.retry_after_seconds);
}

export function authRedirectUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

// Minimal profile built from the auth user while the database row is still being created.
function fallbackProfile(authUser: SupabaseUser): Profile {
  const meta = authUser.user_metadata || {};
  const name = meta.full_name || meta.display_name || authUser.email?.split('@')[0] || 'KYRON user';
  return {
    id: authUser.id,
    email: authUser.email || '',
    display_name: name,
    full_name: name,
    username: meta.username || authUser.email?.split('@')[0] || authUser.id.slice(0, 8),
    credit_balance: 0,
    is_unlimited_credit_user: 0,
    role: 'user',
    created_at: authUser.created_at
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState<boolean>(false);

  // Tracks the signed-in user id so late profile responses for a previous user are discarded.
  const currentUserId = useRef<string | null>(null);
  const profileRequest = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  const loadProfile = useCallback((authUser: SupabaseUser, force = false): Promise<void> => {
    if (!force && profileRequest.current?.userId === authUser.id) {
      return profileRequest.current.promise;
    }

    const promise = (async () => {
      // The signup trigger creates the profile row; allow a short window for it to commit.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const data = await api.getMe();
          if (currentUserId.current === authUser.id) setUser(data.user);
          return;
        } catch (err) {
          const message = (err as Error).message || '';
          const notFound = /not found/i.test(message);
          if (!notFound || attempt === 2) {
            console.warn('Could not load KYRON profile:', message);
            break;
          }
          await sleep(600 * (attempt + 1));
        }
      }
      if (currentUserId.current === authUser.id) {
        setUser(prev => (prev && prev.id === authUser.id ? prev : fallbackProfile(authUser)));
      }
    })();

    profileRequest.current = { userId: authUser.id, promise };
    promise.finally(() => {
      if (profileRequest.current?.promise === promise) profileRequest.current = null;
    });
    return promise;
  }, []);

  useEffect(() => {
    let active = true;

    // onAuthStateChange emits INITIAL_SESSION first, so it is the single source of truth.
    // Supabase calls are never awaited inside this callback (it holds the client's auth lock).
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;

      setSession(nextSession);
      if (nextSession?.access_token) {
        setAuthToken(nextSession.access_token);
      }

      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);

      if (!nextSession?.user) {
        const storedToken = getAuthToken();
        if (storedToken) {
          api.getMe()
            .then(res => {
              if (active && res.user) {
                currentUserId.current = res.user.id;
                setUser(res.user);
              }
            })
            .catch(() => {
              setAuthToken(null);
              if (active) setUser(null);
            })
            .finally(() => {
              if (active) setLoading(false);
            });
          return;
        }

        currentUserId.current = null;
        profileRequest.current = null;
        setUser(null);
        setIsPasswordRecovery(false);
        setLoading(false);
        return;
      }

      const authUser = nextSession.user;
      const userChanged = currentUserId.current !== authUser.id;
      currentUserId.current = authUser.id;

      // Token refreshes only rotate the access token; the profile is unchanged.
      if (event === 'TOKEN_REFRESHED' && !userChanged) {
        setLoading(false);
        return;
      }

      if (userChanged) setUser(null);
      void loadProfile(authUser, event === 'USER_UPDATED').finally(() => {
        if (active) setLoading(false);
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshUser = useCallback(async () => {
    const authUser = session?.user;
    if (authUser) {
      await loadProfile(authUser, true);
    } else if (getAuthToken()) {
      try {
        const res = await api.getMe();
        if (res.user) setUser(res.user);
      } catch (err) {
        console.warn('refreshUser error:', err);
      }
    }
  }, [session, loadProfile]);

  const login = useCallback(async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass
    });
    if (error) throw toActionError(error, 'We couldn’t sign you in. Please try again.');
    if (!data.session) throw new AuthActionError('We couldn’t start your session. Please try again.');

    // Resolve the profile before returning so the next screen renders with real data.
    setAuthToken(data.session.access_token);
    currentUserId.current = data.session.user.id;
    setSession(data.session);
    await loadProfile(data.session.user);
  }, [loadProfile]);

  const register = useCallback(async (payload: { email: string; password: string; display_name: string; username: string }): Promise<RegisterResult> => {
    const cleanEmail = payload.email.trim().toLowerCase();

    // Check rate limit quota before initiating signup verification dispatch
    try {
      await api.preSignupRateLimitCheck(cleanEmail);
    } catch (err: any) {
      throw toActionError(err, 'Failed to verify signup eligibility.');
    }

    const fullName = payload.display_name.trim();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: payload.password,
      options: {
        emailRedirectTo: authRedirectUrl('/auth/callback'),
        data: {
          full_name: fullName,
          display_name: fullName,
          username: payload.username.trim().toLowerCase()
        }
      }
    });

    if (error) throw toActionError(error, 'We couldn’t create your account. Please try again.');

    // With email confirmation enabled, an existing address returns a user with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new AuthActionError('An account with this email already exists. Try signing in instead.', 'user_already_exists');
    }

    if (data.session?.user) {
      setAuthToken(data.session.access_token);
      currentUserId.current = data.session.user.id;
      setSession(data.session);
      await loadProfile(data.session.user);
      return { needsEmailVerification: false };
    }

    return { needsEmailVerification: true };
  }, [loadProfile]);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      // Server revocation failed (e.g. offline): still end the session in this browser.
      console.warn('Sign-out could not reach Supabase, clearing local session:', error.message);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    currentUserId.current = null;
    profileRequest.current = null;
    setAuthToken(null);
    setSession(null);
    setUser(null);
    setIsPasswordRecovery(false);
    setIsCreditModalOpen(false);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    const res = await api.updateProfile(updates);
    setUser(res.user);
  }, []);

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    const userId = session?.user?.id || user?.id;
    if (!userId) throw new AuthActionError('Please sign in again to upload an avatar.');

    const invalid = validateAvatarFile(file);
    if (invalid) throw new AuthActionError(invalid);

    const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    // Storage policies only allow writes inside the user's own folder.
    const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
    if (uploadError) {
      console.warn('Avatar upload failed:', uploadError.message);
      throw new AuthActionError('We couldn’t upload that image. Please try again.');
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    await updateProfile({ avatar_url: data.publicUrl });
    return data.publicUrl;
  }, [session, updateProfile]);

  const uploadCoverImage = useCallback(async (file: File): Promise<string> => {
    const userId = session?.user?.id || user?.id;
    if (!userId) throw new AuthActionError('Please sign in again to upload a cover image.');

    const invalid = validateAvatarFile(file);
    if (invalid) throw new AuthActionError(invalid);

    const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const filePath = `${userId}/cover-${Date.now()}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        await updateProfile({ cover_image_url: data.publicUrl });
        return data.publicUrl;
      }
    } catch {}

    // Fallback: load as local Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        await updateProfile({ cover_image_url: dataUrl });
        resolve(dataUrl);
      };
      reader.onerror = () => reject(new AuthActionError('Failed to read cover image file.'));
      reader.readAsDataURL(file);
    });
  }, [session, user, updateProfile]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await api.sendPasswordResetLink(email.trim().toLowerCase());
    } catch (err: any) {
      throw toActionError(err, 'We couldn’t send the reset email. Please try again.');
    }
  }, []);

  const sendPasswordResetOtp = useCallback(async (email: string) => {
    try {
      await api.sendPasswordResetOtp(email.trim().toLowerCase());
    } catch (err: any) {
      throw toActionError(err, 'We couldn’t send the recovery code. Please try again.');
    }
  }, []);

  const verifyPasswordResetOtp = useCallback(async (email: string, otp: string, newPassword: string) => {
    try {
      await api.verifyPasswordResetOtp({
        email: email.trim().toLowerCase(),
        otp,
        new_password: newPassword
      });
    } catch (err: any) {
      throw toActionError(err, 'Failed to verify recovery code.');
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw toActionError(error, 'We couldn’t update your password. Please try again.');
    setIsPasswordRecovery(false);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    try {
      await api.sendVerificationEmail(email.trim().toLowerCase());
    } catch (err: any) {
      throw toActionError(err, 'We couldn’t resend the verification email. Please try again.');
    }
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    setAuthToken(token);
    try {
      const res = await api.getMe();
      if (res.user) {
        currentUserId.current = res.user.id;
        setUser(res.user);
      }
    } catch (err: any) {
      setAuthToken(null);
      throw toActionError(err, 'Could not authenticate with session token.');
    }
  }, []);

  const signInWithProvider = useCallback(async (provider: OAuthProvider, next?: string) => {
    const safeNext = sanitizeRedirect(next, '/dashboard');

    // Single unified OAuth flow: KYRON backend OAuth gateway
    try {
      const backendProviders = await api.getOAuthProviders().catch(() => null);
      if (backendProviders && backendProviders[provider]) {
        const dest = safeNext ? `?next=${encodeURIComponent(safeNext)}` : '';
        window.location.href = `/api/auth/oauth/${provider}${dest}`;
        return;
      }
    } catch {}

    // If credentials are not yet configured in environment:
    throw new AuthActionError(
      `${PROVIDER_LABELS[provider]} sign-in is temporarily unavailable. Please sign in with your email and password.`,
      'provider_disabled'
    );
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    authUser: session?.user ?? null,
    session,
    token: session?.access_token ?? null,
    loading,
    isPasswordRecovery,
    login,
    loginWithToken,
    register,
    logout,
    refreshUser,
    updateProfile,
    uploadAvatar,
    uploadCoverImage,
    resetPassword,
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    updatePassword,
    resendVerification,
    signInWithProvider,
    isCreditModalOpen,
    setIsCreditModalOpen
  }), [loginWithToken, signInWithProvider, user, session, loading, isPasswordRecovery, login, register, logout, refreshUser, updateProfile, uploadAvatar, uploadCoverImage, resetPassword, sendPasswordResetOtp, verifyPasswordResetOtp, updatePassword, resendVerification, isCreditModalOpen]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

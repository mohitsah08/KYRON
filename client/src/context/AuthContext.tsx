import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { Profile } from '../types.ts';
import { api, setAuthToken } from '../utils/api.ts';
import { supabase, supabaseUrl, supabaseAnonKey } from '../utils/supabase.ts';
import { friendlyAuthError, validateAvatarFile } from '../utils/authHelpers.ts';

export interface RegisterResult {
  needsEmailVerification: boolean;
  user?: Profile;
}

// Error thrown by auth actions: `message` is safe to show, `code` lets screens branch (e.g. resend verification).
export class AuthActionError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthActionError';
    this.code = code;
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
  register: (payload: { email: string; password: string; display_name: string; username: string }) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  signInWithProvider: (provider: OAuthProvider, next?: string) => Promise<void>;
  isCreditModalOpen: boolean;
  setIsCreditModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export type OAuthProvider = 'google' | 'github';

const PROVIDER_LABELS: Record<OAuthProvider, string> = { google: 'Google', github: 'GitHub' };

// Supabase publishes which providers are enabled; checking first avoids sending people to a raw error page.
let providerSettings: Promise<Record<string, boolean> | null> | null = null;
function loadProviderSettings(): Promise<Record<string, boolean> | null> {
  if (!providerSettings) {
    providerSettings = supabaseUrl && supabaseAnonKey
      ? fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseAnonKey } })
          .then(res => (res.ok ? res.json() : null))
          .then(data => (data?.external as Record<string, boolean>) ?? null)
          .catch(() => null)
      : Promise.resolve(null);
    providerSettings.then(value => {
      if (!value) providerSettings = null;
    });
  }
  return providerSettings;
}

function toActionError(err: unknown, fallback?: string): AuthActionError {
  const code = (err as { code?: string })?.code;
  return new AuthActionError(friendlyAuthError(err, fallback), code);
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
      setAuthToken(nextSession?.access_token ?? null);

      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);

      if (!nextSession?.user) {
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
    if (!authUser) return;
    await loadProfile(authUser, true);
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
    const fullName = payload.display_name.trim();
    const { data, error } = await supabase.auth.signUp({
      email: payload.email.trim().toLowerCase(),
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
    const userId = session?.user?.id;
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

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: authRedirectUrl('/reset-password')
    });
    // Unknown addresses succeed silently on Supabase's side, so this never reveals account existence.
    if (error) throw toActionError(error, 'We couldn’t send the reset email. Please try again.');
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw toActionError(error, 'We couldn’t update your password. Please try again.');
    setIsPasswordRecovery(false);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: authRedirectUrl('/auth/callback') }
    });
    if (error) throw toActionError(error, 'We couldn’t resend the verification email. Please try again.');
  }, []);

  const signInWithProvider = useCallback(async (provider: OAuthProvider, next?: string) => {
    const enabled = await loadProviderSettings();
    if (enabled && !enabled[provider]) {
      throw new AuthActionError(`${PROVIDER_LABELS[provider]} sign-in isn’t enabled for KYRON yet. Use email and password for now.`, 'provider_disabled');
    }
    const callback = next ? `/auth/callback?flow=oauth&next=${encodeURIComponent(next)}` : '/auth/callback?flow=oauth';
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: authRedirectUrl(callback) }
    });
    if (error) throw toActionError(error, `We couldn’t start ${PROVIDER_LABELS[provider]} sign-in. Please try again.`);
    // On success the browser is already navigating to the provider.
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    authUser: session?.user ?? null,
    session,
    token: session?.access_token ?? null,
    loading,
    isPasswordRecovery,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    uploadAvatar,
    resetPassword,
    updatePassword,
    resendVerification,
    signInWithProvider,
    isCreditModalOpen,
    setIsCreditModalOpen
  }), [signInWithProvider, user, session, loading, isPasswordRecovery, login, register, logout, refreshUser, updateProfile, uploadAvatar, resetPassword, updatePassword, resendVerification, isCreditModalOpen]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

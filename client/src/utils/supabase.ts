import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://slkmbmixdqczcjmmnnhc.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsa21ibWl4ZHFjemNqbW1ubmhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NzEyOTIsImV4cCI6MjEwODI0NzI5Mn0.IcIUhnA7MZkyxpHHdijqFl_7lotEnbvSaajug0WAo_E';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

// Guard: Route email-sending Supabase Auth calls through KYRON server rate limiter
// to prevent direct client-side calls from bypassing rate limits.
const originalResetPasswordForEmail = supabase.auth.resetPasswordForEmail.bind(supabase.auth);
const originalResend = supabase.auth.resend.bind(supabase.auth);
const originalSignInWithOtp = supabase.auth.signInWithOtp.bind(supabase.auth);

(supabase.auth as any).resetPasswordForEmail = async (email: string, options?: any) => {
  try {
    const res = await fetch('/api/auth/send-password-reset-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error: any = new Error(data.error || 'Failed to dispatch password reset link.');
      error.status = res.status;
      error.code = data.code || 'over_email_send_rate_limit';
      error.next_eligible_at = data.next_eligible_at;
      error.retry_after_seconds = data.retry_after_seconds;
      return { data: { user: null, session: null }, error };
    }
    return { data: { user: null, session: null }, error: null };
  } catch (err: any) {
    return { data: { user: null, session: null }, error: err };
  }
};

(supabase.auth as any).resend = async (credentials: any) => {
  if (credentials?.type === 'signup' && credentials?.email) {
    try {
      const res = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error: any = new Error(data.error || 'Failed to dispatch verification email.');
        error.status = res.status;
        error.code = data.code || 'over_email_send_rate_limit';
        error.next_eligible_at = data.next_eligible_at;
        error.retry_after_seconds = data.retry_after_seconds;
        return { data: { user: null, session: null }, error };
      }
      return { data: { user: null, session: null }, error: null };
    } catch (err: any) {
      return { data: { user: null, session: null }, error: err };
    }
  }
  return originalResend(credentials);
};

(supabase.auth as any).signInWithOtp = async (credentials: any) => {
  if (credentials?.email) {
    try {
      const res = await fetch('/api/auth/send-password-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error: any = new Error(data.error || 'Failed to dispatch recovery code.');
        error.status = res.status;
        error.code = data.code || 'over_email_send_rate_limit';
        error.next_eligible_at = data.next_eligible_at;
        error.retry_after_seconds = data.retry_after_seconds;
        return { data: { user: null, session: null }, error };
      }
      return { data: { user: null, session: null }, error: null };
    } catch (err: any) {
      return { data: { user: null, session: null }, error: err };
    }
  }
  return originalSignInWithOtp(credentials);
};


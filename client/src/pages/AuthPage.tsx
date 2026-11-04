import React, { useEffect, useId, useRef, useState } from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth, AuthActionError, OAuthProvider } from '../context/AuthContext.tsx';
import { supabase } from '../utils/supabase.ts';
import { AuthLoadingScreen } from '../components/ProtectedRoute.tsx';
import {
  sanitizeRedirect,
  validateEmail,
  validatePassword,
  validateUsername,
  validateFullName,
  passwordStrength,
  friendlyAuthError,
  parseAuthUrlError,
  AuthUrlError
} from '../utils/authHelpers.ts';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  MailCheck,
  ShieldCheck,
  Sparkles,
  Store,
  XCircle
} from 'lucide-react';

export type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'callback';

// The route decides the mode; /auth?mode=… is kept for older links.
export function authModeFromLocation(path: string, query: URLSearchParams): AuthMode {
  if (path === '/signup') return 'signup';
  if (path === '/forgot-password') return 'forgot-password';
  if (path === '/reset-password') return 'reset-password';
  if (path === '/auth/callback') return 'callback';
  if (path === '/auth') {
    const legacy = query.get('mode');
    if (legacy === 'register' || legacy === 'signup') return 'signup';
    if (legacy === 'forgot-password') return 'forgot-password';
    if (legacy === 'reset-password') return 'reset-password';
  }
  return 'login';
}

const RESEND_COOLDOWN_SECONDS = 60;

/* ---------- Shared UI ---------- */

function Alert({ tone, children }: { tone: 'error' | 'success' | 'info'; children: React.ReactNode }) {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-[#FAFAF9] border-[#E8E8E6] text-[#404040]'
  }[tone];
  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Mail;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`p-3 border text-sm rounded-xl flex items-start gap-2.5 ${styles}`}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: React.ReactNode;
  prefix?: string;
  trailing?: React.ReactNode;
}

function Field({ label, error, hint, prefix, trailing, id, className, ...inputProps }: FieldProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-[#171717]">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#737373]" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full h-11 ${prefix ? 'pl-8' : 'pl-3.5'} ${trailing ? 'pr-11' : 'pr-3.5'} text-sm bg-white border rounded-xl text-[#171717] placeholder:text-[#A3A3A3] transition-colors focus:outline-none focus:ring-2 focus:ring-[#F97316]/25 disabled:bg-[#FAFAF9] disabled:text-[#737373] ${
            error ? 'border-red-400 focus:border-red-500' : 'border-[#E5E5E3] hover:border-[#D4D4D0] focus:border-[#F97316]'
          } ${className || ''}`}
          {...inputProps}
        />
        {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <div id={`${inputId}-hint`} className="text-xs text-[#737373]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function PasswordField(props: Omit<FieldProps, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="p-2 rounded-lg text-[#737373] hover:text-[#171717] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/40"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
    />
  );
}

function StrengthMeter({ password }: { password: string }) {
  const score = passwordStrength(password);
  if (!password) return <span>At least 8 characters, with letters and numbers.</span>;
  const labels = ['Too weak', 'Weak', 'Good', 'Strong'];
  const colors = ['bg-red-400', 'bg-amber-400', 'bg-emerald-500', 'bg-emerald-600'];
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className="flex gap-1 flex-1" aria-hidden="true">
        {[1, 2, 3].map(i => (
          <span key={i} className={`h-1 flex-1 rounded-full ${score >= i ? colors[score] : 'bg-[#E8E8E6]'}`} />
        ))}
      </div>
      <span className="shrink-0">{labels[score]}</span>
    </div>
  );
}

const primaryButton =
  'w-full h-11 bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F97316]';

const secondaryButton =
  'w-full h-11 bg-white border border-[#E5E5E3] hover:border-[#D4D4D0] hover:bg-[#FAFAF9] text-[#171717] font-medium text-sm rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/40';

function SubmitButton({ loading, disabled, children, loadingLabel }: { loading: boolean; disabled?: boolean; children: React.ReactNode; loadingLabel: string }) {
  return (
    <button type="submit" disabled={loading || disabled} aria-busy={loading} className={primaryButton}>
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

function PrimaryAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={primaryButton}>
      {children}
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}

function StatusIcon({ tone }: { tone: 'success' | 'mail' | 'error' }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'mail' ? MailCheck : XCircle;
  const styles =
    tone === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-[#FFF4EB] text-[#F97316] border-[#F97316]/15';
  return (
    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${styles}`}>
      <Icon className="w-6 h-6" aria-hidden="true" />
    </div>
  );
}

function useCooldown() {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);
  return {
    remaining,
    start: (seconds?: number) => setRemaining(seconds && seconds > 0 ? seconds : RESEND_COOLDOWN_SECONDS),
    reset: () => setRemaining(0)
  };
}

function formatRetryCountdown(seconds: number): string {
  if (seconds <= 0) return '';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/* ---------- Social sign-in ---------- */

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" aria-hidden="true" fill="#171717">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}

function SocialButtons({ next, onError, disabled }: { next: string; onError: (message: string | null) => void; disabled?: boolean }) {
  const { signInWithProvider } = useAuth();
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  const start = async (provider: OAuthProvider) => {
    if (pending) return;
    onError(null);
    setPending(provider);
    try {
      await signInWithProvider(provider, next);
      // The browser is leaving for the provider; keep the spinner until it does.
    } catch (err) {
      onError((err as Error).message);
      setPending(null);
    }
  };

  const providers: Array<{ id: OAuthProvider; label: string; icon: React.ReactNode }> = [
    { id: 'google', label: 'Continue with Google', icon: <GoogleIcon /> },
    { id: 'github', label: 'Continue with GitHub', icon: <GitHubIcon /> }
  ];

  return (
    <div className="space-y-2.5">
      {providers.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => void start(p.id)}
          disabled={disabled || pending !== null}
          aria-busy={pending === p.id}
          className={secondaryButton}
        >
          {pending === p.id ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : p.icon}
          <span>{pending === p.id ? 'Redirecting…' : p.label}</span>
        </button>
      ))}
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5" aria-hidden="true">
      <span className="h-px flex-1 bg-[#EDEDEB]" />
      <span className="text-xs text-[#A3A3A3]">or continue with email</span>
      <span className="h-px flex-1 bg-[#EDEDEB]" />
    </div>
  );
}

/* ---------- Layout ---------- */

const HEADINGS: Record<AuthMode, { title: string; subtitle: string }> = {
  login: { title: 'Welcome back to KYRON', subtitle: 'Sign in to access your skills, workspace, and creator dashboard.' },
  signup: { title: 'Create your KYRON account', subtitle: 'Discover AI skills, build your own, and bring your workflows to life.' },
  'forgot-password': { title: 'Reset your password', subtitle: 'Enter the email you signed up with and we’ll send you a secure reset link.' },
  'reset-password': { title: 'Choose a new password', subtitle: 'Pick a strong password you haven’t used on KYRON before.' },
  callback: { title: 'Signing you in', subtitle: 'Hang tight while we confirm your account.' }
};

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-white">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-10 sm:py-16 grid lg:grid-cols-[minmax(0,1fr)_400px] gap-10 lg:gap-16 items-start">
        <div className="w-full max-w-[440px] mx-auto lg:mx-0 lg:justify-self-end lg:w-[440px]">
          <div className="bg-white border border-[#EDEDEB] rounded-2xl p-6 sm:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
            <Link href="/" className="inline-flex items-center gap-2 mb-6 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/40">
              <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
              <span className="font-bold text-base tracking-[0.12em] text-[#171717]">
                KYR<span className="text-[#F97316]">O</span>N
              </span>
            </Link>
            {children}
          </div>
        </div>
        <aside className="hidden lg:block pt-6" aria-label="Why KYRON">
          <h2 className="text-lg font-semibold text-[#171717] tracking-tight">One account for the whole marketplace</h2>
          <p className="mt-2 text-sm text-[#737373] leading-relaxed">
            Browse freely. Sign in when you want to install, publish, or manage your AI skills.
          </p>
          <ul className="mt-8 space-y-6">
            {[
              { icon: Store, title: 'Discover skills', body: 'Install verified Skill.md packages and use them in your agents.' },
              { icon: Sparkles, title: 'Publish as a creator', body: 'Ship your own skills from Creator Studio and track how they perform.' },
              { icon: ShieldCheck, title: 'Security-scanned', body: 'Every package is audited before it reaches the marketplace.' }
            ].map(item => (
              <li key={item.title} className="flex gap-3.5">
                <span className="w-9 h-9 shrink-0 rounded-xl bg-[#FFF4EB] text-[#F97316] flex items-center justify-center">
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-[#171717]">{item.title}</div>
                  <div className="text-sm text-[#737373] leading-relaxed mt-0.5">{item.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Heading({ mode, title, subtitle }: { mode?: AuthMode; title?: string; subtitle?: string }) {
  const h = mode ? HEADINGS[mode] : { title: '', subtitle: '' };
  return (
    <div className="mb-6 space-y-1.5">
      <h1 className="text-2xl font-bold text-[#171717] tracking-tight">{title ?? h.title}</h1>
      <p className="text-sm text-[#737373] leading-relaxed">{subtitle ?? h.subtitle}</p>
    </div>
  );
}

const textLink =
  'font-semibold text-[#EA580C] hover:text-[#C2410C] hover:underline underline-offset-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/40';

function withNext(pathname: string, next: string) {
  return next && next !== '/dashboard' ? `${pathname}?next=${encodeURIComponent(next)}` : pathname;
}

function ModeTabs({ mode, next }: { mode: 'login' | 'signup'; next: string }) {
  const tab = (active: boolean) =>
    `flex-1 h-9 inline-flex items-center justify-center rounded-lg text-sm transition-colors ${
      active ? 'bg-white text-[#171717] font-semibold shadow-sm' : 'text-[#737373] hover:text-[#171717] font-medium'
    }`;
  return (
    <nav className="flex p-1 mb-6 bg-[#F5F5F4] rounded-xl" aria-label="Sign in or create an account">
      <Link href={withNext('/login', next)} aria-current={mode === 'login' ? 'page' : undefined} className={tab(mode === 'login')}>
        Sign In
      </Link>
      <Link href={withNext('/signup', next)} aria-current={mode === 'signup' ? 'page' : undefined} className={tab(mode === 'signup')}>
        Create Account
      </Link>
    </nav>
  );
}

/* ---------- Page ---------- */

export function AuthPage() {
  const { path, query, navigate } = useRouter();
  const { session, loading: authLoading } = useAuth();
  const mode = authModeFromLocation(path, query);
  const next = sanitizeRedirect(query.get('next') || query.get('redirect'));

  // Signed-in users have no business on the login or signup screens.
  useEffect(() => {
    if (!authLoading && session && (mode === 'login' || mode === 'signup')) {
      navigate(next, { replace: true });
    }
  }, [authLoading, session, mode, next]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading && (mode === 'login' || mode === 'signup')) {
    return <AuthLoadingScreen label="Checking your session…" />;
  }

  return (
    <AuthShell>
      {mode === 'login' && <LoginForm next={next} />}
      {mode === 'signup' && <SignupForm next={next} />}
      {mode === 'forgot-password' && <ForgotPasswordForm />}
      {mode === 'reset-password' && <ResetPasswordForm />}
      {mode === 'callback' && <AuthCallback next={next} />}
    </AuthShell>
  );
}

/* ---------- Login ---------- */

function LoginForm({ next }: { next: string }) {
  const { navigate } = useRouter();
  const { login, resendVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const cooldown = useCooldown();
  const inFlight = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    setFormError(null);
    setNotice(null);
    setNeedsVerification(false);

    const nextErrors = {
      email: validateEmail(email),
      password: password ? null : 'Enter your password.'
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setNeedsVerification((err as AuthActionError).code === 'email_not_confirmed');
      setFormError((err as Error).message || 'We couldn’t sign you in. Please try again.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerification(email);
      cooldown.start();
      setFormError(null);
      setNotice(`We sent a new verification link to ${email.trim()}.`);
    } catch (err: any) {
      setFormError(err.message);
      if (err.retryAfterSeconds) {
        cooldown.start(err.retryAfterSeconds);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <ModeTabs mode="login" next={next} />
      <Heading mode="login" />
      {formError && (
        <div className="mb-4">
          <Alert tone="error">
            <span>{formError}</span>
            {needsVerification && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown.remaining > 0}
                className={`block mt-1.5 ${textLink} disabled:opacity-60 disabled:no-underline`}
              >
                {resending ? 'Sending…' : cooldown.remaining > 0 ? `Resend available in ${formatRetryCountdown(cooldown.remaining)}` : 'Resend verification email'}
              </button>
            )}
          </Alert>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}

      <SocialButtons next={next} onError={setFormError} disabled={submitting} />
      <Divider />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onBlur={() => email && setErrors(p => ({ ...p, email: validateEmail(email) }))}
          error={errors.email}
          disabled={submitting}
        />

        <div className="space-y-1.5">
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={errors.password}
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className={`text-xs ${textLink}`}>
              Forgot password?
            </Link>
          </div>
        </div>

        <SubmitButton loading={submitting} loadingLabel="Signing in…">
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </SubmitButton>
      </form>

      <p className="mt-6 text-sm text-center text-[#737373]">
        New to KYRON?{' '}
        <Link href={withNext('/signup', next)} className={textLink}>
          Create an account
        </Link>
      </p>
    </>
  );
}

/* ---------- Sign up ---------- */

type SignupErrors = Partial<Record<'fullName' | 'username' | 'email' | 'password' | 'confirm', string | null>>;

function SignupForm({ next }: { next: string }) {
  const { navigate } = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<SignupErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const inFlight = useRef(false);

  // Suggest a username from the name until the person edits it themselves.
  useEffect(() => {
    if (usernameTouched) return;
    setUsername(fullName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24));
  }, [fullName, usernameTouched]);

  const isUsernameTaken = async (value: string): Promise<boolean> => {
    const { data, error } = await supabase.from('profiles').select('id').eq('username', value).limit(1);
    if (error) return false; // The signup trigger still guarantees uniqueness.
    return (data?.length ?? 0) > 0;
  };

  const checkUsername = async () => {
    const value = username.trim().toLowerCase();
    const invalid = validateUsername(value);
    if (invalid) {
      setErrors(p => ({ ...p, username: invalid }));
      return;
    }
    setErrors(p => ({ ...p, username: null }));
    if (await isUsernameTaken(value)) {
      setErrors(p => ({ ...p, username: 'That username is taken. Try another.' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    setFormError(null);

    const normalizedUsername = username.trim().toLowerCase();
    const nextErrors: SignupErrors = {
      fullName: validateFullName(fullName),
      username: validateUsername(normalizedUsername),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: !confirm ? 'Confirm your password.' : confirm !== password ? 'Passwords don’t match.' : null
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      if (await isUsernameTaken(normalizedUsername)) {
        setErrors(p => ({ ...p, username: 'That username is taken. Try another.' }));
        return;
      }
      const res = await register({ email, password, display_name: fullName, username: normalizedUsername });
      if (res.needsEmailVerification) {
        setSentTo(email.trim().toLowerCase());
      } else {
        navigate(next, { replace: true });
      }
    } catch (err) {
      setFormError((err as Error).message || 'We couldn’t create your account. Please try again.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  if (sentTo) return <CheckEmail email={sentTo} />;

  return (
    <>
      <ModeTabs mode="signup" next={next} />
      <Heading mode="signup" />
      {formError && (
        <div className="mb-4">
          <Alert tone="error">
            <span>{formError}</span>
            {/already exists/i.test(formError) && (
              <Link href={withNext('/login', next)} className={`block mt-1.5 ${textLink}`}>
                Go to sign in
              </Link>
            )}
          </Alert>
        </div>
      )}

      <SocialButtons next={next} onError={setFormError} disabled={submitting} />
      <Divider />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          onBlur={() => fullName && setErrors(p => ({ ...p, fullName: validateFullName(fullName) }))}
          error={errors.fullName}
          disabled={submitting}
        />

        <Field
          label="Username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          prefix="@"
          placeholder="ada_lovelace"
          value={username}
          onChange={e => {
            setUsernameTouched(true);
            setUsername(e.target.value.toLowerCase());
          }}
          onBlur={() => username && void checkUsername()}
          error={errors.username}
          hint="Shown on your public creator profile."
          disabled={submitting}
        />

        <Field
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onBlur={() => email && setErrors(p => ({ ...p, email: validateEmail(email) }))}
          error={errors.email}
          disabled={submitting}
        />

        <PasswordField
          label="Password"
          name="new-password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onBlur={() => password && setErrors(p => ({ ...p, password: validatePassword(password) }))}
          error={errors.password}
          hint={<StrengthMeter password={password} />}
          disabled={submitting}
        />

        <PasswordField
          label="Confirm password"
          name="confirm-password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onBlur={() => confirm && setErrors(p => ({ ...p, confirm: confirm !== password ? 'Passwords don’t match.' : null }))}
          error={errors.confirm}
          disabled={submitting}
        />

        <SubmitButton loading={submitting} loadingLabel="Creating account…">
          <span>Create Account</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </SubmitButton>
      </form>

      <p className="mt-6 text-sm text-center text-[#737373]">
        Already have an account?{' '}
        <Link href={withNext('/login', next)} className={textLink}>
          Sign in
        </Link>
      </p>
    </>
  );
}

function CheckEmail({ email }: { email: string }) {
  const { resendVerification } = useAuth();
  const cooldown = useCooldown();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    cooldown.start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resend = async () => {
    setSending(true);
    setMessage(null);
    try {
      await resendVerification(email);
      cooldown.start();
      setMessage({ tone: 'success', text: 'We sent you a new verification link.' });
    } catch (err: any) {
      setMessage({ tone: 'error', text: err.message });
      if (err.retryAfterSeconds) {
        cooldown.start(err.retryAfterSeconds);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <StatusIcon tone="mail" />
      <Heading title="Check your inbox" subtitle="We sent a verification link to the address below. Open it to activate your account." />
      <div className="-mt-2 px-3.5 py-2.5 rounded-xl bg-[#FAFAF9] border border-[#EDEDEB] text-sm font-medium text-[#171717] break-all">
        {email}
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <p className="text-xs text-[#737373] leading-relaxed">
        Can’t find it? Check your spam folder. Links expire after a while, so use the most recent one.
      </p>
      <div className="space-y-2.5">
        <button type="button" onClick={resend} disabled={sending || cooldown.remaining > 0} className={secondaryButton}>
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Sending…
            </>
          ) : cooldown.remaining > 0 ? (
            `Resend email in ${formatRetryCountdown(cooldown.remaining)}`
          ) : (
            'Resend verification email'
          )}
        </button>
        <Link
          href="/login"
          className="w-full h-11 bg-[#171717] hover:bg-black text-white font-semibold text-sm rounded-xl transition-colors inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#171717]"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

/* ---------- Forgot password ---------- */

type RecoveryMethod = 'link' | 'otp';

function ForgotPasswordForm() {
  const { navigate } = useRouter();
  const { resetPassword, sendPasswordResetOtp, verifyPasswordResetOtp } = useAuth();
  const [method, setMethod] = useState<RecoveryMethod>('link');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpErrors, setOtpErrors] = useState<{ otp?: string | null; password?: string | null; confirm?: string | null }>({});
  const [resetSuccess, setResetSuccess] = useState(false);
  const linkCooldown = useCooldown();
  const otpCooldown = useCooldown();

  const handleSendLink = async (target: string) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await resetPassword(target);
      setSentTo(target);
      linkCooldown.start();
    } catch (err: any) {
      setFormError(err.message);
      if (err.retryAfterSeconds) {
        linkCooldown.start(err.retryAfterSeconds);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (target: string) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await sendPasswordResetOtp(target);
      setSentTo(target);
      setOtpStep(true);
      otpCooldown.start();
    } catch (err: any) {
      setFormError(err.message);
      if (err.retryAfterSeconds) {
        otpCooldown.start(err.retryAfterSeconds);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const invalid = validateEmail(email);
    setEmailError(invalid);
    if (invalid) return;

    const normalized = email.trim().toLowerCase();
    if (method === 'link') {
      void handleSendLink(normalized);
    } else {
      void handleSendOtp(normalized);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !sentTo) return;
    setFormError(null);

    const errors = {
      otp: !otpCode.trim() ? 'Enter the 6-digit code.' : otpCode.trim().length !== 6 ? 'Code must be 6 digits.' : null,
      password: validatePassword(newPassword),
      confirm: !confirmPassword ? 'Confirm your password.' : confirmPassword !== newPassword ? 'Passwords don’t match.' : null
    };
    setOtpErrors(errors);
    if (errors.otp || errors.password || errors.confirm) return;

    setSubmitting(true);
    try {
      await verifyPasswordResetOtp(sentTo, otpCode.trim(), newPassword);
      setResetSuccess(true);
    } catch (err: any) {
      setFormError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (resetSuccess) {
    return (
      <div className="space-y-5">
        <StatusIcon tone="success" />
        <Heading
          title="Password updated"
          subtitle="Your password has been reset successfully. You can now sign in with your new credentials."
        />
        <PrimaryAction onClick={() => navigate('/login', { replace: true })}>
          Sign In Now
        </PrimaryAction>
      </div>
    );
  }

  // OTP Step view
  if (method === 'otp' && otpStep && sentTo) {
    return (
      <div className="space-y-5">
        <StatusIcon tone="mail" />
        <Heading
          title="Enter 6-digit code"
          subtitle={`We sent an OTP code to ${sentTo}. Enter the code and set your new password.`}
        />
        {formError && <Alert tone="error">{formError}</Alert>}

        <form onSubmit={handleVerifyOtp} noValidate className="space-y-4">
          <Field
            label="Verification code"
            name="otp"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={otpCode}
            onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            error={otpErrors.otp}
            disabled={submitting}
          />

          <PasswordField
            label="New password"
            name="new-password"
            autoComplete="new-password"
            placeholder="Create a new password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            error={otpErrors.password}
            hint={<StrengthMeter password={newPassword} />}
            disabled={submitting}
          />

          <PasswordField
            label="Confirm new password"
            name="confirm-password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            error={otpErrors.confirm}
            disabled={submitting}
          />

          <SubmitButton loading={submitting} loadingLabel="Verifying & updating…">
            <span>Update Password</span>
          </SubmitButton>
        </form>

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => void handleSendOtp(sentTo)}
            disabled={submitting || otpCooldown.remaining > 0}
            className={secondaryButton}
          >
            {submitting ? (
              'Sending…'
            ) : otpCooldown.remaining > 0 ? (
              `Resend code in ${formatRetryCountdown(otpCooldown.remaining)}`
            ) : (
              'Resend 6-digit code'
            )}
          </button>
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => {
                setOtpStep(false);
                setFormError(null);
              }}
              className={textLink}
            >
              Use a different email
            </button>
            <Link href="/login" className={`flex items-center gap-1 ${textLink}`}>
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Sent link confirmation view
  if (method === 'link' && sentTo) {
    return (
      <div className="space-y-5">
        <StatusIcon tone="mail" />
        <Heading
          title="Check your email"
          subtitle={`If an account exists for ${sentTo}, you’ll receive a password reset link shortly.`}
        />
        {formError && <Alert tone="error">{formError}</Alert>}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => void handleSendLink(sentTo)}
            disabled={submitting || linkCooldown.remaining > 0}
            className={secondaryButton}
          >
            {submitting ? (
              'Sending…'
            ) : linkCooldown.remaining > 0 ? (
              `Resend link in ${formatRetryCountdown(linkCooldown.remaining)}`
            ) : (
              'Resend reset link'
            )}
          </button>
          <Link href="/login" className={`flex items-center justify-center gap-1.5 text-sm py-2 ${textLink}`}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Heading mode="forgot-password" />

      {/* Recovery Method Selector */}
      <div className="mb-4 grid grid-cols-2 p-1 bg-[#F4F4F5] rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setMethod('link');
            setFormError(null);
          }}
          className={`py-2 rounded-lg transition-colors ${
            method === 'link'
              ? 'bg-white text-[#171717] shadow-xs'
              : 'text-[#737373] hover:text-[#171717]'
          }`}
        >
          Email Reset Link
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod('otp');
            setFormError(null);
          }}
          className={`py-2 rounded-lg transition-colors ${
            method === 'otp'
              ? 'bg-white text-[#171717] shadow-xs'
              : 'text-[#737373] hover:text-[#171717]'
          }`}
        >
          Email 6-Digit OTP
        </button>
      </div>

      <form onSubmit={handleInitialSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <Field
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={emailError}
          disabled={submitting}
        />
        <SubmitButton
          loading={submitting}
          disabled={
            (method === 'link' && linkCooldown.remaining > 0) ||
            (method === 'otp' && otpCooldown.remaining > 0)
          }
          loadingLabel="Sending…"
        >
          <span>{method === 'link' ? 'Send Reset Link' : 'Send 6-Digit Code'}</span>
        </SubmitButton>
      </form>
      <Link href="/login" className={`mt-6 flex items-center justify-center gap-1.5 text-sm ${textLink}`}>
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Sign In
      </Link>
    </>
  );
}

/* ---------- Reset password ---------- */

function useInitialUrlError(): AuthUrlError | null {
  // Captured once: Supabase strips the hash after reading it.
  const [urlError] = useState(() => parseAuthUrlError(window.location.search, window.location.hash));
  return urlError;
}

function ResetPasswordForm() {
  const { navigate } = useRouter();
  const { session, loading, isPasswordRecovery, updatePassword } = useAuth();
  const urlError = useInitialUrlError();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (loading) {
    return (
      <div className="py-10">
        <AuthLoadingScreen label="Validating your reset link…" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5">
        <StatusIcon tone="success" />
        <Heading title="Password updated" subtitle="Your new password is active. Use it the next time you sign in." />
        <PrimaryAction onClick={() => navigate('/dashboard', { replace: true })}>Continue to Dashboard</PrimaryAction>
      </div>
    );
  }

  if (urlError || !session) {
    const expired = urlError?.code === 'otp_expired' || /expired/i.test(urlError?.description || '');
    return (
      <div className="space-y-5">
        <StatusIcon tone="error" />
        <Heading
          title={expired ? 'This reset link has expired' : 'This reset link isn’t valid'}
          subtitle="Reset links work once and expire after a short time. Request a new one to continue."
        />
        <div className="space-y-2.5">
          <PrimaryAction onClick={() => navigate('/forgot-password')}>Request a new link</PrimaryAction>
          <Link href="/login" className={`flex items-center justify-center gap-1.5 text-sm py-2 ${textLink}`}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    const nextErrors = {
      password: validatePassword(password),
      confirm: !confirm ? 'Confirm your new password.' : confirm !== password ? 'Passwords don’t match.' : null
    };
    setErrors(nextErrors);
    if (nextErrors.password || nextErrors.confirm) return;

    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Heading mode="reset-password" />
      {!isPasswordRecovery && (
        <div className="mb-4">
          <Alert tone="info">You’re signed in as {session.user.email}. Setting a new password here updates this account.</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}
        <PasswordField
          label="New password"
          name="new-password"
          autoComplete="new-password"
          placeholder="Create a new password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          error={errors.password}
          hint={<StrengthMeter password={password} />}
          disabled={submitting}
        />
        <PasswordField
          label="Confirm new password"
          name="confirm-password"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          error={errors.confirm}
          disabled={submitting}
        />
        <SubmitButton loading={submitting} loadingLabel="Updating…">
          <span>Update Password</span>
        </SubmitButton>
      </form>
    </>
  );
}

/* ---------- Email verification & OAuth callback ---------- */

function AuthCallback({ next }: { next: string }) {
  const { navigate, query } = useRouter();
  const { session, user, loading, resendVerification, loginWithToken } = useAuth();
  const urlError = useInitialUrlError();
  const isOAuth = query.get('flow') === 'oauth';
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const exchanged = useRef(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resendState, setResendState] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const cooldown = useCooldown();

  // PKCE-style links arrive with ?code=…; exchange it exactly once. Implicit links are
  // handled by the Supabase client itself (detectSessionInUrl).
  const code = query.get('code');
  useEffect(() => {
    if (!code || exchanged.current || urlError || session || loading) return;
    exchanged.current = true;
    setExchanging(true);
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) setExchangeError(friendlyAuthError(error, 'This sign-in link is invalid or has already been used.'));
      })
      .finally(() => setExchanging(false));
  }, [code, urlError, session, loading]);

  // Token-based OAuth callback from KYRON backend
  const token = query.get('token');
  useEffect(() => {
    if (!token || exchanged.current || urlError || session || user) return;
    exchanged.current = true;
    setExchanging(true);
    loginWithToken(token)
      .catch(err => {
        setExchangeError(friendlyAuthError(err, 'Failed to complete sign-in.'));
      })
      .finally(() => setExchanging(false));
  }, [token, urlError, session, user, loginWithToken]);

  const signedIn = (Boolean(session?.user) || Boolean(user)) && !urlError;
  const verified = signedIn && (isOAuth || Boolean(session?.user?.email_confirmed_at));

  useEffect(() => {
    if (!verified) return;
    const t = setTimeout(() => navigate(next, { replace: true }), isOAuth ? 300 : 2500);
    return () => clearTimeout(t);
  }, [verified, next, isOAuth]); // eslint-disable-line react-hooks/exhaustive-deps

  if ((loading || exchanging) && !urlError) {
    return (
      <div className="py-10">
        <AuthLoadingScreen label={isOAuth ? 'Finishing sign-in…' : 'Confirming your email…'} />
      </div>
    );
  }

  if (verified) {
    return (
      <div className="space-y-5">
        <StatusIcon tone="success" />
        <Heading
          title={isOAuth ? 'You’re signed in' : 'Email verified'}
          subtitle={isOAuth ? 'Taking you to KYRON…' : 'Your KYRON account is active. Taking you to your dashboard…'}
        />
        <PrimaryAction onClick={() => navigate(next, { replace: true })}>Continue</PrimaryAction>
      </div>
    );
  }

  if (isOAuth) {
    const cancelled = urlError?.code === 'access_denied' || /denied|cancel/i.test(urlError?.description || '');
    const notConfigured =
      urlError?.code === 'provider_not_configured' ||
      urlError?.code === 'provider_disabled' ||
      /not configured|missing client|temporarily unavailable/i.test(urlError?.description || '');
    return (
      <div className="space-y-5">
        <StatusIcon tone="error" />
        <Heading
          title={
            cancelled
              ? 'Sign-in was cancelled'
              : notConfigured
              ? 'Sign-in temporarily unavailable'
              : 'We couldn’t sign you in'
          }
          subtitle={
            cancelled
              ? 'No changes were made. You can try again or use your email and password.'
              : notConfigured
              ? 'Social sign-in with this provider is temporarily unavailable. Please sign in with your email and password.'
              : (urlError ? friendlyAuthError(urlError) : exchangeError ? friendlyAuthError(exchangeError) : 'The sign-in attempt failed or expired. Please try again.')
          }
        />
        <PrimaryAction onClick={() => navigate(withNext('/login', next), { replace: true })}>Back to Sign In</PrimaryAction>
      </div>
    );
  }

  const expired = urlError?.code === 'otp_expired' || /expired/i.test(urlError?.description || '') || /expired/i.test(exchangeError || '');

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateEmail(email);
    setEmailError(invalid);
    if (invalid || sending || cooldown.remaining > 0) return;
    setSending(true);
    setResendState(null);
    try {
      await resendVerification(email);
      cooldown.start();
      setResendState({ tone: 'success', text: 'If that address is waiting for verification, a new link is on its way.' });
    } catch (err: any) {
      setResendState({ tone: 'error', text: err.message });
      if (err.retryAfterSeconds) {
        cooldown.start(err.retryAfterSeconds);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <StatusIcon tone="error" />
      <Heading
        title={expired ? 'This verification link has expired' : 'We couldn’t verify your email'}
        subtitle={
          expired
            ? 'Verification links expire for your security. Enter your email and we’ll send a fresh one.'
            : 'The link may be invalid or already used. If you’ve verified before, just sign in. Otherwise request a new link.'
        }
      />
      <form onSubmit={resend} noValidate className="space-y-4">
        {resendState && <Alert tone={resendState.tone}>{resendState.text}</Alert>}
        <Field
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={emailError}
          disabled={sending}
        />
        <SubmitButton loading={sending} disabled={cooldown.remaining > 0} loadingLabel="Sending…">
          {cooldown.remaining > 0 ? `Resend available in ${formatRetryCountdown(cooldown.remaining)}` : 'Send a new verification link'}
        </SubmitButton>
      </form>
      <Link href="/login" className={`flex items-center justify-center gap-1.5 text-sm ${textLink}`}>
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Sign In
      </Link>
    </div>
  );
}

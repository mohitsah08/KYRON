import React, { useState } from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldCheck, AlertCircle, ArrowRight, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';

export function AuthPage() {
  const { query, navigate } = useRouter();
  const initialMode = query.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ email, password, display_name: displayName, username });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-12 px-4 bg-white">
      <div className="w-full max-w-md bg-white border border-[#E8E8E6] rounded-2xl p-8 shadow-xl shadow-black/[0.02] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <img src="/logo.png" alt="KYRON Emblem" className="w-8 h-8 object-contain transition-transform group-hover:scale-105" />
            <div className="flex items-center gap-1">
              <span className="font-bold text-lg tracking-wider text-[#171717]">
                KYR<span className="text-[#F97316]">O</span>N
              </span>
              <span className="text-[#A3A3A3] font-mono text-xs">// AGENTS</span>
            </div>
          </Link>
          <h2 className="text-xl font-bold text-[#171717] tracking-tight">
            {mode === 'login' ? 'Sign In to Workspace' : 'Create an Account'}
          </h2>
          <p className="text-xs text-[#737373]">
            {mode === 'login'
              ? 'Access verified agent skills, execution telemetry, and runtime keys.'
              : 'Join Kyron to discover, test, and publish autonomous agent capabilities.'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-1.5 rounded-md transition-all ${
              mode === 'login' ? 'bg-white text-[#171717] shadow-xs font-semibold' : 'text-[#737373]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-1.5 rounded-md transition-all ${
              mode === 'register' ? 'bg-white text-[#171717] shadow-xs font-semibold' : 'text-[#737373]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#171717]">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                  <input
                    type="text"
                    required
                    placeholder="Dr. Elena Vance"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-[#171717] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#171717] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#171717]">Username</label>
                <div className="relative">
                  <span className="text-xs font-mono absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]">@</span>
                  <input
                    type="text"
                    required
                    placeholder="elenavance"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-10 pl-8 pr-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-[#171717] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#171717] transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#171717]">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
              <input
                type="email"
                required
                placeholder="engineer@enterprise.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-[#E8E8E6] rounded-lg text-[#171717] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#171717] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#171717]">Password</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => alert('Password reset link sent to demo environment email.')}
                  className="text-[11px] text-[#F97316] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 pl-9 pr-9 text-xs bg-white border border-[#E8E8E6] rounded-lg text-[#171717] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#171717] transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#171717]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-xs rounded-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* 1-Click Fast Logins */}
        <div className="pt-4 border-t border-[#E8E8E6] space-y-2">
          <div className="text-[11px] font-mono text-[#A3A3A3] uppercase text-center font-semibold">
            Instant Demo Logins
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('demo@kyron.dev', 'password123')}
              className="p-2 rounded-lg border border-[#E8E8E6] bg-[#F8F8F7] hover:bg-white text-left transition-colors"
            >
              <div className="text-xs font-semibold text-[#171717]">Alex Vance</div>
              <div className="text-[10px] font-mono text-[#737373]">demo@kyron.dev ($25)</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@kyron.dev', 'password123')}
              className="p-2 rounded-lg border border-[#E8E8E6] bg-[#F8F8F7] hover:bg-white text-left transition-colors"
            >
              <div className="text-xs font-semibold text-[#171717]">KYRON Admin</div>
              <div className="text-[10px] font-mono text-[#737373]">admin@kyron.dev (SecOps)</div>
            </button>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('contact@axiomlabs.ai', 'password123')}
            className="h-9 px-3 rounded-lg border border-[#E8E8E6] bg-white hover:bg-[#F8F8F7] text-xs font-medium text-[#171717] flex items-center justify-center gap-2 transition-colors"
          >
            <span>Axiom Labs</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('demo@kyron.dev', 'password123')}
            className="h-9 px-3 rounded-lg border border-[#E8E8E6] bg-white hover:bg-[#F8F8F7] text-xs font-medium text-[#171717] flex items-center justify-center gap-2 transition-colors"
          >
            <span>Google SSO</span>
          </button>
        </div>

        <p className="text-[11px] text-center text-[#A3A3A3] leading-relaxed">
          Protected by Kyron Zero-Knowledge Protocol. By connecting, you agree to our Terms and Security Policies.
        </p>
      </div>
    </div>
  );
}

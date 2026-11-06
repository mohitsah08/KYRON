import React, { useState, useEffect, useRef } from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { CommandPalette } from './CommandPalette.tsx';
import { KyronWordmark } from './KyronWordmark.tsx';
import {
  Search,
  Plus,
  Menu,
  X,
  User,
  LayoutDashboard,
  Settings,
  LogOut,
  CreditCard,
  ChevronDown,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Check
} from 'lucide-react';
import { initialsFor } from '../utils/authHelpers.ts';

function UserAvatar({ name, url, size = 'w-8 h-8' }: { name: string; url?: string; size?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  return (
    <span className={`${size} rounded-full overflow-hidden bg-[#171717] dark:bg-[#262626] flex items-center justify-center shrink-0 text-white font-semibold text-xs`}>
      {url && !broken ? (
        <img src={url} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span>{initialsFor(name) || 'PK'}</span>
      )}
    </span>
  );
}

const baseNavLinks = [
  { label: 'Home', path: '/' },
  { label: 'Marketplace', path: '/marketplace' },
  { label: 'Creator Studio', path: '/creator-studio' },
  { label: 'Dashboard', path: '/dashboard', authRequired: true },
];

export function Navbar() {
  const { path, navigate } = useRouter();
  const { user, session, loading: authLoading, logout, setIsCreditModalOpen } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    setSignOutError(null);
    try {
      await logout();
      navigate('/', { replace: true });
    } catch {
      setSignOutError('We couldn’t sign you out. Please try again.');
    }
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  // Global ⌘K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close the profile and theme dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setThemeDropdownOpen(false);
  }, [path]);

  const navLinks = baseNavLinks.filter((l) => !l.authRequired || Boolean(user));

  const isActive = (linkPath: string) => {
    if (linkPath === '/') return path === '/';
    if (linkPath === '/marketplace') return path === '/marketplace' || path === '/skills' || path.startsWith('/skills/');
    if (linkPath === '/creators') return path === '/creators';
    if (linkPath === '/creator-studio') return path === '/creator-studio' || path === '/creator' || path.startsWith('/creator/') || path === '/sell';
    if (linkPath === '/dashboard') return path === '/dashboard' || path.startsWith('/dashboard/');
    if (linkPath === '/profile') return path === '/profile' || (user?.username && path.startsWith(`/creators/${user.username}`));
    return path === linkPath;
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#EDEDEB] dark:border-[#262626] transition-colors duration-200">
        <div className="flex justify-between items-center w-full px-4 sm:px-6 lg:px-10 max-w-[1440px] mx-auto h-16">
          {/* Left: Brand & primary links */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="KYRON"
                className="h-8 w-8 object-contain shrink-0 transition-transform duration-150 group-hover:scale-105"
              />
              <KyronWordmark className="h-5 w-auto text-[#171717] dark:text-white" />
            </Link>

            <nav className="hidden md:flex items-center gap-2 lg:gap-3" aria-label="Primary">
              {navLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`relative text-sm px-3.5 py-1.5 rounded-full transition-all duration-150 ${
                      active
                        ? 'bg-[#FFEDE1] dark:bg-[#382012] text-[#C2410C] dark:text-[#FB923C] font-semibold shadow-xs'
                        : 'text-[#525252] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-white hover:bg-[#F5F5F4] dark:hover:bg-[#1A1A1A] font-medium'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Search, Theme Toggle, Profile & mobile menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="p-2 text-[#525252] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-white hover:bg-[#F5F5F4] dark:hover:bg-[#1A1A1A] rounded-full transition-colors"
              title="Search skills (⌘K)"
              aria-label="Search skills"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* ================= THEME SELECTOR BUTTON & DROPDOWN ================= */}
            <div className="relative" ref={themeDropdownRef}>
              <button
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 ${
                  resolvedTheme === 'dark'
                    ? 'bg-[#382012] hover:bg-[#4A2916] border border-[#EA580C]/40 text-[#FB923C] shadow-xs'
                    : 'bg-[#FFEDE1] hover:bg-[#FCE3D2] border border-[#FDBA74]/40 text-[#EA580C] shadow-xs'
                }`}
                title={`Current theme: ${theme} (${resolvedTheme}). Click to change.`}
                aria-label="Toggle theme mode"
                aria-haspopup="menu"
                aria-expanded={themeDropdownOpen}
              >
                {resolvedTheme === 'dark' ? (
                  <Moon className="w-4 h-4 text-[#FB923C]" />
                ) : (
                  <Sun className="w-4 h-4 text-[#EA580C]" />
                )}
              </button>

              {themeDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#141414] border border-[#E8E8E6] dark:border-[#2E2E2E] rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in"
                >
                  <button
                    role="menuitem"
                    onClick={() => {
                      setTheme('light');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors text-left ${
                      theme === 'light'
                        ? 'text-[#F97316] bg-[#FFF4EB] dark:bg-[#2A1306]'
                        : 'text-[#171717] dark:text-[#EDEDED] hover:bg-[#F8F8F7] dark:hover:bg-[#1F1F1F]'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-[#F97316]" />
                    <span className="flex-1">Light</span>
                    {theme === 'light' && <Check className="w-4 h-4 text-[#F97316] stroke-[2.5]" />}
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => {
                      setTheme('dark');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors text-left ${
                      theme === 'dark'
                        ? 'text-[#F97316] bg-[#FFF4EB] dark:bg-[#2A1306]'
                        : 'text-[#171717] dark:text-[#EDEDED] hover:bg-[#F8F8F7] dark:hover:bg-[#1F1F1F]'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-[#F97316]" />
                    <span className="flex-1">Dark</span>
                    {theme === 'dark' && <Check className="w-4 h-4 text-[#F97316] stroke-[2.5]" />}
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => {
                      setTheme('system');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors text-left ${
                      theme === 'system'
                        ? 'text-[#F97316] bg-[#FFF4EB] dark:bg-[#2A1306]'
                        : 'text-[#171717] dark:text-[#EDEDED] hover:bg-[#F8F8F7] dark:hover:bg-[#1F1F1F]'
                    }`}
                  >
                    <Laptop className="w-4 h-4 text-[#F97316]" />
                    <span className="flex-1">System</span>
                    {theme === 'system' && <Check className="w-4 h-4 text-[#F97316] stroke-[2.5]" />}
                  </button>
                </div>
              )}
            </div>

            {authLoading || (session && !user) ? (
              <span className="w-8 h-8 rounded-full bg-[#F5F5F4] dark:bg-[#1A1A1A] animate-pulse" aria-hidden="true" />
            ) : !user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center px-3.5 h-9 text-[#171717] dark:text-white hover:bg-[#F5F5F4] dark:hover:bg-[#1A1A1A] text-sm font-medium rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center px-4 h-9 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold rounded-lg transition-colors active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F97316]"
                >
                  Get Started
                </Link>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-0.5 pr-2 rounded-full border border-[#E8E8E6] dark:border-[#2E2E2E] bg-white dark:bg-[#141414] hover:border-[#D4D4D0] dark:hover:border-[#404040] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/40"
                  aria-haspopup="menu"
                  aria-expanded={userDropdownOpen}
                  aria-label="Open profile menu"
                >
                  <UserAvatar name={user.display_name} url={user.avatar_url} />
                  <ChevronDown className="w-3.5 h-3.5 text-[#737373] dark:text-[#A3A3A3]" />
                </button>

                {userDropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#141414] border border-[#E8E8E6] dark:border-[#2E2E2E] rounded-2xl shadow-xl py-1.5 z-50 text-[#171717] dark:text-[#EDEDED]"
                  >
                    <div className="px-4 py-2.5 border-b border-[#EDEDEB] dark:border-[#262626] flex items-center gap-3">
                      <UserAvatar name={user.display_name} url={user.avatar_url} size="w-9 h-9" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#171717] dark:text-white truncate">{user.display_name}</div>
                        <div className="text-xs text-[#737373] dark:text-[#A3A3A3] truncate">{session?.user?.email || `@${user.username}`}</div>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link href="/dashboard" role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#171717] dark:text-[#EDEDED] hover:bg-[#F8F8F7] dark:hover:bg-[#1F1F1F] transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-[#737373] dark:text-[#A3A3A3]" />
                        <span>My Dashboard</span>
                      </Link>
                      <Link href="/profile" role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#171717] dark:text-[#EDEDED] hover:bg-[#F8F8F7] dark:hover:bg-[#1F1F1F] transition-colors">
                        <User className="w-4 h-4 text-[#737373] dark:text-[#A3A3A3]" />
                        <span>My Profile</span>
                      </Link>
                      <Link href="/creator-studio" role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#171717] dark:text-[#EDEDED] hover:bg-[#F8F8F7] dark:hover:bg-[#1F1F1F] transition-colors">
                        <Sparkles className="w-4 h-4 text-[#737373] dark:text-[#A3A3A3]" />
                        <span>Creator Studio</span>
                      </Link>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setIsCreditModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#171717] dark:text-[#EDEDED] hover:bg-[#F8F8F7] dark:hover:bg-[#1F1F1F] transition-colors text-left"
                      >
                        <CreditCard className="w-4 h-4 text-[#737373] dark:text-[#A3A3A3]" />
                        <span className="flex-1">Credits</span>
                        <span className="font-mono text-xs text-[#F97316] font-semibold">${user.credit_balance.toFixed(2)}</span>
                        <Plus className="w-3 h-3 text-[#737373] dark:text-[#A3A3A3]" />
                      </button>
                      <Link href="/settings" role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#171717] dark:text-[#EDEDED] hover:bg-[#F8F8F7] dark:hover:bg-[#1F1F1F] transition-colors">
                        <Settings className="w-4 h-4 text-[#737373] dark:text-[#A3A3A3]" />
                        <span>Account Settings</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-[#EDEDEB] dark:border-[#262626]">
                      <button
                        role="menuitem"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#B91C1C] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left font-medium"
                      >
                        <LogOut className="w-4 h-4 text-[#B91C1C] dark:text-red-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#525252] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-white hover:bg-[#F5F5F4] dark:hover:bg-[#1A1A1A] rounded-lg"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#EDEDEB] dark:border-[#262626] bg-white dark:bg-[#0A0A0A] px-4 py-3 space-y-1 shadow-lg">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive(link.path)
                    ? 'bg-[#FFEDE1] dark:bg-[#382012] text-[#C2410C] dark:text-[#FB923C]'
                    : 'text-[#525252] dark:text-[#A3A3A3] hover:bg-[#F8F8F7] dark:hover:bg-[#1A1A1A]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!authLoading && !session && (
              <div className="pt-2 mt-2 border-t border-[#EDEDEB] dark:border-[#262626] grid grid-cols-2 gap-2">
                <Link href="/login" className="flex items-center justify-center h-10 rounded-lg border border-[#E8E8E6] dark:border-[#2E2E2E] text-sm font-medium text-[#171717] dark:text-white">
                  Sign In
                </Link>
                <Link href="/signup" className="flex items-center justify-center h-10 rounded-lg bg-[#F97316] text-sm font-semibold text-white">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
        {signOutError && (
          <div role="alert" className="border-t border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-sm px-4 py-2 text-center">
            {signOutError}
          </div>
        )}
      </header>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}

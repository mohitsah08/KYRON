import React, { useState, useEffect, useRef } from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { CommandPalette } from './CommandPalette.tsx';
import { KyronWordmark } from './KyronWordmark.tsx';
import {
  Search,
  Bell,
  Plus,
  Menu,
  X,
  User,
  LayoutDashboard,
  Settings,
  LogOut,
  CreditCard,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { initialsFor } from '../utils/authHelpers.ts';

function UserAvatar({ name, url, size = 'w-8 h-8' }: { name: string; url?: string; size?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  return (
    <span className={`${size} rounded-full overflow-hidden bg-[#FFF4EB] flex items-center justify-center shrink-0`}>
      {url && !broken ? (
        <img src={url} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span className="text-xs font-semibold text-[#EA580C]">{initialsFor(name)}</span>
      )}
    </span>
  );
}

const baseNavLinks = [
  { label: 'Home', path: '/' },
  { label: 'Marketplace', path: '/marketplace' },
  { label: 'Creator Studio', path: '/creator-studio' },
  { label: 'Dashboard', path: '/dashboard', authRequired: true },
  { label: 'Profile', path: '/profile', authRequired: true },
];

export function Navbar() {
  const { path, navigate } = useRouter();
  const { user, session, loading: authLoading, logout, setIsCreditModalOpen } = useAuth();
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
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close the profile dropdown on outside click
  useEffect(() => {
    if (!userDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [userDropdownOpen]);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
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
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur border-b border-[#EDEDEB]">
        <div className="flex justify-between items-center w-full px-4 sm:px-6 lg:px-10 max-w-[1440px] mx-auto h-16">
          {/* Left: Brand & primary links */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="KYRON"
                className="h-8 w-8 object-contain shrink-0 transition-transform duration-150 group-hover:scale-105"
              />
              <KyronWordmark className="h-5 w-auto text-[#171717]" />
            </Link>

            <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`relative text-sm py-5 transition-colors ${
                    isActive(link.path)
                      ? 'text-[#171717] font-semibold after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:bg-[#F97316] after:rounded-full'
                      : 'text-[#525252] hover:text-[#171717] font-medium'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: Search, notifications, profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 w-64 px-3 h-9 rounded-lg border border-[#E8E8E6] bg-[#FAFAF9] hover:border-[#D4D4D0] text-xs transition-colors"
              aria-label="Search skills"
            >
              <Search className="w-4 h-4 text-[#A3A3A3]" />
              <span className="flex-1 text-left text-[#A3A3A3]">Search skills...</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#E8E8E6] text-[#737373]">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="lg:hidden p-2 text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F4] rounded-lg transition-colors"
              aria-label="Search skills"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>

            <button
              className="relative p-2 text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F4] rounded-lg transition-colors"
              title="Notifications"
              aria-label="Notifications"
              onClick={() => navigate(session ? '/dashboard' : '/login?next=%2Fdashboard')}
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F97316] rounded-full ring-2 ring-white"></span>
            </button>

            {authLoading || (session && !user) ? (
              <span className="w-8 h-8 rounded-full bg-[#F5F5F4] animate-pulse" aria-hidden="true" />
            ) : !user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center px-3.5 h-9 text-[#171717] hover:bg-[#F5F5F4] text-sm font-medium rounded-lg transition-colors"
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
                  className="flex items-center gap-2 p-0.5 pr-2 rounded-full border border-[#E8E8E6] hover:border-[#D4D4D0] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/40"
                  aria-haspopup="menu"
                  aria-expanded={userDropdownOpen}
                  aria-label="Open profile menu"
                >
                  <UserAvatar name={user.display_name} url={user.avatar_url} />
                  <span className="hidden lg:block max-w-[120px] truncate text-sm font-medium text-[#171717]">
                    {user.display_name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#737373] hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 bg-white border border-[#E8E8E6] rounded-xl shadow-xl py-1.5 z-50"
                  >
                    <div className="px-4 py-2.5 border-b border-[#EDEDEB] flex items-center gap-3">
                      <UserAvatar name={user.display_name} url={user.avatar_url} size="w-9 h-9" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#171717] truncate">{user.display_name}</div>
                        <div className="text-xs text-[#737373] truncate">{session?.user?.email || `@${user.username}`}</div>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link href="/dashboard" role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#171717] hover:bg-[#F8F8F7] transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-[#737373]" />
                        <span>My Dashboard</span>
                      </Link>
                      <Link href="/profile" role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#171717] hover:bg-[#F8F8F7] transition-colors">
                        <User className="w-4 h-4 text-[#737373]" />
                        <span>My Profile</span>
                      </Link>
                      <Link href="/creator-studio" role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#171717] hover:bg-[#F8F8F7] transition-colors">
                        <Sparkles className="w-4 h-4 text-[#737373]" />
                        <span>Creator Studio</span>
                      </Link>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setIsCreditModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#171717] hover:bg-[#F8F8F7] transition-colors text-left"
                      >
                        <CreditCard className="w-4 h-4 text-[#737373]" />
                        <span className="flex-1">Credits</span>
                        <span className="font-mono text-xs text-[#F97316] font-semibold">${user.credit_balance.toFixed(2)}</span>
                        <Plus className="w-3 h-3 text-[#737373]" />
                      </button>
                      <Link href="/settings" role="menuitem" className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#171717] hover:bg-[#F8F8F7] transition-colors">
                        <Settings className="w-4 h-4 text-[#737373]" />
                        <span>Account Settings</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-[#EDEDEB]">
                      <button
                        role="menuitem"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#B91C1C] hover:bg-red-50 transition-colors text-left font-medium"
                      >
                        <LogOut className="w-4 h-4 text-[#B91C1C]" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F4] rounded-lg"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#EDEDEB] bg-white px-4 py-3 space-y-1 shadow-lg">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive(link.path) ? 'bg-[#FFF4EB] text-[#F97316]' : 'text-[#525252] hover:bg-[#F8F8F7]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!authLoading && !session && (
              <div className="pt-2 mt-2 border-t border-[#EDEDEB] grid grid-cols-2 gap-2">
                <Link href="/login" className="flex items-center justify-center h-10 rounded-lg border border-[#E8E8E6] text-sm font-medium text-[#171717]">
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
          <div role="alert" className="border-t border-red-200 bg-red-50 text-red-800 text-sm px-4 py-2 text-center">
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

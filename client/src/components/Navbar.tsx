import React, { useState, useEffect } from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { CommandPalette } from './CommandPalette.tsx';
import { 
  Search, 
  Terminal, 
  Bell, 
  Plus, 
  Menu, 
  X, 
  User, 
  Folder, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  CreditCard,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export function Navbar() {
  const { path, navigate } = useRouter();
  const { user, logout, setIsCreditModalOpen } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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

  const navLinks = [
    { label: 'Marketplace', path: '/skills' },
    { label: 'Categories', path: '/categories' },
    { label: 'MCP Hub', path: '/mcp' },
    { label: 'Workspace', path: '/dashboard' },
    { label: 'My Library', path: '/library' },
    { label: 'Projects', path: '/projects' },
    { label: 'AI Chat', path: '/chat' },
    { label: 'Creator Studio', path: '/creator' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white border-b border-[#E8E8E6]">
        <div className="flex justify-between items-center w-full px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto h-14">
          {/* Left: Brand Identity & Links */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img 
                src="/logo.png" 
                alt="KYRON Emblem" 
                className="h-8 w-8 object-contain shrink-0 transition-transform duration-150 group-hover:scale-105" 
              />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-wider text-[#171717]">
                  KYR<span className="text-[#F97316]">O</span>N
                </span>
                <span className="text-[#A3A3A3] font-mono text-xs tracking-normal font-normal">
                  // AGENTS
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-5">
              {navLinks.map((link) => {
                const isActive = link.path === '/' 
                  ? path === '/' 
                  : path === link.path || (link.path === '/skills' && path.startsWith('/skills'));
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`text-sm transition-colors py-1 ${
                      isActive 
                        ? 'text-[#171717] font-semibold border-b-2 border-[#F97316]' 
                        : 'text-[#737373] hover:text-[#171717] font-medium'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Quick Search, Actions, Credits, User */}
          <div className="flex items-center gap-3">
            {/* Quick Find Command Palette Trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#E8E8E6] bg-[#F8F8F7] hover:border-[#D4D4D0] text-[#737373] text-xs transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[#A3A3A3]" />
              <span className="text-[#A3A3A3]">Quick find...</span>
              <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-white border border-[#E8E8E6] text-[#737373]">
                ⌘K
              </kbd>
            </button>

            {/* Quick Chat Playground icon */}
            <Link
              href="/chat"
              className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F8F8F7] rounded-lg transition-colors"
              title="Launch AI Chat & Execution"
            >
              <Terminal className="w-4 h-4" />
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button
                className="p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F8F8F7] rounded-lg transition-colors"
                title="Notifications"
                onClick={() => navigate('/dashboard')}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#F97316] rounded-full ring-2 ring-white"></span>
              </button>
            </div>

            <div className="h-4 w-[1px] bg-[#E8E8E6] hidden sm:block"></div>

            {/* Logged Out Actions */}
            {!user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth"
                  className="hidden sm:inline-flex items-center px-3 h-8 bg-white border border-[#E8E8E6] hover:border-[#D4D4D0] hover:bg-[#F8F8F7] text-[#171717] text-xs font-medium rounded-lg transition-colors active:scale-[0.99]"
                >
                  Sign In
                </Link>
                <Link
                  href="/creator/submit"
                  className="inline-flex items-center gap-1 px-3 h-8 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium rounded-lg transition-colors active:scale-[0.99]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Deploy Skill</span>
                </Link>
              </div>
            ) : (
              /* Logged In Actions */
              <div className="flex items-center gap-3">
                {/* Credit balance chip */}
                <button
                  onClick={() => setIsCreditModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 h-8 bg-[#F8F8F7] hover:bg-[#E8E8E6] border border-[#E8E8E6] rounded-lg text-xs font-mono font-medium text-[#171717] transition-colors"
                  title="Click to top up credits"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>${user.credit_balance.toFixed(2)}</span>
                  <Plus className="w-3 h-3 text-[#737373]" />
                </button>

                {/* Deploy Skill CTA */}
                <Link
                  href="/creator/submit"
                  className="hidden sm:inline-flex items-center gap-1 px-3 h-8 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium rounded-lg transition-colors active:scale-[0.99]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Deploy Skill</span>
                </Link>

                {/* User Avatar Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="w-8 h-8 rounded-full border border-[#E8E8E6] overflow-hidden bg-[#F8F8F7] flex items-center justify-center hover:border-[#D4D4D0] transition-colors"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-mono text-xs font-semibold text-[#171717]">
                        {user.display_name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 bg-white border border-[#E8E8E6] rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-3.5 py-2 border-b border-[#E8E8E6]">
                        <div className="text-xs font-semibold text-[#171717] truncate">{user.display_name}</div>
                        <div className="text-[11px] font-mono text-[#737373] truncate">@{user.username}</div>
                      </div>
                      
                      <div className="py-1">
                        <Link href="/dashboard" className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#171717] hover:bg-[#F8F8F7] transition-colors">
                          <User className="w-3.5 h-3.5 text-[#737373]" />
                          <span>Workspace Overview</span>
                        </Link>
                        <Link href="/library" className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#171717] hover:bg-[#F8F8F7] transition-colors">
                          <Folder className="w-3.5 h-3.5 text-[#737373]" />
                          <span>My Library</span>
                        </Link>
                        <Link href="/projects" className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#171717] hover:bg-[#F8F8F7] transition-colors">
                          <Sparkles className="w-3.5 h-3.5 text-[#737373]" />
                          <span>Projects & Deliverables</span>
                        </Link>
                        <Link href="/chat" className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#171717] hover:bg-[#F8F8F7] transition-colors">
                          <MessageSquare className="w-3.5 h-3.5 text-[#737373]" />
                          <span>AI Chat Interface</span>
                        </Link>
                        <Link href="/settings" className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#171717] hover:bg-[#F8F8F7] transition-colors">
                          <Settings className="w-3.5 h-3.5 text-[#737373]" />
                          <span>Team & Settings</span>
                        </Link>
                        <Link href="/admin" className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#F97316] hover:bg-[#FFF4EB] transition-colors font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" />
                          <span>Trust & Safety Console</span>
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-[#E8E8E6]">
                        <button
                          onClick={() => {
                            logout();
                            navigate('/');
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#B91C1C] hover:bg-red-50 transition-colors text-left font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5 text-[#B91C1C]" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-1.5 text-[#737373] hover:text-[#171717] hover:bg-[#F8F8F7] rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-[#E8E8E6] bg-white px-4 py-3 space-y-1 shadow-lg">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  path === link.path ? 'bg-[#FFF4EB] text-[#F97316]' : 'text-[#737373] hover:bg-[#F8F8F7]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[#E8E8E6] space-y-1">
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-[#737373] hover:bg-[#F8F8F7]"
              >
                Workspace Settings
              </Link>
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-[#F97316] font-medium hover:bg-[#FFF4EB]"
              >
                Trust & Safety Console
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Global Command Palette Modal */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />
    </>
  );
}

import React from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  LayoutDashboard, 
  Folder, 
  Terminal, 
  Settings, 
  ShieldCheck, 
  Plus, 
  LogOut,
  Sparkles,
  MessageSquare
} from 'lucide-react';

interface SideNavProps {
  activeTab?: string;
}

export function SideNav({ activeTab }: SideNavProps) {
  const { path, navigate } = useRouter();
  const { user, logout } = useAuth();

  const links = [
    { id: 'overview', label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { id: 'library', label: 'My Library', path: '/library', icon: Folder, badge: '6' },
    { id: 'projects', label: 'Projects', path: '/projects', icon: Sparkles, badge: '8' },
    { id: 'mcp', label: 'MCP Connections', path: '/mcp', icon: Terminal, status: '4 LIVE' },
    { id: 'chat', label: 'AI Chat', path: '/chat', icon: MessageSquare },
    { id: 'creator', label: 'Creator Studio', path: '/creator', icon: Terminal },
    { id: 'settings', label: 'Team & Settings', path: '/settings', icon: Settings },
    { id: 'admin', label: 'Trust & Safety', path: '/admin', icon: ShieldCheck, accent: true },
  ];

  return (
    <>
      {/* Mobile Horizontal Workspace Bar (< lg) */}
      <div className="lg:hidden w-full border-b border-[#E8E8E6] bg-white px-3 py-2 overflow-x-auto flex items-center gap-1.5 shrink-0 sticky top-14 z-30">
        {links.map((item) => {
          const Icon = item.icon;
          const isCurrent = activeTab 
            ? activeTab === item.id 
            : path === item.path || (item.path !== '/' && path.startsWith(item.path));

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                isCurrent
                  ? 'bg-[#FFF4EB] text-[#F97316] font-semibold border border-[#F97316]/30'
                  : 'text-[#737373] hover:text-[#171717] bg-[#F8F8F7]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-1 px-1 py-0.2 bg-white border border-[#E8E8E6] font-mono text-[9px] rounded text-[#737373]">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Desktop Vertical Sidebar (>= lg) */}
      <aside className="hidden lg:flex w-[260px] shrink-0 border-r border-[#E8E8E6] bg-white flex-col justify-between p-4 min-h-screen select-none">
        <div className="flex flex-col gap-6">
          {/* Workspace Brand Header */}
          <div className="flex items-center gap-3 px-1.5 py-1">
            <div className="w-8 h-8 rounded-lg bg-[#171717] flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Emblem" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold tracking-tight text-[#171717] truncate font-mono">
                KYRON // WORKSPACE
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]"></span>
                <span className="text-[10px] text-[#737373] uppercase tracking-wide">Enterprise Tier</span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1">
            {links.map((item) => {
              const Icon = item.icon;
              const isCurrent = activeTab 
                ? activeTab === item.id 
                : path === item.path || (item.path !== '/' && path.startsWith(item.path));

              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isCurrent
                      ? 'bg-[#FFF4EB] text-[#F97316] font-semibold border border-[#F97316]/20'
                      : 'text-[#737373] hover:text-[#171717] hover:bg-[#F8F8F7]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-[#F97316]' : 'text-[#737373]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 bg-[#F8F8F7] border border-[#E8E8E6] font-mono text-[10px] text-[#737373] rounded">
                      {item.badge}
                    </span>
                  )}
                  {item.status && (
                    <span className="px-1.5 py-0.2 bg-emerald-50 text-[#15803D] font-mono text-[9px] rounded font-semibold">
                      {item.status}
                    </span>
                  )}
                  {isCurrent && !item.badge && !item.status && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]"></span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-3 pt-4 border-t border-[#E8E8E6]">
          {/* Deploy Skill CTA */}
          <Link
            href="/creator/submit"
            className="w-full flex items-center justify-center gap-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white h-9 rounded-lg px-3 text-xs font-medium transition-colors duration-150 active:scale-[0.99]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deploy Skill</span>
          </Link>

          {/* Runtime cluster status */}
          <div className="p-2.5 bg-[#F8F8F7] rounded-lg border border-[#E8E8E6] text-[11px] font-mono">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#737373]">CLUSTER US-EAST</span>
              <span className="text-[#15803D] font-semibold">99.98%</span>
            </div>
            <div className="w-full bg-[#E8E8E6] h-1 rounded-full overflow-hidden">
              <div className="bg-[#F97316] h-full w-[82%]"></div>
            </div>
          </div>

          {/* User Card & Logout */}
          {user && (
            <div className="flex items-center justify-between px-2 pt-2 border-t border-[#E8E8E6]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#E8E8E6] overflow-hidden flex items-center justify-center text-[10px] font-mono font-bold">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user.display_name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-[#171717] truncate">{user.display_name}</span>
                  <span className="text-[10px] font-mono text-[#737373] truncate">${user.credit_balance.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title="Sign Out"
                className="text-[#737373] hover:text-[#B91C1C] p-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

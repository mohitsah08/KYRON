import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { api } from '../utils/api.ts';
import { Skill } from '../types.ts';
import { Search, X, Sparkles, Terminal, Folder, Shield, ArrowRight } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await api.getSkills({ q: query, limit: 6 });
        setSkills(data.skills);
      } catch (err) {
        console.warn('Failed to search skills in command palette:', err);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const quickPages = [
    { title: 'Explore Marketplace', path: '/skills', icon: Sparkles, desc: 'Browse all verified skills' },
    { title: 'Categories & Search', path: '/categories', icon: Folder, desc: '32 specialized AI domains' },
    { title: 'MCP Connection Hub', path: '/mcp', icon: Terminal, desc: 'Connect Claude, Cursor, and Codex' },
    { title: 'AI Chat Playground', path: '/chat', icon: Terminal, desc: 'Execute agent skills interactively' },
    { title: 'Projects & Deliverables', path: '/projects', icon: Folder, desc: 'Manage agent workflows' },
    { title: 'Trust & Safety Console', path: '/admin', icon: Shield, desc: 'Security scans and moderation' },
  ];

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white border border-[#E8E8E6] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#E8E8E6] gap-3">
          <Search className="w-5 h-5 text-[#737373] shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a skill name, protocol, or command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm text-[#171717] placeholder:text-[#A3A3A3] bg-transparent outline-none font-medium"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F8F8F7] border border-[#E8E8E6] rounded text-[#737373]">
            ESC
          </kbd>
          <button onClick={onClose} className="text-[#737373] hover:text-[#171717] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[#E8E8E6]">
          {/* Quick Pages */}
          {!query && (
            <div className="py-2">
              <div className="px-3 py-1 text-[11px] font-mono uppercase text-[#A3A3A3] font-semibold">
                Quick Navigation
              </div>
              <div className="space-y-0.5 mt-1">
                {quickPages.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.path}
                      onClick={() => handleSelect(p.path)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-[#F8F8F7] transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#737373] group-hover:text-[#F97316] transition-colors" />
                        <div>
                          <div className="text-sm font-medium text-[#171717]">{p.title}</div>
                          <div className="text-xs text-[#737373]">{p.desc}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#A3A3A3] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Searched Skills */}
          {skills.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-[11px] font-mono uppercase text-[#A3A3A3] font-semibold">
                Skills & Agents ({skills.length})
              </div>
              <div className="space-y-0.5 mt-1">
                {skills.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(`/skills/${s.slug}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-[#F8F8F7] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded bg-[#FFF4EB] border border-[#F97316]/20 flex items-center justify-center text-[#F97316] shrink-0 font-bold text-xs">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#171717] truncate">{s.name}</div>
                        <div className="text-xs text-[#737373] truncate">{s.summary}</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-semibold text-[#171717] shrink-0 ml-3">
                      {s.pricing_type === 'free' ? 'Free' : `$${s.price.toFixed(2)}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && skills.length === 0 && !loading && (
            <div className="p-8 text-center text-sm text-[#737373]">
              No skills found matching "<span className="text-[#171717] font-medium">{query}</span>"
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#F8F8F7] border-t border-[#E8E8E6] flex items-center justify-between text-xs text-[#737373]">
          <span>Navigate with mouse or keyboard</span>
          <span className="font-mono text-[11px]">KYRON v2.4</span>
        </div>
      </div>
    </div>
  );
}

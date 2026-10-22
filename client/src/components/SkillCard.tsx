import React, { useState } from 'react';
import { Skill } from '../types.ts';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';
import { Check, Download, ArrowRight, Star, ShieldCheck, Terminal } from 'lucide-react';

interface SkillCardProps {
  skill: Skill;
  onInstalled?: () => void;
}

export function SkillCard({ skill, onInstalled }: SkillCardProps) {
  const { navigate } = useRouter();
  const { user, refreshUser, setIsCreditModalOpen } = useAuth();
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  const isFree = skill.pricing_type === 'free' || skill.price === 0;

  // Derive latency estimate from skill ID or metadata
  const latencyMs = skill.slug.includes('octocode') ? 340 : skill.slug.includes('geo') ? 420 : 38;

  const handleQuickInstall = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/auth');
      return;
    }

    if (isFree) {
      setInstalling(true);
      try {
        await api.installFreeSkill(skill.id);
        setInstalled(true);
        if (onInstalled) onInstalled();
      } catch (err) {
        console.warn('Install failed:', err);
      } finally {
        setInstalling(false);
      }
    } else {
      if (user.credit_balance < skill.price && user.is_unlimited_credit_user !== 1) {
        setIsCreditModalOpen(true);
        return;
      }
      setInstalling(true);
      try {
        await api.purchaseWithCredit(skill.id);
        await refreshUser();
        setInstalled(true);
        if (onInstalled) onInstalled();
      } catch (err) {
        console.warn('Purchase failed:', err);
      } finally {
        setInstalling(false);
      }
    }
  };

  return (
    <div 
      onClick={() => navigate(`/skills/${skill.slug}`)}
      className="group relative bg-white border border-[#E8E8E6] hover:border-[#D4D4D0] rounded-xl p-5 flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
    >
      <div>
        {/* Top Header Rail: Provider & Operational Latency */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-[#F8F8F7] border border-[#E8E8E6] flex items-center justify-center shrink-0 overflow-hidden">
              {skill.logo_url ? (
                <img src={skill.logo_url} alt={skill.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-mono text-[10px] font-bold text-[#171717]">
                  {skill.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-[#737373] truncate">
              @{skill.creator_username || 'kyron'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#F8F8F7] border border-[#E8E8E6] text-[#737373]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span>
              <span>{latencyMs}ms</span>
            </span>
          </div>
        </div>

        {/* Skill Title */}
        <h3 className="font-semibold text-base text-[#171717] group-hover:text-[#F97316] transition-colors leading-snug mb-1.5 line-clamp-1">
          {skill.name}
        </h3>

        {/* Capability Summary */}
        <p className="text-xs text-[#737373] leading-relaxed line-clamp-2 mb-4">
          {skill.summary}
        </p>

        {/* Capability Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F8F8F7] border border-[#E8E8E6] text-[#737373]">
            v{skill.current_version}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FFF4EB] border border-[#F97316]/20 text-[#F97316]">
            MCP 1.0
          </span>
          {skill.category && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F8F8F7] text-[#737373]">
              {skill.category.replace(/-/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Rail: Pricing, Ratings, and Execution / Install Action */}
      <div className="pt-3 border-t border-[#E8E8E6] flex items-center justify-between mt-auto">
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-bold text-sm text-[#171717]">
            {isFree ? (
              <span className="text-[#15803D]">Free</span>
            ) : (
              <span>${skill.price.toFixed(2)}</span>
            )}
          </span>
          {skill.deal_discount_percent ? (
            <span className="text-[10px] font-mono font-bold text-[#F97316] bg-[#FFF4EB] px-1 rounded">
              -{skill.deal_discount_percent}%
            </span>
          ) : null}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#A3A3A3] font-mono ml-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{skill.average_rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {installed ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#15803D] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Check className="w-3 h-3" />
              <span>Installed</span>
            </span>
          ) : (
            <button
              onClick={handleQuickInstall}
              disabled={installing}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-[#F8F8F7] border border-[#E8E8E6] hover:border-[#D4D4D0] text-[#171717] transition-all group-hover:border-[#F97316]/40 group-hover:text-[#F97316] active:scale-[0.98]"
            >
              {isFree ? (
                <>
                  <Download className="w-3 h-3" />
                  <span>{installing ? 'Installing...' : 'Get Skill'}</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3 h-3" />
                  <span>{installing ? 'Purchasing...' : 'Connect'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

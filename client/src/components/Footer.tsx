import React from 'react';
import { Link } from '../context/RouterContext.tsx';

export function Footer() {
  return (
    <footer className="w-full bg-[#FFFFFF] border-t border-[#E8E8E6] mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 pb-10 border-b border-[#E8E8E6]">
          {/* Col 1: Brand & Operational Status */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="KYRON Emblem" className="h-7 w-7 object-contain shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-wider text-[#171717]">
                  KYR<span className="text-[#F97316]">O</span>N
                </span>
                <span className="text-[#A3A3A3] font-mono text-xs">// AGENTS</span>
              </div>
            </Link>
            <p className="text-xs text-[#737373] leading-relaxed max-w-sm">
              The curated registry and marketplace for autonomous AI agent skills. Discover, inspect, and deploy verified skills for Claude Code, Cursor, Codex, and Antigravity.
            </p>
            {/* Live Operational Status Pill */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#F8F8F7] border border-[#E8E8E6] text-xs font-mono text-[#15803D]">
              <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
              <span>All Systems Operational (99.98%)</span>
            </div>
          </div>

          {/* Col 2: Marketplace */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717] font-mono">
              Marketplace
            </h4>
            <ul className="space-y-2 text-xs text-[#737373]">
              <li>
                <Link href="/marketplace" className="hover:text-[#171717] transition-colors">
                  Explore Verified Skills
                </Link>
              </li>
              <li>
                <Link href="/marketplace?filter=free" className="hover:text-[#171717] transition-colors">
                  Free 1-Click Skills
                </Link>
              </li>
              <li>
                <Link href="/marketplace?sort=votes" className="hover:text-[#171717] transition-colors">
                  Community Upvoted
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Creators */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717] font-mono">
              Creators
            </h4>
            <ul className="space-y-2 text-xs text-[#737373]">
              <li>
                <Link href="/creators" className="hover:text-[#171717] transition-colors">
                  Creator Hub & Guides
                </Link>
              </li>
              <li>
                <Link href="/creator-studio" className="hover:text-[#171717] transition-colors">
                  Creator Studio
                </Link>
              </li>
              <li>
                <Link href="/creator-studio" className="hover:text-[#171717] transition-colors">
                  Publish a Skill
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Security */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717] font-mono">
              Trust & Security
            </h4>
            <ul className="space-y-2 text-xs text-[#737373]">
              <li>
                <span className="text-[#737373]">8-Point Automated Static Analysis Scanner</span>
              </li>
              <li>
                <span className="text-[#737373]">Zero-Knowledge Hermetic Enclave</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A3A3A3]">
          <div className="flex items-center gap-3">
            <span>© 2026 KYRON Protocol. All rights reserved.</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-[#737373]">v2.4.1 STANDALONE</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/marketplace" className="hover:text-[#171717] transition-colors">Marketplace</Link>
            <Link href="/creators" className="hover:text-[#171717] transition-colors">Creator Hub</Link>
            <Link href="/creator-studio" className="hover:text-[#171717] transition-colors">Creator Studio</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

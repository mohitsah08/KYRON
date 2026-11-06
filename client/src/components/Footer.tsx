import React from 'react';
import { Link } from '../context/RouterContext.tsx';
import { KyronWordmark } from './KyronWordmark.tsx';

export function Footer() {
  return (
    <footer className="w-full bg-[#FFFFFF] dark:bg-[#0A0A0A] border-t border-[#E8E8E6] dark:border-[#262626] mt-auto transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 pb-10 border-b border-[#E8E8E6] dark:border-[#262626]">
          {/* Col 1: Brand & Operational Status */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="KYRON Emblem" className="h-7 w-7 object-contain shrink-0" />
              <div className="flex items-center gap-2">
                <KyronWordmark className="h-4.5 w-auto text-[#171717] dark:text-white" />
                <span className="text-[#A3A3A3] font-mono text-xs">// AGENTS</span>
              </div>
            </Link>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] leading-relaxed max-w-sm">
              The curated registry and marketplace for autonomous AI agent skills. Discover, inspect, and deploy verified skills for Claude Code, Cursor, Codex, and Antigravity.
            </p>
            {/* Live Operational Status Pill */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#F8F8F7] dark:bg-[#141414] border border-[#E8E8E6] dark:border-[#262626] text-xs font-mono text-[#15803D] dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-[#15803D] dark:bg-emerald-400 animate-pulse"></span>
              <span>All Systems Operational (99.98%)</span>
            </div>
          </div>

          {/* Col 2: Marketplace */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717] dark:text-white font-mono">
              Marketplace
            </h4>
            <ul className="space-y-2 text-xs text-[#737373] dark:text-[#A3A3A3]">
              <li>
                <Link href="/marketplace" className="hover:text-[#171717] dark:hover:text-white transition-colors">
                  Explore Verified Skills
                </Link>
              </li>
              <li>
                <Link href="/marketplace?filter=free" className="hover:text-[#171717] dark:hover:text-white transition-colors">
                  Free 1-Click Skills
                </Link>
              </li>
              <li>
                <Link href="/marketplace?sort=votes" className="hover:text-[#171717] dark:hover:text-white transition-colors">
                  Community Upvoted
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Creators */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717] dark:text-white font-mono">
              Creators
            </h4>
            <ul className="space-y-2 text-xs text-[#737373] dark:text-[#A3A3A3]">
              <li>
                <Link href="/creators" className="hover:text-[#171717] dark:hover:text-white transition-colors">
                  Creator Hub & Guides
                </Link>
              </li>
              <li>
                <Link href="/creator-studio" className="hover:text-[#171717] dark:hover:text-white transition-colors">
                  Creator Studio
                </Link>
              </li>
              <li>
                <Link href="/creator-studio" className="hover:text-[#171717] dark:hover:text-white transition-colors">
                  Publish a Skill
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Security */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717] dark:text-white font-mono">
              Trust & Security
            </h4>
            <ul className="space-y-2 text-xs text-[#737373] dark:text-[#A3A3A3]">
              <li>
                <span className="text-[#737373] dark:text-[#A3A3A3]">8-Point Automated Static Analysis Scanner</span>
              </li>
              <li>
                <span className="text-[#737373] dark:text-[#A3A3A3]">Zero-Knowledge Hermetic Enclave</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A3A3A3]">
          <div className="flex items-center gap-3">
            <span>© 2026 KYRON Protocol. All rights reserved.</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-[#737373] dark:text-[#A3A3A3]">v2.4.1 STANDALONE</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/marketplace" className="hover:text-[#171717] dark:hover:text-white transition-colors">Marketplace</Link>
            <Link href="/creators" className="hover:text-[#171717] dark:hover:text-white transition-colors">Creator Hub</Link>
            <Link href="/creator-studio" className="hover:text-[#171717] dark:hover:text-white transition-colors">Creator Studio</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

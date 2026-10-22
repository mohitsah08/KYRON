import React from 'react';
import { Link } from '../context/RouterContext.tsx';
import { ShieldCheck, Terminal, ExternalLink, CheckCircle } from 'lucide-react';

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
              The curated registry and runtime gateway for autonomous AI agent skills. Discover, benchmark, and deploy audited tools and MCP servers with zero-knowledge sandboxing.
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
                <Link href="/skills" className="hover:text-[#171717] transition-colors">
                  Explore Verified Skills
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-[#171717] transition-colors">
                  32 Domain Categories
                </Link>
              </li>
              <li>
                <Link href="/skills?filter=free" className="hover:text-[#171717] transition-colors">
                  Free 1-Click Skills
                </Link>
              </li>
              <li>
                <Link href="/skills?sort=votes" className="hover:text-[#171717] transition-colors">
                  Community Upvoted
                </Link>
              </li>
              <li>
                <Link href="/creator" className="hover:text-[#171717] transition-colors">
                  Creator Studio & Payouts (70/30)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Developers & Protocol */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717] font-mono">
              MCP & Protocols
            </h4>
            <ul className="space-y-2 text-xs text-[#737373]">
              <li>
                <Link href="/mcp" className="hover:text-[#171717] transition-colors">
                  Model Context Protocol Hub
                </Link>
              </li>
              <li>
                <Link href="/mcp?client=claude" className="hover:text-[#171717] transition-colors">
                  Claude Desktop Config
                </Link>
              </li>
              <li>
                <Link href="/mcp?client=cursor" className="hover:text-[#171717] transition-colors">
                  Cursor Rules & MCP Extension
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-[#171717] transition-colors">
                  Interactive AI Chat Playground
                </Link>
              </li>
              <li>
                <Link href="/projects" className="hover:text-[#171717] transition-colors">
                  Projects & Multi-Agent Deliverables
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust, Safety & Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717] font-mono">
              Trust & Security
            </h4>
            <ul className="space-y-2 text-xs text-[#737373]">
              <li>
                <Link href="/admin" className="hover:text-[#F97316] transition-colors flex items-center gap-1 font-medium text-[#171717]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Trust & Safety Console</span>
                </Link>
              </li>
              <li>
                <span className="text-[#737373]">8-Point Automated AST Scanner</span>
              </li>
              <li>
                <span className="text-[#737373]">Zero-Knowledge Hermetic Enclave</span>
              </li>
              <li>
                <Link href="/settings" className="hover:text-[#171717] transition-colors">
                  Workspace Team Management
                </Link>
              </li>
              <li>
                <span className="text-[#737373]">Deterministic Codemod Verification</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A3A3A3]">
          <div className="flex items-center gap-3">
            <span>© 2026 KYRON Protocol. All rights reserved.</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-[#737373]">v2.4.1 MCP-STABLE</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/skills" className="hover:text-[#171717] transition-colors">Marketplace</Link>
            <Link href="/mcp" className="hover:text-[#171717] transition-colors">Protocol</Link>
            <Link href="/admin" className="hover:text-[#171717] transition-colors">Security</Link>
            <Link href="/dashboard" className="hover:text-[#171717] transition-colors">Workspace</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

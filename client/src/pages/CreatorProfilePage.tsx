import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext.tsx';

interface CreatorSkillItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  tag: string;
  rating: number;
  badge: string;
  summary: string;
  latency: string;
  context: string;
  price: string;
}

export function CreatorProfilePage() {
  const { navigate } = useRouter();
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'skills' | 'about' | 'changelog'>('skills');
  const [filter, setFilter] = useState<'all' | 'mcp' | 'ast'>('all');

  const skills: CreatorSkillItem[] = [
    {
      id: '1',
      name: 'OctoCode Architect',
      slug: 'octocode-architect',
      category: 'Development',
      tag: '#mcp-core',
      rating: 4.9,
      badge: 'MCP Native',
      summary: 'Multi-repo autonomous refactoring system with real-time dependency graph reconciliation and AST semantic alignment.',
      latency: '142ms',
      context: '128k',
      price: '0.0024'
    },
    {
      id: '2',
      name: 'AST Migrator Pro',
      slug: 'ast-migrator-pro',
      category: 'Code Tooling',
      tag: '#transpiler',
      rating: 4.8,
      badge: 'MCP Native',
      summary: 'Deterministic code migration pipelines translating legacy TypeScript/JavaScript to modern idiomatic Rust & Go.',
      latency: '88ms',
      context: 'pure-ast',
      price: '0.0018'
    },
    {
      id: '3',
      name: 'Sentinel Security Auditor',
      slug: 'sentinel-security-auditor',
      category: 'Security & Compliance',
      tag: '#security',
      rating: 5.0,
      badge: 'Tier 0 Sandboxed',
      summary: 'Zero-trust AST code auditing engine scanning for prompt injection, buffer overruns, and telemetry data exfiltration.',
      latency: '45ms',
      context: '64k',
      price: '0.0030'
    },
    {
      id: '4',
      name: 'SEC Filing Synthesis MCP',
      slug: 'sec-filing-financial-synthesis-mcp',
      category: 'Finance & Compliance',
      tag: '#sec-edgar',
      rating: 4.9,
      badge: 'MCP stdio',
      summary: 'Deterministic EDGAR 10-K & 10-Q filing ingestion engine with balance sheet reconciliation and XBRL validation.',
      latency: '180ms',
      context: '256k',
      price: '0.0045'
    },
    {
      id: '5',
      name: 'Browserbase Headless Computer Use',
      slug: 'browserbase-headless-computer-use',
      category: 'DevOps & Infra',
      tag: '#automation',
      rating: 4.8,
      badge: 'MCP SSE',
      summary: 'Stealth headless browser execution environment for complex agentic web navigation and deterministic scraping.',
      latency: '240ms',
      context: '32k',
      price: '0.0050'
    },
    {
      id: '6',
      name: 'SchemaForge DB Migration',
      slug: 'schemaforge-db-migration',
      category: 'Database & Migrations',
      tag: '#postgres',
      rating: 4.9,
      badge: 'MCP Native',
      summary: 'Zero-loss PostgreSQL schema transformations with dynamic vector index generation and Prisma binding synthesis.',
      latency: '92ms',
      context: '128k',
      price: '0.0018'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-6 md:px-margin py-8 md:py-10">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-code-sm font-code-sm text-text-tertiary">
          <button onClick={() => navigate('/skills')} className="hover:text-text-primary transition-colors">
            Registry
          </button>
          <span>/</span>
          <span className="text-text-secondary">Studios</span>
          <span>/</span>
          <span className="text-text-primary font-medium">Axiom Labs</span>
        </div>

        {/* Creator Header Banner */}
        <section className="bg-bg-canvas border border-border-subtle rounded-xl p-6 md:p-8 relative mb-10">
          <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6 pb-6 border-b border-border-subtle">
            
            {/* Studio Identity */}
            <div className="flex items-start gap-5">
              <div className="relative w-20 h-20 rounded-xl bg-bg-surface border border-border-subtle p-2 flex items-center justify-center shrink-0 shadow-xs">
                <img 
                  alt="Axiom Labs Studio Emblem" 
                  className="w-full h-full object-contain" 
                  src="/logo.svg"
                />
                <span className="absolute -bottom-1 -right-1 bg-status-success w-3.5 h-3.5 rounded-full border-2 border-bg-canvas" title="Operational Cluster Live"></span>
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight">
                    Axiom Labs
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-tint text-primary-container border border-primary-container/20 text-label-sm font-label-sm">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    Verified Studio
                  </span>
                  <span className="text-code-sm font-code-sm text-text-secondary bg-bg-surface px-2 py-0.5 rounded border border-border-subtle">
                    @axiom_labs
                  </span>
                </div>
                <p className="text-body-md font-body-md text-text-secondary max-w-2xl leading-relaxed">
                  Pioneering deterministic developer tools, autonomous AST migration agents, and high-performance Model Context Protocol (MCP) servers.
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3 shrink-0 self-start lg:self-auto">
              <button 
                onClick={() => setFollowing(!following)}
                className={`inline-flex items-center gap-2 px-4 h-9 rounded-lg font-body-md font-medium transition-colors active:scale-[0.99] ${
                  following
                    ? 'bg-bg-surface border border-border-strong text-text-primary'
                    : 'bg-primary-container text-on-primary hover:bg-accent-hover'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {following ? 'check' : 'add'}
                </span>
                <span>{following ? 'Following' : 'Follow Studio'}</span>
              </button>
              <button 
                onClick={() => navigate('/chat')}
                className="inline-flex items-center gap-2 px-4 h-9 rounded-lg border border-border-subtle bg-bg-canvas text-text-primary font-body-md hover:border-border-strong hover:bg-bg-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-text-secondary">mail</span>
                <span>Contact / Inquire</span>
              </button>
            </div>
          </div>

          {/* Studio Metadata Rail */}
          <div className="pt-5 flex flex-wrap items-center gap-y-3 gap-x-6 text-body-sm font-body-sm text-text-secondary">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-text-tertiary">location_on</span>
              <span>San Francisco, CA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-text-tertiary">link</span>
              <span className="text-text-primary hover:underline font-code-sm text-code-sm">axiomlabs.dev</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-text-tertiary">calendar_today</span>
              <span>Joined Sept 2024</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-text-tertiary">deployed_code</span>
              <span className="font-medium text-text-primary">14 Published Skills</span>
            </div>
            <div className="ml-auto flex items-center gap-2 text-code-sm font-code-sm text-status-success">
              <span className="w-2 h-2 rounded-full bg-status-success"></span>
              <span>99.98% Protocol Availability</span>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="border-b border-border-subtle mb-8">
          <div className="flex gap-8 -mb-px">
            <button 
              onClick={() => setActiveTab('skills')}
              className={`flex items-center gap-2 pb-3.5 font-headline-md text-headline-md border-b-2 transition-colors ${
                activeTab === 'skills'
                  ? 'border-primary-container text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>Published Skills</span>
              <span className="px-2 py-0.5 text-label-sm font-label-sm rounded-full bg-bg-surface text-text-secondary border border-border-subtle">
                {skills.length}
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-2 pb-3.5 text-body-md font-body-md border-b-2 transition-colors ${
                activeTab === 'about'
                  ? 'border-primary-container text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>About & Architecture</span>
            </button>
            <button 
              onClick={() => setActiveTab('changelog')}
              className={`flex items-center gap-2 pb-3.5 text-body-md font-body-md border-b-2 transition-colors ${
                activeTab === 'changelog'
                  ? 'border-primary-container text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>Release Notes & Changelog</span>
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>
            </button>
          </div>
        </div>

        {/* Tab 1: Published Skills */}
        {activeTab === 'skills' && (
          <div>
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-label-md font-label-md text-text-secondary uppercase tracking-wider">Catalog Filter:</span>
                <div className="flex items-center gap-1.5 bg-bg-surface p-1 rounded-lg border border-border-subtle text-body-sm font-body-sm">
                  <button 
                    onClick={() => setFilter('all')}
                    className={`px-2.5 py-1 rounded transition-colors ${filter === 'all' ? 'bg-bg-canvas text-text-primary font-medium border border-border-subtle shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    All Models
                  </button>
                  <button 
                    onClick={() => setFilter('mcp')}
                    className={`px-2.5 py-1 rounded transition-colors ${filter === 'mcp' ? 'bg-bg-canvas text-text-primary font-medium border border-border-subtle shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    MCP Protocol
                  </button>
                  <button 
                    onClick={() => setFilter('ast')}
                    className={`px-2.5 py-1 rounded transition-colors ${filter === 'ast' ? 'bg-bg-canvas text-text-primary font-medium border border-border-subtle shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    AST Automation
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-code-sm font-code-sm text-text-secondary">
                <span>Sort by:</span>
                <span className="text-text-primary font-medium">Rating & Velocity</span>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {skills.map(skill => (
                <article 
                  key={skill.id}
                  className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all duration-150 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Metadata Rail */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle text-code-sm font-code-sm">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-bg-surface text-text-secondary border border-border-subtle">{skill.category}</span>
                        <span className="text-text-tertiary">{skill.tag}</span>
                      </div>
                      <div className="flex items-center gap-1 text-text-primary font-medium">
                        <span className="material-symbols-outlined text-[15px] text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span>{skill.rating}</span>
                      </div>
                    </div>

                    {/* Title & Badges */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-headline-md font-headline-md text-text-primary group-hover:text-primary transition-colors">
                        {skill.name}
                      </h3>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-label-sm font-label-sm bg-accent-tint text-primary-container border border-primary-container/20 shrink-0">
                        {skill.badge}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-body-sm font-body-sm text-text-secondary line-clamp-2 mb-4 leading-relaxed">
                      {skill.summary}
                    </p>

                    {/* Metric Badges */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      <span className="text-code-sm font-code-sm px-2 py-0.5 rounded bg-bg-surface text-text-secondary border border-border-subtle">
                        lat: {skill.latency}
                      </span>
                      <span className="text-code-sm font-code-sm px-2 py-0.5 rounded bg-bg-surface text-text-secondary border border-border-subtle">
                        context: {skill.context}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Rail */}
                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                    <div className="text-code-sm font-code-sm text-text-primary font-medium">
                      {skill.price} <span className="text-text-tertiary font-normal">TOK/req</span>
                    </div>
                    <button 
                      onClick={() => navigate(`/skills/${skill.slug}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-canvas text-body-sm font-body-sm text-text-primary hover:border-border-strong hover:bg-bg-surface transition-colors active:scale-[0.99]"
                    >
                      <span>View details</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: About & Architecture */}
        {activeTab === 'about' && (
          <div className="bg-bg-canvas border border-border-subtle rounded-xl p-8 space-y-6 max-w-3xl">
            <h3 className="font-headline-md font-semibold text-text-primary text-headline-md">
              Axiom Labs Engineering Principles
            </h3>
            <p className="text-body-md text-text-secondary leading-relaxed">
              We build deterministic, zero-hallucination tools for autonomous software engineering. Every model Context Protocol (MCP) server published by Axiom Labs is compiled against hermetic AST verification boundaries, guaranteeing reproducible symbol graphs and non-leaking memory allocations.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-subtle font-code-sm text-xs">
              <div className="p-4 bg-bg-surface border border-border-subtle rounded-lg">
                <span className="text-text-tertiary uppercase text-[10px] block mb-1">COMPILATION TARGET</span>
                <span className="text-text-primary font-medium">Rust 2024 / WASM Tier 0</span>
              </div>
              <div className="p-4 bg-bg-surface border border-border-subtle rounded-lg">
                <span className="text-text-tertiary uppercase text-[10px] block mb-1">PROTOCOL STANDARD</span>
                <span className="text-text-primary font-medium">Anthropic MCP 2024-11-05</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Changelog */}
        {activeTab === 'changelog' && (
          <div className="bg-bg-canvas border border-border-subtle rounded-xl p-8 space-y-6 max-w-3xl">
            <div className="space-y-4 font-body-sm text-body-sm">
              <div className="border-l-2 border-primary-container pl-4 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-headline-md font-semibold text-text-primary">v2.4.1 Release</span>
                  <span className="font-code-sm text-xs text-text-tertiary">Oct 20, 2025</span>
                </div>
                <p className="text-text-secondary">
                  Released OctoCode Architect memory leak fix for cyclical monorepo AST traversals. Heap allocation reduced by 94.2%.
                </p>
              </div>

              <div className="border-l-2 border-border-subtle pl-4 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-headline-md font-semibold text-text-primary">v2.0.0 Release</span>
                  <span className="font-code-sm text-xs text-text-tertiary">Sept 12, 2025</span>
                </div>
                <p className="text-text-secondary">
                  Added full Model Context Protocol stdio and SSE transport compatibility across all 14 published skills.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

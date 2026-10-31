import React, { useState } from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { loginPathFor } from '../utils/authHelpers.ts';
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  FolderArchive,
  ShieldCheck,
  DollarSign,
  Cpu,
  Layers,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Terminal,
  FileText
} from 'lucide-react';

export function CreatorHubPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'quickstart' | 'what-to-sell' | 'format-spec' | 'packaging' | 'validation' | 'pricing' | 'agents' | 'faq'
  >('quickstart');

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Quickstart checklist state persisted in localStorage for creators
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('kyron_creator_checklist');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleChecklist = (id: string) => {
    const updated = { ...checklist, [id]: !checklist[id] };
    setChecklist(updated);
    try {
      localStorage.setItem('kyron_creator_checklist', JSON.stringify(updated));
    } catch {}
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 7) * 100);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleProtectedAction = (targetPath: string) => {
    if (!user) {
      navigate(loginPathFor(targetPath));
    } else {
      navigate(targetPath);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#171717] font-sans">
      {/* Top Banner / Announcement */}
      <div className="bg-[#171717] text-white text-xs py-2.5 px-4 text-center border-b border-[#262626]">
        <div className="max-w-[1280px] mx-auto flex items-center justify-center gap-2">
          <span className="bg-[#F97316] text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            Creator Hub
          </span>
          <span className="text-[#D4D4D0]">
            Comprehensive guide to packaging, validating, pricing, and publishing standard AI Skills on KYRON.
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="border-b border-[#E8E8E6] bg-white py-14 px-4 sm:px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-3xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#F97316] tracking-wider uppercase">
                  KYRON CREATOR ECOSYSTEM
                </span>
                <span className="text-[#A3A3A3]">/</span>
                <span className="text-xs font-mono text-[#737373]">Documentation & Tutorials</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#171717] font-['Outfit']">
                Build & Monetize Standalone AI Skills
              </h1>
              <p className="text-base sm:text-lg text-[#525252] leading-relaxed">
                KYRON provides a complete creator platform for AI agent workflows. Package domain expertise into clean 
                <code className="text-[#F97316] bg-[#FFF4EB] px-1.5 py-0.5 rounded font-mono text-sm ml-1 font-semibold">SKILL.md</code> specifications 
                with supporting templates and scripts. Zero MCP lock-in, instant ZIP downloads, and direct agent installation.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  onClick={() => handleProtectedAction('/creator-studio')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-sm rounded-lg shadow-sm transition-all active:scale-[0.99]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Open Creator Studio</span>
                </button>
                <button
                  onClick={() => handleProtectedAction('/creator-studio?tab=create')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#D4D4D0] hover:border-[#171717] text-[#171717] font-medium text-sm rounded-lg transition-colors"
                >
                  <FileCode className="w-4 h-4 text-[#737373]" />
                  <span>Create Your First Skill</span>
                </button>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-[#525252] hover:text-[#171717] font-medium text-sm transition-colors"
                >
                  <span>Browse Marketplace</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Quick KPI Card */}
            <div className="lg:w-80 bg-[#FAFAF9] border border-[#E8E8E6] rounded-2xl p-6 space-y-4 shadow-sm shrink-0">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E6]">
                <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">Creator Highlights</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#525252]">Creator Net Payout</span>
                  <span className="font-bold text-[#171717] font-mono">70%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#525252]">Platform Quality Fee</span>
                  <span className="font-bold text-[#737373] font-mono">30%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#525252]">Security Scanning</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> 8-Point Auto
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#525252]">Distribution</span>
                  <span className="font-semibold text-[#171717]">ZIP + SKILL.md</span>
                </div>
              </div>
              <div className="pt-2 text-[11px] text-[#737373] border-t border-[#E8E8E6] leading-relaxed">
                Compatible with Claude Code, Cursor, OpenAI Codex, and Antigravity agents without extra servers.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Hub Tabs & Content */}
      <section className="max-w-[1280px] mx-auto py-10 px-4 sm:px-6 lg:px-10">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-4 border-b border-[#E8E8E6] scrollbar-none text-sm">
          {[
            { id: 'quickstart', label: '1. Quickstart Guide', icon: Sparkles },
            { id: 'what-to-sell', label: '2. What You Can Sell', icon: Layers },
            { id: 'format-spec', label: '3. SKILL.md Standard', icon: FileCode },
            { id: 'packaging', label: '4. ZIP Packaging', icon: FolderArchive },
            { id: 'validation', label: '5. Quality & Security', icon: ShieldCheck },
            { id: 'pricing', label: '6. Pricing & Revenue', icon: DollarSign },
            { id: 'agents', label: '7. Agent Installation', icon: Cpu },
            { id: 'faq', label: '8. FAQs & Terms', icon: HelpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                  isCurrent
                    ? 'bg-[#171717] text-white shadow-sm'
                    : 'text-[#525252] hover:text-[#171717] hover:bg-[#E8E8E6]/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCurrent ? 'text-[#F97316]' : 'text-[#737373]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="mt-8">
          {/* TAB 1: QUICKSTART */}
          {activeTab === 'quickstart' && (
            <div className="space-y-8 max-w-4xl">
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
                    Creator Onboarding Checklist
                  </h2>
                  <p className="text-sm text-[#737373] mt-1">
                    Follow this step-by-step checklist to prepare, test, and publish your first verified skill package.
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#525252]">Your Publishing Readiness</span>
                    <span className="text-[#F97316] font-mono">{progressPercent}% ({completedCount}/7 Completed)</span>
                  </div>
                  <div className="w-full bg-[#E8E8E6] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#F97316] h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Steps List */}
                <div className="space-y-3">
                  {[
                    {
                      id: 'step_profile',
                      title: '1. Set up your Creator Profile',
                      desc: 'Configure your username, display name, bio, and website URL in Creator Studio. This powers your public storefront.',
                      actionLabel: 'Edit Profile',
                      actionUrl: '/creator-studio?tab=storefront'
                    },
                    {
                      id: 'step_author',
                      title: '2. Create or Upload a Skill Package',
                      desc: 'Author a compliant SKILL.md file with YAML frontmatter or upload an existing multi-file ZIP archive.',
                      actionLabel: 'Open Skill Editor',
                      actionUrl: '/creator-studio?tab=create'
                    },
                    {
                      id: 'step_validate',
                      title: '3. Run 8-Point Automated Security Scan',
                      desc: 'Validate frontmatter, check against prompt injection, destructive commands, credential exfiltration, and obfuscation.',
                      actionLabel: 'Read Validation Rules',
                      onClick: () => setActiveTab('validation')
                    },
                    {
                      id: 'step_preview',
                      title: '4. Preview Actual Saved Content & Directory Tree',
                      desc: 'Inspect the live rendered markdown instructions, sample agent session execution, and file tree manifest.',
                      actionLabel: 'View Packaging Spec',
                      onClick: () => setActiveTab('packaging')
                    },
                    {
                      id: 'step_test_zip',
                      title: '5. Download & Test the ZIP Locally',
                      desc: 'Export the real generated ZIP package. Unpack it into your local agent skills folder (.claude/skills/ or .cursor/skills/) to verify behavior.',
                      actionLabel: 'Agent Setup Guide',
                      onClick: () => setActiveTab('agents')
                    },
                    {
                      id: 'step_listing',
                      title: '6. Prepare Marketplace Listing Details',
                      desc: 'Provide a crisp title, 1-sentence summary, category, tags, pricing model (free or paid), and open-source license.',
                      actionLabel: 'Pricing Guide',
                      onClick: () => setActiveTab('pricing')
                    },
                    {
                      id: 'step_submit',
                      title: '7. Submit for Review & Publish',
                      desc: 'Submit your completed draft for marketplace review. Once approved, publish it to make it discoverable worldwide.',
                      actionLabel: 'Go to Submissions',
                      actionUrl: '/creator-studio?tab=submissions'
                    }
                  ].map((step) => {
                    const isDone = Boolean(checklist[step.id]);
                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                          isDone ? 'bg-[#F9FAFB] border-[#E5E7EB]' : 'bg-white border-[#E8E8E6] hover:border-[#D4D4D0]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleChecklist(step.id)}
                          className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-[#D4D4D0] hover:border-[#A3A3A3] text-transparent'
                          }`}
                          aria-label={`Toggle ${step.title}`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h3 className={`text-sm font-semibold ${isDone ? 'text-[#737373] line-through' : 'text-[#171717]'}`}>
                              {step.title}
                            </h3>
                            {step.actionUrl ? (
                              <button
                                onClick={() => handleProtectedAction(step.actionUrl)}
                                className="text-xs text-[#F97316] hover:text-[#EA580C] font-semibold inline-flex items-center gap-1 self-start sm:self-auto"
                              >
                                <span>{step.actionLabel}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                onClick={step.onClick}
                                className="text-xs text-[#F97316] hover:text-[#EA580C] font-semibold inline-flex items-center gap-1 self-start sm:self-auto"
                              >
                                <span>{step.actionLabel}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-[#737373] mt-1 leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WHAT YOU CAN SELL */}
          {activeTab === 'what-to-sell' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
                    Supported Product Types on KYRON
                  </h2>
                  <p className="text-sm text-[#737373] mt-1">
                    KYRON focuses on clean, high-value prompt instructions, agent rules, and multi-file packages that enhance AI developer productivity.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      title: 'Autonomous Coding Rules',
                      desc: 'Domain-specific instructions that guide AI coding agents to write idiomatic, bug-free code for frameworks like Next.js, Supabase, Flutter, and Rust.',
                      example: 'E.g., Supabase RLS & Schema Validator, Tailwind Grid Patterns.'
                    },
                    {
                      title: 'Multi-File Workflow Packages',
                      desc: 'Complete packages containing SKILL.md alongside references/*.md, templates/*.md, and helper scripts in Python or Node.js.',
                      example: 'E.g., Production Release Checklist with changelog template.'
                    },
                    {
                      title: 'API & Toolchain Integrations',
                      desc: 'Detailed curl schemas, authentication patterns, and prompt recipes for integrating third-party APIs (Stripe, Twilio, OpenAI, GitHub).',
                      example: 'E.g., Stripe Webhook Verification Skill.'
                    },
                    {
                      title: 'Security & Quality Auditing',
                      desc: 'Checklists and prompt instructions that systematically review code for OWASP Top 10 vulnerabilities, credential leaks, and anti-patterns.',
                      example: 'E.g., Enterprise Security Review Rule.'
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="p-5 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-2">
                      <h3 className="text-sm font-bold text-[#171717]">{item.title}</h3>
                      <p className="text-xs text-[#525252] leading-relaxed">{item.desc}</p>
                      <div className="text-[11px] font-mono text-[#F97316] bg-white border border-[#E8E8E6] p-2 rounded">
                        {item.example}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Prohibited items */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Prohibited Content & Restrictions</span>
                  </div>
                  <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
                    <li>Compiled binary executables (.exe, .dll, .so, .dylib, .bin).</li>
                    <li>Malicious payloads, exploit scripts, or credential theft prompts.</li>
                    <li>Obfuscated code, encrypted archives, or base64 eval loops.</li>
                    <li>Files attempting directory traversal outside the skill package.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SKILL.MD SPECIFICATION */}
          {activeTab === 'format-spec' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
                    The Official SKILL.md Standard
                  </h2>
                  <p className="text-sm text-[#737373] mt-1">
                    Every skill on KYRON requires a compliant <code className="font-mono text-[#F97316]">SKILL.md</code> file at its root with YAML frontmatter.
                  </p>
                </div>

                {/* Sample Code Block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#737373]">
                    <span className="font-mono font-medium">Canonical SKILL.md Example</span>
                    <button
                      onClick={() =>
                        handleCopy(
                          `---\nname: nextjs-architect\ndescription: Enforces App Router conventions, server actions, and caching patterns\nversion: 1.0.0\nlicense: MIT\ncompatibility: [claude-code, cursor, codex, antigravity]\nmetadata:\n  author: kyron-team\n  category: Frontend & Web Apps\n---\n\n# Next.js Architecture Guidelines\n\nWhen authoring or modifying Next.js components and routes, always adhere to the following principles:\n\n## 1. Server vs Client Components\n- Default to React Server Components (RSC) unless interactivity or browser APIs are required.\n- Add the 'use client' directive only to leaf components handling state or browser events.\n\n## 2. Server Actions\n- Place server mutations in dedicated action files or mark with 'use server'.\n- Always validate inputs with Zod before running database queries.`,
                          'skill_md_code'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FAFAF9] border border-[#E8E8E6] hover:bg-white text-xs font-medium text-[#171717] transition-colors"
                    >
                      {copiedCode === 'skill_md_code' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Template</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#171717] text-white font-mono text-xs overflow-x-auto leading-relaxed border border-[#262626]">
                    <code>{`---
name: nextjs-architect
description: Enforces App Router conventions, server actions, and caching patterns
version: 1.0.0
license: MIT
compatibility: [claude-code, cursor, codex, antigravity]
metadata:
  author: kyron-team
  category: Frontend & Web Apps
---

# Next.js Architecture Guidelines

When authoring or modifying Next.js components and routes, always adhere to the following principles:

## 1. Server vs Client Components
- Default to React Server Components (RSC) unless interactivity or browser APIs are required.
- Add the 'use client' directive only to leaf components handling state or browser events.

## 2. Server Actions
- Place server mutations in dedicated action files or mark with 'use server'.
- Always validate inputs with Zod before running database queries.`}</code>
                  </pre>
                </div>

                {/* Key Frontmatter Fields */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[#171717]">Required Frontmatter Attributes</h3>
                  <div className="border border-[#E8E8E6] rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-[#FAFAF9] border-b border-[#E8E8E6] text-[#737373]">
                        <tr>
                          <th className="p-3 font-semibold">Field</th>
                          <th className="p-3 font-semibold">Type</th>
                          <th className="p-3 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E6]">
                        <tr>
                          <td className="p-3 font-mono font-bold text-[#F97316]">name</td>
                          <td className="p-3 font-mono text-[#737373]">string</td>
                          <td className="p-3 text-[#525252]">Unique identifier (lowercase letters, numbers, hyphens).</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono font-bold text-[#F97316]">description</td>
                          <td className="p-3 font-mono text-[#737373]">string</td>
                          <td className="p-3 text-[#525252]">Concise 1-2 sentence description explaining when agents should trigger this skill.</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono font-bold text-[#171717]">version</td>
                          <td className="p-3 font-mono text-[#737373]">string</td>
                          <td className="p-3 text-[#525252]">Semantic version number (e.g. 1.0.0, 1.1.0).</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-mono font-bold text-[#171717]">license</td>
                          <td className="p-3 font-mono text-[#737373]">string</td>
                          <td className="p-3 text-[#525252]">Open-source or commercial license (MIT, Apache-2.0, Proprietary).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PACKAGING */}
          {activeTab === 'packaging' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
                    Supporting Files & ZIP Packaging Architecture
                  </h2>
                  <p className="text-sm text-[#737373] mt-1">
                    Skills can include supporting documentation, templates, and scripts organized in standard subdirectories.
                  </p>
                </div>

                {/* Directory Tree */}
                <div className="p-5 rounded-xl bg-[#171717] text-white font-mono text-xs space-y-1 border border-[#262626]">
                  <div className="text-[#A3A3A3] pb-2 border-b border-[#333333]">my-awesome-skill.zip</div>
                  <div className="text-emerald-400">└── my-awesome-skill/</div>
                  <div className="pl-6 text-[#F97316]">├── SKILL.md  (Required root instruction file)</div>
                  <div className="pl-6 text-[#A3A3A3]">├── references/</div>
                  <div className="pl-12 text-[#D4D4D0]">└── architecture-rules.md</div>
                  <div className="pl-6 text-[#A3A3A3]">├── templates/</div>
                  <div className="pl-12 text-[#D4D4D0]">└── pr-template.md</div>
                  <div className="pl-6 text-[#A3A3A3]">└── scripts/</div>
                  <div className="pl-12 text-[#D4D4D0]">└── validate.py</div>
                </div>

                <div className="space-y-3 text-sm text-[#525252] leading-relaxed">
                  <h3 className="font-bold text-[#171717]">Packaging Guidelines</h3>
                  <ul className="list-disc list-inside space-y-1.5 text-xs">
                    <li><strong>Root Folder:</strong> The archive may either contain files directly at the root or within a single top-level folder matching the skill slug.</li>
                    <li><strong>Relative Links:</strong> In your SKILL.md, refer to supporting files using relative paths like <code className="font-mono bg-[#FAFAF9] border px-1 py-0.5 rounded text-[#171717]">references/architecture-rules.md</code>.</li>
                    <li><strong>No Path Traversal:</strong> Files containing <code className="font-mono text-red-600">../</code> or absolute paths (<code className="font-mono text-red-600">/etc/</code>) are blocked by the packaging validator.</li>
                    <li><strong>File Count Limit:</strong> Packages support up to 50 files and 15MB total uncompressed archive size.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VALIDATION */}
          {activeTab === 'validation' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
                    8-Point Automated Security & Quality Scanner
                  </h2>
                  <p className="text-sm text-[#737373] mt-1">
                    Every skill submitted to KYRON undergoes an automated AST security scan before human review.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { id: 'Rule 1', name: 'Frontmatter Compliance', desc: 'Validates YAML syntax, required name & description, and semver tags.' },
                    { id: 'Rule 2', name: 'Prompt Injection Defense', desc: 'Checks for adversarial system overrides, jailbreak phrases, and instruction erasing.' },
                    { id: 'Rule 3', name: 'Disk & File Safety', desc: 'Scans for destructive commands like rm -rf, mkfs, or disk-formatting patterns.' },
                    { id: 'Rule 4', name: 'Credential Protection', desc: 'Blocks hardcoded private API keys, Supabase service roles, and token exfiltration.' },
                    { id: 'Rule 5', name: 'Shell & Pipeline Guard', desc: 'Prohibits blind pipe-to-bash (curl | sh) and unauthenticated reverse shells.' },
                    { id: 'Rule 6', name: 'Archive Integrity', desc: 'Enforces zip slip defense, checks against symlink attacks and path traversal.' },
                    { id: 'Rule 7', name: 'Obfuscation Detection', desc: 'Flags base64 decode-exec loops, hex dumps, and heavily obfuscated strings.' },
                    { id: 'Rule 8', name: 'Binary Exclusion', desc: 'Rejects compiled native binaries, ensuring total inspection transparency.' },
                  ].map((rule) => (
                    <div key={rule.id} className="p-4 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#F97316]">{rule.id}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                          Enforced
                        </span>
                      </div>
                      <div className="font-semibold text-[#171717]">{rule.name}</div>
                      <div className="text-[#737373] leading-relaxed">{rule.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-[#737373] bg-[#FAFAF9] p-4 rounded-xl border border-[#E8E8E6] leading-relaxed">
                  <strong>Notice:</strong> Structural validation confirms compliance with KYRON standards, but creators are responsible for testing instructions across target agents before publishing.
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PRICING */}
          {activeTab === 'pricing' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
                    Pricing, Value & Revenue Structure
                  </h2>
                  <p className="text-sm text-[#737373] mt-1">
                    KYRON offers transparent revenue sharing and clear creator economics.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 rounded-2xl border-2 border-[#171717] bg-white space-y-3">
                    <div className="text-xs font-mono font-bold text-[#F97316] uppercase">Free Tier</div>
                    <div className="text-3xl font-extrabold text-[#171717]">$0.00</div>
                    <p className="text-xs text-[#525252] leading-relaxed">
                      Great for open-source frameworks, portfolio building, and developer adoption. Users install with 1-click.
                    </p>
                    <ul className="text-xs text-[#737373] space-y-1 list-disc list-inside">
                      <li>Unlimited free downloads</li>
                      <li>Public marketplace visibility</li>
                      <li>Community reviews & ratings</li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-2xl border-2 border-[#F97316] bg-[#FFF4EB]/30 space-y-3">
                    <div className="text-xs font-mono font-bold text-[#F97316] uppercase">Commercial Paid Listing</div>
                    <div className="text-3xl font-extrabold text-[#171717]">$2 – $499</div>
                    <p className="text-xs text-[#525252] leading-relaxed">
                      Monetize proprietary engineering workflows, enterprise standards, and complex multi-file packages.
                    </p>
                    <ul className="text-xs text-[#737373] space-y-1 list-disc list-inside">
                      <li><strong>70% Net Payout</strong> directly to creator</li>
                      <li>30% KYRON platform fee (scanning & hosting)</li>
                      <li>Server-verified purchase entitlements</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] text-xs text-[#525252] space-y-2">
                  <div className="font-semibold text-[#171717] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Payment Gateway Configuration</span>
                  </div>
                  <p className="leading-relaxed">
                    Paid listings are supported through KYRON wallet credits and verified payment gateway transactions. 
                    Creators receive automated monthly ledger balance reporting in the Creator Studio.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AGENT INSTALLATION GUIDES */}
          {activeTab === 'agents' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
                    Target Coding Agent Installation Conventions
                  </h2>
                  <p className="text-sm text-[#737373] mt-1">
                    Every skill on KYRON includes an auto-generated installation prompt customized for major AI coding agents.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      name: 'Claude Code',
                      path: '.claude/skills/<skill-name>/',
                      instructions: 'Unpack the ZIP into .claude/skills/ in your workspace. Claude Code automatically scans this directory.'
                    },
                    {
                      name: 'Cursor',
                      path: '.cursor/skills/<skill-name>/ or .cursorrules',
                      instructions: 'Place the folder in .cursor/skills/ or append the prompt to your project’s .cursorrules configuration.'
                    },
                    {
                      name: 'OpenAI Codex',
                      path: '.codex/skills/<skill-name>/',
                      instructions: 'Extract archive contents to .codex/skills/ or reference the SKILL.md file directly in the agent instructions.'
                    },
                    {
                      name: 'Antigravity',
                      path: '.agents/skills/<skill-name>/',
                      instructions: 'Place in workspace customizations root under .agents/skills/ with a valid SKILL.md.'
                    }
                  ].map((agent, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#171717]">{agent.name}</span>
                        <Cpu className="w-4 h-4 text-[#F97316]" />
                      </div>
                      <div className="font-mono text-xs bg-white border border-[#E8E8E6] px-2 py-1 rounded text-[#737373]">
                        {agent.path}
                      </div>
                      <p className="text-xs text-[#525252] leading-relaxed">{agent.instructions}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                  <strong>Safety First:</strong> KYRON installation prompts explicitly instruct agents to inspect files before applying changes 
                  and to never execute arbitrary bash scripts without explicit confirmation.
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: FAQS & TERMS */}
          {activeTab === 'faq' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
                    Frequently Asked Questions & Creator Terms
                  </h2>
                  <p className="text-sm text-[#737373] mt-1">
                    Common questions regarding reviewing, ownership, licensing, and updates.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      q: 'Do I own the intellectual property of skills I publish?',
                      a: 'Yes. You retain full copyright and ownership of your skill instructions, templates, and code. You grant KYRON a non-exclusive license to host, display, and distribute your package according to your selected pricing model.'
                    },
                    {
                      q: 'How long does the review process take?',
                      a: 'Automated 8-point security scanning runs in under 3 seconds. Human reviewer inspection typically completes within 24 to 48 hours. If changes are requested, actionable feedback will appear on your Creator Dashboard.'
                    },
                    {
                      q: 'How do version updates work?',
                      a: 'You can author new versions in Creator Studio with custom changelogs. When you submit an update for review, your existing published version remains live in the Marketplace until the new version is approved.'
                    },
                    {
                      q: 'Can I unpublish or pause my skill?',
                      a: 'Yes. You can toggle your skill to Paused at any time from your Creator Studio. Paused skills are immediately hidden from marketplace search and new installations while preserving access for previous buyers.'
                    },
                    {
                      q: 'Does KYRON require Model Context Protocol (MCP)?',
                      a: 'No. KYRON skills are standalone Markdown files and standard ZIP archives. They run locally on any compatible AI coding agent without requiring MCP servers or cloud intermediaries.'
                    }
                  ].map((faq, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-1.5">
                      <h3 className="font-bold text-sm text-[#171717]">{faq.q}</h3>
                      <p className="text-xs text-[#525252] leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer Call to Action */}
      <section className="bg-[#171717] text-white py-14 px-4 sm:px-6 lg:px-10 border-t border-[#262626]">
        <div className="max-w-[1280px] mx-auto text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold font-['Outfit']">
            Ready to distribute your first AI Skill?
          </h2>
          <p className="text-sm text-[#A3A3A3] max-w-xl mx-auto">
            Join developers and prompt engineers building high-value, verified coding rules and workflows.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => handleProtectedAction('/creator-studio')}
              className="px-6 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-sm rounded-lg shadow-sm transition-all"
            >
              Open Creator Studio
            </button>
            <Link
              href="/marketplace"
              className="px-5 py-2.5 bg-transparent border border-[#404040] hover:border-white text-white font-medium text-sm rounded-lg transition-colors"
            >
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

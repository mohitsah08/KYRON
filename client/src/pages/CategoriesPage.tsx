import React, { useEffect, useState } from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { api } from '../utils/api.ts';
import { CategoryCount } from '../types.ts';
import { 
  Search, 
  Code2, 
  Database, 
  ShieldCheck, 
  Cloud, 
  TrendingUp, 
  BrainCircuit, 
  Palette, 
  Globe, 
  ArrowRight,
  Folder,
  Layers,
  ChevronRight
} from 'lucide-react';

export function CategoriesPage() {
  const { navigate } = useRouter();
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategories()
      .then(res => setCategories(res.categories))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const coreDomains = [
    {
      title: 'Code Generation & Synthesis',
      slug: 'code-quality-review',
      icon: Code2,
      desc: 'AST transpilation, deterministic codemods, multi-file refactoring, and static type migration.',
      count: '34 skills',
      latency: '340ms'
    },
    {
      title: 'Data Extraction & ELT',
      slug: 'data-databases',
      icon: Database,
      desc: 'Automated table normalization, vector embedding pipelines, schema validation, and database migrations.',
      count: '28 skills',
      latency: '42ms'
    },
    {
      title: 'Security & AST Auditing',
      slug: 'security',
      icon: ShieldCheck,
      desc: '8-point automated vulnerability scanners, CVE package audits, reverse shell prevention, and secret exfiltration guards.',
      count: '19 skills',
      latency: '14ms'
    },
    {
      title: 'Autonomous DevOps & Cloud',
      slug: 'devops-cloud',
      icon: Cloud,
      desc: 'Infrastructure-as-code linting, Docker image slimming, Kubernetes manifests, and CI/CD healing.',
      count: '22 skills',
      latency: '88ms'
    },
    {
      title: 'Financial & Market Intelligence',
      slug: 'trading-investing',
      icon: TrendingUp,
      desc: 'SEC EDGAR synthesis, Minervini trend template screeners, CAN SLIM momentum filters, and liquidity analysis.',
      count: '16 skills',
      latency: '120ms'
    },
    {
      title: 'Machine Learning & Fine-Tuning',
      slug: 'prompt-skill-engineering',
      icon: BrainCircuit,
      desc: 'JSONL dataset curation, semantic deduplication, prompt evaluations, and benchmark grading.',
      count: '15 skills',
      latency: '65ms'
    },
    {
      title: 'Creative & Media Synthesis',
      slug: 'branding-design',
      icon: Palette,
      desc: 'Design system tokens, Figma variables synchronization, SVG geometry synthesis, and visual formatting.',
      count: '12 skills',
      latency: '95ms'
    },
    {
      title: 'Web & Headless Automation',
      slug: 'workflow-automation',
      icon: Globe,
      desc: 'Stealth headless browsing, anti-bot bypass, session replay, and deterministic scraping.',
      count: '24 skills',
      latency: '240ms'
    }
  ];

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full bg-white min-h-screen">
      {/* ================= HEADER SECTION ================= */}
      <section className="border-b border-[#E8E8E6] bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#F8F8F7] border border-[#E8E8E6] text-xs font-mono text-[#F97316] font-semibold mb-3">
              <span>// DOMAIN TAXONOMY</span>
              <span>•</span>
              <span className="text-[#737373]">32 SPECIALIZED VERTICALS</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-[#171717] tracking-tight mb-3">
              Find the right AI tool for your work
            </h1>
            <p className="text-sm sm:text-base text-[#737373] leading-relaxed">
              Explore specialized skill domains categorized by operational capability, protocol standard, and agent compatibility.
            </p>

            {/* Search Input */}
            <div className="mt-8 relative max-w-xl">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
              <input
                type="text"
                placeholder="Search across 420+ specialized agent skills, protocols, MCP services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-xl text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:bg-white focus:outline-none focus:border-[#171717] transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= CORE KNOWLEDGE DOMAINS ================= */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-[#E8E8E6]">
          <div>
            <h2 className="text-xl font-bold text-[#171717] tracking-tight">
              Core Knowledge Domains
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">
              Primary architectural clusters powering autonomous workflows
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {coreDomains.map((domain) => {
            const Icon = domain.icon;
            return (
              <div
                key={domain.title}
                onClick={() => navigate(`/skills?category=${domain.slug}`)}
                className="group p-5 bg-white border border-[#E8E8E6] hover:border-[#D4D4D0] rounded-xl flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-9 h-9 rounded-lg bg-[#FFF4EB] border border-[#F97316]/20 flex items-center justify-center text-[#F97316]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[11px] text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ● {domain.latency}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-[#171717] group-hover:text-[#F97316] transition-colors mb-2">
                    {domain.title}
                  </h3>

                  <p className="text-xs text-[#737373] leading-relaxed line-clamp-3 mb-4">
                    {domain.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E8E8E6] flex items-center justify-between mt-auto">
                  <span className="font-mono text-xs text-[#737373]">
                    {domain.count}
                  </span>
                  <span className="text-xs font-medium text-[#171717] group-hover:text-[#F97316] flex items-center gap-1 transition-colors">
                    <span>Explore</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= ALL 32 CATEGORIES MATRIX ================= */}
      <section className="bg-[#F8F8F7] border-t border-[#E8E8E6] py-14">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 pb-3 border-b border-[#E8E8E6]">
            <div>
              <h2 className="text-xl font-bold text-[#171717] tracking-tight">
                Development & Engineering Tools
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Complete directory of all 32 specialized verticals
              </p>
            </div>
            <span className="font-mono text-xs text-[#737373]">
              {filteredCategories.length} Categories
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 8].map((n) => (
                <div key={n} className="h-16 bg-white rounded-lg border border-[#E8E8E6] animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredCategories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/skills?category=${c.slug}`}
                  className="p-3.5 bg-white border border-[#E8E8E6] hover:border-[#D4D4D0] rounded-lg flex items-center justify-between group transition-colors shadow-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-[#171717] group-hover:text-[#F97316] transition-colors truncate">
                      {c.name}
                    </div>
                    <div className="font-mono text-[10px] text-[#A3A3A3] mt-0.5">
                      {c.count} active skills
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A3A3A3] group-hover:text-[#171717] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

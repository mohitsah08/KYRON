import React, { useEffect, useState } from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';
import { Skill } from '../types.ts';
import { SkillCard } from '../components/SkillCard.tsx';
import { 
  Search, 
  Terminal, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  ChevronRight, 
  CheckCircle2, 
  Cpu, 
  Lock, 
  Activity,
  Layers
} from 'lucide-react';

export function HomePage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [skillsRes, dealsRes] = await Promise.all([
          api.getSkills({ limit: 16 }),
          api.getDeals()
        ]);
        setSkills(skillsRes.skills);
        setDeals(dealsRes.deals);
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/skills?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categories = [
    { id: 'all', label: 'All Curated' },
    { id: 'code-quality-review', label: 'Code Synthesis' },
    { id: 'data-databases', label: 'Data Pipelines' },
    { id: 'workflow-automation', label: 'Web Automation' },
    { id: 'security', label: 'Security & Audit' },
    { id: 'trading-investing', label: 'Finance & Trading' },
  ];

  const filteredSkills = activeCategory === 'all'
    ? skills
    : skills.filter(s => s.category === activeCategory);

  const featuredDeal = deals.length > 0 ? deals[0] : null;

  return (
    <div className="w-full bg-white flex flex-col items-center">
      {/* ================= HERO SECTION ================= */}
      <section className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-10 pb-12">
        <div className="max-w-4xl">
          {/* Badge: Version 2.4 MCP Compliant Registry */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#FFF4EB] border border-[#F97316]/20 mb-5">
            <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse"></span>
            <span className="font-mono text-xs font-semibold text-[#F97316] tracking-wider uppercase">
              VERSION 2.4 MCP COMPLIANT REGISTRY
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#171717] leading-[1.12] mb-4">
            The Curated Registry for Autonomous Agent Skills.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#737373] max-w-2xl leading-relaxed mb-8">
            Discover, benchmark, and deploy audited tools, MCP servers, and execution capabilities for Claude, OpenAI, Cursor, and LangChain with zero-knowledge sandboxing.
          </p>

          {/* Global Benchmark Metrics Strip */}
          <div className="pt-6 border-t border-[#E8E8E6] grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="font-mono text-xs text-[#A3A3A3] mb-1">AUDITED SKILLS</div>
              <div className="text-2xl font-bold text-[#171717] font-mono">1,420</div>
              <div className="text-xs text-[#737373] mt-0.5">Verified deterministic runs</div>
            </div>
            <div>
              <div className="font-mono text-xs text-[#A3A3A3] mb-1">SANDBOX UPTIME</div>
              <div className="text-2xl font-bold text-[#171717] font-mono">99.98%</div>
              <div className="text-xs text-[#15803D] mt-0.5 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span>
                Sub-millisecond routing
              </div>
            </div>
            <div>
              <div className="font-mono text-xs text-[#A3A3A3] mb-1">API INVOCATIONS</div>
              <div className="text-2xl font-bold text-[#171717] font-mono">48.2M</div>
              <div className="text-xs text-[#737373] mt-0.5">Past 30 calendar days</div>
            </div>
            <div>
              <div className="font-mono text-xs text-[#A3A3A3] mb-1">MEDIAN LATENCY</div>
              <div className="text-2xl font-bold text-[#171717] font-mono">42ms</div>
              <div className="text-xs text-[#737373] mt-0.5">Hermetic edge execution</div>
            </div>
          </div>
        </div>

        {/* ================= NATURAL LANGUAGE SEARCH PROMPT BAR ================= */}
        <div className="mt-10">
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-3xl">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              placeholder="Search by tool name, payload schema, MCP protocol, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-28 text-sm bg-white border border-[#E8E8E6] rounded-xl text-[#171717] placeholder:text-[#A3A3A3] focus:outline-none focus:border-[#171717] shadow-sm transition-colors"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 h-8 bg-[#171717] hover:bg-black text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
            >
              <span>Search</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Domain Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs font-mono text-[#A3A3A3]">FILTER:</span>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activeCategory === c.id
                    ? 'bg-[#171717] text-white'
                    : 'bg-[#F8F8F7] text-[#737373] hover:text-[#171717] hover:bg-[#EEEEED] border border-[#E8E8E6]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= DEAL OF THE MONTH SPOTLIGHT ================= */}
      {featuredDeal && (
        <section className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-[#FFF4EB] border border-[#F97316]/30 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#F97316] text-white uppercase">
                  DEAL OF THE MONTH
                </span>
                <span className="text-xs font-mono font-semibold text-[#F97316]">
                  {featuredDeal.discount_percent}% OFF LIMITED TIME
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#171717]">
                {featuredDeal.skill.name}
              </h3>
              <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
                {featuredDeal.skill.summary}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
              <div className="text-right sm:text-left">
                <div className="text-xs text-[#737373] line-through font-mono">
                  ${(featuredDeal.skill.price / (1 - featuredDeal.discount_percent / 100)).toFixed(2)}
                </div>
                <div className="text-2xl font-bold text-[#171717] font-mono">
                  ${featuredDeal.skill.price.toFixed(2)}
                </div>
              </div>
              <Link
                href={`/skills/${featuredDeal.skill.slug}`}
                className="px-5 h-10 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium rounded-lg flex items-center gap-2 transition-all active:scale-[0.99] shadow-sm"
              >
                <span>View Deal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ================= CURATED SKILLS GRID ================= */}
      <section className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#E8E8E6]">
          <div>
            <h2 className="text-xl font-bold text-[#171717] tracking-tight">
              Featured Autonomous Capabilities
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">
              Production-ready tools verified across strict Model Context Protocol benchmarks
            </p>
          </div>
          <Link
            href="/skills"
            className="text-xs font-medium text-[#F97316] hover:text-[#EA580C] flex items-center gap-1 transition-colors"
          >
            <span>View all 1,420 skills</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="h-64 rounded-xl bg-[#F8F8F7] border border-[#E8E8E6] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSkills.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>
        )}
      </section>

      {/* ================= EXECUTION GUARANTEE & ARCHITECTURE ================= */}
      <section className="w-full bg-[#F8F8F7] border-y border-[#E8E8E6] py-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <div className="font-mono text-xs text-[#F97316] font-semibold uppercase tracking-wider mb-2">
              ZERO-KNOWLEDGE INFRASTRUCTURE
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#171717] tracking-tight">
              Engineered for Autonomous Reliability.
            </h2>
            <p className="text-sm text-[#737373] mt-2 leading-relaxed">
              Every skill package published to Kyron conforms to verifiable AST constraints and sandbox invariants before reaching your agent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-[#E8E8E6] space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[#FFF4EB] border border-[#F97316]/20 flex items-center justify-center text-[#F97316]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#171717]">8-Point Automated Security Scan</h3>
              <p className="text-xs text-[#737373] leading-relaxed">
                AST pattern matching validates YAML frontmatter, detects adversarial prompt injections, halts destructive shell commands, and blocks credential leaks.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[#E8E8E6] space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[#FFF4EB] border border-[#F97316]/20 flex items-center justify-center text-[#F97316]">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#171717]">Hermetic Sandbox Enclave</h3>
              <p className="text-xs text-[#737373] leading-relaxed">
                Agents execute tools within isolated micro-VM containers. Zero outbound telemetry or un-audited phone-home requests permitted during runs.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[#E8E8E6] space-y-3">
              <div className="w-9 h-9 rounded-lg bg-[#FFF4EB] border border-[#F97316]/20 flex items-center justify-center text-[#F97316]">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#171717]">Universal Model Context Protocol</h3>
              <p className="text-xs text-[#737373] leading-relaxed">
                Seamless compatibility with Claude Desktop, Cursor, OpenAI GPT-4o, and custom LangChain multi-agent swarms via standard JSON-RPC 2.0.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE MCP PROTOCOL DEMONSTRATION ================= */}
      <section className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-14">
        <div className="bg-[#171717] rounded-xl border border-[#222222] text-white p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <span className="font-mono text-xs uppercase tracking-wider text-[#F97316] font-semibold">
              ONE-CLICK AGENT INTEGRATION
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Connect to Any Agent in Under 30 Seconds.
            </h2>
            <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
              Copy our unified MCP configuration into your Claude Desktop or Cursor config file. Discover, purchase, and execute verified skills directly from your prompt.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/mcp"
                className="px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium rounded-lg flex items-center gap-2 transition-all active:scale-[0.99]"
              >
                <span>Explore MCP Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/chat"
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg border border-white/10 transition-colors"
              >
                <span>Launch Chat Playground</span>
              </Link>
            </div>
          </div>

          {/* Interactive Code Preview Box */}
          <div className="w-full lg:max-w-md bg-[#0D0D0D] border border-[#2D2D2D] rounded-lg p-4 font-mono text-xs overflow-x-auto text-[#CCCCCC]">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#222222] text-[#737373] text-[11px]">
              <span>claude_desktop_config.json</span>
              <span className="text-[#15803D]">● verified</span>
            </div>
            <pre className="text-[12px] leading-5 text-gray-300">
{`{
  "mcpServers": {
    "kyron": {
      "command": "npx",
      "args": ["-y", "@kyron/mcp-gateway@latest"],
      "env": {
        "KYRON_API_KEY": "kyr_live_8f921...3d"
      }
    }
  }
}`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

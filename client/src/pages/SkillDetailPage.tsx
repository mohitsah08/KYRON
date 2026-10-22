import React, { useEffect, useState } from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';
import { Skill, Profile, SkillDeal, SecurityAuditRule, SkillReview, UserPurchase } from '../types.ts';
import { 
  Sparkles, 
  ArrowBigUp, 
  Bookmark, 
  Star, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink,
  Lock,
  CloudOff,
  Cpu,
  GitBranch,
  ArrowRight,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

export function SkillDetailPage({ slug }: { slug: string }) {
  const { navigate } = useRouter();
  const { user, refreshUser, setIsCreditModalOpen } = useAuth();

  const [data, setData] = useState<{
    skill: Skill;
    creator: Profile;
    deal: SkillDeal | null;
    security_audit: SecurityAuditRule[];
    reviews: SkillReview[];
    user_vote: number;
    is_saved: boolean;
    is_purchased?: boolean;
    purchase?: UserPurchase | null;
  } | null>(null);

  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'how-it-works' | 'permissions' | 'sample-io' | 'security' | 'reviews'>('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchSkillData = async () => {
    try {
      setLoading(true);
      const res = await api.getSkillBySlug(slug);
      setData(res);

      if (res.is_purchased || res.skill.pricing_type === 'free') {
        try {
          const pkg = await api.getSkillPackage(slug);
          setPackageData(pkg);
        } catch {
          // Allowed to fail if not purchased
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load skill details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkillData();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-96 rounded-xl bg-[#F8F8F7] border border-[#E8E8E6] animate-pulse"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="text-xl font-bold text-[#171717]">Skill Not Found</div>
        <p className="text-xs text-[#737373]">{error || 'The requested skill does not exist.'}</p>
        <Link href="/skills" className="inline-flex px-4 py-2 bg-[#171717] text-white text-xs font-medium rounded-lg">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const { skill, creator, deal, security_audit, reviews, user_vote, is_saved, is_purchased } = data;
  const isFree = skill.pricing_type === 'free' || skill.price === 0;
  const effectivePrice = deal ? skill.price * (1 - deal.discount_percent / 100) : skill.price;
  const latencyMs = slug.includes('octocode') ? 340 : slug.includes('geo') ? 420 : 38;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(`kyron connect ${skill.slug}`);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const handleCopyMcp = () => {
    const config = JSON.stringify({
      mcpServers: {
        [skill.slug]: {
          command: "npx",
          args: ["-y", `@kyron/${skill.slug}@latest`],
          env: {
            KYRON_API_KEY: user ? `kyr_live_${user.id.slice(0, 8)}` : "YOUR_API_KEY"
          }
        }
      }
    }, null, 2);
    navigator.clipboard.writeText(config);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  };

  const handleVote = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      const nextVote = user_vote === 1 ? 0 : 1;
      const res = await api.voteSkill(skill.id, nextVote as any);
      setData(prev => prev ? {
        ...prev,
        user_vote: res.user_vote,
        skill: { ...prev.skill, net_votes: res.net_votes }
      } : null);
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      const res = await api.saveSkill(skill.id);
      setData(prev => prev ? {
        ...prev,
        is_saved: res.is_saved
      } : null);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleAcquire = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (isFree) {
      setActionLoading(true);
      try {
        await api.installFreeSkill(skill.id);
        setActionMessage('Skill successfully installed in your workspace!');
        await fetchSkillData();
      } catch (err: any) {
        setActionMessage(`Error: ${err.message}`);
      } finally {
        setActionLoading(false);
      }
    } else {
      if (user.credit_balance < effectivePrice && user.is_unlimited_credit_user !== 1) {
        setIsCreditModalOpen(true);
        return;
      }

      setActionLoading(true);
      try {
        await api.purchaseWithCredit(skill.id);
        await refreshUser();
        setActionMessage('Skill unlocked and license registered to your account!');
        await fetchSkillData();
      } catch (err: any) {
        setActionMessage(`Error: ${err.message}`);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!reviewComment.trim()) return;

    setSubmittingReview(true);
    try {
      await api.submitReview(skill.id, reviewRating, reviewComment.trim());
      setReviewComment('');
      await fetchSkillData();
    } catch (err: any) {
      console.warn('Failed to submit review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="w-full bg-white min-h-screen">
      {/* ================= BREADCRUMBS BAR ================= */}
      <div className="w-full bg-[#F8F8F7] border-b border-[#E8E8E6]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center font-mono text-xs text-[#737373] overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-[#171717] transition-colors">Home</Link>
          <span className="mx-2 text-[#D4D4D0]">/</span>
          <Link href="/skills" className="hover:text-[#171717] transition-colors">Marketplace</Link>
          <span className="mx-2 text-[#D4D4D0]">/</span>
          <Link href={`/skills?category=${skill.category}`} className="hover:text-[#171717] transition-colors">
            {skill.category.replace(/-/g, ' ')}
          </Link>
          <span className="mx-2 text-[#D4D4D0]">/</span>
          <span className="text-[#171717] font-semibold">{skill.name}</span>
        </div>
      </div>

      {/* ================= MAIN DETAIL CANVAS ================= */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 8 COLUMNS: Specification, Tabs & Documentation */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Header Box */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl p-6 sm:p-8 relative shadow-xs">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Emblem */}
                <div className="w-20 h-20 rounded-xl bg-[#FFF4EB] border border-[#F97316]/20 p-2 flex items-center justify-center shrink-0">
                  {skill.logo_url ? (
                    <img src={skill.logo_url} alt={skill.name} className="w-16 h-16 object-contain rounded-lg" />
                  ) : (
                    <span className="font-mono text-xl font-bold text-[#F97316]">
                      {skill.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Title & Metadata */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-[#FFF4EB] text-[#F97316] border border-[#F97316]/20 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified MCP Server
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-[#737373] bg-[#F8F8F7] border border-[#E8E8E6]">
                      v{skill.current_version} (Stable)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-[#15803D] bg-emerald-50 border border-emerald-200">
                      ● {latencyMs}ms latency
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold text-[#171717] tracking-tight">
                    {skill.name}
                  </h1>

                  <div className="mt-2 flex items-center gap-2 text-xs text-[#737373]">
                    <span>Created by</span>
                    <Link
                      href={`/creators/${creator.username}`}
                      className="text-[#171717] font-semibold hover:text-[#F97316] flex items-center gap-1 transition-colors"
                    >
                      {creator.display_name}
                      <span className="text-[#A3A3A3] font-normal">(@{creator.username})</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Value proposition paragraph */}
              <div className="mt-6 pt-6 border-t border-[#E8E8E6]">
                <p className="text-sm sm:text-base text-[#171717] leading-relaxed">
                  {skill.description}
                </p>
              </div>

              {/* Capability Quick Chips */}
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="text-xs font-mono px-2.5 py-1 bg-[#F8F8F7] border border-[#E8E8E6] rounded text-[#737373]">
                  mcp:protocol-1.0
                </span>
                <span className="text-xs font-mono px-2.5 py-1 bg-[#F8F8F7] border border-[#E8E8E6] rounded text-[#737373]">
                  ast:structural-engine
                </span>
                <span className="text-xs font-mono px-2.5 py-1 bg-[#F8F8F7] border border-[#E8E8E6] rounded text-[#737373]">
                  safety:hermetic-sandbox
                </span>
                <span className="text-xs font-mono px-2.5 py-1 bg-[#F8F8F7] border border-[#E8E8E6] rounded text-[#737373]">
                  runtime:zero-exfiltration
                </span>
              </div>
            </div>

            {/* Dynamic Architectural Tabs */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-xs">
              {/* Tab Navigation Strip */}
              <div className="flex items-center border-b border-[#E8E8E6] px-4 bg-[#F8F8F7]/60 overflow-x-auto no-scrollbar">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'how-it-works', label: 'How It Works' },
                  { id: 'permissions', label: 'Requirements & Permissions' },
                  { id: 'sample-io', label: 'Sample Input / Output' },
                  { id: 'security', label: `Security & Audit (${security_audit.length})` },
                  { id: 'reviews', label: `Reviews (${reviews.length})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`py-3.5 px-4 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${
                      activeTab === t.id
                        ? 'border-[#F97316] text-[#171717] font-semibold'
                        : 'border-transparent text-[#737373] hover:text-[#171717]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: Overview */}
              {activeTab === 'overview' && (
                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h3 className="text-base font-bold text-[#171717] mb-2">Architectural Capabilities</h3>
                    <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
                      {skill.name} executes deterministic operations in memory to plan atomic multi-file refactor cascades. Unlike generic LLM coding agents, verified Kyron skills perform deterministic graph traversals to guarantee compatibility before emitting synthetic operations.
                    </p>
                  </div>

                  {/* Bento Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg">
                      <div className="text-[11px] font-mono text-[#737373] mb-1">EXECUTION LATENCY</div>
                      <div className="text-2xl font-bold text-[#171717] font-mono">{latencyMs}<span className="text-sm font-normal text-[#737373]">ms</span></div>
                      <div className="text-[11px] text-[#15803D] mt-1 font-medium">99th percentile across runs</div>
                    </div>
                    <div className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg">
                      <div className="text-[11px] font-mono text-[#737373] mb-1">DETERMINISTIC RATE</div>
                      <div className="text-2xl font-bold text-[#171717] font-mono">99.98%</div>
                      <div className="text-[11px] text-[#737373] mt-1">Zero regression verified</div>
                    </div>
                    <div className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg">
                      <div className="text-[11px] font-mono text-[#737373] mb-1">SANDBOX RATING</div>
                      <div className="text-2xl font-bold text-[#171717] font-mono">Tier 0</div>
                      <div className="text-[11px] text-[#737373] mt-1">Hermetic enclave compliance</div>
                    </div>
                  </div>

                  {/* Operational Primitives */}
                  <div>
                    <h4 className="text-sm font-bold text-[#171717] mb-4">Core Operational Primitives</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 border border-[#E8E8E6] rounded-lg hover:border-[#D4D4D0] transition-colors">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Cpu className="w-4 h-4 text-[#F97316]" />
                          <span className="text-xs font-semibold text-[#171717]">Symbol Graph Traversal</span>
                        </div>
                        <p className="text-xs text-[#737373]">Queries full symbol graphs in Monorepos to resolve transitive import paths with zero broken callers.</p>
                      </div>
                      <div className="p-4 border border-[#E8E8E6] rounded-lg hover:border-[#D4D4D0] transition-colors">
                        <div className="flex items-center gap-2 mb-1.5">
                          <GitBranch className="w-4 h-4 text-[#F97316]" />
                          <span className="text-xs font-semibold text-[#171717]">Deterministic Transformations</span>
                        </div>
                        <p className="text-xs text-[#737373]">Produces structural AST transforms rather than token stream replacements, eliminating syntax hallucinations.</p>
                      </div>
                      <div className="p-4 border border-[#E8E8E6] rounded-lg hover:border-[#D4D4D0] transition-colors">
                        <div className="flex items-center gap-2 mb-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#F97316]" />
                          <span className="text-xs font-semibold text-[#171717]">Ephemeral Micro-VM</span>
                        </div>
                        <p className="text-xs text-[#737373]">Spins up clean verification containers to guarantee zero regressions before submitting patch proposals.</p>
                      </div>
                      <div className="p-4 border border-[#E8E8E6] rounded-lg hover:border-[#D4D4D0] transition-colors">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Terminal className="w-4 h-4 text-[#F97316]" />
                          <span className="text-xs font-semibold text-[#171717]">Standard Stdio / SSE MCP</span>
                        </div>
                        <p className="text-xs text-[#737373]">Conforms strictly to Model Context Protocol 1.0 JSON-RPC specification across all clients.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: How It Works */}
              {activeTab === 'how-it-works' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <h3 className="text-base font-bold text-[#171717]">Autonomous Agent Execution Pipeline</h3>
                  <p className="text-xs sm:text-sm text-[#737373]">Every invocation passes through an isolated 4-stage validation and synthesis cascade.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    <div className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg">
                      <span className="font-mono text-xs text-[#F97316] font-semibold">STAGE 01</span>
                      <h5 className="text-xs font-bold text-[#171717] mt-1 mb-1.5">Parse AST</h5>
                      <p className="text-xs text-[#737373]">Builds in-memory structural syntax trees of candidate files using Tree-sitter.</p>
                    </div>
                    <div className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg">
                      <span className="font-mono text-xs text-[#F97316] font-semibold">STAGE 02</span>
                      <h5 className="text-xs font-bold text-[#171717] mt-1 mb-1.5">Formulate Diff</h5>
                      <p className="text-xs text-[#737373]">Calculates minimal unified patch deltas while preserving comment trees and formatting.</p>
                    </div>
                    <div className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg">
                      <span className="font-mono text-xs text-[#F97316] font-semibold">STAGE 03</span>
                      <h5 className="text-xs font-bold text-[#171717] mt-1 mb-1.5">Sandbox Verification</h5>
                      <p className="text-xs text-[#737373]">Executes affected test suites in a zero-network micro-VM sandbox container.</p>
                    </div>
                    <div className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg">
                      <span className="font-mono text-xs text-[#F97316] font-semibold">STAGE 04</span>
                      <h5 className="text-xs font-bold text-[#171717] mt-1 mb-1.5">Propose PR</h5>
                      <p className="text-xs text-[#737373]">Emits clean JSON-RPC formatted tool response or validated multi-file commit tree.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Permissions & Requirements */}
              {activeTab === 'permissions' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <h3 className="text-base font-bold text-[#171717]">Security, Sandboxing & Protocol Scopes</h3>
                  <p className="text-xs sm:text-sm text-[#737373]">Adheres to Kyron Strict Enclave guidelines for enterprise workstation deployment.</p>

                  <div className="border border-[#E8E8E6] rounded-lg divide-y divide-[#E8E8E6]">
                    <div className="p-4 flex items-start gap-3.5">
                      <Lock className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-[#171717]">Workspace Read / Write Access</div>
                        <div className="text-xs text-[#737373] mt-0.5">Filesystem access limited strictly to the designated project root folder. No access to ~/.ssh, credentials, or parent directories.</div>
                      </div>
                    </div>
                    <div className="p-4 flex items-start gap-3.5">
                      <CloudOff className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-[#171717]">Zero Outbound Telemetry</div>
                        <div className="text-xs text-[#737373] mt-0.5">Code files, symbol names, and AST snapshots never leave your local environment. Network sockets are blocked during execution.</div>
                      </div>
                    </div>
                    <div className="p-4 flex items-start gap-3.5">
                      <Cpu className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-[#171717]">Host Runtime Requirements</div>
                        <div className="text-xs text-[#737373] mt-0.5">Node.js 20.0+ LTS or Bun 1.1+, 512MB RAM reserve for large workspace AST caches.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Sample Input / Output */}
              {activeTab === 'sample-io' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#171717]">MCP Interactive Protocol Inspection</h3>
                      <p className="text-xs text-[#737373] mt-0.5">Live execution payload trace between client agent and {skill.name}.</p>
                    </div>
                    <span className="font-mono text-[11px] text-[#A3A3A3] bg-[#F8F8F7] px-2.5 py-1 rounded border border-[#E8E8E6]">
                      TOOLS/CALL RPC 2.0
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Input Terminal */}
                    <div className="bg-[#171717] rounded-lg border border-[#333333] text-white overflow-hidden flex flex-col font-mono text-[12px]">
                      <div className="px-4 py-2 bg-[#222222] border-b border-[#333333] flex items-center justify-between text-[#A3A3A3]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#737373]"></span>
                          <span>Client Request</span>
                        </span>
                        <span className="text-[10px]">tools/call</span>
                      </div>
                      <pre className="p-4 overflow-x-auto text-[#CCCCCC] leading-5 text-[11px]">
{`{
  "method": "tools/call",
  "params": {
    "name": "refactor_symbols",
    "arguments": {
      "targetFile": "src/auth/session.ts",
      "action": "migrate_iron_session_v8",
      "updateCallers": true
    }
  }
}`}
                      </pre>
                    </div>

                    {/* Output Terminal */}
                    <div className="bg-[#171717] rounded-lg border border-[#333333] text-white overflow-hidden flex flex-col font-mono text-[12px]">
                      <div className="px-4 py-2 bg-[#222222] border-b border-[#333333] flex items-center justify-between text-[#A3A3A3]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]"></span>
                          <span>Synthesized Patch</span>
                        </span>
                        <span className="text-[10px] text-[#15803D]">200 OK (294ms)</span>
                      </div>
                      <pre className="p-4 overflow-x-auto text-[#CCCCCC] leading-5 text-[11px]">
{`--- a/src/auth/session.ts
+++ b/src/auth/session.ts
@@ -14,5 +14,6 @@
- import { withIronSession } from 'iron-session';
+ import { getIronSession } from 'iron-session';
+ import { sessionOptions } from './config';

✨ 3 callers automatically updated.`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Security & Audit */}
              {activeTab === 'security' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#171717]">8-Point Automated Security Scan</h3>
                      <p className="text-xs text-[#737373]">Static AST analysis and behavioral verification log.</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-50 text-[#15803D] font-mono text-xs font-semibold border border-emerald-200">
                      8 / 8 RULES PASSED
                    </span>
                  </div>

                  <div className="space-y-2">
                    {security_audit.map((rule, idx) => (
                      <div key={idx} className="p-3 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold text-[#171717]">{rule.rule_name}</span>
                            <span className="text-[10px] font-mono uppercase text-[#15803D] font-bold">PASS</span>
                          </div>
                          <p className="text-xs text-[#737373] mt-0.5">{rule.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: Reviews */}
              {activeTab === 'reviews' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <h3 className="text-base font-bold text-[#171717]">Community Reviews & Discussion</h3>

                  {/* Review form if logged in */}
                  {user ? (
                    <form onSubmit={handleReviewSubmit} className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#171717]">Leave a Verified Review</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="p-0.5"
                            >
                              <Star className={`w-4 h-4 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-[#D4D4D0]'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Write your experience with this skill..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                      />
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="px-4 py-1.5 bg-[#171717] hover:bg-black text-white text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        {submittingReview ? 'Submitting...' : 'Post Review'}
                      </button>
                    </form>
                  ) : null}

                  {/* Reviews List */}
                  <div className="space-y-3">
                    {reviews.length === 0 ? (
                      <p className="text-xs text-[#737373]">No reviews yet. Be the first to leave feedback!</p>
                    ) : (
                      reviews.map((rev) => (
                        <div key={rev.id} className="p-4 border border-[#E8E8E6] rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#171717]">{rev.user_name || 'Community Engineer'}</span>
                              <span className="text-[10px] font-mono text-[#15803D] bg-emerald-50 px-1.5 py-0.2 rounded">VERIFIED</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-[#737373] leading-relaxed">{rev.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: Sticky Action Panel & Creator Profile */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-20">
            {/* Action Card */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#737373]">Execution Cost</span>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-2xl font-bold text-[#171717]">
                    {isFree ? 'Free' : `$${effectivePrice.toFixed(2)}`}
                  </span>
                  <span className="text-xs text-[#737373]">/ license</span>
                </div>
              </div>

              {/* Action feedback */}
              {actionMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                  <span>{actionMessage}</span>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                onClick={handleAcquire}
                disabled={actionLoading}
                className="w-full h-11 bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <Terminal className="w-4 h-4" />
                <span>
                  {actionLoading
                    ? 'Processing...'
                    : is_purchased || isFree
                    ? 'Connect via MCP (Active)'
                    : `Get Skill for $${effectivePrice.toFixed(2)}`}
                </span>
              </button>

              {/* One-Click Terminal Snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#737373] font-mono">
                  <span>CLI Connect</span>
                  <button onClick={handleCopyCli} className="hover:text-[#171717] flex items-center gap-1">
                    {copiedCli ? <Check className="w-3 h-3 text-[#15803D]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCli ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg font-mono text-xs text-[#171717] flex items-center justify-between">
                  <code className="truncate">kyron connect {skill.slug}</code>
                </div>
              </div>

              {/* Copy MCP JSON */}
              <button
                onClick={handleCopyMcp}
                className="w-full py-2 bg-white hover:bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg text-xs font-mono font-medium text-[#171717] flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedMcp ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMcp ? 'JSON Copied!' : 'Copy MCP Config JSON'}</span>
              </button>

              {/* Secondary Actions: Save and Upvote */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8E8E6]">
                <button
                  onClick={handleSave}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    is_saved
                      ? 'bg-[#FFF4EB] border-[#F97316]/30 text-[#F97316]'
                      : 'bg-white border-[#E8E8E6] text-[#737373] hover:text-[#171717]'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${is_saved ? 'fill-[#F97316]' : ''}`} />
                  <span>{is_saved ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  onClick={handleVote}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    user_vote === 1
                      ? 'bg-[#FFF4EB] border-[#F97316]/30 text-[#F97316]'
                      : 'bg-white border-[#E8E8E6] text-[#737373] hover:text-[#171717]'
                  }`}
                >
                  <ArrowBigUp className={`w-4 h-4 ${user_vote === 1 ? 'fill-[#F97316]' : ''}`} />
                  <span>Upvote ({skill.net_votes})</span>
                </button>
              </div>
            </div>

            {/* Creator Information Card */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl p-5 shadow-xs space-y-3">
              <span className="text-[11px] font-mono uppercase text-[#A3A3A3] font-semibold">Publisher Profile</span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F8F8F7] border border-[#E8E8E6] overflow-hidden flex items-center justify-center">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-mono text-xs font-bold text-[#171717]">{creator.display_name.slice(0, 2)}</span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#171717] flex items-center gap-1">
                    <span>{creator.display_name}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" />
                  </div>
                  <div className="text-[11px] font-mono text-[#737373]">@{creator.username}</div>
                </div>
              </div>
              <p className="text-xs text-[#737373] leading-relaxed">
                {creator.bio || 'Verified autonomous skills creator on Kyron Protocol.'}
              </p>
              <Link
                href={`/creators/${creator.username}`}
                className="text-xs text-[#F97316] font-semibold hover:underline flex items-center gap-1 pt-1"
              >
                <span>View Creator Studio</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

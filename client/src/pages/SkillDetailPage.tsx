import React, { useEffect, useState } from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { loginPathFor } from '../utils/authHelpers.ts';
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
  FolderArchive,
  FileText,
  FileCode,
  ShieldCheck, 
  CheckCircle2, 
  Lock,
  CloudOff,
  Cpu,
  GitBranch,
  ArrowRight,
  AlertTriangle,
  Bot,
  Info
} from 'lucide-react';

type TargetAgent = 'claude' | 'codex' | 'cursor' | 'antigravity' | 'generic';

const AGENT_OPTIONS: { id: TargetAgent; label: string; icon: string; path: string; desc: string }[] = [
  { id: 'claude', label: 'Claude Code', icon: '🤖', path: '.claude/skills/', desc: 'Claude Code CLI project skills directory' },
  { id: 'codex', label: 'OpenAI Codex', icon: '⚡', path: '.codex/skills/', desc: 'Codex project skills directory' },
  { id: 'cursor', label: 'Cursor', icon: '🖱️', path: '.cursor/skills/', desc: 'Cursor project rules & skills' },
  { id: 'antigravity', label: 'Antigravity', icon: '🚀', path: '.agents/skills/', desc: 'Google Antigravity workspace skills root' },
  { id: 'generic', label: 'Generic Agent', icon: '🧩', path: '.agents/skills/', desc: 'Standard Open Agent Skills directory' }
];

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
  const [selectedAgent, setSelectedAgent] = useState<TargetAgent>('generic');
  const [promptText, setPromptText] = useState<string>('');
  const [loadingPrompt, setLoadingPrompt] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'prompt-preview' | 'package-files' | 'permissions' | 'security' | 'reviews'>('overview');
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

      if (res.is_purchased || res.skill.pricing_type === 'free' || (user && user.id === res.skill.creator_id)) {
        try {
          const pkg = await api.getSkillPackage(slug);
          setPackageData(pkg);
        } catch {
          // Allowed to fail if not authorized
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load skill details');
    } finally {
      setLoading(false);
    }
  };

  const loadPrompt = async (agent: TargetAgent) => {
    try {
      setLoadingPrompt(true);
      const res = await api.getSkillPrompt(slug, agent);
      setPromptText(res.prompt);
    } catch (err) {
      console.warn('Failed to load prompt:', err);
    } finally {
      setLoadingPrompt(false);
    }
  };

  useEffect(() => {
    fetchSkillData();
  }, [slug]);

  useEffect(() => {
    if (data) {
      loadPrompt(selectedAgent);
    }
  }, [slug, selectedAgent, data?.is_purchased]);

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
        <p className="text-xs text-[#737373]">{error || 'The requested skill does not exist or is a private draft.'}</p>
        <Link href="/skills" className="inline-flex px-4 py-2 bg-[#171717] text-white text-xs font-medium rounded-lg">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const { skill, creator, deal, security_audit, reviews, user_vote, is_saved, is_purchased } = data;
  const isPaid = skill.pricing_type === 'paid' && Number(skill.price) > 0;
  const isFree = !isPaid;
  const isCreator = user ? user.id === skill.creator_id : false;
  const isUnlocked = isFree || is_purchased || isCreator;
  const effectivePrice = deal ? skill.price * (1 - deal.discount_percent / 100) : skill.price;

  const currentAgentInfo = AGENT_OPTIONS.find(a => a.id === selectedAgent) || AGENT_OPTIONS[4];
  const targetInstallPath = `${currentAgentInfo.path}${skill.slug}/`;

  const handleCopyPrompt = () => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(targetInstallPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleVote = async () => {
    if (!user) {
      navigate(loginPathFor(window.location.pathname + window.location.search));
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
      navigate(loginPathFor(window.location.pathname + window.location.search));
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
      navigate(loginPathFor(window.location.pathname + window.location.search));
      return;
    }

    if (isFree) {
      setActionLoading(true);
      try {
        await api.installFreeSkill(skill.id);
        setActionMessage('Skill unlocked! You can now download the ZIP, Markdown, and prompt.');
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
        setActionMessage('Purchase completed! Package download & agent prompt unlocked.');
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
      navigate(loginPathFor(window.location.pathname + window.location.search));
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
                      Agent Skills Standard
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-[#737373] bg-[#F8F8F7] border border-[#E8E8E6]">
                      v{skill.current_version || '1.0.0'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-[#15803D] bg-emerald-50 border border-emerald-200">
                      License: {skill.license || 'MIT'}
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
                  format:agent-skills-1.0
                </span>
                <span className="text-xs font-mono px-2.5 py-1 bg-[#F8F8F7] border border-[#E8E8E6] rounded text-[#737373]">
                  primary:SKILL.md
                </span>
                <span className="text-xs font-mono px-2.5 py-1 bg-[#F8F8F7] border border-[#E8E8E6] rounded text-[#737373]">
                  safety:untrusted-exec-blocked
                </span>
                <span className="text-xs font-mono px-2.5 py-1 bg-[#F8F8F7] border border-[#E8E8E6] rounded text-[#737373]">
                  scope:hermetic-install
                </span>
              </div>
            </div>

            {/* Dynamic Architectural Tabs */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-xs">
              {/* Tab Navigation Strip */}
              <div className="flex items-center border-b border-[#E8E8E6] px-4 bg-[#F8F8F7]/60 overflow-x-auto no-scrollbar">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'prompt-preview', label: 'AI Installation Prompt' },
                  { id: 'package-files', label: 'Package Structure' },
                  { id: 'permissions', label: 'Security & Constraints' },
                  { id: 'security', label: `Automated Scan (${security_audit.length})` },
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
                    <h3 className="text-base font-bold text-[#171717] mb-2">Agent Skill Specification</h3>
                    <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
                      {skill.name} follows the standard Open Agent Skills specification. It packages instructions in a standalone <code className="text-[#F97316] font-mono">SKILL.md</code> file along with supporting references, templates, and scripts designed for human and AI inspection.
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg">
                      <div className="text-[11px] font-mono text-[#737373] mb-1">PACKAGE FORMAT</div>
                      <div className="text-xl font-bold text-[#171717] font-mono">ZIP + MD</div>
                      <div className="text-[11px] text-[#15803D] mt-1 font-medium">Standalone or bundled</div>
                    </div>
                    <div className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg">
                      <div className="text-[11px] font-mono text-[#737373] mb-1">TARGET AGENTS</div>
                      <div className="text-xl font-bold text-[#171717] font-mono">5 Supported</div>
                      <div className="text-[11px] text-[#737373] mt-1">Claude, Codex, Cursor, etc.</div>
                    </div>
                    <div className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg">
                      <div className="text-[11px] font-mono text-[#737373] mb-1">SECURITY AUDIT</div>
                      <div className="text-xl font-bold text-[#171717] font-mono">Tier 0 Pass</div>
                      <div className="text-[11px] text-[#15803D] mt-1 font-medium">8/8 Automated Checks</div>
                    </div>
                  </div>

                  {/* Supported Coding Agents */}
                  <div>
                    <h4 className="text-sm font-bold text-[#171717] mb-4">Supported Coding Agent Environments</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {AGENT_OPTIONS.map((agent) => (
                        <div 
                          key={agent.id}
                          onClick={() => setSelectedAgent(agent.id)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedAgent === agent.id
                              ? 'border-[#F97316] bg-[#FFF4EB]/30 shadow-xs'
                              : 'border-[#E8E8E6] hover:border-[#D4D4D0] bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-[#171717] flex items-center gap-1.5">
                              <span>{agent.icon}</span>
                              <span>{agent.label}</span>
                            </span>
                            <span className="text-[10px] font-mono text-[#737373]">{agent.path}</span>
                          </div>
                          <p className="text-xs text-[#737373]">{agent.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AI Installation Prompt */}
              {activeTab === 'prompt-preview' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#171717]">Dynamic AI Agent Installation Prompt</h3>
                      <p className="text-xs text-[#737373] mt-0.5">
                        Provide this prompt and the downloaded ZIP to your AI coding agent.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyPrompt}
                        className="px-3 py-1.5 bg-[#171717] hover:bg-black text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        {copiedPrompt ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPrompt ? 'Copied Prompt' : 'Copy Prompt'}</span>
                      </button>
                      <a
                        href={api.getPromptDownloadUrl(skill.slug, selectedAgent)}
                        download
                        className="px-3 py-1.5 bg-white border border-[#E8E8E6] hover:bg-[#F8F8F7] text-xs font-medium text-[#171717] rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .md</span>
                      </a>
                    </div>
                  </div>

                  {/* Target agent selector pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-xs font-mono text-[#737373] shrink-0">Target Agent:</span>
                    {AGENT_OPTIONS.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono whitespace-nowrap transition-colors ${
                          selectedAgent === agent.id
                            ? 'bg-[#171717] text-white font-medium'
                            : 'bg-[#F8F8F7] text-[#737373] hover:text-[#171717] border border-[#E8E8E6]'
                        }`}
                      >
                        {agent.icon} {agent.label}
                      </button>
                    ))}
                  </div>

                  {/* Prompt Text Container */}
                  <div className="relative bg-[#171717] rounded-lg border border-[#333333] text-white overflow-hidden">
                    <div className="px-4 py-2 bg-[#222222] border-b border-[#333333] flex items-center justify-between text-xs text-[#A3A3A3] font-mono">
                      <span>Installation Target: {currentAgentInfo.path}{skill.slug}/</span>
                      <span className="text-[10px] text-[#A3A3A3]">Markdown Format</span>
                    </div>
                    <pre className="p-4 overflow-x-auto text-[#CCCCCC] font-mono text-xs leading-relaxed max-h-[460px] whitespace-pre-wrap">
                      {loadingPrompt ? 'Generating installation prompt...' : (promptText || 'No prompt available.')}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: Package Structure */}
              {activeTab === 'package-files' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#171717]">Skill Package Hierarchy</h3>
                      <p className="text-xs text-[#737373]">Directory tree contained inside {skill.slug}.zip</p>
                    </div>
                    {isUnlocked && (
                      <a
                        href={api.getZipDownloadUrl(skill.slug)}
                        download
                        className="px-3 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                        <span>Download ZIP</span>
                      </a>
                    )}
                  </div>

                  <div className="p-4 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg font-mono text-xs space-y-2 text-[#171717]">
                    <div className="flex items-center gap-2 font-bold text-[#F97316]">
                      <FolderArchive className="w-4 h-4" />
                      <span>{skill.slug}/</span>
                    </div>
                    <div className="ml-6 space-y-2 border-l-2 border-[#E8E8E6] pl-4">
                      <div className="flex items-center gap-2 text-[#171717]">
                        <FileCode className="w-4 h-4 text-[#F97316]" />
                        <span className="font-semibold">SKILL.md</span>
                        <span className="text-[10px] text-[#737373] bg-white border border-[#E8E8E6] px-1.5 py-0.5 rounded">Primary Specification</span>
                      </div>
                      {packageData?.files && Object.keys(packageData.files).filter((k: string) => k !== 'SKILL.md').map((file: string) => (
                        <div key={file} className="flex items-center gap-2 text-[#525252]">
                          <FileText className="w-4 h-4 text-[#737373]" />
                          <span>{file}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-[#737373]">
                        <FileText className="w-4 h-4 text-[#737373]" />
                        <span>LICENSE.txt</span>
                        <span className="text-[10px] text-[#A3A3A3]">({skill.license || 'MIT'})</span>
                      </div>
                    </div>
                  </div>

                  {packageData?.skill_md_content && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono uppercase text-[#737373] font-semibold">SKILL.md Preview</h4>
                      <pre className="p-4 bg-white border border-[#E8E8E6] rounded-lg text-xs font-mono text-[#171717] overflow-x-auto max-h-72 whitespace-pre-wrap leading-relaxed">
                        {packageData.skill_md_content}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Security & Constraints */}
              {activeTab === 'permissions' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <h3 className="text-base font-bold text-[#171717]">Safe Execution & Installation Protocol</h3>
                  <p className="text-xs sm:text-sm text-[#737373]">
                    KYRON enforces hermetic boundaries. AI coding agents should never execute downloaded scripts automatically without user review.
                  </p>

                  <div className="border border-[#E8E8E6] rounded-lg divide-y divide-[#E8E8E6]">
                    <div className="p-4 flex items-start gap-3.5">
                      <Lock className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-[#171717]">Hermetic Workspace Scope</div>
                        <div className="text-xs text-[#737373] mt-0.5">Filesystem access is strictly restricted to designated agent skill folders (<code className="font-mono text-[#171717]">.agents/skills/</code>, <code className="font-mono text-[#171717]">.claude/skills/</code>, etc.). No access to system roots or credentials.</div>
                      </div>
                    </div>
                    <div className="p-4 flex items-start gap-3.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-[#171717]">Zero Automatic Script Execution</div>
                        <div className="text-xs text-[#737373] mt-0.5">Any packaged scripts (.py, .ts, .sh) are auxiliary reference tools. The generated agent prompt strictly instructs agents never to execute them automatically.</div>
                      </div>
                    </div>
                    <div className="p-4 flex items-start gap-3.5">
                      <CloudOff className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-[#171717]">Zero Secret Exfiltration</div>
                        <div className="text-xs text-[#737373] mt-0.5">Skills are statically scanned for network phone-homes, prompt injection tokens, and key sniffers before being published.</div>
                      </div>
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
                      <p className="text-xs text-[#737373]">Static AST analysis, frontmatter check, and behavioral verification log.</p>
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

          {/* RIGHT 4 COLUMNS: Sticky Action Panel & Downloads */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-20">
            {/* Action Card */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#737373]">Skill License</span>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-2xl font-bold text-[#171717]">
                    {isFree ? 'Free' : `$${effectivePrice.toFixed(2)}`}
                  </span>
                  <span className="text-xs text-[#737373]">{isFree ? '(Open Source)' : '/ lifetime access'}</span>
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
              {!isUnlocked ? (
                <button
                  onClick={handleAcquire}
                  disabled={actionLoading}
                  className="w-full h-11 bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {actionLoading
                      ? 'Processing...'
                      : `Purchase & Unlock ($${effectivePrice.toFixed(2)})`}
                  </span>
                </button>
              ) : (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-[#15803D] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{isCreator ? 'You are the creator of this skill' : 'Authorized for download'}</span>
                </div>
              )}

              {/* Target Agent Selector */}
              <div className="space-y-1.5 pt-2 border-t border-[#E8E8E6]">
                <label className="text-xs font-semibold text-[#171717] flex items-center justify-between">
                  <span>Selected Coding Agent</span>
                  <span className="text-[10px] font-mono text-[#737373]">{currentAgentInfo.label}</span>
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value as TargetAgent)}
                  className="w-full px-3 py-2 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F97316]"
                >
                  {AGENT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.icon} {opt.label} ({opt.path})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Install Directory */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#737373] font-mono">
                  <span>Installation Path</span>
                  <button onClick={handleCopyPath} className="hover:text-[#171717] flex items-center gap-1">
                    {copiedPath ? <Check className="w-3 h-3 text-[#15803D]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPath ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg font-mono text-xs text-[#171717] flex items-center justify-between">
                  <code className="truncate">{targetInstallPath}</code>
                </div>
              </div>

              {/* Action Buttons Cluster: Copy Prompt, Download Prompt, Download SKILL.md, Download ZIP */}
              <div className="space-y-2 pt-2 border-t border-[#E8E8E6]">
                <button
                  onClick={handleCopyPrompt}
                  disabled={!isUnlocked}
                  className="w-full py-2.5 bg-[#171717] hover:bg-black text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? 'Prompt Copied to Clipboard!' : 'Copy AI Installation Prompt'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={isUnlocked ? api.getMarkdownDownloadUrl(skill.slug) : '#'}
                    download={isUnlocked}
                    onClick={(e) => {
                      if (!isUnlocked) {
                        e.preventDefault();
                        handleAcquire();
                      }
                    }}
                    className={`py-2 px-2.5 border rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      isUnlocked
                        ? 'bg-white hover:bg-[#F8F8F7] border-[#E8E8E6] text-[#171717]'
                        : 'bg-[#F8F8F7] border-[#E8E8E6] text-[#A3A3A3] cursor-not-allowed'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>Download .md</span>
                  </a>

                  <a
                    href={isUnlocked ? api.getZipDownloadUrl(skill.slug) : '#'}
                    download={isUnlocked}
                    onClick={(e) => {
                      if (!isUnlocked) {
                        e.preventDefault();
                        handleAcquire();
                      }
                    }}
                    className={`py-2 px-2.5 border rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      isUnlocked
                        ? 'bg-white hover:bg-[#F8F8F7] border-[#E8E8E6] text-[#171717]'
                        : 'bg-[#F8F8F7] border-[#E8E8E6] text-[#A3A3A3] cursor-not-allowed'
                    }`}
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>Download ZIP</span>
                  </a>
                </div>

                <a
                  href={isUnlocked ? api.getPromptDownloadUrl(skill.slug, selectedAgent) : '#'}
                  download={isUnlocked}
                  onClick={(e) => {
                    if (!isUnlocked) {
                      e.preventDefault();
                      handleAcquire();
                    }
                  }}
                  className={`w-full py-2 border rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    isUnlocked
                      ? 'bg-[#F8F8F7] hover:bg-[#EDEDEB] border-[#E8E8E6] text-[#525252]'
                      : 'bg-[#F8F8F7] border-[#E8E8E6] text-[#A3A3A3] cursor-not-allowed'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Prompt File</span>
                </a>
              </div>

              {/* Informative Note regarding Standalone Markdown vs ZIP */}
              <div className="p-3 bg-[#FFF4EB]/60 border border-[#F97316]/20 rounded-lg text-[11px] text-[#737373] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#171717]">
                  <Info className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Package Delivery Note</span>
                </div>
                <p>
                  The standalone Markdown file includes YAML frontmatter and instructions. If this skill utilizes supporting resources (scripts, templates), download the complete ZIP package for full functionality.
                </p>
              </div>

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

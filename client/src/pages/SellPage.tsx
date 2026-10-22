import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';
import { PlusCircle, ShieldCheck, DollarSign, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export function SellPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();

  // Calculator State
  const [calcPrice, setCalcPrice] = useState<number>(29);
  const [calcSales, setCalcSales] = useState<number>(150);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Engineering');
  const [pricingType, setPricingType] = useState<'free' | 'paid'>('paid');
  const [price, setPrice] = useState('29.00');
  const [tags, setTags] = useState('react, typescript, architecture');
  const [skillMd, setSkillMd] = useState(`---
name: my-agent-skill
description: High-performance composable rule for autonomous agents
version: 1.0.0
compatibility: [claude-code, cursor, mcp]
---

# Instructions
1. Inspect project files before applying edits.
2. Adhere strictly to 8-point security guidelines.`);

  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Revenue math
  const grossMonthly = calcPrice * calcSales;
  const creatorMonthly = grossMonthly * 0.70;
  const platformMonthly = grossMonthly * 0.30;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    setPublishing(true);
    setError(null);
    setResult(null);

    try {
      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await api.publishSkill({
        name,
        slug,
        summary,
        description,
        category,
        tags: parsedTags,
        pricing_type: pricingType,
        price: pricingType === 'paid' ? parseFloat(price) || 0 : 0,
        skill_md_content: skillMd
      });

      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Publishing failed');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>KYRON Creator Network • 70% Revenue Payout</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground font-['Outfit']">
          Turn Your Prompt Engineering Into Recurring Income
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Package your specialized agent workflows, domain rules, and MCP tools. Connect with high-value developers using Claude Code and Cursor.
        </p>
      </div>

      {/* Interactive 70% Earnings Calculator */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-2xl space-y-8">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground font-['Outfit']">
              Creator Earnings Calculator
            </h3>
            <p className="text-xs text-muted-foreground">Estimate your monthly revenue with our transparent 70/30 split</p>
          </div>
          <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            70% Creator Share
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-foreground">
                <span>Skill License Price:</span>
                <span className="text-cyan-400 font-mono text-sm">${calcPrice}.00</span>
              </div>
              <input
                type="range"
                min="5"
                max="99"
                value={calcPrice}
                onChange={(e) => setCalcPrice(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-foreground">
                <span>Estimated Monthly Installs:</span>
                <span className="text-emerald-400 font-mono text-sm">{calcSales} installs</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={calcSales}
                onChange={(e) => setCalcSales(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-3">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Your Estimated Monthly Earnings
            </span>
            <div className="text-4xl font-extrabold text-emerald-400 font-mono">
              ${creatorMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground flex justify-center gap-4 pt-2 border-t border-border/40 font-mono">
              <span>Gross: ${grossMonthly.toFixed(2)}</span>
              <span>Platform Fee (30%): ${platformMonthly.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Skill Publishing Form with 8-Point Live Security Scan */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-cyan-500/40 shadow-2xl space-y-8">
        <div>
          <h3 className="text-xl font-bold text-foreground font-['Outfit'] flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-cyan-400" />
            Publish a New Verified Agent Skill
          </h3>
          <p className="text-xs text-muted-foreground">
            All submitted skills are instantly processed through our automated 8-point static & heuristic security scanner.
          </p>
        </div>

        <form onSubmit={handlePublish} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Skill Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Clean Architecture for Next.js"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-cyan-500/40 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Slug (URL)</label>
              <input
                type="text"
                required
                placeholder="e.g. clean-architecture-nextjs"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono focus:ring-2 focus:ring-cyan-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-cyan-500/40 focus:outline-none text-foreground"
              >
                <option value="Engineering">Engineering</option>
                <option value="DevOps">DevOps</option>
                <option value="Security">Security</option>
                <option value="Data Science">Data Science</option>
                <option value="Marketing">Marketing</option>
                <option value="SEO">SEO</option>
                <option value="Finance">Finance</option>
                <option value="Productivity">Productivity</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Pricing Model</label>
              <select
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-cyan-500/40 focus:outline-none text-foreground"
              >
                <option value="paid">Paid License (Credits)</option>
                <option value="free">Free 1-Click Community</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Price (USD)</label>
              <input
                type="number"
                disabled={pricingType === 'free'}
                min="1"
                step="0.5"
                value={pricingType === 'free' ? '0.00' : price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-mono focus:ring-2 focus:ring-cyan-500/40 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">One-Line Summary</label>
            <input
              type="text"
              required
              placeholder="Concise overview shown in cards and search results..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-cyan-500/40 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Full Description & Capabilities</label>
            <textarea
              rows={3}
              required
              placeholder="Explain how this skill enhances agent workflows, supported tools, and prerequisites..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-cyan-500/40 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground font-mono">
                Skill.md Content (Specification v2.1)
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">YAML frontmatter required</span>
            </div>
            <textarea
              rows={8}
              required
              value={skillMd}
              onChange={(e) => setSkillMd(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs border border-border/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          {/* Feedback & Scan Results */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Skill Successfully Scanned & Published Live!</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/skills/${result.slug}`)}
                  className="px-3 py-1 rounded-lg bg-emerald-500 text-background font-bold text-xs hover:bg-emerald-400"
                >
                  View Listing
                </button>
              </div>
              <div className="text-xs text-muted-foreground">
                All 8 security verification rules passed. Immediate listing in search index and MCP gateway.
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={publishing}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-background font-bold text-sm shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {publishing ? (
              <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Run 8-Point Security Audit & Publish Skill</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

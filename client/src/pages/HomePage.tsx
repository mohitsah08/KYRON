import React, { useEffect, useState } from 'react';
import { Link } from '../context/RouterContext.tsx';
import { api } from '../utils/api.ts';
import { Skill } from '../types.ts';
import { SkillCard } from '../components/SkillCard.tsx';
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  BadgeCheck,
  Users,
  Workflow,
  Upload,
  Bot,
  FileCode2,
  Database,
  Search,
  CheckCircle2
} from 'lucide-react';

const valueProps = [
  {
    icon: BadgeCheck,
    title: 'Curated Skills',
    desc: 'Every skill is reviewed for quality and usefulness before it reaches the marketplace.',
  },
  {
    icon: Users,
    title: 'Creator-Published',
    desc: 'Built and maintained by independent creators who know the workflows they automate.',
  },
  {
    icon: Workflow,
    title: 'Built for AI Workflows',
    desc: 'Plug skills into Claude, Cursor, and custom agents through a standard protocol.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe & Reliable',
    desc: 'Automated security scans and sandboxed execution keep your agents and data protected.',
  },
];

export function HomePage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.getSkills({ limit: 8, sort: 'votes' });
        setSkills(res.skills);
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="w-full bg-white flex flex-col items-center">
      {/* ================= HERO ================= */}
      <section className="w-full relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-[-10%] w-[720px] h-[720px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.10),transparent_65%)]"
        />
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-14 lg:pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF4EB] border border-[#F97316]/20 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
              <span className="text-xs font-semibold text-[#C2410C]">The AI Skills Marketplace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight text-[#171717] leading-[1.05] mb-6">
              Discover Skills.
              <br />
              <span className="text-[#F97316]">Create What’s Next.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#525252] leading-relaxed mb-9">
              Find, use, and publish high-quality AI skills to automate work, accelerate your ideas, and build the next generation of AI agents.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/skills"
                className="inline-flex items-center justify-center gap-2 px-6 h-12 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold rounded-xl shadow-[0_8px_20px_-6px_rgba(249,115,22,0.55)] transition-all active:scale-[0.99]"
              >
                <span>Explore Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/creator"
                className="inline-flex items-center justify-center gap-2 px-6 h-12 bg-white border border-[#E5E5E3] hover:border-[#171717] text-[#171717] text-sm font-semibold rounded-xl transition-colors active:scale-[0.99]"
              >
                <span>Open Creator Studio</span>
              </Link>
            </div>
          </div>

          <HeroIllustration />
        </div>
      </section>

      {/* ================= VALUE PROPS ================= */}
      <section className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-10 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {valueProps.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl border border-[#EDEDEB] bg-white hover:border-[#F97316]/40 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-[#FFF4EB] flex items-center justify-center text-[#F97316] mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-[#171717] mb-1.5">{title}</h3>
              <p className="text-sm text-[#737373] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FEATURED SKILLS ================= */}
      <section className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-10 pb-16">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#171717] tracking-tight">Featured AI Skills</h2>
            <p className="text-sm text-[#737373] mt-1">Popular skills from the community, ready to use in your agents.</p>
          </div>
          <Link
            href="/skills"
            className="shrink-0 text-sm font-semibold text-[#F97316] hover:text-[#EA580C] flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-64 rounded-xl bg-[#F8F8F7] border border-[#E8E8E6] animate-pulse"></div>
            ))}
          </div>
        ) : skills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {skills.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#E5E5E3] p-10 text-center text-sm text-[#737373]">
            No skills available yet.{' '}
            <Link href="/creator/submit" className="font-semibold text-[#F97316]">Publish the first one</Link>.
          </div>
        )}
      </section>

      {/* ================= CREATOR PROMO ================= */}
      <section className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-10 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-[#171717] text-white p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -bottom-32 w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.35),transparent_65%)]"
          />
          <div className="relative max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 mb-4">
              <Upload className="w-3.5 h-3.5 text-[#FB923C]" />
              <span className="text-xs font-semibold text-[#FDBA74]">For creators</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Create &amp; Share Your AI Skills</h2>
            <p className="text-sm sm:text-base text-[#A3A3A3] leading-relaxed">
              Turn your expertise into reusable skills. Upload, manage versions, and publish to the marketplace from Creator Studio.
            </p>
          </div>
          <div className="relative flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
            <Link
              href="/creator/submit"
              className="inline-flex items-center justify-center gap-2 px-6 h-12 bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <span>Publish a Skill</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/creator"
              className="inline-flex items-center justify-center px-6 h-12 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Open Creator Studio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Decorative workflow illustration: an agent calling skills from the marketplace.
function HeroIllustration() {
  const nodes = [
    { icon: Search, label: 'Web Research', meta: 'v2.1', pos: 'left-0 top-[8%]' },
    { icon: FileCode2, label: 'Code Review', meta: 'v1.4', pos: 'right-0 top-[2%]' },
    { icon: Database, label: 'Data Pipeline', meta: 'v3.0', pos: 'left-[2%] bottom-[6%]' },
    { icon: ShieldCheck, label: 'Security Audit', meta: 'v1.2', pos: 'right-[2%] bottom-[12%]' },
  ];

  return (
    <div aria-hidden="true" className="relative w-full max-w-[560px] mx-auto lg:ml-auto aspect-[4/5] sm:aspect-[5/4]">
      {/* Grid backdrop */}
      <div className="absolute inset-4 rounded-[28px] border border-[#EDEDEB] bg-[#FAFAF9] bg-[linear-gradient(#EDEDEB_1px,transparent_1px),linear-gradient(90deg,#EDEDEB_1px,transparent_1px)] bg-[size:28px_28px]" />

      {/* Connectors */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 400" preserveAspectRatio="none" fill="none">
        <g stroke="#F97316" strokeWidth="1.5" strokeDasharray="5 5" strokeOpacity="0.55">
          <path d="M120 75 C 180 75, 200 200, 250 200" />
          <path d="M380 55 C 320 55, 300 200, 250 200" />
          <path d="M120 340 C 180 340, 200 200, 250 200" />
          <path d="M380 315 C 320 315, 300 200, 250 200" />
        </g>
      </svg>

      {/* Central agent */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 sm:w-48 rounded-2xl bg-white border border-[#E8E8E6] shadow-[0_20px_50px_-20px_rgba(23,23,23,0.35)] p-4 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#F97316] flex items-center justify-center text-white shadow-[0_10px_24px_-8px_rgba(249,115,22,0.8)] mb-3">
          <Bot className="w-7 h-7" />
        </div>
        <div className="text-sm font-semibold text-[#171717]">Your AI Agent</div>
        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#15803D]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          4 skills connected
        </div>
      </div>

      {/* Skill nodes */}
      {nodes.map(({ icon: Icon, label, meta, pos }) => (
        <div
          key={label}
          className={`absolute ${pos} flex items-center gap-2.5 rounded-xl bg-white border border-[#E8E8E6] shadow-[0_10px_30px_-15px_rgba(23,23,23,0.3)] pl-2 pr-3 py-2`}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#FFF4EB] flex items-center justify-center text-[#F97316] shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <div className="text-xs sm:text-sm font-semibold text-[#171717] whitespace-nowrap">{label}</div>
            <div className="text-[10px] font-mono text-[#A3A3A3]">{meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

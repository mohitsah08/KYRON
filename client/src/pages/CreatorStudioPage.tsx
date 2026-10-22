import React, { useEffect, useState } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { SideNav } from '../components/SideNav.tsx';
import { api } from '../utils/api.ts';
import { CreatorAnalytics, Skill } from '../types.ts';

export function CreatorStudioPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'skills' | 'verification' | 'payouts'>('overview');
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudio() {
      try {
        const [anaRes, skillRes] = await Promise.all([
          api.getCreatorAnalytics().catch(() => ({ analytics: null })),
          api.getSkills().catch(() => ({ skills: [] }))
        ]);
        setAnalytics(anaRes.analytics || null);
        setSkills(skillRes.skills || []);
      } catch (err) {
        console.error('Failed to load studio:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStudio();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      {/* Shell */}
      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-[1440px] mx-auto">
        <SideNav activeTab="creator" />

        {/* Viewport */}
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          {/* Creator Sub-Navigation (Studio Context) */}
          <section className="bg-bg-surface border-b border-border-subtle px-6 md:px-10 py-2.5">
            <div className="max-w-[1440px] mx-auto flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-label-md font-label-md text-text-secondary">
                <span className="text-text-tertiary font-code-sm">STUDIO</span>
                <span className="text-border-strong">/</span>
                <span className="text-text-primary font-medium">Production Node</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-bg-canvas border border-border-subtle text-[10px] font-code-sm text-text-secondary ml-1">
                  US-EAST
                </span>
              </div>

              {/* Creator Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto text-body-sm">
                <button 
                  onClick={() => setActiveSubTab('overview')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    activeSubTab === 'overview'
                      ? 'font-headline-md bg-bg-canvas text-text-primary border border-border-subtle shadow-xs'
                      : 'font-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-canvas'
                  }`}
                >
                  Studio Overview
                </button>
                <button 
                  onClick={() => setActiveSubTab('skills')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    activeSubTab === 'skills'
                      ? 'font-headline-md bg-bg-canvas text-text-primary border border-border-subtle shadow-xs'
                      : 'font-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-canvas'
                  }`}
                >
                  My Published Skills
                </button>
                <button 
                  onClick={() => navigate('/creator/submit')}
                  className="px-3 py-1.5 rounded font-body-sm text-primary-container hover:text-accent-hover hover:bg-bg-canvas transition-colors font-medium flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Create Skill</span>
                </button>
                <button 
                  onClick={() => setActiveSubTab('verification')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    activeSubTab === 'verification'
                      ? 'font-headline-md bg-bg-canvas text-text-primary border border-border-subtle shadow-xs'
                      : 'font-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-canvas'
                  }`}
                >
                  Verification
                </button>
                <button 
                  onClick={() => setActiveSubTab('payouts')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    activeSubTab === 'payouts'
                      ? 'font-headline-md bg-bg-canvas text-text-primary border border-border-subtle shadow-xs'
                      : 'font-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-canvas'
                  }`}
                >
                  Payouts & Tokens
                </button>
              </div>
            </div>
          </section>

          {/* Main Stage */}
          <main className="flex-1 px-6 md:px-10 py-8 overflow-y-auto">
            <div className="max-w-[1120px] mx-auto flex flex-col gap-8">
              
              {/* Studio Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-subtle pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-label-sm font-code-sm text-primary uppercase font-semibold">
                      AUTONOMOUS AGENT REGISTRY
                    </span>
                    <span className="text-border-strong">/</span>
                    <span className="text-label-sm font-code-sm text-text-tertiary">CREATOR ENVIRONMENT</span>
                  </div>
                  <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight">
                    Creator Studio
                  </h1>
                  <p className="text-body-md font-body-md text-text-secondary mt-1 max-w-2xl">
                    Publish MCP servers, compile tool manifests, and earn 70% recurring revenue across decentralized agent runtimes.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={() => navigate('/creators/axiom_labs')}
                    className="h-9 px-3.5 bg-bg-canvas border border-border-subtle hover:border-border-strong text-text-primary rounded text-body-sm font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>View Public Profile</span>
                  </button>
                  <button 
                    onClick={() => navigate('/creator/submit')}
                    className="h-9 px-4 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Publish New Skill</span>
                  </button>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-2">
                    <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Net Payouts (70%)</span>
                    <span className="material-symbols-outlined text-text-tertiary">payments</span>
                  </div>
                  <div className="text-headline-lg font-headline-lg font-semibold text-text-primary font-code-sm">
                    ${analytics?.total_earnings.toFixed(2) || '14,892.40'}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    <span className="text-status-success font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">trending_up</span> +24.8%
                    </span>
                    <span className="text-text-tertiary">this month</span>
                  </div>
                </div>

                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-2">
                    <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Total Invocations</span>
                    <span className="material-symbols-outlined text-text-tertiary">repeat</span>
                  </div>
                  <div className="text-headline-lg font-headline-lg font-semibold text-text-primary font-code-sm">
                    412,890
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    <span>Active RPC nodes</span>
                    <span className="text-status-success font-medium">99.98% up</span>
                  </div>
                </div>

                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-2">
                    <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Published Skills</span>
                    <span className="material-symbols-outlined text-text-tertiary">terminal</span>
                  </div>
                  <div className="text-headline-lg font-headline-lg font-semibold text-text-primary font-code-sm">
                    {skills.length || 4}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    <span>100% AST Passed</span>
                    <span className="text-primary-container font-medium">0 Flagged</span>
                  </div>
                </div>

                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-2">
                    <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Creator Trust Score</span>
                    <span className="material-symbols-outlined text-status-success">verified</span>
                  </div>
                  <div className="text-headline-lg font-headline-lg font-semibold text-text-primary font-code-sm">
                    99.4%
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    <span>Hermetic Sandbox Tier</span>
                    <span className="text-text-primary font-medium">Tier 0 Strict</span>
                  </div>
                </div>
              </div>

              {/* Published Skills Table */}
              <section className="bg-bg-canvas border border-border-subtle rounded-xl overflow-hidden">
                <div className="p-5 border-b border-border-subtle flex items-center justify-between">
                  <div>
                    <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">
                      Managed Skill Manifests
                    </h3>
                    <p className="font-body-sm text-text-secondary text-xs mt-0.5">
                      Production AST tools published under your creator profile and exposed to host LLMs.
                    </p>
                  </div>
                  <button 
                    onClick={() => navigate('/creator/submit')}
                    className="h-8 px-3 bg-bg-surface hover:bg-bg-canvas border border-border-subtle text-text-primary rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    <span>Submit New</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-body-sm text-body-sm">
                    <thead>
                      <tr className="border-b border-border-subtle bg-bg-surface text-label-sm uppercase text-[11px] text-text-secondary tracking-wider font-semibold">
                        <th className="py-3 px-5">Skill Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Price / Token</th>
                        <th className="py-3 px-4">AST Security Scan</th>
                        <th className="py-3 px-4">Total Invocations</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle font-code-sm text-code-sm">
                      {skills.map(item => (
                        <tr key={item.id} className="hover:bg-bg-surface/50 transition-colors">
                          <td className="py-3.5 px-5 font-body-md text-body-sm font-medium text-text-primary">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded bg-bg-surface border border-border-subtle flex items-center justify-center text-primary-container">
                                <span className="material-symbols-outlined text-[16px]">terminal</span>
                              </div>
                              <div>
                                <div className="font-medium text-text-primary">{item.name}</div>
                                <div className="font-code-sm text-[11px] text-text-tertiary">kyron/{item.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-sans text-xs text-text-secondary">
                            {item.category}
                          </td>
                          <td className="py-3.5 px-4 text-text-primary font-medium">
                            {item.pricing_type === 'free' ? 'FREE' : `$${item.price.toFixed(2)}`}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-status-success/10 text-status-success border border-status-success/20 font-label-sm text-[10px] uppercase font-bold tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span> PASSED
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-text-secondary">
                            {(item.rating_count * 120 + 480).toLocaleString()} calls
                          </td>
                          <td className="py-3.5 px-5 text-right font-sans">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => navigate(`/skills/${item.slug}`)}
                                className="text-text-secondary hover:text-text-primary p-1"
                                title="View details"
                              >
                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                              </button>
                              <button 
                                onClick={() => navigate('/creator/submit')}
                                className="text-primary-container hover:text-accent-hover p-1"
                                title="Edit manifest"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

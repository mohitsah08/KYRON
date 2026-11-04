import React, { useEffect, useState } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { SideNav } from '../components/SideNav.tsx';
import { api } from '../utils/api.ts';
import { DashboardData } from '../types.ts';

interface TelemetryEvent {
  id: string;
  timestamp: string;
  skillName: string;
  command?: string;
  status: string;
  latency: string;
  tokens: string;
  payload?: any;
}

export function DashboardPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayload, setSelectedPayload] = useState<TelemetryEvent | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getDashboard()
      .then(res => {
        if (mounted && res) {
          setData(res);
        }
      })
      .catch(err => {
        console.error('Failed to load dashboard data:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeSkillsCount = data?.metrics?.active_skills?.count ?? 0;
  const monthlyCalls = data?.metrics?.monthly_calls?.total ?? 0;
  const monthlyTokens = data?.metrics?.monthly_calls?.tokens ?? 0;
  const growthPercent = data?.metrics?.monthly_calls?.growth_percent;
  const latencyDisplay = data?.metrics?.average_latency?.display ?? '--';
  const sampleCount = data?.metrics?.average_latency?.sample_count ?? 0;
  const healthStatus = data?.metrics?.system_health?.status ?? 'Workspace ready';
  const healthDetails = data?.metrics?.system_health?.details ?? 'Runtime ready for execution';
  const frequentlyInvoked = data?.frequently_invoked_skills || [];
  const recentActivity = data?.recent_activity || [];

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      {/* Runtime Status Banner */}
      <div className="bg-bg-surface border-b border-border-subtle px-space-lg py-1.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between text-xs font-code-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
            <span className="text-text-secondary">Gateway Runtime:</span>
            <span className="text-text-primary font-medium">KYRON Agent Skill Gateway</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-text-tertiary">
            <span>MCP Protocol: 2024-11-05</span>
            <span className="text-status-success font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
              Gateway Operational
            </span>
          </div>
        </div>
      </div>

      {/* Main Shell */}
      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-[1440px] mx-auto">
        <SideNav activeTab="overview" />

        {/* Content Canvas */}
        <main className="flex-1 min-w-0 bg-bg-canvas px-6 md:px-10 py-8 overflow-y-auto">
          <div className="max-w-[1080px] mx-auto flex flex-col gap-8">
            
            {/* Header & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-code-sm text-code-sm text-primary-container font-medium">// WORKSPACE DASHBOARD</span>
                  <span className="text-text-tertiary text-xs">•</span>
                  <span className="font-code-sm text-[11px] text-text-secondary">KYRON RUNTIME</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">Your Workspace</h1>
                <p className="font-body-md text-body-md text-text-secondary mt-1">
                  Active skills, connected MCP tools, and personal execution telemetry for {user?.display_name || user?.username || 'Authenticated Node'}.
                </p>
              </div>

              {/* Quick Action Pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button 
                  onClick={() => navigate('/mcp')}
                  className="inline-flex items-center gap-2 px-3.5 h-9 rounded bg-primary-container hover:bg-accent-hover text-on-primary font-body-md font-medium text-body-sm transition-colors active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[16px]">add_link</span>
                  <span>Connect MCP Server</span>
                </button>
                <button 
                  onClick={() => navigate('/skills')}
                  className="inline-flex items-center gap-2 px-3.5 h-9 rounded bg-bg-canvas border border-border-subtle hover:border-border-strong hover:bg-bg-surface text-text-primary font-body-md text-body-sm transition-colors active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[16px]">storefront</span>
                  <span>Browse Marketplace</span>
                </button>
                <button 
                  onClick={() => navigate('/library')}
                  className="inline-flex items-center gap-2 px-3 h-9 rounded bg-bg-canvas border border-border-subtle hover:border-border-strong hover:bg-bg-surface text-text-primary font-body-md text-body-sm transition-colors active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[16px]">folder_special</span>
                  <span>My Library & Keys</span>
                </button>
              </div>
            </div>

            {/* Metric KPI Cards: 4 Column Quiet Luxury Bento */}
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Active Skills */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-3">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">Active Skills</span>
                    <span className="material-symbols-outlined text-text-tertiary">bolt</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-headline-lg text-headline-lg font-semibold text-text-primary font-code-sm">
                        {loading ? '...' : activeSkillsCount}
                      </span>
                      <span className="font-code-sm text-body-sm text-text-tertiary">
                        {activeSkillsCount === 1 ? 'skill active' : 'skills active'}
                      </span>
                    </div>
                    <div className="font-code-sm text-xs text-text-secondary mt-1">
                      {activeSkillsCount === 0 ? 'No skills in workspace' : 'Ready for execution'}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    <span>Capacity entitlement</span>
                    <span className="text-text-primary font-medium">Standard (Unrestricted)</span>
                  </div>
                </div>

                {/* Metric 2: Monthly Calls */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-3">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">Monthly Calls</span>
                    <span className="material-symbols-outlined text-text-tertiary">repeat</span>
                  </div>
                  <div>
                    <div className="font-headline-lg text-headline-lg font-semibold text-text-primary font-code-sm tracking-tight">
                      {loading ? '...' : monthlyCalls.toLocaleString()}
                    </div>
                    <div className="font-code-sm text-body-sm text-text-secondary mt-1">
                      {monthlyTokens > 0 ? `${monthlyTokens.toLocaleString()} tokens processed` : '0 tokens processed'}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    {growthPercent !== null && growthPercent !== undefined ? (
                      <span className={`flex items-center gap-1 ${growthPercent >= 0 ? 'text-primary-container' : 'text-text-tertiary'}`}>
                        <span className="material-symbols-outlined text-[13px]">{growthPercent >= 0 ? 'trending_up' : 'trending_down'}</span>
                        {growthPercent >= 0 ? `+${growthPercent}%` : `${growthPercent}%`} vs prev
                      </span>
                    ) : (
                      <span className="text-text-tertiary">Current cycle (UTC)</span>
                    )}
                    <span className="text-text-tertiary">Personal usage</span>
                  </div>
                </div>

                {/* Metric 3: Average Latency */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-3">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">Average Latency</span>
                    <span className="material-symbols-outlined text-text-tertiary">timer</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-headline-lg text-headline-lg font-semibold text-text-primary font-code-sm">
                        {loading ? '...' : latencyDisplay}
                      </span>
                    </div>
                    <div className="font-code-sm text-body-sm text-text-secondary mt-1">
                      {sampleCount > 0 ? 'p95 recorded runtime' : 'No execution data yet'}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    {sampleCount > 0 ? (
                      <>
                        <span className="text-status-success font-medium">Recorded</span>
                        <span className="text-text-tertiary">{sampleCount} sample{sampleCount === 1 ? '' : 's'}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-text-tertiary">Awaiting calls</span>
                        <span className="text-text-tertiary">--</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Metric 4: System Health */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-3">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">System Health</span>
                    <span className="material-symbols-outlined text-status-success">check_circle</span>
                  </div>
                  <div>
                    <div className="font-headline-lg text-headline-lg font-semibold text-text-primary font-code-sm">
                      {loading ? '...' : healthStatus}
                    </div>
                    <div className="font-code-sm text-body-sm text-text-secondary mt-1 truncate">
                      {healthDetails}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
                      <span>MCP Gateway</span>
                    </span>
                    <span className="text-text-tertiary">Operational</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 1: Frequently Invoked Skills */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-headline-md text-headline-md font-semibold text-text-primary">Frequently Invoked Skills</h2>
                  {frequentlyInvoked.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-code-sm">
                      {frequentlyInvoked.length} in workspace
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => navigate('/skills')}
                  className="font-body-md text-body-sm text-text-secondary hover:text-text-primary flex items-center gap-1 group transition-colors"
                >
                  <span>Explore marketplace</span>
                  <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">chevron_right</span>
                </button>
              </div>

              {/* Cards Grid or Clean Empty State */}
              {loading ? (
                <div className="p-12 text-center text-text-tertiary font-code-sm border border-border-subtle rounded-xl bg-bg-surface/30">
                  Loading workspace skills...
                </div>
              ) : frequentlyInvoked.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {frequentlyInvoked.map(skill => (
                    <div key={skill.id} className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all duration-150 flex flex-col justify-between group">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded bg-accent-tint border border-primary-container/20 flex items-center justify-center text-primary-container">
                              <span className="material-symbols-outlined text-[16px]">terminal</span>
                            </div>
                            <div>
                              <span className="font-code-sm text-code-sm text-text-primary font-medium">{skill.creator_username || 'creator'}/{skill.slug}</span>
                              <div className="font-code-sm text-[10px] text-text-tertiary">v{skill.current_version || '1.0'} • {skill.pricing_type}</div>
                            </div>
                          </div>
                          {skill.invocation_count !== undefined && skill.invocation_count > 0 ? (
                            <span className="px-1.5 py-0.5 bg-accent-tint text-primary-container border border-primary-container/20 rounded font-code-sm text-[11px] font-medium">
                              {skill.invocation_count} run{skill.invocation_count === 1 ? '' : 's'}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-bg-surface text-text-tertiary border border-border-subtle rounded font-code-sm text-[11px]">
                              Installed
                            </span>
                          )}
                        </div>
                        <h3 className="font-headline-md text-body-lg font-semibold text-text-primary mb-1">{skill.name}</h3>
                        <p className="font-body-sm text-body-sm text-text-secondary mb-4 line-clamp-2">
                          {skill.summary}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-[11px] capitalize">
                            {(skill.category || 'tools').replace(/-/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                        <div>
                          <span className="font-code-sm text-code-sm text-text-primary font-medium">
                            {Number(skill.price) === 0 ? 'FREE' : `$${Number(skill.price).toFixed(2)}`}
                          </span>
                        </div>
                        <button 
                          onClick={() => navigate(`/skills/${skill.slug}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-canvas border border-border-subtle hover:border-text-primary hover:bg-bg-surface text-text-primary font-body-md text-body-sm transition-colors active:scale-[0.99]"
                        >
                          <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                          <span>Launch</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Honest Empty State for New Users */
                <div className="border border-border-subtle border-dashed rounded-xl p-8 md:p-12 text-center bg-bg-surface/30 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center text-text-tertiary mb-3">
                    <span className="material-symbols-outlined text-[24px]">terminal</span>
                  </div>
                  <h3 className="font-headline-md text-body-lg font-semibold text-text-primary">No workspace skills yet</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-1.5 max-w-md">
                    Acquire autonomous skills from the marketplace or author your own playbooks in Creator Studio to run workflows here.
                  </p>
                  <div className="flex items-center gap-3 mt-5">
                    <button 
                      onClick={() => navigate('/skills')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary-container hover:bg-accent-hover text-on-primary font-body-md text-body-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">storefront</span>
                      <span>Browse Marketplace</span>
                    </button>
                    <button 
                      onClick={() => navigate('/creator-studio')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded bg-bg-canvas border border-border-subtle hover:border-text-primary hover:bg-bg-surface text-text-primary font-body-md text-body-sm transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_box</span>
                      <span>Create New Skill</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Section 2: Recent Autonomous Activity */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-md text-headline-md font-semibold text-text-primary">Recent Autonomous Activity</h2>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">Execution telemetry across your connected MCP runtime instances</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 font-code-sm text-[11px] text-text-secondary bg-bg-surface px-2.5 py-1 rounded border border-border-subtle">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span> Telemetry Stream
                  </span>
                </div>
              </div>

              {/* Event Stream Table Card */}
              <div className="border border-border-subtle rounded-xl overflow-hidden bg-bg-canvas">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-subtle bg-bg-surface font-label-sm text-[11px] uppercase tracking-wider text-text-secondary">
                        <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                        <th className="py-2.5 px-4 font-semibold">Skill Entity</th>
                        <th className="py-2.5 px-4 font-semibold">Status</th>
                        <th className="py-2.5 px-4 font-semibold">Execution Latency</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Tokens Consumed</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle font-code-sm text-code-sm">
                      {recentActivity.length > 0 ? (
                        recentActivity.map(evt => (
                          <tr key={evt.id} className="hover:bg-bg-surface/60 transition-colors">
                            <td className="py-3 px-4 text-text-tertiary">
                              {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="py-3 px-4 font-body-md text-body-sm font-medium text-text-primary">
                              <div className="flex items-center gap-2 font-code-sm text-code-sm">
                                <span className="material-symbols-outlined text-primary-container text-[16px]">terminal</span>
                                <span>{evt.skillName}</span>
                                {evt.command && <span className="text-text-tertiary font-normal truncate max-w-[180px]">{evt.command}</span>}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-[10px] uppercase font-bold tracking-wider ${
                                evt.status === 'COMPLETED'
                                  ? 'bg-status-success/10 text-status-success border border-status-success/20'
                                  : 'bg-status-error/10 text-status-error border border-status-error/20'
                              }`}>
                                {evt.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-text-secondary">{evt.latency}</td>
                            <td className="py-3 px-4 text-right font-medium text-text-primary">{evt.tokens}</td>
                            <td className="py-3 px-4 text-right">
                              {evt.payload && Object.keys(evt.payload).length > 0 ? (
                                <button 
                                  onClick={() => setSelectedPayload(evt)}
                                  className="text-text-secondary hover:text-text-primary font-body-sm text-[12px] underline decoration-border-subtle underline-offset-4"
                                >
                                  Payload
                                </button>
                              ) : (
                                <span className="text-text-tertiary text-xs">--</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-10 px-4 text-center text-text-tertiary">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-[20px]">history</span>
                              <span>No autonomous activity recorded yet.</span>
                              <span className="text-xs text-text-tertiary">Run skill playbooks or execute workflows to stream execution telemetry.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="py-2.5 px-4 bg-bg-surface border-t border-border-subtle flex items-center justify-between font-code-sm text-xs text-text-secondary">
                  <span>
                    {recentActivity.length > 0 
                      ? `Showing last ${recentActivity.length} event${recentActivity.length === 1 ? '' : 's'}`
                      : '0 events recorded'}
                  </span>
                  <button 
                    onClick={() => navigate('/mcp')}
                    className="text-text-primary hover:text-primary-container transition-colors flex items-center gap-1"
                  >
                    <span>MCP Runtime Console</span>
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Payload Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-canvas border border-border-strong rounded-xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">terminal</span>
                <span className="font-headline-md font-semibold text-text-primary">{selectedPayload.skillName} Payload</span>
              </div>
              <button 
                onClick={() => setSelectedPayload(null)}
                className="text-text-tertiary hover:text-text-primary p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-3 font-code-sm text-xs">
              {selectedPayload.command && (
                <div className="p-3 bg-bg-surface border border-border-subtle rounded-lg space-y-1">
                  <span className="text-text-tertiary uppercase text-[10px] block">Command Executed</span>
                  <code className="text-text-primary font-medium">{selectedPayload.command}</code>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-bg-surface border border-border-subtle rounded-lg">
                  <span className="text-text-tertiary text-[10px] block">Latency</span>
                  <span className="text-text-primary font-medium">{selectedPayload.latency}</span>
                </div>
                <div className="p-2.5 bg-bg-surface border border-border-subtle rounded-lg">
                  <span className="text-text-tertiary text-[10px] block">Tokens Consumed</span>
                  <span className="text-text-primary font-medium">{selectedPayload.tokens}</span>
                </div>
              </div>

              <div className="p-3 bg-inverse-surface text-inverse-on-surface rounded-lg space-y-1 max-h-60 overflow-y-auto">
                <span className="text-text-tertiary uppercase text-[10px] block">Return Payload Buffer</span>
                <pre className="text-white/90 text-[11px] leading-relaxed whitespace-pre-wrap font-mono">
                  {typeof selectedPayload.payload === 'string' 
                    ? selectedPayload.payload 
                    : JSON.stringify(selectedPayload.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

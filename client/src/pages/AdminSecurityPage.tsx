import React, { useState } from 'react';
import { SideNav } from '../components/SideNav.tsx';
import { SecuritySubmission } from '../types.ts';

export function AdminSecurityPage() {
  const [selectedId, setSelectedId] = useState<string>('sub_1');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<SecuritySubmission[]>([
    {
      id: 'sub_1',
      skill_name: 'QuantumRAG Engine',
      version: 'v1.2.0-beta',
      creator: '@axiom_labs',
      submitted_at: '2 hrs ago',
      ast_status: 'Passed',
      review_status: 'Pending',
      summary: 'Quantum-inspired probabilistic vector state retrieval engine for ultra-dense context windows.',
      nodes_scanned: 1248,
      network_egress: 'Hermetic / No external sockets',
      reproducibility: '100% Deterministic WASM'
    },
    {
      id: 'sub_2',
      skill_name: 'AutoSolidity Auditor',
      version: 'v0.9.4',
      creator: '@vuln_hunter',
      submitted_at: '5 hrs ago',
      ast_status: 'Flagged',
      review_status: 'In Review',
      summary: 'Smart contract vulnerability scanner using symbolic execution.',
      nodes_scanned: 4890,
      network_egress: 'Warning: Unverified socket connection detected on port 9021',
      reproducibility: 'Non-deterministic RPC calls'
    },
    {
      id: 'sub_3',
      skill_name: 'PromptMorph Transformer',
      version: 'v2.0.1',
      creator: '@prompt_craft',
      submitted_at: '1 day ago',
      ast_status: 'Passed',
      review_status: 'Pending',
      summary: 'Dynamic semantic prompt rewriting layer optimized for Claude 3.5 Sonnet agent tool calling.',
      nodes_scanned: 312,
      network_egress: 'Hermetic / stdio pipe only',
      reproducibility: '100% Deterministic'
    }
  ]);

  const activeSubmission = submissions.find(s => s.id === selectedId) || submissions[0];

  const handleApprove = () => {
    setSubmissions(submissions.map(s => s.id === activeSubmission.id ? { ...s, review_status: 'Approved' } : s));
    setActionNotice(`Approved "${activeSubmission.skill_name}". Published to Kyron Registry.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleFlag = () => {
    setSubmissions(submissions.map(s => s.id === activeSubmission.id ? { ...s, review_status: 'In Review', ast_status: 'Flagged' } : s));
    setActionNotice(`Flagged "${activeSubmission.skill_name}" for deep decompilation audit.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleReject = () => {
    setSubmissions(submissions.filter(s => s.id !== activeSubmission.id));
    setActionNotice(`Rejected "${activeSubmission.skill_name}". Submitter notified.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-[1440px] mx-auto">
        <SideNav activeTab="admin" />

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          {/* Header */}
          <header className="bg-bg-canvas border-b border-border-subtle px-6 md:px-10 py-6 sticky top-0 z-30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-label-sm font-label-sm uppercase tracking-wider text-primary-container font-semibold">Moderation Workspace</span>
                  <span className="text-text-tertiary">/</span>
                  <span className="text-label-sm font-label-sm text-text-secondary">Queue Dispatch</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg font-semibold tracking-tight text-text-primary">
                  Trust, Safety & Review Console
                </h1>
                <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                  Moderate published skills, inspect automated AST static analysis results, and review compliance flags.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button 
                  onClick={() => alert('Refreshing queue stream from AST scanner daemon...')}
                  className="px-3 py-2 bg-bg-canvas border border-border-subtle rounded text-body-md font-body-md text-text-primary hover:bg-bg-surface hover:border-border-strong transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                  <span>Refresh Stream</span>
                </button>
                <button 
                  onClick={() => alert('Batch verification: Approved all passed submissions in queue.')}
                  className="px-3.5 py-2 bg-primary-container text-white rounded text-body-md font-medium hover:bg-accent-hover transition-colors flex items-center gap-2 active:scale-[0.99] shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>Batch Verify (2)</span>
                </button>
              </div>
            </div>
          </header>

          {/* Action Notice */}
          {actionNotice && (
            <div className="mx-6 md:mx-10 mt-6 p-4 rounded-xl bg-accent-tint border border-primary-container/30 text-primary-container text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Operational Area */}
          <main className="p-6 md:p-10 flex flex-col gap-8 flex-1 overflow-y-auto">
            
            {/* Metric KPI Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-bg-canvas border border-border-subtle p-5 rounded-xl hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between text-text-secondary mb-2">
                  <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Submissions in Queue</span>
                  <span className="material-symbols-outlined text-[18px] text-primary-container">pending_actions</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl font-semibold text-text-primary font-code-sm">
                    {submissions.length}
                  </span>
                  <span className="text-label-md font-label-md text-text-secondary">pending manual review</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-label-sm font-label-sm text-primary font-medium">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span>Oldest unmoderated: 5h 12m</span>
                </div>
              </div>

              <div className="bg-bg-canvas border border-border-subtle p-5 rounded-xl hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between text-text-secondary mb-2">
                  <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Automated Scans Passed</span>
                  <span className="material-symbols-outlined text-[18px] text-status-success">verified</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl font-semibold text-text-primary font-code-sm">98.4%</span>
                  <span className="text-label-md font-label-md text-status-success">+0.3%</span>
                </div>
                <div className="mt-3 text-label-sm font-label-sm text-text-secondary">
                  AST & Sandbox tests (342 runs today)
                </div>
              </div>

              <div className="bg-bg-canvas border border-border-subtle p-5 rounded-xl hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between text-text-secondary mb-2">
                  <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Open Security Flag</span>
                  <span className="material-symbols-outlined text-[18px] text-status-error">gpp_bad</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl font-semibold text-status-error font-code-sm">1</span>
                  <span className="text-label-md font-label-md text-text-secondary">flagged for audit</span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-label-sm font-label-sm text-status-error">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-error"></span>
                  <span>AutoSolidity Auditor (Egress leak)</span>
                </div>
              </div>

              <div className="bg-bg-canvas border border-border-subtle p-5 rounded-xl hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between text-text-secondary mb-2">
                  <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Active Policy Version</span>
                  <span className="material-symbols-outlined text-[18px] text-text-secondary">verified_user</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl font-semibold text-text-primary font-code-sm">v2.4</span>
                  <span className="text-label-sm font-label-sm text-text-secondary">Enforced</span>
                </div>
                <div className="mt-3 font-code-sm text-xs text-text-tertiary truncate">
                  Kyron Trust Spec v2.4 (SHA-256: d8a9f)
                </div>
              </div>
            </section>

            {/* Split View: Queue & Inspector */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* Queue Table (7 cols) */}
              <div className="xl:col-span-7 bg-bg-canvas border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-xs">
                <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-bg-surface/50">
                  <div className="flex items-center gap-3">
                    <span className="font-headline-md text-body-lg font-medium text-text-primary">Submissions Queue</span>
                    <span className="px-2 py-0.5 text-label-sm font-label-sm rounded bg-border-subtle text-text-secondary">
                      {submissions.length} Records
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-body-sm">
                    <thead>
                      <tr className="border-b border-border-subtle text-label-sm font-label-sm text-text-secondary uppercase tracking-wider bg-bg-surface/30 font-semibold">
                        <th className="py-3 px-4">Skill Unit</th>
                        <th className="py-3 px-4">Creator</th>
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4">AST Scan</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {submissions.map(sub => {
                        const isSelected = sub.id === activeSubmission.id;
                        return (
                          <tr 
                            key={sub.id}
                            onClick={() => setSelectedId(sub.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-accent-tint/40 border-l-4 border-l-primary-container' 
                                : 'hover:bg-bg-surface'
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-bg-surface border border-border-subtle flex items-center justify-center font-code-sm font-semibold text-text-primary shrink-0">
                                  {sub.skill_name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-text-primary truncate">{sub.skill_name}</div>
                                  <span className="font-code-sm text-xs text-text-tertiary">{sub.version}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-code-sm text-text-secondary">{sub.creator}</td>
                            <td className="py-3.5 px-4 text-text-secondary text-xs">{sub.submitted_at}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-sm font-label-sm border ${
                                sub.ast_status === 'Passed' 
                                  ? 'bg-[#ECFDF5] text-status-success border-[#A7F3D0]' 
                                  : 'bg-error-container text-status-error border-error'
                              }`}>
                                <span className="material-symbols-outlined text-[13px]">
                                  {sub.ast_status === 'Passed' ? 'check_circle' : 'warning'}
                                </span>
                                {sub.ast_status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-accent-tint text-primary font-medium border border-outline-variant">
                                {sub.review_status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 border-t border-border-subtle bg-bg-surface/30 flex items-center justify-between text-label-sm font-label-sm text-text-secondary">
                  <span>Showing {submissions.length} submissions requiring clearance</span>
                  <span className="text-text-tertiary">Sort: FIFO</span>
                </div>
              </div>

              {/* Inspector Panel (5 cols) */}
              <div className="xl:col-span-5 flex flex-col gap-5">
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-6 shadow-xs space-y-6">
                  
                  {/* Header */}
                  <div className="flex items-start justify-between pb-4 border-b border-border-subtle">
                    <div>
                      <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">
                        {activeSubmission.skill_name}
                      </h3>
                      <p className="font-code-sm text-xs text-text-secondary mt-0.5">
                        {activeSubmission.version} • Submitter: <span className="text-text-primary font-medium">{activeSubmission.creator}</span>
                      </p>
                    </div>
                    <span className="text-code-sm font-code-sm px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary">
                      {activeSubmission.review_status}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-body-sm text-text-secondary leading-relaxed">
                    {activeSubmission.summary}
                  </p>

                  {/* AST Scan Checklist */}
                  <div className="space-y-3 pt-2">
                    <span className="text-label-sm font-label-sm uppercase tracking-wider text-text-secondary font-semibold block">
                      AST Security & Sandboxing Report
                    </span>

                    <div className="p-3 bg-bg-surface border border-border-subtle rounded-lg space-y-2 text-xs font-code-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">AST Nodes Scanned:</span>
                        <span className="text-text-primary font-medium">{activeSubmission.nodes_scanned.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">Network Egress:</span>
                        <span className={activeSubmission.network_egress.includes('Warning') ? 'text-status-error font-medium' : 'text-status-success font-medium'}>
                          {activeSubmission.network_egress}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">Reproducibility:</span>
                        <span className="text-text-primary font-medium">{activeSubmission.reproducibility}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-border-subtle">
                    <button 
                      onClick={handleApprove}
                      className="w-full h-10 bg-primary-container hover:bg-accent-hover text-white rounded-lg text-body-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Approve & Publish to Registry</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={handleFlag}
                        className="h-9 px-3 bg-bg-surface hover:bg-bg-canvas border border-border-subtle text-text-primary rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px] text-amber-500">flag</span>
                        <span>Flag for Audit</span>
                      </button>
                      <button 
                        onClick={handleReject}
                        className="h-9 px-3 bg-bg-surface hover:bg-bg-canvas border border-border-subtle text-status-error rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">block</span>
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </main>
        </div>
      </div>
    </div>
  );
}

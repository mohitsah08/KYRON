import React, { useState, useEffect } from 'react';
import { SideNav } from '../components/SideNav.tsx';
import { api } from '../utils/api.ts';

export function AdminSecurityPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminSubmissions();
      setSubmissions(res.submissions || []);
      if (res.submissions?.length > 0 && !selectedId) {
        setSelectedId(res.submissions[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load admin queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const activeSubmission = submissions.find(s => s.id === selectedId) || submissions[0] || null;

  const handleApprove = async () => {
    if (!activeSubmission) return;
    try {
      setProcessing(true);
      await api.reviewSubmission(activeSubmission.id, 'approve', feedbackInput || 'Verified compliant with KYRON packaging standards.');
      setActionNotice(`Approved "${activeSubmission.skill_name}". Status updated to Approved.`);
      setFeedbackInput('');
      await loadQueue();
    } catch (err: any) {
      setActionNotice(`Failed: ${err.message}`);
    } finally {
      setProcessing(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleReject = async () => {
    if (!activeSubmission) return;
    try {
      setProcessing(true);
      await api.reviewSubmission(activeSubmission.id, 'reject', feedbackInput || 'Submission does not meet quality or safety standards.');
      setActionNotice(`Rejected "${activeSubmission.skill_name}". Creator notified.`);
      setFeedbackInput('');
      await loadQueue();
    } catch (err: any) {
      setActionNotice(`Failed: ${err.message}`);
    } finally {
      setProcessing(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
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
                  Moderate published skills, inspect automated static security analysis results, and review compliance flags.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button 
                  onClick={loadQueue}
                  disabled={loading}
                  className="px-3 py-2 bg-bg-canvas border border-border-subtle rounded text-body-md font-body-md text-text-primary hover:bg-bg-surface hover:border-border-strong transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                  <span>{loading ? 'Refreshing...' : 'Refresh Stream'}</span>
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
                  Static Security & Sandbox tests (342 runs today)
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
            {submissions.length === 0 ? (
              <div className="bg-bg-canvas border border-border-subtle rounded-2xl p-12 text-center max-w-xl mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border-subtle flex items-center justify-center mx-auto mb-4 text-primary">
                  <span className="material-symbols-outlined text-[32px]">checklist</span>
                </div>
                <h3 className="font-headline-md text-text-primary text-xl font-semibold mb-2">Review Queue Is Empty</h3>
                <p className="text-body-sm text-text-secondary leading-relaxed mb-6">
                  There are no creator skill packages awaiting administrative review or security clearance at this time.
                </p>
                <button
                  onClick={loadQueue}
                  className="px-4 py-2 bg-primary-container hover:bg-accent-hover text-white rounded-lg text-body-sm font-medium transition-all"
                >
                  Refresh Queue
                </button>
              </div>
            ) : (
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
                          <th className="py-3 px-4">Validation</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {submissions.map(sub => {
                          const isSelected = activeSubmission && sub.id === activeSubmission.id;
                          const isValid = sub.validation_report?.valid !== false;
                          const creatorDisplay = sub.creator_name || sub.creator_username || sub.creator_email || 'Unknown';
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
                                    {(sub.skill_name || 'SK').substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-text-primary truncate">{sub.skill_name}</div>
                                    <span className="font-code-sm text-xs text-text-tertiary">{sub.category || 'Agent Skill'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-code-sm text-text-secondary truncate max-w-[120px]">{creatorDisplay}</td>
                              <td className="py-3.5 px-4 text-text-secondary text-xs">{new Date(sub.submitted_at).toLocaleDateString()}</td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-sm font-label-sm border ${
                                  isValid 
                                    ? 'bg-[#ECFDF5] text-status-success border-[#A7F3D0]' 
                                    : 'bg-error-container text-status-error border-error'
                                }`}>
                                  <span className="material-symbols-outlined text-[13px]">
                                    {isValid ? 'check_circle' : 'warning'}
                                  </span>
                                  {isValid ? 'Passed' : 'Issues'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-label-sm font-label-sm font-medium border ${
                                  sub.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : sub.status === 'rejected'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-accent-tint text-primary border-outline-variant'
                                }`}>
                                  {sub.status.toUpperCase()}
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
                  {activeSubmission ? (
                    <div className="bg-bg-canvas border border-border-subtle rounded-xl p-6 shadow-xs space-y-6">
                      
                      {/* Header */}
                      <div className="flex items-start justify-between pb-4 border-b border-border-subtle">
                        <div>
                          <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">
                            {activeSubmission.skill_name}
                          </h3>
                          <p className="font-code-sm text-xs text-text-secondary mt-0.5">
                            Category: <span className="text-text-primary font-medium">{activeSubmission.category || 'General'}</span> • Creator: <span className="text-text-primary font-medium">{activeSubmission.creator_name || activeSubmission.creator_username || activeSubmission.creator_email}</span>
                          </p>
                        </div>
                        <span className="text-code-sm font-code-sm px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary">
                          {activeSubmission.pricing_type === 'paid' ? `$${activeSubmission.price}` : 'Free'}
                        </span>
                      </div>

                      {/* Security & Validation Report */}
                      <div className="space-y-3 pt-1">
                        <span className="text-label-sm font-label-sm uppercase tracking-wider text-text-secondary font-semibold block">
                          Automated Integrity & Static Scan
                        </span>

                        <div className="p-3 bg-bg-surface border border-border-subtle rounded-lg space-y-2 text-xs font-code-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Validation Status:</span>
                            <span className={activeSubmission.validation_report?.valid !== false ? 'text-status-success font-medium' : 'text-status-error font-medium'}>
                              {activeSubmission.validation_report?.valid !== false ? 'Passed Structure Checks' : 'Failed Checks'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Report Errors:</span>
                            <span className="text-text-primary font-medium">{activeSubmission.validation_report?.errors?.length || 0} blocking</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Report Warnings:</span>
                            <span className="text-text-primary font-medium">{activeSubmission.validation_report?.warnings?.length || 0} notices</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary">Files Manifested:</span>
                            <span className="text-text-primary font-medium">{activeSubmission.validation_report?.fileCount || 1} file(s)</span>
                          </div>
                        </div>
                      </div>

                      {/* Reviewer Feedback Input */}
                      <div className="space-y-2">
                        <label className="text-label-sm font-label-sm uppercase tracking-wider text-text-secondary font-semibold block">
                          Reviewer Feedback & Decision Notes
                        </label>
                        <textarea
                          rows={3}
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          placeholder="Provide constructive feedback for the creator explaining approval conditions or required changes..."
                          className="w-full text-xs font-body-sm p-3 bg-bg-surface border border-border-subtle rounded-lg focus:outline-none focus:border-primary-container text-text-primary"
                        />
                      </div>

                      {/* Actions */}
                      <div className="space-y-2 pt-2 border-t border-border-subtle">
                        <button 
                          onClick={handleApprove}
                          disabled={processing}
                          className="w-full h-10 bg-primary-container hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-body-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[18px]">verified</span>
                          <span>{processing ? 'Processing...' : 'Approve & Clear for Publishing'}</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => setFeedbackInput('Please enhance SKILL.md documentation and ensure complete parameter specifications before resubmitting.')}
                            disabled={processing}
                            className="h-9 px-3 bg-bg-surface hover:bg-bg-canvas border border-border-subtle text-text-primary rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px] text-amber-500">edit_note</span>
                            <span>Request Revisions</span>
                          </button>
                          <button 
                            onClick={handleReject}
                            disabled={processing}
                            className="h-9 px-3 bg-bg-surface hover:bg-bg-canvas border border-border-subtle text-status-error rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">block</span>
                            <span>Reject Submission</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="bg-bg-canvas border border-border-subtle rounded-xl p-8 text-center text-text-secondary text-sm">
                      Select a submission from the queue to view its security analysis and package inspection details.
                    </div>
                  )}
                </div>

              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}

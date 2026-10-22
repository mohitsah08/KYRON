import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { SideNav } from '../components/SideNav.tsx';
import { ProjectMilestone, ProjectDeliverable } from '../types.ts';

export function ProjectDetailPage() {
  const { navigate, path } = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'deliverables' | 'logs'>('overview');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const [milestones, setMilestones] = useState<ProjectMilestone[]>([
    {
      id: 'm1',
      title: 'Lexical Grammar Specification & AST Grammar Rules',
      status: 'Completed',
      due_date: 'Nov 08, 2025',
      agent: 'OctoCode Architect',
      description: 'Formalized tree-sitter BNF grammar bindings for Python 3.12 syntax tree normalization.'
    },
    {
      id: 'm2',
      title: 'Circular Cycle Elimination in Lexical Scopes',
      status: 'Completed',
      due_date: 'Nov 14, 2025',
      agent: 'OctoCode Architect',
      description: 'Replaced cyclical parent pointer graphs with weak arena-allocated handles. Zero memory leak.'
    },
    {
      id: 'm3',
      title: 'High-Throughput 100k LOC Monorepo Benchmark',
      status: 'In Progress',
      due_date: 'Nov 20, 2025',
      agent: 'OctoCode Architect',
      description: 'Autonomous stress test verifying 482 kLOC/s traversal throughput under simulated memory load.'
    },
    {
      id: 'm4',
      title: 'WASM Runtime Sandbox Packaging & Verification',
      status: 'Pending',
      due_date: 'Nov 28, 2025',
      agent: 'Sentinel Security Auditor',
      description: 'Final hermetic sandboxing pass ensuring zero unauthorized filesystem access beyond virtual mount.'
    }
  ]);

  const [deliverables] = useState<ProjectDeliverable[]>([
    {
      id: 'd1',
      filename: 'ast_walker_arena.rs',
      size: '28.4 KB',
      hash: 'sha256:8f9a24c...b91',
      status: 'Verified',
      created_at: '2 hours ago'
    },
    {
      id: 'd2',
      filename: 'grammar_spec_v2.json',
      size: '142.1 KB',
      hash: 'sha256:3a18e02...41a',
      status: 'Verified',
      created_at: 'Yesterday'
    },
    {
      id: 'd3',
      filename: 'benchmark_telemetry_run_8904.csv',
      size: '1.2 MB',
      hash: 'sha256:7c9921b...802',
      status: 'In Progress',
      created_at: 'Nov 18, 2025'
    }
  ]);

  const copyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-[1440px] mx-auto">
        <SideNav activeTab="projects" />

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          
          {/* Top Breadcrumb Header */}
          <header className="sticky top-0 z-30 bg-bg-canvas border-b border-border-subtle h-14 flex items-center justify-between px-6 lg:px-10">
            <div className="flex items-center gap-2 font-code-sm text-code-sm text-text-secondary">
              <button onClick={() => navigate('/projects')} className="hover:text-text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">folder_copy</span>
                <span>Projects</span>
              </button>
              <span className="text-border-strong">/</span>
              <span className="text-text-primary font-medium truncate max-w-[200px] sm:max-w-xs">Autonomous AST Migration Engine</span>
              <span className="text-border-strong">/</span>
              <span className="text-primary-container bg-accent-tint px-2 py-0.5 rounded border border-primary-container/20 font-medium">Overview</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-bg-surface border border-border-subtle rounded-lg text-code-sm font-code-sm text-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
                <span>MCP SYNCHRONIZED</span>
              </span>
            </div>
          </header>

          {/* Project Context Header */}
          <section className="border-b border-border-subtle bg-bg-canvas px-6 lg:px-10 pt-8 pb-6">
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight">
                      Autonomous AST Migration Engine
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-label-md font-label-md bg-accent-tint text-primary-container border border-primary-container/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                      In Progress
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-label-md font-label-md bg-bg-surface text-text-secondary border border-border-subtle">
                      Priority: High
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-code-sm font-code-sm bg-bg-surface text-text-secondary border border-border-subtle">
                      RUN-ID // #8904-X
                    </span>
                  </div>
                  <p className="text-body-sm font-body-sm text-text-secondary max-w-3xl">
                    Deterministic syntactic compiler bridge transforming legacy dynamically-typed Python runtimes to type-safe Rust abstractions via autonomous continuous validation loops.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => navigate('/chat')}
                    className="h-9 px-4 bg-primary-container hover:bg-accent-hover text-white rounded-lg text-body-sm font-medium flex items-center gap-2 transition-all active:scale-[0.99] shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    <span>Launch Agent Runner</span>
                  </button>
                </div>
              </div>

              {/* Metadata Ribbon */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-border-subtle">
                <div>
                  <div className="text-label-sm font-label-sm text-text-secondary uppercase">Owner</div>
                  <div className="text-body-sm text-text-primary font-medium mt-0.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-text-tertiary">corporate_fare</span>
                    Axiom Labs
                  </div>
                </div>
                <div>
                  <div className="text-label-sm font-label-sm text-text-secondary uppercase">Project Lead</div>
                  <div className="text-body-sm text-text-primary font-medium mt-0.5">Alex Rivera</div>
                </div>
                <div>
                  <div className="text-label-sm font-label-sm text-text-secondary uppercase">Active Team</div>
                  <div className="text-body-sm text-text-primary font-medium mt-0.5">
                    5 Members <span className="text-primary-container font-code-sm text-xs">(2 Agents)</span>
                  </div>
                </div>
                <div>
                  <div className="text-label-sm font-label-sm text-text-secondary uppercase">Start Date</div>
                  <div className="text-body-sm font-code-sm text-text-primary font-medium mt-0.5">Nov 01, 2025</div>
                </div>
                <div>
                  <div className="text-label-sm font-label-sm text-text-secondary uppercase">Target Date</div>
                  <div className="text-body-sm font-code-sm text-primary font-medium mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-primary-container">schedule</span>
                    Nov 28, 2025
                  </div>
                </div>
                <div>
                  <div className="text-label-sm font-label-sm text-text-secondary uppercase">Compute Budget</div>
                  <div className="text-body-sm font-code-sm text-text-primary font-medium mt-0.5">
                    $12,400 <span className="text-text-secondary">/ $18,000</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sub-Nav Bar */}
          <div className="border-b border-border-subtle bg-bg-canvas px-6 lg:px-10 sticky top-14 z-20">
            <div className="flex items-center gap-8 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`py-3 text-body-sm font-headline-md font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                  activeTab === 'overview' ? 'text-text-primary border-b-2 border-primary-container' : 'text-text-secondary hover:text-text-primary border-b-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] text-primary-container">flag</span>
                <span>Overview & Milestones</span>
              </button>
              <button 
                onClick={() => setActiveTab('deliverables')}
                className={`py-3 text-body-sm font-body-md flex items-center gap-2 whitespace-nowrap transition-colors ${
                  activeTab === 'deliverables' ? 'text-text-primary border-b-2 border-primary-container' : 'text-text-secondary hover:text-text-primary border-b-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                <span>Files & Deliverables ({deliverables.length})</span>
              </button>
              <button 
                onClick={() => navigate('/chat')}
                className="py-3 text-body-sm font-body-md text-text-secondary hover:text-text-primary flex items-center gap-2 whitespace-nowrap transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">monitor_heart</span>
                <span>Live Agent Runner</span>
                <span className="inline-block w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
              </button>
            </div>
          </div>

          {/* Main 2-Column Body */}
          <main className="flex-1 px-6 lg:px-10 py-8 bg-bg-surface/30">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column (8 cols) */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Objective Specification Card */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-6 shadow-xs">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-container text-[20px]">architecture</span>
                      <h2 className="text-headline-md font-headline-md text-text-primary">Project Objective & Specification</h2>
                    </div>
                    <span className="font-code-sm text-code-sm text-text-tertiary">SPEC REV 2.4.0</span>
                  </div>

                  <p className="text-body-md text-text-secondary leading-relaxed">
                    Build a hermetically isolated transpiler and migration validator that ingests dynamic Python abstract syntax trees and emits memory-safe, non-leaking Rust 2024 modules. The execution harness runs autonomous verification checks using tree-sitter AST queries and static lifetime assertions.
                  </p>
                </div>

                {/* Milestones Timeline */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-container text-[20px]">timeline</span>
                      <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">Milestones Schedule</h3>
                    </div>
                    <span className="text-code-sm text-xs text-text-tertiary">2 / 4 Complete</span>
                  </div>

                  <div className="space-y-4">
                    {milestones.map((m, idx) => (
                      <div key={m.id} className="p-4 bg-bg-surface border border-border-subtle rounded-xl flex items-start gap-4">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                          m.status === 'Completed' ? 'bg-status-success text-white' :
                          m.status === 'In Progress' ? 'bg-primary-container text-white' : 'bg-bg-canvas border border-border-subtle text-text-tertiary'
                        }`}>
                          {m.status === 'Completed' ? '✓' : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h4 className="font-headline-md font-semibold text-text-primary text-body-md">{m.title}</h4>
                            <span className={`px-2 py-0.5 rounded text-label-sm font-label-sm border ${
                              m.status === 'Completed' ? 'bg-status-success/10 text-status-success border-status-success/20' :
                              m.status === 'In Progress' ? 'bg-accent-tint text-primary-container border-primary-container/20' : 'bg-bg-canvas text-text-tertiary border-border-subtle'
                            }`}>
                              {m.status}
                            </span>
                          </div>
                          <p className="text-body-sm text-text-secondary mt-1">{m.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs font-code-sm text-text-tertiary">
                            <span>Assigned: <strong className="text-text-primary font-medium">{m.agent}</strong></span>
                            <span>•</span>
                            <span>Target: {m.due_date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deliverables Table */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl overflow-hidden shadow-xs">
                  <div className="p-5 border-b border-border-subtle flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-container">inventory_2</span>
                      <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">
                        Deliverables & Artifacts
                      </h3>
                    </div>
                    <span className="text-xs font-code-sm text-text-secondary">{deliverables.length} files tracked</span>
                  </div>

                  <table className="w-full text-left border-collapse text-body-sm">
                    <thead>
                      <tr className="border-b border-border-subtle bg-bg-surface text-label-sm text-text-secondary uppercase text-[11px] font-semibold">
                        <th className="py-2.5 px-4">Artifact</th>
                        <th className="py-2.5 px-4">Size</th>
                        <th className="py-2.5 px-4">SHA-256 Checksum</th>
                        <th className="py-2.5 px-4">Verification</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle font-code-sm text-code-sm">
                      {deliverables.map(d => (
                        <tr key={d.id} className="hover:bg-bg-surface/50 transition-colors">
                          <td className="py-3 px-4 font-body-md text-text-primary font-medium">{d.filename}</td>
                          <td className="py-3 px-4 text-text-secondary">{d.size}</td>
                          <td className="py-3 px-4 text-text-tertiary">
                            <button 
                              onClick={() => copyHash(d.hash, d.id)}
                              className="hover:text-text-primary flex items-center gap-1"
                              title="Copy SHA-256"
                            >
                              <span>{d.hash}</span>
                              <span className="material-symbols-outlined text-[13px]">
                                {copiedHash === d.id ? 'check' : 'content_copy'}
                              </span>
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-status-success font-medium">● {d.status}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button 
                              onClick={() => alert(`Downloading artifact ${d.filename}`)}
                              className="text-text-primary hover:text-primary-container underline underline-offset-4 text-xs font-sans"
                            >
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Right Column (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Assigned Agents */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <span className="font-headline-md font-semibold text-text-primary text-body-sm">Assigned Swarm Agents</span>
                    <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-bg-surface border border-border-subtle rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-accent-tint border border-primary-container/20 flex items-center justify-center text-primary-container">
                          <span className="material-symbols-outlined text-[16px]">terminal</span>
                        </div>
                        <div>
                          <div className="font-headline-md font-medium text-text-primary text-body-sm">OctoCode Architect</div>
                          <div className="font-code-sm text-[11px] text-text-tertiary">v2.4.1 • latency 68ms</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-code-sm text-status-success bg-status-success/10 px-1.5 py-0.5 rounded">ACTIVE</span>
                    </div>

                    <div className="p-3 bg-bg-surface border border-border-subtle rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-bg-canvas border border-border-subtle flex items-center justify-center text-text-primary">
                          <span className="material-symbols-outlined text-[16px]">shield</span>
                        </div>
                        <div>
                          <div className="font-headline-md font-medium text-text-primary text-body-sm">Sentinel Security</div>
                          <div className="font-code-sm text-[11px] text-text-tertiary">v3.0.4 • latency 45ms</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-code-sm text-text-secondary bg-bg-canvas px-1.5 py-0.5 rounded border border-border-subtle">IDLE</span>
                    </div>
                  </div>
                </div>

                {/* Runbook Actions */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 shadow-xs space-y-3">
                  <span className="text-label-sm font-label-sm uppercase text-text-secondary font-semibold block mb-2">
                    Autonomous Runbook Actions
                  </span>

                  <button 
                    onClick={() => navigate('/chat')}
                    className="w-full h-9 px-3 bg-bg-canvas border border-border-subtle hover:border-text-primary hover:bg-bg-surface text-text-primary text-body-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary-container">play_arrow</span>
                    <span>Trigger AST Validation Loop</span>
                  </button>

                  <button 
                    onClick={() => alert('Generating Milestone Report PDF...')}
                    className="w-full h-9 px-3 bg-bg-canvas border border-border-subtle hover:border-text-primary hover:bg-bg-surface text-text-primary text-body-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    <span>Generate Milestone Report</span>
                  </button>

                  <button 
                    onClick={() => alert('Checkpoint snapshot created and committed to Git telemetry.')}
                    className="w-full h-9 px-3 bg-bg-canvas border border-border-subtle hover:border-text-primary hover:bg-bg-surface text-text-primary text-body-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Archive Checkpoint Snapshot</span>
                  </button>
                </div>

              </div>

            </div>
          </main>

        </div>
      </div>
    </div>
  );
}

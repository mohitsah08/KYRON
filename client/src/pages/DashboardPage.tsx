import React, { useEffect, useState } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { SideNav } from '../components/SideNav.tsx';
import { api } from '../utils/api.ts';
import { Skill } from '../types.ts';

interface TelemetryEvent {
  id: string;
  timestamp: string;
  skillName: string;
  icon: string;
  invokeId: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  latency: string;
  tokens: string;
  payload: {
    command?: string;
    model?: string;
    output?: string;
    astNodes?: number;
  };
}

export function DashboardPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedPayload, setSelectedPayload] = useState<TelemetryEvent | null>(null);

  // Default live telemetry data matching reference design
  const [telemetry] = useState<TelemetryEvent[]>([
    {
      id: '1',
      timestamp: '14:28:02.108',
      skillName: 'OctoCode Architect',
      icon: 'terminal',
      invokeId: '#invk-9831',
      status: 'COMPLETED',
      latency: '120ms',
      tokens: '4,120 tok',
      payload: {
        command: 'octocode.ast_refactor --strategy=weak_handle_arena',
        model: 'kyron-neural-core-v4',
        output: 'Successfully purged 4 cyclical graph pointers in ast_walker_arena.rs. Heap footprint down 94.2%.',
        astNodes: 14208
      }
    },
    {
      id: '2',
      timestamp: '14:27:44.890',
      skillName: 'SchemaForge',
      icon: 'schema',
      invokeId: '#invk-9830',
      status: 'COMPLETED',
      latency: '88ms',
      tokens: '1,890 tok',
      payload: {
        command: 'schemaforge.introspect --format=vector_sql',
        model: 'postgres-introspect-0.9',
        output: 'Generated zero-loss migration plan for table "audit_logs" with HNSW vector embedding partition.',
        astNodes: 482
      }
    },
    {
      id: '3',
      timestamp: '14:26:11.312',
      skillName: 'VectorData Pipeline',
      icon: 'hub',
      invokeId: '#invk-9829',
      status: 'COMPLETED',
      latency: '142ms',
      tokens: '18,400 tok',
      payload: {
        command: 'vectordata.chunk_and_index --dimension=1536',
        model: 'embedding-partitioner-v2',
        output: 'Ingested and indexed 380 document fragments into local ephemeral RAM-disk buffer.',
        astNodes: 2840
      }
    },
    {
      id: '4',
      timestamp: '14:25:09.004',
      skillName: 'OctoCode Architect',
      icon: 'terminal',
      invokeId: '#invk-9828',
      status: 'COMPLETED',
      latency: '95ms',
      tokens: '3,200 tok',
      payload: {
        command: 'octocode.lint_architecture --strict',
        model: 'kyron-neural-core-v4',
        output: 'Lint pass completed: 0 violations, 0 circular imports detected across 68 files.',
        astNodes: 8912
      }
    },
    {
      id: '5',
      timestamp: '14:22:50.518',
      skillName: 'SubGraph Dispatcher',
      icon: 'alt_route',
      invokeId: '#invk-9827',
      status: 'COMPLETED',
      latency: '74ms',
      tokens: '940 tok',
      payload: {
        command: 'dispatcher.route_rpc --target=eu-west-infra-1',
        model: 'mcp-mesh-router',
        output: 'RPC payload routed through low-latency local socket bridge on port 8421.',
        astNodes: 120
      }
    }
  ]);

  useEffect(() => {
    api.getSkills().then(res => {
      if (res && res.skills) {
        setSkills(res.skills.slice(0, 3));
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      {/* Prototype Banner */}
      <div className="bg-bg-surface border-b border-border-subtle px-space-lg py-1.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between text-xs font-code-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
            <span className="text-text-secondary">Connected Runtime:</span>
            <span className="text-text-primary font-medium">Kyron Testnet Protocol v2.4</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-text-tertiary">
            <span>Region: eu-west-infra-1</span>
            <span>Mesh Latency: 12ms</span>
            <span className="text-status-success font-medium">● Daemon: Port 8421</span>
          </div>
        </div>
      </div>

      {/* Main Shell: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-[1440px] mx-auto">
        <SideNav activeTab="overview" />

        {/* Content Canvas */}
        <main className="flex-1 min-w-0 bg-bg-canvas px-6 md:px-10 py-8 overflow-y-auto">
          <div className="max-w-[1080px] mx-auto flex flex-col gap-8">
            
            {/* Header & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-code-sm text-code-sm text-primary-container font-medium">// RUNTIME DISPATCH</span>
                  <span className="text-text-tertiary text-xs">•</span>
                  <span className="font-code-sm text-[11px] text-text-secondary">KYRON PROTOCOL v2.4</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">Your Workspace</h1>
                <p className="font-body-md text-body-md text-text-secondary mt-1">
                  Active autonomous skills, connected MCP runtimes, and execution quotas for {user?.display_name || 'Enterprise Node'}.
                </p>
              </div>

              {/* Quick Action Pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button 
                  onClick={() => navigate('/mcp')}
                  className="inline-flex items-center gap-2 px-3.5 h-9 rounded bg-primary-container hover:bg-accent-hover text-on-primary font-body-md font-medium text-body-sm transition-colors active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
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
                  <span className="material-symbols-outlined text-[16px]">key</span>
                  <span>API Keys & Library</span>
                </button>
              </div>
            </div>

            {/* Metric KPI Cards: 4 Column Quiet Luxury Bento */}
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1 */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-3">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">Active Skills</span>
                    <span className="material-symbols-outlined text-text-tertiary">bolt</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-headline-lg text-headline-lg font-semibold text-text-primary font-code-sm">6</span>
                      <span className="font-code-sm text-body-md text-text-tertiary">/ 20 slots</span>
                    </div>
                    <div className="w-full bg-bg-surface h-1.5 rounded-full mt-3 overflow-hidden border border-border-subtle">
                      <div className="bg-primary-container h-full w-[30%]"></div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    <span>Concurrency load</span>
                    <span className="text-status-success font-medium">Nominal</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-3">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">Monthly Calls</span>
                    <span className="material-symbols-outlined text-text-tertiary">repeat</span>
                  </div>
                  <div>
                    <div className="font-headline-lg text-headline-lg font-semibold text-text-primary font-code-sm tracking-tight">142,890</div>
                    <div className="font-code-sm text-body-sm text-text-secondary mt-1">tokens / req processed</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    <span className="flex items-center gap-1 text-primary-container">
                      <span className="material-symbols-outlined text-[13px]">trending_up</span> +14.2%
                    </span>
                    <span className="text-text-tertiary">vs previous cycle</span>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-3">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">Average Latency</span>
                    <span className="material-symbols-outlined text-text-tertiary">timer</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-headline-lg text-headline-lg font-semibold text-text-primary font-code-sm">84</span>
                      <span className="font-code-sm text-headline-md font-medium text-text-secondary">ms</span>
                    </div>
                    <div className="font-code-sm text-body-sm text-text-secondary mt-1">p95 global edge compute</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    <span className="text-status-success font-medium">Optimal threshold</span>
                    <span className="text-text-tertiary">&lt; 120ms target</span>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-secondary mb-3">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">System Health</span>
                    <span className="material-symbols-outlined text-status-success">check_circle</span>
                  </div>
                  <div>
                    <div className="font-headline-lg text-headline-lg font-semibold text-text-primary font-code-sm">99.98%</div>
                    <div className="font-code-sm text-body-sm text-status-success mt-1">All runtimes operational</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between font-code-sm text-[11px] text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
                      <span>4 MCP nodes sync</span>
                    </span>
                    <span className="text-text-tertiary">0 degradations</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 1: Frequently Invoked Skills */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-headline-md text-headline-md font-semibold text-text-primary">Frequently Invoked Skills</h2>
                  <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-code-sm">3 pinned</span>
                </div>
                <button 
                  onClick={() => navigate('/skills')}
                  className="font-body-md text-body-sm text-text-secondary hover:text-text-primary flex items-center gap-1 group transition-colors"
                >
                  <span>View full catalog</span>
                  <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">chevron_right</span>
                </button>
              </div>

              {/* Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Skill 1: OctoCode Architect */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all duration-150 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-accent-tint border border-primary-container/20 flex items-center justify-center text-primary-container">
                          <span className="material-symbols-outlined text-[16px]">terminal</span>
                        </div>
                        <div>
                          <span className="font-code-sm text-code-sm text-text-primary font-medium">kyron/octocode</span>
                          <div className="font-code-sm text-[10px] text-text-tertiary">v3.2.1 • core</div>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-accent-tint text-primary-container border border-primary-container/20 rounded font-code-sm text-[11px] font-medium">
                        68ms
                      </span>
                    </div>
                    <h3 className="font-headline-md text-body-lg font-semibold text-text-primary mb-1">OctoCode Architect</h3>
                    <p className="font-body-sm text-body-sm text-text-secondary mb-4 line-clamp-2">
                      Autonomous AST refactoring, structural migration synthesis, and continuous architecture linting.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-[11px]">Rust/Go</span>
                      <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-[11px]">Static-Analysis</span>
                      <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-[11px]">AST-Gen</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                    <div>
                      <span className="font-code-sm text-code-sm text-text-primary font-medium">0.0024</span>
                      <span className="font-code-sm text-[10px] text-text-tertiary"> KYR / call</span>
                    </div>
                    <button 
                      onClick={() => navigate('/chat')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-canvas border border-border-subtle hover:border-text-primary hover:bg-bg-surface text-text-primary font-body-md text-body-sm transition-colors active:scale-[0.99]"
                    >
                      <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                      <span>Open Terminal / Run</span>
                    </button>
                  </div>
                </div>

                {/* Skill 2: SchemaForge */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all duration-150 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-bg-surface border border-border-subtle flex items-center justify-center text-text-primary">
                          <span className="material-symbols-outlined text-[16px]">schema</span>
                        </div>
                        <div>
                          <span className="font-code-sm text-code-sm text-text-primary font-medium">kyron/schemaforge</span>
                          <div className="font-code-sm text-[10px] text-text-tertiary">v1.9.0 • verified</div>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-bg-surface text-text-secondary border border-border-subtle rounded font-code-sm text-[11px]">
                        92ms
                      </span>
                    </div>
                    <h3 className="font-headline-md text-body-lg font-semibold text-text-primary mb-1">SchemaForge</h3>
                    <p className="font-body-sm text-body-sm text-text-secondary mb-4 line-clamp-2">
                      Declarative zero-loss database schema transformations, PostgreSQL vector indexing, and migrations.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-[11px]">Postgres</span>
                      <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-[11px]">Vector</span>
                      <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-[11px]">Prisma</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                    <div>
                      <span className="font-code-sm text-code-sm text-text-primary font-medium">0.0018</span>
                      <span className="font-code-sm text-[10px] text-text-tertiary"> KYR / call</span>
                    </div>
                    <button 
                      onClick={() => navigate('/chat')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-canvas border border-border-subtle hover:border-text-primary hover:bg-bg-surface text-text-primary font-body-md text-body-sm transition-colors active:scale-[0.99]"
                    >
                      <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                      <span>Open Terminal / Run</span>
                    </button>
                  </div>
                </div>

                {/* Skill 3: VectorData Pipeline */}
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all duration-150 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-bg-surface border border-border-subtle flex items-center justify-center text-text-primary">
                          <span className="material-symbols-outlined text-[16px]">hub</span>
                        </div>
                        <div>
                          <span className="font-code-sm text-code-sm text-text-primary font-medium">kyron/vectordata</span>
                          <div className="font-code-sm text-[10px] text-text-tertiary">v2.1.0 • enterprise</div>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-bg-surface text-text-secondary border border-border-subtle rounded font-code-sm text-[11px]">
                        114ms
                      </span>
                    </div>
                    <h3 className="font-headline-md text-body-lg font-semibold text-text-primary mb-1">VectorData Pipeline</h3>
                    <p className="font-body-sm text-body-sm text-text-secondary mb-4 line-clamp-2">
                      High-throughput embeddings partitioner with deterministic chunking, semantic hashing, and streaming ingest.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-[11px]">Embeddings</span>
                      <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-[11px]">HNSW</span>
                      <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary font-code-sm text-[11px]">ETL</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                    <div>
                      <span className="font-code-sm text-code-sm text-text-primary font-medium">0.0032</span>
                      <span className="font-code-sm text-[10px] text-text-tertiary"> KYR / call</span>
                    </div>
                    <button 
                      onClick={() => navigate('/chat')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-canvas border border-border-subtle hover:border-text-primary hover:bg-bg-surface text-text-primary font-body-md text-body-sm transition-colors active:scale-[0.99]"
                    >
                      <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                      <span>Open Terminal / Run</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Recent Autonomous Activity */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-md text-headline-md font-semibold text-text-primary">Recent Autonomous Activity</h2>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">Real-time telemetric execution stream across assigned MCP instances</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 font-code-sm text-[11px] text-text-secondary bg-bg-surface px-2.5 py-1 rounded border border-border-subtle">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span> Live Stream
                  </span>
                </div>
              </div>

              {/* Event Stream Clean Table Card */}
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
                      {telemetry.map(evt => (
                        <tr key={evt.id} className="hover:bg-bg-surface/60 transition-colors">
                          <td className="py-3 px-4 text-text-tertiary">{evt.timestamp}</td>
                          <td className="py-3 px-4 font-body-md text-body-sm font-medium text-text-primary">
                            <div className="flex items-center gap-2 font-code-sm text-code-sm">
                              <span className="material-symbols-outlined text-primary-container text-[16px]">{evt.icon}</span>
                              <span>{evt.skillName}</span>
                              <span className="text-text-tertiary font-normal">{evt.invokeId}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-status-success/10 text-status-success border border-status-success/20 font-label-sm text-[10px] uppercase font-bold tracking-wider">
                              {evt.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-text-secondary">{evt.latency}</td>
                          <td className="py-3 px-4 text-right font-medium text-text-primary">{evt.tokens}</td>
                          <td className="py-3 px-4 text-right">
                            <button 
                              onClick={() => setSelectedPayload(evt)}
                              className="text-text-secondary hover:text-text-primary font-body-sm text-[12px] underline decoration-border-subtle underline-offset-4"
                            >
                              Payload
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="py-2.5 px-4 bg-bg-surface border-t border-border-subtle flex items-center justify-between font-code-sm text-xs text-text-secondary">
                  <span>Showing last 5 events from 142,890 total</span>
                  <button 
                    onClick={() => navigate('/projects')}
                    className="text-text-primary hover:text-primary-container transition-colors flex items-center gap-1"
                  >
                    <span>View Full Telemetry Log</span>
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
                <span className="material-symbols-outlined text-primary-container text-[20px]">{selectedPayload.icon}</span>
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
              <div className="p-3 bg-bg-surface border border-border-subtle rounded-lg space-y-1">
                <span className="text-text-tertiary uppercase text-[10px] block">Command Executed</span>
                <code className="text-text-primary font-medium">{selectedPayload.payload.command}</code>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-bg-surface border border-border-subtle rounded-lg">
                  <span className="text-text-tertiary text-[10px] block">Model Provider</span>
                  <span className="text-text-primary font-medium">{selectedPayload.payload.model}</span>
                </div>
                <div className="p-2.5 bg-bg-surface border border-border-subtle rounded-lg">
                  <span className="text-text-tertiary text-[10px] block">AST Nodes Processed</span>
                  <span className="text-text-primary font-medium">{selectedPayload.payload.astNodes?.toLocaleString()} nodes</span>
                </div>
              </div>

              <div className="p-3 bg-inverse-surface text-inverse-on-surface rounded-lg space-y-1">
                <span className="text-text-tertiary uppercase text-[10px] block">Return Buffer</span>
                <p className="text-white/90 leading-relaxed">{selectedPayload.payload.output}</p>
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

import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { SideNav } from '../components/SideNav.tsx';
import { Project } from '../types.ts';

export function ProjectsPage() {
  const { navigate } = useRouter();
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'review' | 'completed'>('all');
  const [newProjectModal, setNewProjectModal] = useState(false);

  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'ast-migration-engine',
      title: 'Autonomous AST Migration Engine',
      status: 'In Progress',
      priority: 'High',
      run_id: '#8904-X',
      description: 'Deterministic syntactic compiler bridge transforming legacy dynamically-typed Python runtimes to type-safe Rust abstractions.',
      owner: 'Axiom Labs',
      lead: 'Alex Rivera',
      team_count: 5,
      agent_count: 2,
      start_date: 'Nov 01, 2025',
      target_date: 'Nov 28, 2025',
      budget_spent: 12400,
      budget_total: 18000,
      milestones_completed: 4,
      milestones_total: 6
    },
    {
      id: 'hnsw-vector-partitioner',
      title: 'HNSW Vector Partitioning Service',
      status: 'In Progress',
      priority: 'Critical',
      run_id: '#8903-V',
      description: 'High-throughput hierarchical navigable small world indexing pipeline for 1536-dimensional semantic embeddings.',
      owner: 'Axiom Labs',
      lead: 'Elena Rostova',
      team_count: 4,
      agent_count: 3,
      start_date: 'Oct 15, 2025',
      target_date: 'Nov 20, 2025',
      budget_spent: 9800,
      budget_total: 14000,
      milestones_completed: 3,
      milestones_total: 5
    },
    {
      id: 'edgar-sec-synthesizer',
      title: 'EDGAR SEC Financial Synthesizer',
      status: 'Review Required',
      priority: 'Normal',
      run_id: '#8902-S',
      description: 'Automated 10-K and 10-Q XBRL balance sheet reconciliation pipeline with deterministic mathematical audit trails.',
      owner: 'Axiom Labs',
      lead: 'David Chen',
      team_count: 3,
      agent_count: 1,
      start_date: 'Nov 04, 2025',
      target_date: 'Dec 02, 2025',
      budget_spent: 4200,
      budget_total: 8000,
      milestones_completed: 2,
      milestones_total: 4
    },
    {
      id: 'browserbase-stealth-crawler',
      title: 'Browserbase Headless Crawler',
      status: 'In Progress',
      priority: 'High',
      run_id: '#8901-B',
      description: 'Stealth headless Chromium cluster running distributed web navigation sessions with session state checkpointing.',
      owner: 'Browserbase Org',
      lead: 'Sarah Lin',
      team_count: 4,
      agent_count: 2,
      start_date: 'Oct 28, 2025',
      target_date: 'Nov 25, 2025',
      budget_spent: 6700,
      budget_total: 10000,
      milestones_completed: 3,
      milestones_total: 4
    },
    {
      id: 'zero-trust-telemetry-audit',
      title: 'Zero-Trust Telemetry Audit Sentinel',
      status: 'Completed',
      priority: 'Normal',
      run_id: '#8899-Z',
      description: 'Hermetic sandbox security scanner analyzing outbound process sockets and verifying mTLS peer certs across 24 nodes.',
      owner: 'SecOps Core',
      lead: 'Marcus Vance',
      team_count: 2,
      agent_count: 2,
      start_date: 'Oct 01, 2025',
      target_date: 'Nov 01, 2025',
      budget_spent: 5000,
      budget_total: 5000,
      milestones_completed: 4,
      milestones_total: 4
    }
  ]);

  // Modal new project form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'Normal' | 'High' | 'Critical'>('High');

  const handleCreateProject = () => {
    if (!newTitle) return;
    const p: Project = {
      id: newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: newTitle,
      status: 'In Progress',
      priority: newPriority,
      run_id: `#${Math.floor(8000 + Math.random() * 1000)}-N`,
      description: newDesc || 'Autonomous computational task initialized in workspace.',
      owner: 'Axiom Labs',
      lead: 'Alex Rivera',
      team_count: 3,
      agent_count: 1,
      start_date: 'Today',
      target_date: 'In 30 days',
      budget_spent: 0,
      budget_total: 10000,
      milestones_completed: 0,
      milestones_total: 3
    };
    setProjects([p, ...projects]);
    setNewProjectModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  const filteredProjects = projects.filter(p => {
    if (activeTab === 'active' && p.status !== 'In Progress') return false;
    if (activeTab === 'review' && p.status !== 'Review Required') return false;
    if (activeTab === 'completed' && p.status !== 'Completed') return false;
    if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
    if (filterPriority !== 'ALL' && p.priority !== filterPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.run_id.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-[1440px] mx-auto">
        <SideNav activeTab="projects" />

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          {/* Main Content Canvas */}
          <main className="w-full max-w-[1440px] mx-auto px-6 md:px-space-xl py-space-lg flex flex-col gap-6 flex-1">
            
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-space-md">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight">
                  Projects & Deliverables
                </h1>
                <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                  Manage computational tasks, autonomous agent schedules, and deliverables.
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {/* Search */}
                <div className="relative w-64">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary text-[18px]">search</span>
                  <input 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search tasks, runs, specs..."
                    className="w-full pl-8 pr-3 h-8 text-body-sm bg-bg-surface border border-border-subtle rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary"
                  />
                </div>

                {/* Filter Priority */}
                <select 
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  className="h-8 px-2.5 bg-bg-canvas border border-border-subtle rounded text-body-sm font-medium text-text-primary focus:outline-none focus:border-text-primary cursor-pointer"
                >
                  <option value="ALL">Priority: All</option>
                  <option value="Critical">Priority: Critical</option>
                  <option value="High">Priority: High</option>
                  <option value="Normal">Priority: Normal</option>
                </select>

                <button 
                  onClick={() => setNewProjectModal(true)}
                  className="h-8 px-3.5 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>New Project</span>
                </button>
              </div>
            </div>

            {/* KPI Metric Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-bg-canvas border border-border-subtle p-space-md rounded-lg hover:border-border-strong transition-colors relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-label-md font-label-md text-text-secondary uppercase tracking-wider">Active Projects</span>
                  <span className="material-symbols-outlined text-text-tertiary group-hover:text-primary-container transition-colors">folder_managed</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-headline-lg font-headline-lg text-text-primary">8</span>
                  <span className="text-body-sm font-body-sm text-text-secondary">In Progress</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-label-sm font-code-sm text-status-success">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  <span>+2 initialized this cycle</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-container opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              <div className="bg-bg-canvas border border-border-subtle p-space-md rounded-lg hover:border-border-strong transition-colors relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-label-md font-label-md text-text-secondary uppercase tracking-wider">Upcoming Milestones</span>
                  <span className="material-symbols-outlined text-text-tertiary group-hover:text-primary-container transition-colors">event_upcoming</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-headline-lg font-headline-lg text-text-primary">3</span>
                  <span className="text-body-sm font-body-sm text-status-warning font-medium">Due This Week</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-label-sm font-code-sm text-text-secondary">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span>Next check: Nov 20 (HNSW)</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-container opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              <div className="bg-bg-canvas border border-border-subtle p-space-md rounded-lg hover:border-border-strong transition-colors relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-label-md font-label-md text-text-secondary uppercase tracking-wider">Automated Agent Runs</span>
                  <span className="material-symbols-outlined text-text-tertiary group-hover:text-primary-container transition-colors">smart_toy</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-headline-lg font-headline-lg text-text-primary">142</span>
                  <span className="text-body-sm font-body-sm text-status-success font-medium">Completed</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-label-sm font-code-sm text-text-secondary">
                  <span className="w-2 h-2 rounded-full bg-status-success inline-block"></span>
                  <span>99.4% task synthesis accuracy</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-container opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              <div className="bg-bg-canvas border border-border-subtle p-space-md rounded-lg hover:border-border-strong transition-colors relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-label-md font-label-md text-text-secondary uppercase tracking-wider">Compute Burn</span>
                  <span className="material-symbols-outlined text-text-tertiary group-hover:text-primary-container transition-colors">memory</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-headline-lg font-headline-lg text-text-primary">74%</span>
                  <span className="text-body-sm font-body-sm text-text-secondary">Allocated</span>
                </div>
                <div className="mt-3 w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full" style={{ width: '74%' }}></div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-container opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>

            {/* Segmented View Tabs */}
            <div className="flex items-center p-0.5 bg-bg-surface border border-border-subtle rounded-lg self-start">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-body-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                  activeTab === 'all' ? 'bg-bg-canvas text-text-primary shadow-xs border border-border-subtle' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>All Projects</span>
                <span className="text-label-sm font-code-sm text-text-secondary px-1 bg-surface-container rounded">{projects.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 text-body-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                  activeTab === 'active' ? 'bg-bg-canvas text-text-primary shadow-xs border border-border-subtle' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>Active</span>
              </button>
              <button 
                onClick={() => setActiveTab('review')}
                className={`px-3 py-1.5 text-body-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                  activeTab === 'review' ? 'bg-bg-canvas text-text-primary shadow-xs border border-border-subtle' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>In Review</span>
              </button>
              <button 
                onClick={() => setActiveTab('completed')}
                className={`px-3 py-1.5 text-body-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                  activeTab === 'completed' ? 'bg-bg-canvas text-text-primary shadow-xs border border-border-subtle' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>Completed</span>
              </button>
            </div>

            {/* Project Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredProjects.map(project => {
                const percent = Math.round((project.milestones_completed / project.milestones_total) * 100);
                return (
                  <div 
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="bg-bg-canvas border border-border-subtle hover:border-border-strong rounded-xl p-6 transition-all cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-sm"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-label-sm font-label-sm border ${
                            project.status === 'In Progress' 
                              ? 'bg-accent-tint text-primary-container border-primary-container/30' 
                              : project.status === 'Review Required'
                              ? 'bg-amber-500/10 text-status-warning border-amber-500/30'
                              : 'bg-status-success/10 text-status-success border-status-success/30'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {project.status}
                          </span>
                          <span className="text-code-sm font-code-sm text-text-tertiary">
                            {project.run_id}
                          </span>
                        </div>
                        <span className="font-label-sm text-[11px] font-code-sm text-text-secondary uppercase">
                          Priority: {project.priority}
                        </span>
                      </div>

                      {/* Title & Desc */}
                      <h3 className="font-headline-md text-headline-md font-semibold text-text-primary group-hover:text-primary transition-colors mb-2">
                        {project.title}
                      </h3>
                      <p className="font-body-sm text-body-sm text-text-secondary line-clamp-2 mb-5">
                        {project.description}
                      </p>

                      {/* Milestones Progress */}
                      <div className="space-y-1.5 mb-5">
                        <div className="flex items-center justify-between text-code-sm text-xs text-text-secondary">
                          <span>Progress: {project.milestones_completed} of {project.milestones_total} Milestones</span>
                          <span className="font-medium text-text-primary">{percent}%</span>
                        </div>
                        <div className="w-full bg-bg-surface h-1.5 rounded-full overflow-hidden border border-border-subtle">
                          <div className="bg-primary-container h-full rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Rail */}
                    <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-body-sm text-text-secondary">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">Lead: <strong className="text-text-primary font-medium">{project.lead}</strong></span>
                        <span className="text-text-tertiary">•</span>
                        <span className="text-xs font-code-sm text-primary-container">{project.agent_count} Agents Active</span>
                      </div>

                      <span className="text-primary-container font-label-md flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Details</span>
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </main>
        </div>
      </div>

      {/* New Project Modal */}
      {newProjectModal && (
        <div className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-canvas border border-border-strong rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">Create Autonomous Project</h3>
              <button onClick={() => setNewProjectModal(false)} className="text-text-tertiary hover:text-text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-body-sm font-medium text-text-primary mb-1">Project Name</label>
                <input 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed Tree-Sitter Worker"
                  className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary"
                />
              </div>

              <div>
                <label className="block text-body-sm font-medium text-text-primary mb-1">Objective / Specification</label>
                <textarea 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="State the objective and autonomous validation loop criteria..."
                  className="w-full p-2.5 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary"
                />
              </div>

              <div>
                <label className="block text-body-sm font-medium text-text-primary mb-1">Priority</label>
                <select 
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary"
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setNewProjectModal(false)}
                className="px-3.5 py-2 bg-bg-surface border border-border-subtle text-text-secondary rounded text-body-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateProject}
                className="px-4 py-2 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium transition-colors"
              >
                Initialize Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

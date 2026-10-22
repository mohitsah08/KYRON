import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { SideNav } from '../components/SideNav.tsx';
import { TeamMember } from '../types.ts';

export function TeamSettingsPage() {
  const { navigate } = useRouter();
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'dev' | 'agent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Developer' | 'Autonomous Agent' | 'Viewer'>('Developer');

  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'm1',
      name: 'Alex Rivera',
      email: 'alex.rivera@axiomlabs.dev',
      role: 'Admin',
      type: 'human',
      security: 'Hardware 2FA + mTLS',
      status: 'Active',
      last_active: 'Just now'
    },
    {
      id: 'm2',
      name: 'OctoCode Architect',
      email: 'agent:kyron.octocode.01',
      role: 'Autonomous Agent',
      type: 'agent',
      security: 'Tier 0 Ephemeral Key',
      status: 'Active',
      last_active: '2 mins ago'
    },
    {
      id: 'm3',
      name: 'Elena Rostova',
      email: 'elena.r@axiomlabs.dev',
      role: 'Developer',
      type: 'human',
      security: 'Hardware 2FA',
      status: 'Active',
      last_active: '14 mins ago'
    },
    {
      id: 'm4',
      name: 'Sentinel Security Bot',
      email: 'agent:kyron.sentinel.sec',
      role: 'Autonomous Agent',
      type: 'agent',
      security: 'mTLS Strict Auth',
      status: 'Active',
      last_active: '1 hour ago'
    },
    {
      id: 'm5',
      name: 'David Chen',
      email: 'd.chen@axiomlabs.dev',
      role: 'Developer',
      type: 'human',
      security: 'Hardware 2FA',
      status: 'Active',
      last_active: 'Yesterday'
    },
    {
      id: 'm6',
      name: 'Marcus Vance',
      email: 'marcus.v@axiomlabs.dev',
      role: 'Admin',
      type: 'human',
      security: 'Hardware 2FA + mTLS',
      status: 'Active',
      last_active: '3 days ago'
    }
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newM: TeamMember = {
      id: `m_${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      type: inviteRole === 'Autonomous Agent' ? 'agent' : 'human',
      security: 'Pending Invite',
      status: 'Invited',
      last_active: 'Never'
    };

    setMembers([...members, newM]);
    setInviteModalOpen(false);
    setInviteEmail('');
  };

  const filteredMembers = members.filter(m => {
    if (roleFilter === 'admin' && m.role !== 'Admin') return false;
    if (roleFilter === 'dev' && m.role !== 'Developer') return false;
    if (roleFilter === 'agent' && m.role !== 'Autonomous Agent') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-[1440px] mx-auto">
        <SideNav activeTab="settings" />

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 md:px-margin py-8 flex flex-col gap-8">
            
            {/* Header */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-label-sm font-code-sm text-text-tertiary">
                <span>WORKSPACE</span>
                <span>/</span>
                <span>SETTINGS</span>
                <span>/</span>
                <span className="text-primary-container font-semibold">TEAM & ACCESS</span>
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border-subtle">
                <div className="flex flex-col gap-1 max-w-2xl">
                  <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight">
                    Team & Access Management
                  </h1>
                  <p className="text-body-md font-body-md text-text-secondary">
                    Manage human collaborators, autonomous agent permissions, and workspace access roles.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => alert('Audit log exported: 1,420 telemetric events saved to CSV.')}
                    className="h-9 px-4 bg-bg-canvas hover:bg-bg-surface text-text-primary border border-border-subtle hover:border-border-strong rounded-lg text-body-md font-medium flex items-center gap-2 transition-all active:scale-[0.99]"
                  >
                    <span className="material-symbols-outlined text-[18px] text-text-secondary">file_download</span>
                    <span>Export Audit Log</span>
                  </button>
                  <button 
                    onClick={() => setInviteModalOpen(true)}
                    className="h-9 px-4 bg-primary-container hover:bg-accent-hover text-white rounded-lg text-body-md font-medium flex items-center gap-2 transition-all active:scale-[0.99] shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    <span>+ Invite Member</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Metrics */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-text-secondary mb-3">
                  <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Allocated Seats</span>
                  <span className="material-symbols-outlined text-text-tertiary text-[20px]">group</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-headline-md font-headline-md text-text-primary">
                    12 <span className="text-body-md font-normal text-text-secondary">/ 20 Used</span>
                  </div>
                  <span className="font-code-sm text-label-sm text-status-success font-medium">8 Seats Available</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>

              <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-text-secondary mb-3">
                  <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Autonomous Workflows</span>
                  <span className="material-symbols-outlined text-primary-container text-[20px]">smart_toy</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-headline-md font-headline-md text-text-primary">
                    6 <span className="text-body-md font-normal text-text-secondary">Autonomous Runtimes</span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-code-sm text-label-sm text-status-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
                    All Healthy
                  </span>
                </div>
                <div className="text-body-sm font-body-sm text-text-secondary mt-3">
                  Continuous background AST code generation and auditing active
                </div>
              </div>

              <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-text-secondary mb-3">
                  <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Governance Protocol</span>
                  <span className="material-symbols-outlined text-text-tertiary text-[20px]">verified_user</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-headline-md font-headline-md text-text-primary font-medium">
                    Enterprise Zero-Trust
                  </div>
                  <span className="font-code-sm text-label-sm bg-accent-tint text-primary-container px-2 py-0.5 rounded border border-primary-container/20">
                    STRICT
                  </span>
                </div>
                <div className="text-body-sm font-body-sm text-text-secondary mt-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-status-success">check_circle</span>
                  Hardware 2FA & mTLS forced for agent runtimes
                </div>
              </div>
            </section>

            {/* Members Directory */}
            <section className="bg-bg-canvas border border-border-subtle rounded-xl overflow-hidden flex flex-col shadow-xs">
              <div className="p-4 sm:p-5 border-b border-border-subtle flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-bg-surface/50">
                <div className="relative w-full lg:w-96">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-[18px]">search</span>
                  <input 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or role..."
                    className="w-full h-9 pl-9 pr-4 bg-bg-canvas border border-border-subtle rounded-lg text-body-sm font-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 text-body-sm">
                  <span className="text-label-sm font-label-sm text-text-tertiary uppercase mr-2 font-semibold">Filter:</span>
                  <button 
                    onClick={() => setRoleFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
                      roleFilter === 'all' ? 'bg-text-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                    }`}
                  >
                    All Roles <span className="ml-1 text-label-sm font-code-sm opacity-70">{members.length}</span>
                  </button>
                  <button 
                    onClick={() => setRoleFilter('admin')}
                    className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
                      roleFilter === 'admin' ? 'bg-text-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                    }`}
                  >
                    Admins
                  </button>
                  <button 
                    onClick={() => setRoleFilter('dev')}
                    className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
                      roleFilter === 'dev' ? 'bg-text-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                    }`}
                  >
                    Developers
                  </button>
                  <button 
                    onClick={() => setRoleFilter('agent')}
                    className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
                      roleFilter === 'agent' ? 'bg-text-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                    }`}
                  >
                    Autonomous Agents
                  </button>
                </div>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-body-sm">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-surface text-label-sm font-label-sm text-text-tertiary uppercase tracking-wider font-semibold">
                      <th className="py-3 px-5">Member / Entity</th>
                      <th className="py-3 px-4">Security / Permissions</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Last Active</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle font-body-sm">
                    {filteredMembers.map(m => (
                      <tr key={m.id} className="hover:bg-bg-surface/50 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-surface-container border border-border-strong flex items-center justify-center font-code-sm text-body-sm font-semibold text-text-primary shrink-0">
                              {m.type === 'agent' ? '🤖' : m.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-text-primary font-headline-md text-body-md truncate">{m.name}</span>
                              <span className="font-code-sm text-xs text-text-tertiary truncate">{m.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-code-sm text-xs text-text-secondary">
                          {m.security}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm border ${
                            m.role === 'Admin' ? 'bg-primary-container/10 text-primary-container border-primary-container/20 font-bold' :
                            m.role === 'Autonomous Agent' ? 'bg-accent-tint text-primary border-primary-container/20' : 'bg-bg-surface text-text-secondary border-border-subtle'
                          }`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-code-sm text-xs text-text-tertiary">
                          {m.last_active}
                        </td>
                        <td className="py-4 px-5 text-right font-sans">
                          <button 
                            onClick={() => setMembers(members.filter(item => item.id !== m.id))}
                            className="text-text-tertiary hover:text-status-error text-xs"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

          </main>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleInvite} className="bg-bg-canvas border border-border-strong rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">Invite Workspace Collaborator</h3>
              <button type="button" onClick={() => setInviteModalOpen(false)} className="text-text-tertiary hover:text-text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-body-sm font-medium text-text-primary mb-1">Email or Agent Identifier</label>
                <input 
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="collaborator@enterprise.io"
                  className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary"
                />
              </div>

              <div>
                <label className="block text-body-sm font-medium text-text-primary mb-1">Workspace Role</label>
                <select 
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary"
                >
                  <option value="Developer">Developer (Execute & Deploy Skills)</option>
                  <option value="Admin">Admin (Full Cluster & Billing Access)</option>
                  <option value="Autonomous Agent">Autonomous Agent (Machine Role via mTLS)</option>
                  <option value="Viewer">Viewer (Read-Only Access)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setInviteModalOpen(false)}
                className="px-3.5 py-2 bg-bg-surface border border-border-subtle text-text-secondary rounded text-body-sm"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium transition-colors"
              >
                Send Invitation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

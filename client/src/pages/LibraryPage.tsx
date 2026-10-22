import React, { useEffect, useState } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { SideNav } from '../components/SideNav.tsx';
import { api } from '../utils/api.ts';
import { UserPurchase, ApiKeyItem } from '../types.ts';

interface InstalledSkillItem {
  id: string;
  name: string;
  slug: string;
  version: string;
  provider: string;
  avatar: string;
  status: 'ACTIVE' | 'IDLE' | 'UPDATE';
  latency: string;
  category: string;
  transport: 'stdio' | 'SSE';
  endpoint: string;
  licenseKey: string;
}

export function LibraryPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'running' | 'saved' | 'keys'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [disconnectModalSkill, setDisconnectModalSkill] = useState<InstalledSkillItem | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [daemonConfigOpen, setDaemonConfigOpen] = useState(false);
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);

  // Default provisioned skills
  const [skills, setSkills] = useState<InstalledSkillItem[]>([
    {
      id: '1',
      name: 'OctoCode Architect',
      slug: 'octocode-architect',
      version: 'v2.4.1',
      provider: '@axiom_labs',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      latency: '68ms',
      category: 'Code Intelligence',
      transport: 'stdio',
      endpoint: 'kyron://node-01/ast-transpiler',
      licenseKey: 'ky_lic_octo_998124_live_enterprise'
    },
    {
      id: '2',
      name: 'SchemaForge DB Migration',
      slug: 'schemaforge-db-migration',
      version: 'v1.9.0',
      provider: '@axiom_labs',
      avatar: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=100&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      latency: '92ms',
      category: 'Database & Migrations',
      transport: 'stdio',
      endpoint: 'kyron://node-01/schemaforge',
      licenseKey: 'ky_lic_forge_110293_live_enterprise'
    },
    {
      id: '3',
      name: 'VectorData Pipeline Engine',
      slug: 'vectordata-pipeline-engine',
      version: 'v2.1.0',
      provider: '@axiom_labs',
      avatar: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=100&auto=format&fit=crop&q=80',
      status: 'IDLE',
      latency: '114ms',
      category: 'Database & Migrations',
      transport: 'SSE',
      endpoint: 'http://127.0.0.1:8421/mcp/vectordata',
      licenseKey: 'ky_lic_vdata_882109_live_enterprise'
    },
    {
      id: '4',
      name: 'Sentinel Security Auditor',
      slug: 'sentinel-security-auditor',
      version: 'v3.0.4',
      provider: '@axiom_labs',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      latency: '45ms',
      category: 'Security & Compliance',
      transport: 'stdio',
      endpoint: 'kyron://node-01/sentinel-sec',
      licenseKey: 'ky_lic_snt_449102_live_enterprise'
    },
    {
      id: '5',
      name: 'SEC Filing Synthesis MCP',
      slug: 'sec-filing-financial-synthesis-mcp',
      version: 'v1.2.0',
      provider: '@axiom_labs',
      avatar: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=100&auto=format&fit=crop&q=80',
      status: 'UPDATE',
      latency: '180ms',
      category: 'Code Intelligence',
      transport: 'stdio',
      endpoint: 'kyron://node-01/sec-synthesis',
      licenseKey: 'ky_lic_sec_330192_live_enterprise'
    },
    {
      id: '6',
      name: 'Browserbase Headless Computer Use',
      slug: 'browserbase-headless-computer-use',
      version: 'v1.8.4',
      provider: '@axiom_labs',
      avatar: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=100&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      latency: '240ms',
      category: 'DevOps & Infra',
      transport: 'SSE',
      endpoint: 'http://127.0.0.1:8421/mcp/browserbase',
      licenseKey: 'ky_lic_bb_772019_live_enterprise'
    }
  ]);

  // Default API keys
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([
    {
      id: 'key_1',
      name: 'Production Serverless AST Worker',
      key_prefix: 'ky_live_89x204',
      created_at: '2025-10-14',
      last_used: '3 mins ago'
    },
    {
      id: 'key_2',
      name: 'Local Cursor & Claude MCP Bridge',
      key_prefix: 'ky_live_11a882',
      created_at: '2025-10-18',
      last_used: 'Just now'
    },
    {
      id: 'key_3',
      name: 'CI/CD Automated Security Auditing',
      key_prefix: 'ky_live_04f931',
      created_at: '2025-10-20',
      last_used: '2 hours ago'
    }
  ]);

  useEffect(() => {
    api.getMyLibrary().then(res => {
      if (res && res.purchases) {
        setPurchases(res.purchases);
      }
    }).catch(() => {});
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSyncAll = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
    }, 1200);
  };

  const handleDisconnect = () => {
    if (disconnectModalSkill) {
      setSkills(skills.filter(s => s.id !== disconnectModalSkill.id));
      setDisconnectModalSkill(null);
    }
  };

  // Filter logic
  const filteredSkills = skills.filter(item => {
    if (activeTab === 'running' && item.status !== 'ACTIVE') return false;
    if (activeTab === 'saved' && item.status !== 'IDLE') return false;
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      {/* Main Shell */}
      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-[1440px] mx-auto">
        <SideNav activeTab="library" />

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 bg-bg-canvas px-6 md:px-10 py-8 overflow-y-auto">
          <div className="max-w-[1120px] mx-auto flex flex-col gap-6">

            {/* Page Header */}
            <section>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-subtle pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-label-sm font-code-sm text-primary tracking-wider uppercase font-semibold">
                      KYRON NODE ENVIRONMENT
                    </span>
                    <span className="text-border-strong">/</span>
                    <span className="text-label-sm font-code-sm text-text-tertiary">MANAGED REPOSITORY</span>
                  </div>
                  <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight">My Library</h1>
                  <p className="text-body-md font-body-md text-text-secondary mt-1 max-w-2xl">
                    Manage your provisioned autonomous tools, local MCP bindings, and active execution licenses.
                  </p>
                </div>

                {/* Quick Actions / Sync Status */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleSyncAll}
                    disabled={syncing}
                    className="h-9 px-3 bg-bg-canvas border border-border-subtle rounded text-body-sm font-label-md text-text-primary flex items-center gap-2 hover:bg-bg-surface hover:border-border-strong transition-all"
                  >
                    <span className={`material-symbols-outlined text-text-secondary text-[18px] ${syncing ? 'animate-spin' : ''}`}>sync</span>
                    <span>{syncing ? 'Syncing...' : 'Sync All MCP'}</span>
                  </button>
                  <button 
                    onClick={() => setDaemonConfigOpen(true)}
                    className="h-9 px-3 bg-bg-canvas border border-border-subtle rounded text-body-sm font-label-md text-text-primary flex items-center gap-2 hover:bg-bg-surface hover:border-border-strong transition-all"
                  >
                    <span className="material-symbols-outlined text-text-secondary text-[18px]">tune</span>
                    <span>Daemon Config</span>
                  </button>
                  <button 
                    onClick={() => navigate('/mcp')}
                    className="h-9 px-3.5 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>New Binding</span>
                  </button>
                </div>
              </div>

              {/* Segmented Library View Switcher */}
              <div className="flex items-center justify-between border-b border-border-subtle mt-4 overflow-x-auto">
                <div className="flex gap-6 -mb-px">
                  <button 
                    onClick={() => setActiveTab('all')}
                    className={`pb-3 text-body-md font-headline-md font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                      activeTab === 'all' 
                        ? 'text-text-primary border-b-2 border-primary-container' 
                        : 'text-text-secondary hover:text-text-primary border-b-2 border-transparent'
                    }`}
                  >
                    <span>All Skills</span>
                    <span className="text-code-sm font-code-sm px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary">
                      {skills.length}
                    </span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('running')}
                    className={`pb-3 text-body-md font-headline-md font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                      activeTab === 'running' 
                        ? 'text-text-primary border-b-2 border-primary-container' 
                        : 'text-text-secondary hover:text-text-primary border-b-2 border-transparent'
                    }`}
                  >
                    <span>Installed & Running</span>
                    <span className="text-code-sm font-code-sm px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary">
                      {skills.filter(s => s.status === 'ACTIVE').length}
                    </span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('saved')}
                    className={`pb-3 text-body-md font-headline-md font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                      activeTab === 'saved' 
                        ? 'text-text-primary border-b-2 border-primary-container' 
                        : 'text-text-secondary hover:text-text-primary border-b-2 border-transparent'
                    }`}
                  >
                    <span>Saved for Later</span>
                    <span className="text-code-sm font-code-sm px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary">
                      {skills.filter(s => s.status === 'IDLE').length}
                    </span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('keys')}
                    className={`pb-3 text-body-md font-headline-md font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                      activeTab === 'keys' 
                        ? 'text-text-primary border-b-2 border-primary-container' 
                        : 'text-text-secondary hover:text-text-primary border-b-2 border-transparent'
                    }`}
                  >
                    <span>API Keys & Secrets</span>
                    <span className="text-code-sm font-code-sm px-1.5 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-secondary">
                      {apiKeys.length}
                    </span>
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 pb-2 text-code-sm font-code-sm text-text-tertiary">
                  <span>BINDINGS: 4 ACTIVE</span>
                  <span>•</span>
                  <span>STORAGE: 1.2 GB</span>
                </div>
              </div>
            </section>

            {/* TAB: SKILLS (All, Running, Saved) */}
            {activeTab !== 'keys' && (
              <>
                {/* Filter & Query Control Rail */}
                <section className="bg-bg-canvas border border-border-subtle rounded-xl p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  {/* Search Box */}
                  <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary text-[18px]">search</span>
                    <input 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 h-9 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary placeholder:text-text-tertiary focus:border-text-primary focus:ring-0" 
                      placeholder="Filter by skill name, version, protocol..." 
                      type="text"
                    />
                  </div>

                  {/* Dropdowns */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <select 
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="h-9 pl-3 pr-8 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary focus:border-text-primary focus:ring-0 appearance-none cursor-pointer"
                      >
                        <option value="ALL">Category: All Environments</option>
                        <option value="Code Intelligence">Code Intelligence</option>
                        <option value="Database & Migrations">Database & Migrations</option>
                        <option value="DevOps & Infra">DevOps & Infra</option>
                        <option value="Security & Compliance">Security & Compliance</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none text-[16px]">expand_more</span>
                    </div>

                    <div className="relative">
                      <select 
                        value={selectedStatus}
                        onChange={e => setSelectedStatus(e.target.value)}
                        className="h-9 pl-3 pr-8 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary focus:border-text-primary focus:ring-0 appearance-none cursor-pointer"
                      >
                        <option value="ALL">Status: All Statuses</option>
                        <option value="ACTIVE">Status: Active / Running</option>
                        <option value="IDLE">Status: Idle</option>
                        <option value="UPDATE">Status: Update Available</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none text-[16px]">expand_more</span>
                    </div>
                  </div>
                </section>

                {/* Provisioned Skills List */}
                <div className="flex flex-col gap-3">
                  {filteredSkills.map(item => (
                    <div 
                      key={item.id}
                      className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      {/* Left: Info */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <img 
                          src={item.avatar} 
                          alt={item.name} 
                          className="w-10 h-10 rounded-lg object-cover border border-border-subtle shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-headline-md font-semibold text-text-primary text-body-md truncate">
                              {item.name}
                            </h3>
                            <span className="font-code-sm text-[11px] text-text-tertiary">{item.version}</span>
                            <span className="text-text-tertiary">•</span>
                            <span className="font-code-sm text-[11px] text-text-secondary">{item.provider}</span>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-code-sm text-[11px] text-text-secondary flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                item.status === 'ACTIVE' ? 'bg-status-success animate-pulse' : 
                                item.status === 'UPDATE' ? 'bg-primary-container' : 'bg-text-tertiary'
                              }`}></span>
                              <span>{item.status}</span>
                            </span>
                            <span>•</span>
                            <span>Latency: {item.latency}</span>
                            <span>•</span>
                            <span className="text-text-tertiary">Transport: {item.transport}</span>
                            <span>•</span>
                            <code className="text-text-primary bg-bg-surface px-1.5 py-0.5 rounded border border-border-subtle">
                              {item.endpoint}
                            </code>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border-subtle">
                        <button 
                          onClick={() => copyToClipboard(`kyron install ${item.slug}`, `cli-${item.id}`)}
                          className="h-8 px-2.5 rounded bg-bg-surface border border-border-subtle hover:border-border-strong text-text-secondary hover:text-text-primary text-xs font-code-sm flex items-center gap-1 transition-colors"
                          title="Copy CLI command"
                        >
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                          <span>{copiedKey === `cli-${item.id}` ? 'Copied' : 'CLI'}</span>
                        </button>

                        <button 
                          onClick={() => navigate('/chat')}
                          className="h-8 px-3 rounded bg-bg-canvas border border-border-subtle hover:border-text-primary text-text-primary text-body-sm font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                          <span>Run</span>
                        </button>

                        <button 
                          onClick={() => navigate(`/skills/${item.slug}`)}
                          className="h-8 px-2.5 rounded bg-bg-canvas border border-border-subtle hover:bg-bg-surface text-text-secondary hover:text-text-primary text-body-sm transition-colors"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>

                        <button 
                          onClick={() => setDisconnectModalSkill(item)}
                          className="h-8 w-8 rounded bg-bg-canvas border border-border-subtle hover:border-status-error hover:text-status-error text-text-tertiary flex items-center justify-center transition-colors"
                          title="Disconnect / Remove"
                        >
                          <span className="material-symbols-outlined text-[16px]">link_off</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* TAB: API KEYS & SECRETS */}
            {activeTab === 'keys' && (
              <div className="space-y-6">
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">Kyron Node API Keys</h3>
                    <p className="font-body-sm text-text-secondary text-body-sm mt-0.5">
                      Bearer keys used to authenticate Claude Desktop, Cursor, or your local agent scripts with Kyron MCP.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      const newId = `key_${Date.now()}`;
                      setApiKeys([...apiKeys, {
                        id: newId,
                        name: 'Ephemeral Agent Key',
                        key_prefix: `ky_live_${Math.random().toString(36).substring(2, 8)}`,
                        created_at: 'Just now',
                        last_used: 'Never'
                      }]);
                    }}
                    className="h-9 px-4 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium flex items-center gap-1.5 transition-all self-start md:self-auto"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Generate New Key</span>
                  </button>
                </div>

                <div className="border border-border-subtle rounded-xl overflow-hidden bg-bg-canvas">
                  <table className="w-full text-left border-collapse font-body-sm text-body-sm">
                    <thead>
                      <tr className="border-b border-border-subtle bg-bg-surface text-label-sm uppercase text-[11px] text-text-secondary tracking-wider font-semibold">
                        <th className="py-3 px-5">Key Name & Label</th>
                        <th className="py-3 px-4">Key Value</th>
                        <th className="py-3 px-4">Created</th>
                        <th className="py-3 px-4">Last Invoked</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle font-code-sm text-code-sm">
                      {apiKeys.map(key => (
                        <tr key={key.id} className="hover:bg-bg-surface/50 transition-colors">
                          <td className="py-3.5 px-5 font-body-md text-body-sm font-medium text-text-primary">
                            {key.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-2 bg-bg-surface px-2 py-1 rounded border border-border-subtle text-text-secondary">
                              <span>{key.key_prefix}••••••••••••••••</span>
                              <button 
                                onClick={() => copyToClipboard(`${key.key_prefix}_super_secret_token_live`, key.id)}
                                className="text-text-tertiary hover:text-text-primary p-0.5"
                                title="Copy Key"
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  {copiedKey === key.id ? 'check' : 'content_copy'}
                                </span>
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-text-tertiary">{key.created_at}</td>
                          <td className="py-3.5 px-4 text-text-secondary">{key.last_used}</td>
                          <td className="py-3.5 px-5 text-right font-sans">
                            <button 
                              onClick={() => setApiKeys(apiKeys.filter(k => k.id !== key.id))}
                              className="text-status-error hover:underline text-xs"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Disconnect Dialog Modal */}
      {disconnectModalSkill && (
        <div className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-canvas border border-border-strong rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-status-warning">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">Disconnect Skill Binding?</h3>
            </div>
            <p className="font-body-md text-text-secondary text-body-sm leading-relaxed">
              Are you sure you want to decouple <strong className="text-text-primary">{disconnectModalSkill.name}</strong> from your local runtime daemon? Agents attempting to execute this tool will return connection errors.
            </p>
            <div className="p-3 bg-bg-surface border border-border-subtle rounded-lg font-code-sm text-xs text-text-secondary">
              Target Socket: <span className="text-text-primary font-medium">{disconnectModalSkill.endpoint}</span>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button 
                onClick={() => setDisconnectModalSkill(null)}
                className="px-3.5 py-2 bg-bg-canvas border border-border-subtle hover:bg-bg-surface text-text-primary rounded text-body-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDisconnect}
                className="px-4 py-2 bg-status-error hover:bg-red-700 text-white rounded text-body-sm font-medium transition-colors"
              >
                Disconnect Binding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daemon Config Modal */}
      {daemonConfigOpen && (
        <div className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-canvas border border-border-strong rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">tune</span>
                <h3 className="font-headline-md font-semibold text-text-primary">Local Daemon Settings</h3>
              </div>
              <button onClick={() => setDaemonConfigOpen(false)} className="text-text-tertiary hover:text-text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-3 font-body-sm text-body-sm">
              <div>
                <label className="block text-text-secondary font-medium mb-1">Local Port Binding</label>
                <input 
                  defaultValue="8421" 
                  className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded font-code-sm text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="block text-text-secondary font-medium mb-1">Hermetic Sandbox Mode</label>
                <select className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary">
                  <option>Tier 0 (Full Ephemeral Isolation)</option>
                  <option>Tier 1 (Read-Only FS Access)</option>
                </select>
              </div>
              <div className="p-3 bg-accent-tint/40 border border-primary-container/20 rounded-lg text-xs text-text-secondary">
                Kyron Daemon is listening for incoming stdio/SSE socket connections on <code className="text-primary-container font-code-sm">127.0.0.1:8421</code>.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setDaemonConfigOpen(false)}
                className="px-4 py-2 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium transition-colors"
              >
                Save Daemon Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

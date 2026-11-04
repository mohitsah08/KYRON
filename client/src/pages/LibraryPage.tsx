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
  const [, setPurchases] = useState<UserPurchase[]>([]);
  const [skills, setSkills] = useState<InstalledSkillItem[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Key creation state
  const [createKeyModalOpen, setCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdSecretKey, setCreatedSecretKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getMyLibrary().catch(() => ({ purchases: [] as UserPurchase[] })),
      api.getApiKeys().catch(() => ({ keys: [] as ApiKeyItem[] }))
    ]).then(([libraryRes, keysRes]) => {
      if (!mounted) return;
      if (libraryRes && libraryRes.purchases) {
        setPurchases(libraryRes.purchases);
        const mapped: InstalledSkillItem[] = libraryRes.purchases.map(p => ({
          id: p.id,
          name: p.skill_name || 'Autonomous Skill',
          slug: p.skill_slug || '',
          version: p.current_version ? `v${p.current_version}` : 'v1.0.0',
          provider: p.creator_name ? `@${p.creator_name.toLowerCase().replace(/\s+/g, '_')}` : '@creator',
          avatar: p.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
          status: 'ACTIVE',
          latency: 'Nominal',
          category: p.skill_category || 'General',
          transport: 'stdio',
          endpoint: `kyron://skills/${p.skill_slug || p.skill_id}`,
          licenseKey: p.license_key || 'KYRON-ACTIVE'
        }));
        setSkills(mapped);
      }
      if (keysRes && keysRes.keys) {
        setApiKeys(keysRes.keys);
      }
    }).finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
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
    }, 800);
  };

  const handleDisconnect = () => {
    if (disconnectModalSkill) {
      setSkills(skills.filter(s => s.id !== disconnectModalSkill.id));
      setDisconnectModalSkill(null);
    }
  };

  const handleGenerateKey = async () => {
    if (isGeneratingKey) return;
    setIsGeneratingKey(true);
    try {
      const res = await api.createApiKey(newKeyName.trim() || 'Personal Agent Key');
      if (res?.api_key) {
        setCreatedSecretKey(res.api_key.secret_key);
        setApiKeys(prev => [res.api_key, ...prev]);
        setNewKeyName('');
      }
    } catch (err: any) {
      console.error('Failed to create API key:', err);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await api.revokeApiKey(id);
      setApiKeys(prev => prev.filter(k => k.id !== id));
    } catch (err: any) {
      console.error('Failed to revoke API key:', err);
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
                    <span className="text-label-sm font-code-sm text-primary-container tracking-wider uppercase font-semibold">
                      KYRON WORKSPACE
                    </span>
                    <span className="text-border-strong">/</span>
                    <span className="text-label-sm font-code-sm text-text-tertiary">MANAGED REPOSITORY</span>
                  </div>
                  <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight">My Library</h1>
                  <p className="text-body-md font-body-md text-text-secondary mt-1 max-w-2xl">
                    Manage your provisioned autonomous tools, local MCP bindings, and active execution keys for {user?.display_name || 'your node'}.
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleSyncAll}
                    disabled={syncing}
                    className="h-9 px-3.5 bg-bg-surface border border-border-subtle hover:border-border-strong text-text-primary rounded text-body-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${syncing ? 'animate-spin' : ''}`}>
                      sync
                    </span>
                    <span>{syncing ? 'Syncing...' : 'Sync Bindings'}</span>
                  </button>
                  <button 
                    onClick={() => navigate('/mcp')}
                    className="h-9 px-3.5 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_link</span>
                    <span>Connect MCP</span>
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
                  <span>BINDINGS: {skills.length} ACTIVE</span>
                </div>
              </div>
            </section>

            {/* TAB: SKILLS (All, Running) */}
            {activeTab !== 'keys' && (
              <>
                {/* Filter & Query Control Rail */}
                <section className="bg-bg-canvas border border-border-subtle rounded-xl p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary text-[18px]">search</span>
                    <input 
                      type="text" 
                      placeholder="Search workspace skills..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 rounded bg-bg-surface border border-border-subtle text-body-sm font-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-border-strong"
                    />
                  </div>
                </section>

                {/* Skills List or Empty State */}
                <div className="space-y-3">
                  {loading ? (
                    <div className="p-12 text-center text-text-tertiary font-code-sm border border-border-subtle rounded-xl">
                      Loading your library...
                    </div>
                  ) : filteredSkills.length > 0 ? (
                    filteredSkills.map(item => (
                      <div 
                        key={item.id} 
                        className="bg-bg-canvas border border-border-subtle rounded-xl p-4 sm:p-5 hover:border-border-strong transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-bg-surface border border-border-subtle flex items-center justify-center shrink-0 text-primary-container font-mono font-bold">
                            <span className="material-symbols-outlined text-[20px]">terminal</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-headline-md font-semibold text-text-primary text-body-md truncate">
                                {item.name}
                              </h3>
                              <span className="text-code-sm font-code-sm text-text-tertiary text-xs">
                                {item.version}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-code-sm font-medium uppercase tracking-wider bg-status-success/10 text-status-success border border-status-success/20">
                                {item.status}
                              </span>
                            </div>

                            <p className="text-body-sm text-text-secondary text-xs mt-1 truncate">
                              Provider: <span className="font-medium text-text-primary">{item.provider}</span> • Category: <span className="capitalize">{item.category}</span>
                            </p>

                            <div className="flex items-center gap-2 mt-2 font-code-sm text-xs text-text-tertiary">
                              <span className="material-symbols-outlined text-[14px]">terminal</span>
                              <code className="bg-bg-surface px-1.5 py-0.5 rounded text-text-secondary text-[11px]">
                                {item.endpoint}
                              </code>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border-subtle">
                          <button 
                            onClick={() => copyToClipboard(`kyron run ${item.slug}`, `cli-${item.id}`)}
                            className="h-8 px-2.5 rounded bg-bg-surface border border-border-subtle hover:border-border-strong text-text-secondary hover:text-text-primary text-xs font-code-sm flex items-center gap-1 transition-colors"
                            title="Copy Run Command"
                          >
                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            <span>{copiedKey === `cli-${item.id}` ? 'Copied' : 'Run Cmd'}</span>
                          </button>

                          <button 
                            onClick={() => navigate(`/skills/${item.slug}`)}
                            className="h-8 px-2.5 rounded bg-bg-canvas border border-border-subtle hover:bg-bg-surface text-text-secondary hover:text-text-primary text-body-sm transition-colors"
                            title="View Details"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="border border-border-subtle border-dashed rounded-xl p-10 text-center bg-bg-surface/30 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center text-text-tertiary mb-3">
                        <span className="material-symbols-outlined text-[24px]">folder_open</span>
                      </div>
                      <h3 className="font-headline-md text-body-lg font-semibold text-text-primary">No skills in your library yet</h3>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-1 max-w-md">
                        Install skills with 1-click from the KYRON marketplace to add them to your agent runtime.
                      </p>
                      <button 
                        onClick={() => navigate('/skills')}
                        className="mt-4 px-4 py-2 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium transition-colors inline-flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">storefront</span>
                        <span>Browse Marketplace</span>
                      </button>
                    </div>
                  )}
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
                      setCreatedSecretKey(null);
                      setCreateKeyModalOpen(true);
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
                        <th className="py-3 px-4">Key Prefix</th>
                        <th className="py-3 px-4">Created At</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle font-code-sm text-code-sm">
                      {apiKeys.length > 0 ? (
                        apiKeys.map(key => (
                          <tr key={key.id} className="hover:bg-bg-surface/50 transition-colors">
                            <td className="py-3.5 px-5 font-body-md text-body-sm font-medium text-text-primary">
                              {key.name}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="inline-flex items-center gap-2 bg-bg-surface px-2 py-1 rounded border border-border-subtle text-text-secondary">
                                <span>{key.key_prefix}••••••••••••••••</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-text-tertiary">
                              {new Date(key.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-5 text-right font-sans">
                              <button 
                                onClick={() => handleRevokeKey(key.id)}
                                className="text-status-error hover:underline text-xs"
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-10 px-4 text-center text-text-tertiary font-sans">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-[22px]">key</span>
                              <span>No active API keys found.</span>
                              <span className="text-xs text-text-tertiary">Generate a key to connect external agents with your Kyron workspace.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Generate API Key Modal */}
      {createKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-canvas border border-border-strong rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">key</span>
                <h3 className="font-headline-md font-semibold text-text-primary">
                  {createdSecretKey ? 'API Key Created' : 'Generate New API Key'}
                </h3>
              </div>
              <button 
                onClick={() => setCreateKeyModalOpen(false)} 
                className="text-text-tertiary hover:text-text-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {createdSecretKey ? (
              <div className="space-y-4">
                <div className="p-3 bg-status-success/10 border border-status-success/30 rounded-lg text-xs text-status-success">
                  Make sure to copy your API key now. You will not be able to see it again!
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-text-secondary font-code-sm">YOUR API KEY</label>
                  <div className="flex items-center gap-2">
                    <input 
                      readOnly 
                      value={createdSecretKey}
                      className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded font-mono text-xs text-text-primary select-all"
                    />
                    <button 
                      onClick={() => copyToClipboard(createdSecretKey, 'secret-key')}
                      className="h-9 px-3 bg-primary-container text-white rounded text-xs font-medium shrink-0 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedKey === 'secret-key' ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedKey === 'secret-key' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => setCreateKeyModalOpen(false)}
                    className="px-4 py-2 bg-bg-surface border border-border-subtle hover:border-text-primary text-text-primary rounded text-body-sm font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Key Name / Label</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Cursor MCP Gateway or Production Agent"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary focus:outline-hidden focus:border-border-strong"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setCreateKeyModalOpen(false)}
                    className="px-3.5 py-2 bg-bg-canvas border border-border-subtle hover:bg-bg-surface text-text-primary rounded text-body-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleGenerateKey}
                    disabled={isGeneratingKey}
                    className="px-4 py-2 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isGeneratingKey ? 'Generating...' : 'Create Secret Key'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

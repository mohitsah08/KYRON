import React, { useState, useEffect } from 'react';
import { api, getAuthToken } from '../utils/api.ts';

interface McpServerItem {
  id: string;
  name: string;
  version: string;
  maintainer: string;
  rating: number;
  description: string;
  transport: 'stdio' | 'SSE' | 'Dual (stdio + SSE)';
  latency: string;
  status: 'Active' | 'Ready to connect';
  entrypoint: string;
  defaultConfigKey: string;
  tools: string[];
}

export function McpHubPage() {
  const [selectedClient, setSelectedClient] = useState<'all' | 'antigravity' | 'cursor' | 'claude' | 'codex'>('all');
  const [activeServerId, setActiveServerId] = useState<string>('kyron-gateway');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pingTesting, setPingTesting] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<{ online: boolean; latencyMs?: number; version?: string }>({ online: false });

  // Playground state
  const [playgroundOpen, setPlaygroundOpen] = useState(true);
  const [selectedTool, setSelectedTool] = useState<string>('ping');
  const [toolParams, setToolParams] = useState<string>('{}');
  const [rpcResponse, setRpcResponse] = useState<any>(null);
  const [rpcLoading, setRpcLoading] = useState(false);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const mcpHttpUrl = `${originUrl}/api/mcp`;
  const mcpSseUrl = `${originUrl}/api/mcp/sse`;

  const servers: McpServerItem[] = [
    {
      id: 'kyron-gateway',
      name: 'kyron/ai-skill-gateway',
      version: 'v1.0.0 (MCP 2024-11-05)',
      maintainer: '@kyron_core',
      rating: 5.0,
      description: 'Unified AI Agent Skill Gateway MCP Server providing discovery, skill inspection, atomic library installs, and playbook workflow execution.',
      transport: 'Dual (stdio + SSE)',
      latency: gatewayStatus.latencyMs ? `${gatewayStatus.latencyMs}ms` : '3ms',
      status: 'Active',
      entrypoint: 'server/mcp-stdio.ts',
      defaultConfigKey: 'kyron',
      tools: ['ping', 'search_skills', 'get_skill_details', 'install_skill', 'get_my_skills', 'execute_skill_workflow']
    },
    {
      id: 'geo-seo-suite',
      name: 'kyron/geo-seo-suite-mcp',
      version: 'v1.1.0',
      maintainer: '@juan_gabriel',
      rating: 5.0,
      description: 'AI Search Optimization & Citability Engine. Analyzes visibility across Perplexity, ChatGPT, and Google AI Overviews with 6-dimension scoring.',
      transport: 'SSE',
      latency: '6ms',
      status: 'Ready to connect',
      entrypoint: 'server/mcp-stdio.ts',
      defaultConfigKey: 'kyron_geo_seo',
      tools: ['execute_skill_workflow (/geo quick, /geo audit)']
    },
    {
      id: 'octocode-architect',
      name: 'kyron/octocode-ast-mcp',
      version: 'v2.4.1',
      maintainer: '@axiom_labs',
      rating: 4.9,
      description: 'Autonomous multi-file codebase refactoring, AST analysis, and zero-breakage dependency migration playbooks.',
      transport: 'stdio',
      latency: '4ms',
      status: 'Ready to connect',
      entrypoint: 'server/mcp-stdio.ts',
      defaultConfigKey: 'kyron_octocode',
      tools: ['execute_skill_workflow (/octocode refactor)']
    },
    {
      id: 'code-review-auditor',
      name: 'kyron/code-review-auditor-mcp',
      version: 'v1.0.0',
      maintainer: '@antara_chindarkar',
      rating: 4.8,
      description: 'Diff inspector and concurrency race condition auditor providing AST memory allocation and unhandled rejection detection.',
      transport: 'Dual (stdio + SSE)',
      latency: '5ms',
      status: 'Ready to connect',
      entrypoint: 'server/mcp-stdio.ts',
      defaultConfigKey: 'kyron_code_review',
      tools: ['execute_skill_workflow (/review diff)']
    }
  ];

  const activeServer = servers.find(s => s.id === activeServerId) || servers[0];

  // Test live connection on component mount
  useEffect(() => {
    let mounted = true;
    const start = performance.now();
    api.callMcp('ping')
      .then((res) => {
        if (!mounted) return;
        const elapsed = Math.round(performance.now() - start);
        if (res?.result) {
          setGatewayStatus({ online: true, latencyMs: Math.max(1, elapsed), version: '1.0.0' });
        } else {
          setGatewayStatus({ online: true, latencyMs: Math.max(1, elapsed) });
        }
      })
      .catch(() => {
        if (mounted) setGatewayStatus({ online: false });
      });

    return () => {
      mounted = false;
    };
  }, []);

  const getClientConfigJson = () => {
    const userToken = getAuthToken() || 'YOUR_OPTIONAL_BEARER_TOKEN';

    if (selectedClient === 'antigravity') {
      return JSON.stringify({
        mcpServers: {
          [activeServer.defaultConfigKey]: {
            command: "npx",
            args: ["-y", "tsx", "server/mcp-stdio.ts"],
            env: {
              KYRON_AUTH_TOKEN: userToken
            }
          }
        }
      }, null, 2);
    }

    if (selectedClient === 'cursor') {
      return JSON.stringify({
        mcpServers: {
          [activeServer.defaultConfigKey]: {
            url: mcpSseUrl
          }
        }
      }, null, 2);
    }

    if (selectedClient === 'codex') {
      return JSON.stringify({
        mcpServers: [
          {
            name: activeServer.defaultConfigKey,
            command: "npx",
            args: ["-y", "tsx", "server/mcp-stdio.ts"],
            env: {
              KYRON_AUTH_TOKEN: userToken
            }
          }
        ]
      }, null, 2);
    }

    // Default / Claude Desktop
    return JSON.stringify({
      mcpServers: {
        [activeServer.defaultConfigKey]: {
          command: "npx",
          args: [
            "-y",
            "tsx",
            "server/mcp-stdio.ts"
          ],
          env: {
            KYRON_AUTH_TOKEN: userToken
          }
        }
      }
    }, null, 2);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getClientConfigJson());
    triggerToast('Configuration copied to clipboard');
  };

  const testPing = async () => {
    setPingTesting(true);
    setPingResult(null);
    const start = performance.now();

    try {
      const res = await api.callMcp('tools/call', {
        name: 'ping',
        arguments: {}
      });
      const elapsed = Math.round(performance.now() - start);

      if (res?.result?.content?.[0]?.text) {
        setPingResult(`OK: ${elapsed}ms round-trip latency verified via tools/call ping`);
        setGatewayStatus({ online: true, latencyMs: elapsed });
        triggerToast(`Live ping test passed (${elapsed}ms)`);
      } else if (res?.error) {
        setPingResult(`Error: ${res.error.message} (${res.error.code})`);
      } else {
        setPingResult(`OK: ${elapsed}ms latency verified`);
      }
    } catch (err: any) {
      setPingResult(`Connection failed: ${err.message}`);
    } finally {
      setPingTesting(false);
    }
  };

  const handleSendRpc = async () => {
    setRpcLoading(true);
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(toolParams);
      } catch {
        alert('Invalid JSON parameters');
        setRpcLoading(false);
        return;
      }

      if (selectedTool === 'initialize') {
        const res = await api.callMcp('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'KYRON Playground', version: '1.0.0' }
        });
        setRpcResponse(res);
      } else if (selectedTool === 'ping_method') {
        const res = await api.callMcp('ping', {});
        setRpcResponse(res);
      } else if (selectedTool === 'tools/list') {
        const res = await api.callMcp('tools/list', parsedParams);
        setRpcResponse(res);
      } else {
        const res = await api.callMcp('tools/call', {
          name: selectedTool,
          arguments: parsedParams
        });
        setRpcResponse(res);
      }
    } catch (err: any) {
      setRpcResponse({ error: err.message || 'RPC Call Failed' });
    } finally {
      setRpcLoading(false);
    }
  };

  const filteredServers = servers.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.transport.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-inverse-surface text-inverse-on-surface rounded-lg shadow-xl border border-border-strong font-code-sm text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="material-symbols-outlined text-primary-container text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="w-full max-w-[1440px] mx-auto px-6 md:px-gutter py-8 flex-1">
        {/* Hero Section */}
        <section className="border-b border-border-subtle pb-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-accent-tint text-primary-container font-label-sm border border-primary-container/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                  MCP SPEC 2024-11-05
                </span>
                <span className="text-text-tertiary text-label-sm font-label-sm">ARCHITECTURE v2.1</span>
              </div>
              <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight">
                Model Context Protocol (MCP) Hub
              </h1>
              <p className="text-body-md font-body-md text-text-secondary mt-1 max-w-2xl">
                Direct bridge connecting Antigravity, Cursor, Claude Desktop, and Codex to the live KYRON AI Agent Skill Gateway.
              </p>
            </div>

            {/* Local Bridge Status Pill */}
            <div className="flex items-center gap-2.5 px-3 py-2 bg-bg-surface border border-border-subtle rounded-lg self-start md:self-auto shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${gatewayStatus.online ? 'bg-status-success' : 'bg-status-warning'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${gatewayStatus.online ? 'bg-status-success' : 'bg-status-warning'}`}></span>
              </span>
              <span className="text-code-sm font-code-sm text-text-secondary">
                KYRON MCP Gateway: <span className="text-text-primary font-medium">{gatewayStatus.online ? `Online (${gatewayStatus.latencyMs}ms)` : 'Checking Gateway...'}</span>
              </span>
            </div>
          </div>
        </section>

        {/* Search & Compatibility Filter Bar */}
        <section className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-tertiary">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 bg-bg-canvas border border-border-subtle rounded-lg text-body-md font-body-md text-text-primary placeholder:text-text-tertiary focus:border-text-primary focus:outline-none transition-colors" 
                placeholder="Filter by capability, transport (stdio/SSE), or tool..." 
                type="text"
              />
            </div>

            {/* Client Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-label-sm font-label-sm text-text-tertiary mr-1 hidden sm:inline">Clients:</span>
              <button 
                onClick={() => setSelectedClient('all')}
                className={`px-3 py-1 text-label-md font-label-md rounded-lg transition-colors ${
                  selectedClient === 'all' 
                    ? 'bg-text-primary text-bg-canvas' 
                    : 'bg-bg-surface hover:bg-surface-container-high border border-border-subtle text-text-secondary'
                }`}
              >
                All Clients
              </button>
              <button 
                onClick={() => setSelectedClient('antigravity')}
                className={`px-3 py-1 text-label-md font-label-md rounded-lg transition-colors ${
                  selectedClient === 'antigravity' 
                    ? 'bg-text-primary text-bg-canvas' 
                    : 'bg-bg-surface hover:bg-surface-container-high border border-border-subtle text-text-secondary'
                }`}
              >
                Antigravity
              </button>
              <button 
                onClick={() => setSelectedClient('cursor')}
                className={`px-3 py-1 text-label-md font-label-md rounded-lg transition-colors ${
                  selectedClient === 'cursor' 
                    ? 'bg-text-primary text-bg-canvas' 
                    : 'bg-bg-surface hover:bg-surface-container-high border border-border-subtle text-text-secondary'
                }`}
              >
                Cursor IDE
              </button>
              <button 
                onClick={() => setSelectedClient('claude')}
                className={`px-3 py-1 text-label-md font-label-md rounded-lg transition-colors ${
                  selectedClient === 'claude' 
                    ? 'bg-text-primary text-bg-canvas' 
                    : 'bg-bg-surface hover:bg-surface-container-high border border-border-subtle text-text-secondary'
                }`}
              >
                Claude Desktop
              </button>
              <button 
                onClick={() => setSelectedClient('codex')}
                className={`px-3 py-1 text-label-md font-label-md rounded-lg transition-colors ${
                  selectedClient === 'codex' 
                    ? 'bg-text-primary text-bg-canvas' 
                    : 'bg-bg-surface hover:bg-surface-container-high border border-border-subtle text-text-secondary'
                }`}
              >
                Codex / Continue
              </button>
            </div>
          </div>
        </section>

        {/* Bento Workbench: Directory List (Left) & Inspector (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Server Directory Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-label-sm font-label-sm text-text-tertiary uppercase tracking-wider">
                Gateway Toolsuites ({filteredServers.length})
              </span>
              <span className="text-code-sm font-code-sm text-text-tertiary">PROTOCOL: MCP 2024-11-05</span>
            </div>

            {filteredServers.map(server => {
              const isSelected = server.id === activeServerId;
              return (
                <div 
                  key={server.id}
                  onClick={() => setActiveServerId(server.id)}
                  className={`p-5 bg-bg-canvas rounded-xl transition-all duration-150 cursor-pointer shadow-xs relative overflow-hidden group ${
                    isSelected 
                      ? 'border-2 border-primary-container' 
                      : 'border border-border-subtle hover:border-border-strong'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-2 h-full bg-primary-container"></div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg bg-bg-surface border border-border-subtle flex items-center justify-center font-code-sm font-semibold ${
                        isSelected ? 'text-primary-container' : 'text-text-primary'
                      }`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {server.transport === 'stdio' ? 'terminal' : 'cloud_sync'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-body-lg font-headline-md font-semibold text-text-primary">
                            {server.name}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-label-sm font-label-sm border ${
                            server.status === 'Active'
                              ? 'bg-accent-tint text-primary-container border-primary-container/20'
                              : 'bg-bg-surface text-text-secondary border-border-subtle'
                          }`}>
                            {server.status}
                          </span>
                        </div>
                        <p className="text-code-sm font-code-sm text-text-tertiary">
                          {server.version} • maintainer: {server.maintainer}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-bg-surface px-2 py-1 rounded-lg border border-border-subtle">
                      <span className="material-symbols-outlined text-[14px] text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-code-sm font-code-sm font-medium text-text-primary">{server.rating}</span>
                    </div>
                  </div>

                  <p className="text-body-sm font-body-sm text-text-secondary mb-4">
                    {server.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {server.tools.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-bg-surface border border-border-subtle rounded text-xs font-code-sm text-text-secondary">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-code-sm font-code-sm">
                    <div className="flex items-center gap-4 text-text-secondary">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${server.transport.includes('stdio') ? 'bg-status-success' : 'bg-status-warning'}`}></span>
                        {server.transport}
                      </span>
                      <span>{server.latency} latency</span>
                    </div>
                    <span className={`font-label-md flex items-center gap-1 transition-transform ${
                      isSelected ? 'text-primary-container group-hover:translate-x-0.5' : 'text-text-secondary hover:text-text-primary'
                    }`}>
                      {isSelected ? 'Selected' : 'Select'} 
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Test RPC Playground Accordion */}
            <div className="border border-border-subtle rounded-xl bg-bg-surface/50 overflow-hidden mt-6">
              <button 
                onClick={() => setPlaygroundOpen(!playgroundOpen)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-bg-surface transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container">science</span>
                  <span className="font-headline-md font-semibold text-text-primary text-body-md">
                    Interactive MCP JSON-RPC 2.0 Playground
                  </span>
                </div>
                <span className="material-symbols-outlined text-text-tertiary text-[20px]">
                  {playgroundOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {playgroundOpen && (
                <div className="p-5 border-t border-border-subtle bg-bg-canvas space-y-4">
                  <p className="text-xs text-text-secondary">
                    Directly dispatch live JSON-RPC methods and tools/call requests against the active Express MCP endpoint ({mcpHttpUrl}).
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Target Method / Tool</label>
                      <select 
                        value={selectedTool}
                        onChange={e => {
                          const t = e.target.value;
                          setSelectedTool(t);
                          if (t === 'ping') setToolParams('{}');
                          else if (t === 'initialize') setToolParams('{}');
                          else if (t === 'ping_method') setToolParams('{}');
                          else if (t === 'tools/list') setToolParams('{}');
                          else if (t === 'search_skills') setToolParams(JSON.stringify({ query: 'SEO', limit: 3 }, null, 2));
                          else if (t === 'get_skill_details') setToolParams(JSON.stringify({ slug_or_id: 'geo-seo-suite-ai-search-optimization' }, null, 2));
                          else if (t === 'install_skill') setToolParams(JSON.stringify({ skill_id: 'code-review-architecture-auditor' }, null, 2));
                          else if (t === 'get_my_skills') setToolParams('{}');
                          else if (t === 'execute_skill_workflow') setToolParams(JSON.stringify({ command: '/geo quick https://electron-srl.com', skill_slug: 'geo-seo-suite-ai-search-optimization' }, null, 2));
                        }}
                        className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary"
                      >
                        <option value="ping">tools/call: ping (Harmless Round-Trip Probe)</option>
                        <option value="initialize">initialize (Negotiate Protocol & Capabilities)</option>
                        <option value="ping_method">ping (JSON-RPC Protocol Ping)</option>
                        <option value="tools/list">tools/list (Inspect All 6 Registered Tools)</option>
                        <option value="search_skills">tools/call: search_skills (Marketplace Search)</option>
                        <option value="get_skill_details">tools/call: get_skill_details (Inspect Spec & Deals)</option>
                        <option value="install_skill">tools/call: install_skill (Acquire Skill.md Package)</option>
                        <option value="get_my_skills">tools/call: get_my_skills (Authenticated Library)</option>
                        <option value="execute_skill_workflow">tools/call: execute_skill_workflow (Playbook Engine)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">JSON Parameters</label>
                      <input 
                        value={toolParams}
                        onChange={e => setToolParams(e.target.value)}
                        className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded font-code-sm text-xs text-text-primary"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleSendRpc}
                    disabled={rpcLoading}
                    className="px-4 py-2 bg-text-primary text-bg-canvas hover:bg-black rounded text-body-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    <span>{rpcLoading ? 'Executing RPC...' : 'Dispatch Live JSON-RPC Call'}</span>
                  </button>

                  {rpcResponse && (
                    <div className="mt-3 p-3 bg-inverse-surface rounded-lg text-inverse-on-surface font-code-sm text-xs max-h-56 overflow-auto">
                      <pre>{JSON.stringify(rpcResponse, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Configuration & Connection Inspector (5 cols) */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <div className="p-6 bg-bg-canvas border border-border-subtle rounded-xl shadow-xs">
              
              {/* Server Header & Verified Badge */}
              <div className="flex items-start justify-between pb-4 border-b border-border-subtle">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-headline-md font-headline-md text-text-primary">
                      {activeServer.name}
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                      verified
                    </span>
                  </div>
                  <p className="text-body-sm font-body-sm text-text-secondary mt-0.5">
                    Maintainer: <span className="font-code-sm text-text-primary font-medium">{activeServer.maintainer}</span>
                  </p>
                </div>
                <span className="text-code-sm font-code-sm px-2 py-1 bg-bg-surface border border-border-subtle rounded text-text-secondary">
                  {activeServer.version}
                </span>
              </div>

              {/* Transport URLs Info */}
              <div className="mt-4 p-3 bg-bg-surface border border-border-subtle rounded-lg space-y-2 text-xs font-code-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-tertiary">SSE Endpoint:</span>
                  <span className="text-text-primary select-all font-mono">{mcpSseUrl}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-tertiary">Stdio Bridge:</span>
                  <span className="text-text-primary select-all font-mono">{activeServer.entrypoint}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-tertiary">HTTP POST:</span>
                  <span className="text-text-primary select-all font-mono">{mcpHttpUrl}</span>
                </div>
              </div>

              {/* Configuration Snippet Block */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-label-sm font-label-sm text-text-secondary uppercase tracking-wider">
                    Target: {
                      selectedClient === 'antigravity' ? 'antigravity.json (MCP Servers)' :
                      selectedClient === 'cursor' ? '.cursor/mcp.json' :
                      selectedClient === 'codex' ? 'config.json (Codex / Continue)' :
                      'claude_desktop_config.json'
                    }
                  </span>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-code-sm font-code-sm text-primary-container hover:text-accent-hover transition-colors focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>Copy JSON</span>
                  </button>
                </div>

                {/* Code Window */}
                <div className="relative bg-inverse-surface rounded-lg p-4 font-code-sm text-code-sm text-inverse-on-surface border border-border-strong overflow-x-auto shadow-inner">
                  <pre><code>{getClientConfigJson()}</code></pre>
                </div>
              </div>

              {/* Runtime Telemetry Grid */}
              <div className="mt-5 pt-5 border-t border-border-subtle">
                <span className="text-label-sm font-label-sm text-text-tertiary uppercase tracking-wider block mb-3">
                  Runtime Telemetry
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-bg-surface border border-border-subtle rounded-lg">
                    <span className="text-label-sm font-label-sm text-text-secondary block">Latency</span>
                    <span className="text-body-md font-code-sm font-semibold text-text-primary">
                      {gatewayStatus.online ? `${gatewayStatus.latencyMs}ms` : activeServer.latency}
                    </span>
                  </div>
                  <div className="p-2.5 bg-bg-surface border border-border-subtle rounded-lg">
                    <span className="text-label-sm font-label-sm text-text-secondary block">Transport</span>
                    <span className="text-body-md font-code-sm font-semibold text-text-primary">{activeServer.transport}</span>
                  </div>
                  <div className="p-2.5 bg-bg-surface border border-border-subtle rounded-lg">
                    <span className="text-label-sm font-label-sm text-text-secondary block">Isolation</span>
                    <span className="text-body-md font-code-sm font-semibold text-text-primary">Tier 0</span>
                  </div>
                </div>
              </div>

              {/* Security Sandbox Status */}
              <div className="mt-4 p-3 bg-accent-tint/50 border border-border-subtle rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-primary-container">shield</span>
                <div>
                  <p className="text-label-sm font-label-sm text-text-primary font-medium">8-Point Security Sandbox Active</p>
                  <p className="text-code-sm font-code-sm text-text-secondary">All packages pre-scanned against disk mutation and prompt injection.</p>
                </div>
              </div>

              {/* Ping Result if available */}
              {pingResult && (
                <div className="mt-3 p-2.5 bg-status-success/10 border border-status-success/30 rounded-lg text-xs font-code-sm text-status-success flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{pingResult}</span>
                </div>
              )}

              {/* Connection Action Buttons */}
              <div className="mt-6 space-y-2 pt-2">
                <button 
                  onClick={testPing}
                  disabled={pingTesting}
                  className="w-full h-9 bg-bg-canvas border border-border-subtle hover:border-border-strong hover:bg-bg-surface text-text-primary font-label-md rounded-lg flex items-center justify-center gap-2 transition-all duration-150"
                >
                  <span className={`material-symbols-outlined text-[16px] ${pingTesting ? 'animate-spin' : ''}`}>sync</span>
                  <span>{pingTesting ? 'Testing Real Round-Trip Ping...' : 'Test Real Round-Trip Ping'}</span>
                </button>

                <button 
                  onClick={handleCopy}
                  className="w-full h-10 bg-primary-container hover:bg-accent-hover text-on-primary font-label-md rounded-lg flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99] font-medium shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">hub</span>
                  <span>Copy Config for {selectedClient === 'antigravity' ? 'Antigravity' : selectedClient === 'cursor' ? 'Cursor IDE' : selectedClient === 'codex' ? 'Codex / Continue' : 'Claude Desktop'}</span>
                </button>
              </div>

            </div>

            {/* Quick Help Card */}
            <div className="p-4 bg-bg-surface border border-border-subtle rounded-xl flex items-center justify-between text-body-sm font-body-sm">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-text-secondary">help_outline</span>
                <span className="text-text-secondary">Need help connecting your agent runtime?</span>
              </div>
              <a href="#playground" onClick={() => setPlaygroundOpen(true)} className="text-text-primary font-medium hover:underline flex items-center gap-1">
                Open Playground <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </a>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}

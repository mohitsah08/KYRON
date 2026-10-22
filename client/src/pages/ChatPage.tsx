import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { SideNav } from '../components/SideNav.tsx';
import { ChatMessage } from '../types.ts';

export function ChatPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  
  const [selectedModel, setSelectedModel] = useState('Kyron Neural Core v4 - 70B');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxOutput, setSandboxOutput] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      role: 'user',
      content: 'Optimize our AST tree walker to eliminate memory leaks during large monorepo parsing. Currently retaining circular references across cyclical module graphs.',
      timestamp: '14:28:11'
    },
    {
      id: 'm2',
      role: 'assistant',
      content: 'The cyclical reference retention during monorepo AST traversals is primarily caused by un-cleared parent node references inside the lexical scope visitors. By switching from a recursive pointer graph to an arena-allocated stack with decoupled weak handles, memory consumption drops from O(N·M) to deterministic O(Depth).',
      timestamp: '14:28:12',
      codeSnippet: {
        filename: 'ast_walker_arena.rs',
        language: 'Rust 2024',
        diffLines: [
          { type: 'context', text: '// Arena-allocated non-cyclical traversal pattern' },
          { type: 'context', text: 'use std::sync::Arc;' },
          { type: 'context', text: 'use typed_arena::Arena;' },
          { type: 'remove', text: 'pub struct NodeVisitor<\'a> { parent: Option<&\'a mut NodeVisitor<\'a>> } // LEAK: Circular cycle' },
          { type: 'add', text: 'pub struct AstArena<\'tree> { arena: Arena<AstNode<\'tree>>, stack: Vec<NodeId> }' },
          { type: 'context', text: 'impl<\'tree> AstArena<\'tree> {' },
          { type: 'context', text: '    pub fn traverse_safe(&mut self, root: NodeId) -> Result<(), WalkError> {' },
          { type: 'context', text: '        self.stack.clear(); self.stack.push(root);' },
          { type: 'context', text: '        while let Some(current) = self.stack.pop() {' },
          { type: 'context', text: '            let node = &self.arena[current];' },
          { type: 'context', text: '            for &child in &node.children { self.stack.push(child); }' },
          { type: 'context', text: '        }' },
          { type: 'context', text: '        Ok(())' },
          { type: 'context', text: '    }' },
          { type: 'context', text: '}' }
        ]
      },
      metrics: {
        heapAllocation: '1.8 MB (-94.2%)',
        throughput: '482 kLOC/s',
        cyclicRetention: '0 Byte Leak'
      }
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleExecute = (promptText?: string) => {
    const textToSend = promptText || inputPrompt;
    if (!textToSend.trim() || isExecuting) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setIsExecuting(true);

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: `Executed autonomous AST analysis for: "${textToSend}". Synthesized optimal AST transformations adhering to Kyron Tier 0 hermetic sandboxing rules.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        codeSnippet: {
          filename: 'ast_transform.rs',
          language: 'Rust',
          diffLines: [
            { type: 'context', text: '// Verified AST Transformation via Kyron Neural Core' },
            { type: 'add', text: 'pub fn synthesize_rule() -> bool { true }' }
          ]
        },
        metrics: {
          heapAllocation: '2.1 MB (-88%)',
          throughput: '512 kLOC/s',
          cyclicRetention: '0 Byte Leak'
        }
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsExecuting(false);
    }, 900);
  };

  const handleRunSandbox = () => {
    setSandboxRunning(true);
    setSandboxOutput(null);
    setTimeout(() => {
      setSandboxRunning(false);
      setSandboxOutput('Sandbox execution passed in 14ms: cargo test --release finished with 0 errors.');
    }, 700);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-bg-canvas text-text-primary antialiased font-body-md overflow-hidden">
      {/* Workspace SideNav */}
      <SideNav activeTab="chat" />

      {/* Secondary Drawer: Conversations */}
      <aside className="w-[280px] shrink-0 border-r border-border-subtle bg-bg-surface hidden lg:flex flex-col h-full select-none">
        <div className="p-3 border-b border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-headline-md text-body-md font-semibold text-text-primary">Conversations</span>
            <button className="inline-flex items-center justify-center w-7 h-7 rounded border border-border-subtle bg-bg-canvas hover:border-border-strong text-text-secondary hover:text-text-primary transition-colors">
              <span className="material-symbols-outlined text-[16px]">tune</span>
            </button>
          </div>

          <button 
            onClick={() => setMessages([messages[0], messages[1]])}
            className="w-full h-9 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>New Chat</span>
          </button>

          <div className="relative">
            <span className="material-symbols-outlined text-[16px] absolute left-2.5 top-2 text-text-tertiary">search</span>
            <input 
              className="w-full h-8 pl-8 pr-3 text-body-sm bg-bg-canvas border border-border-subtle rounded text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary transition-colors"
              placeholder="Search conversations..."
              type="text"
            />
          </div>
        </div>

        {/* Grouped Threads */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
            <div className="px-2 pb-1.5 text-label-sm font-label-sm text-text-tertiary">TODAY</div>
            <div className="space-y-0.5">
              <div className="px-2.5 py-2 rounded border border-border-subtle bg-bg-canvas shadow-xs flex items-start gap-2 cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[16px] text-primary-container mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-text-primary truncate">AST Transpiler Optimization</p>
                  <p className="text-label-sm font-code-sm text-text-tertiary truncate">memory leak walker • 14:28</p>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-1.5"></span>
              </div>
              <div className="px-2.5 py-2 rounded hover:bg-bg-canvas flex items-start gap-2 cursor-pointer transition-colors text-text-secondary hover:text-text-primary">
                <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0 text-text-tertiary">code</span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-normal truncate">AST Parser Benchmark</p>
                  <p className="text-label-sm font-code-sm text-text-tertiary truncate">12.4ms per monorepo</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="px-2 pb-1.5 text-label-sm font-label-sm text-text-tertiary">YESTERDAY</div>
            <div className="space-y-0.5">
              <div className="px-2.5 py-2 rounded hover:bg-bg-canvas flex items-start gap-2 cursor-pointer transition-colors text-text-secondary hover:text-text-primary">
                <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0 text-text-tertiary">dataset</span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-normal truncate">VectorDB Indexing Pipeline</p>
                  <p className="text-label-sm font-code-sm text-text-tertiary truncate">HNSW cluster rebuild</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="px-2 pb-1.5 text-label-sm font-label-sm text-text-tertiary">LAST 7 DAYS</div>
            <div className="space-y-0.5">
              <div className="px-2.5 py-2 rounded hover:bg-bg-canvas flex items-start gap-2 cursor-pointer transition-colors text-text-secondary hover:text-text-primary">
                <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0 text-text-tertiary">schema</span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-normal truncate">Postgres Migration Schema</p>
                  <p className="text-label-sm font-code-sm text-text-tertiary truncate">Zero downtime partition</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Context Pool Gauge */}
        <div className="p-3 border-t border-border-subtle bg-bg-canvas">
          <div className="flex items-center justify-between text-label-sm font-label-sm text-text-secondary mb-1.5">
            <span>Context Cache Pool</span>
            <span className="font-code-sm">18.4 / 64 GB</span>
          </div>
          <div className="w-full bg-bg-surface rounded-full h-1 overflow-hidden border border-border-subtle">
            <div className="bg-text-primary h-full w-[28%] rounded-full"></div>
          </div>
        </div>
      </aside>

      {/* Main Canvas: Chat Interaction */}
      <main className="flex-1 flex flex-col h-full bg-bg-canvas relative overflow-hidden">
        
        {/* Top Control Bar */}
        <header className="h-14 shrink-0 border-b border-border-subtle px-6 flex items-center justify-between bg-bg-canvas z-20">
          <div className="flex items-center gap-3">
            <select 
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="h-9 px-3 rounded border border-border-subtle bg-bg-canvas hover:border-border-strong text-body-sm font-medium text-text-primary cursor-pointer transition-colors focus:ring-0"
            >
              <option value="Kyron Neural Core v4 - 70B">Kyron Neural Core v4 - 70B</option>
              <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet (via MCP)</option>
              <option value="GPT-4o Reasoning">GPT-4o Reasoning Matrix</option>
            </select>

            <span className="text-border-strong hidden sm:inline">/</span>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded bg-bg-surface border border-border-subtle text-code-sm font-code-sm text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
              <span>14ms</span>
            </div>

            <div className="hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded bg-bg-surface border border-border-subtle text-code-sm font-code-sm text-text-secondary">
              <span className="material-symbols-outlined text-[14px] text-text-tertiary">data_usage</span>
              <span>4,120 / 32k tokens</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const text = JSON.stringify(messages, null, 2);
                navigator.clipboard.writeText(text);
                alert('Session transcript copied to clipboard!');
              }}
              className="h-8 px-2.5 rounded border border-border-subtle bg-bg-canvas hover:bg-bg-surface text-text-secondary hover:text-text-primary text-body-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={() => setMessages([])}
              className="h-8 px-2.5 rounded border border-border-subtle bg-bg-canvas hover:bg-bg-surface text-text-secondary hover:text-text-primary text-body-sm font-medium flex items-center gap-1.5 transition-colors"
              title="Clear current buffer"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-4xl w-full mx-auto pb-48">
          
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-subtle bg-bg-surface text-text-tertiary text-code-sm font-code-sm">
              <span>Thread started at 14:28:02 UTC</span>
              <span>•</span>
              <span>Workspace Environment: AST-PROD-01</span>
            </div>
          </div>

          {messages.map(msg => (
            <div key={msg.id}>
              {msg.role === 'user' ? (
                <div className="flex gap-4 items-start justify-end">
                  <div className="max-w-2xl bg-bg-surface border border-border-subtle rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-4 text-label-sm font-label-sm text-text-tertiary">
                      <span className="font-medium text-text-primary">Principal Systems Architect</span>
                      <span className="font-code-sm">{msg.timestamp}</span>
                    </div>
                    <p className="text-body-md text-text-primary leading-relaxed">{msg.content}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-text-primary text-bg-canvas flex items-center justify-center shrink-0 font-code-sm text-xs font-semibold">
                    PS
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-lg bg-accent-tint border border-primary-container/30 text-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-headline-md text-body-md font-semibold text-text-primary">{selectedModel}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-code-sm bg-accent-tint text-primary border border-primary-container/20">
                        70B Parameter Engine
                      </span>
                      <span className="text-code-sm text-text-tertiary font-code-sm ml-auto">0.34s generation time</span>
                    </div>

                    <div className="border border-border-subtle rounded-xl bg-bg-canvas p-5 space-y-4 shadow-xs">
                      <p className="text-body-md text-text-primary leading-relaxed">{msg.content}</p>

                      {msg.codeSnippet && (
                        <div className="rounded-lg border border-border-subtle bg-inverse-surface text-inverse-on-surface overflow-hidden font-code-sm">
                          <div className="flex items-center justify-between px-3.5 py-2 bg-text-primary/95 border-b border-border-subtle/20 text-text-tertiary text-code-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-border-strong/40"></span>
                              <span className="text-inverse-on-surface font-medium">{msg.codeSnippet.filename}</span>
                              <span className="text-xs px-1.5 py-0.2 bg-white/10 rounded text-inverse-on-surface">{msg.codeSnippet.language}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  const text = msg.codeSnippet?.diffLines.map(l => l.text).join('\n') || '';
                                  navigator.clipboard.writeText(text);
                                  setCopiedCode(true);
                                  setTimeout(() => setCopiedCode(false), 2000);
                                }}
                                className="flex items-center gap-1 hover:text-white transition-colors"
                              >
                                <span className="material-symbols-outlined text-[15px]">content_copy</span>
                                <span className="text-xs">{copiedCode ? 'Copied' : 'Copy'}</span>
                              </button>
                              <button 
                                onClick={handleRunSandbox}
                                disabled={sandboxRunning}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary-container text-white hover:bg-accent-hover transition-colors text-xs font-medium"
                              >
                                <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                                <span>{sandboxRunning ? 'Running...' : 'Run in Sandbox'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="p-4 text-xs font-code-sm leading-5 overflow-x-auto select-text font-mono">
                            {msg.codeSnippet.diffLines.map((line, idx) => (
                              <div 
                                key={idx}
                                className={`px-2 -mx-4 py-0.5 flex ${
                                  line.type === 'add' 
                                    ? 'bg-status-success/20 text-emerald-200' 
                                    : line.type === 'remove' 
                                    ? 'bg-status-error/20 text-red-200' 
                                    : 'text-neutral-300'
                                }`}
                              >
                                <span className="w-6 select-none opacity-40">
                                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                                </span>
                                <span>{line.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {sandboxOutput && (
                        <div className="p-3 bg-status-success/10 border border-status-success/30 rounded-lg text-xs font-code-sm text-status-success flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>{sandboxOutput}</span>
                        </div>
                      )}

                      {msg.metrics && (
                        <div className="grid grid-cols-3 gap-3 p-3 bg-bg-surface rounded-lg border border-border-subtle">
                          <div>
                            <span className="text-label-sm font-label-sm text-text-tertiary block">HEAP ALLOCATION</span>
                            <span className="text-body-md font-semibold text-text-primary font-code-sm">{msg.metrics.heapAllocation}</span>
                          </div>
                          <div>
                            <span className="text-label-sm font-label-sm text-text-tertiary block">PARSING THROUGHPUT</span>
                            <span className="text-body-md font-semibold text-text-primary font-code-sm">{msg.metrics.throughput}</span>
                          </div>
                          <div>
                            <span className="text-label-sm font-label-sm text-text-tertiary block">CYCLIC RETENTION</span>
                            <span className="text-body-md font-semibold text-status-success font-code-sm">{msg.metrics.cyclicRetention}</span>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isExecuting && (
            <div className="flex gap-4 items-center text-text-tertiary font-code-sm text-xs animate-pulse">
              <span className="material-symbols-outlined text-primary-container animate-spin">sync</span>
              <span>Kyron Neural Core v4 is generating AST synthesis...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Composer at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg-canvas via-bg-canvas to-transparent pt-8 z-30 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto space-y-2">
            
            {/* Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-label-sm font-label-sm text-text-tertiary shrink-0 mr-1">Suggested:</span>
              <button 
                onClick={() => handleExecute('Analyze AST memory footprint for circular references')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-canvas border border-border-subtle hover:border-border-strong text-text-secondary hover:text-text-primary text-body-sm transition-all shadow-xs shrink-0 active:scale-95"
              >
                <span className="material-symbols-outlined text-[14px] text-primary-container">memory</span>
                <span>Analyze AST memory footprint</span>
              </button>
              <button 
                onClick={() => handleExecute('Generate JSON-RPC schema for Model Context Protocol 2024-11-05')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-canvas border border-border-subtle hover:border-border-strong text-text-secondary hover:text-text-primary text-body-sm transition-all shadow-xs shrink-0 active:scale-95"
              >
                <span className="material-symbols-outlined text-[14px]">data_object</span>
                <span>Generate JSON-RPC schema</span>
              </button>
              <button 
                onClick={() => handleExecute('Audit security rules and hermetic sandboxing boundaries')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-canvas border border-border-subtle hover:border-border-strong text-text-secondary hover:text-text-primary text-body-sm transition-all shadow-xs shrink-0 active:scale-95"
              >
                <span className="material-symbols-outlined text-[14px]">shield</span>
                <span>Audit security rules</span>
              </button>
            </div>

            {/* Input Box Tray */}
            <div className="bg-bg-canvas border border-border-strong rounded-xl shadow-lg p-3 space-y-2 focus-within:border-text-primary transition-colors">
              <textarea 
                value={inputPrompt}
                onChange={e => setInputPrompt(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleExecute();
                  }
                }}
                className="w-full resize-none border-none p-1 text-body-md text-text-primary placeholder:text-text-tertiary focus:ring-0 focus:outline-none bg-transparent"
                placeholder="Instruct Kyron Neural Core or paste stacktrace... (Press Cmd+Enter to execute)"
                rows={2}
              />

              <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                <div className="flex items-center gap-2">
                  <button className="w-7 h-7 rounded hover:bg-bg-surface text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors" title="Attach file">
                    <span className="material-symbols-outlined text-[18px]">attach_file</span>
                  </button>
                  <button className="w-7 h-7 rounded hover:bg-bg-surface text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors" title="Repository context">
                    <span className="material-symbols-outlined text-[18px]">folder_code</span>
                  </button>
                  <div className="h-4 w-[1px] bg-border-subtle mx-0.5"></div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs text-text-secondary bg-bg-surface border border-border-subtle">
                    <span className="material-symbols-outlined text-[14px]">travel_explore</span>
                    <span>Web Search</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-code-sm font-code-sm text-text-secondary">
                    <span>temp=0.2</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-label-sm font-code-sm text-text-tertiary hidden sm:inline">⌘ + ↵</span>
                  <button 
                    onClick={() => handleExecute()}
                    disabled={isExecuting}
                    className="h-8 px-3.5 rounded bg-primary-container hover:bg-accent-hover text-white text-body-sm font-medium flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <span>Execute</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-label-sm text-[11px] text-text-tertiary">
                Kyron Neural Architecture v4.0. Enterprise sandboxing enforced. Zero data retention active.
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { SideNav } from '../components/SideNav.tsx';
import { api } from '../utils/api.ts';

export function SubmitSkillPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basics
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Code Intelligence');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('ast, refactor, typescript');

  // Step 2: Protocol
  const [protocol, setProtocol] = useState<'stdio' | 'sse' | 'rest'>('stdio');
  const [packageName, setPackageName] = useState('@kyron/my-skill-mcp');
  const [command, setCommand] = useState('npx');
  const [args, setArgs] = useState('-y @kyron/my-skill-mcp');

  // Step 3: Safety & Permissions
  const [permFs, setPermFs] = useState(true);
  const [permNet, setPermNet] = useState(false);
  const [permShell, setPermShell] = useState(false);
  const [isolationTier, setIsolationTier] = useState<'tier0' | 'tier1'>('tier0');

  // Step 4: Testing & Output
  const [sampleInput, setSampleInput] = useState('{\n  "action": "refactor_ast",\n  "file": "src/walker.rs"\n}');
  const [sampleOutput, setSampleOutput] = useState('{\n  "status": "success",\n  "cycles_removed": 4,\n  "heap_reduction": "94.2%"\n}');
  const [astTestPassed, setAstTestPassed] = useState(false);
  const [astTesting, setAstTesting] = useState(false);

  // Step 5: Review & Submit
  const [pricingType, setPricingType] = useState<'free' | 'paid'>('paid');
  const [price, setPrice] = useState('0.0024');
  const [license, setLicense] = useState('Apache-2.0');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  };

  const handleRunAstTest = () => {
    setAstTesting(true);
    setTimeout(() => {
      setAstTesting(false);
      setAstTestPassed(true);
    }, 800);
  };

  const handleFinalSubmit = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      await api.publishSkill({
        name: name || 'Untitled Skill',
        slug: slug || `skill-${Date.now()}`,
        summary: summary || 'Autonomous high-performance agent skill',
        description: summary || 'High-performance MCP runtime binding for autonomous agent loops.',
        category,
        tags: parsedTags,
        pricing_type: pricingType,
        price: pricingType === 'paid' ? parseFloat(price) || 0.0024 : 0,
        skill_md_content: `---\nname: ${slug}\nversion: 1.0.0\nprotocol: ${protocol}\n---\n\n# Sample Input\n\`\`\`json\n${sampleInput}\n\`\`\`\n\n# Sample Output\n\`\`\`json\n${sampleOutput}\n\`\`\``
      });
      navigate('/creator');
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-[1440px] mx-auto">
        <SideNav activeTab="creator" />

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <main className="flex-1 pb-24 px-6 md:px-10 py-8">
            <div className="max-w-[1080px] mx-auto">
              
              {/* Header Monograph */}
              <div className="border-b border-border-subtle pb-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-bg-surface border border-border-subtle rounded text-label-sm font-label-sm text-text-secondary mb-3 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                      CREATOR TOOLING & INFRASTRUCTURE
                    </div>
                    <h1 className="text-headline-lg font-headline-lg text-text-primary font-semibold tracking-tight">
                      Publish an Autonomous Skill
                    </h1>
                    <p className="text-body-md font-body-md text-text-secondary mt-1.5 max-w-2xl">
                      Register an MCP server, autonomous agent, or tool model with verified runtime sandboxing.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-label-sm font-label-sm text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-status-success">verified</span>
                      Verified Developer Auth
                    </span>
                    <span className="text-border-strong">•</span>
                    <span>Draft ID: <code className="font-code-sm text-code-sm text-text-primary">sk_99x_ast</code></span>
                  </div>
                </div>

                {/* 5-Step Progress Bar */}
                <div className="mt-8 pt-6 border-t border-border-subtle">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
                    {/* Step 1 */}
                    <div className="flex flex-col gap-2 cursor-pointer" onClick={() => setCurrentStep(1)}>
                      <div className={`h-1.5 w-full rounded-full ${currentStep >= 1 ? 'bg-primary-container' : 'bg-border-subtle'}`}></div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-label-sm font-label-sm font-semibold truncate text-text-primary">1. Basics</span>
                      </div>
                    </div>
                    {/* Step 2 */}
                    <div className="flex flex-col gap-2 cursor-pointer" onClick={() => setCurrentStep(2)}>
                      <div className={`h-1.5 w-full rounded-full ${currentStep >= 2 ? 'bg-primary-container' : 'bg-border-subtle'}`}></div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-label-sm font-label-sm font-semibold truncate ${currentStep >= 2 ? 'text-text-primary' : 'text-text-tertiary'}`}>
                          2. Setup & MCP
                        </span>
                      </div>
                    </div>
                    {/* Step 3 */}
                    <div className="flex flex-col gap-2 cursor-pointer" onClick={() => setCurrentStep(3)}>
                      <div className={`h-1.5 w-full rounded-full ${currentStep >= 3 ? 'bg-primary-container' : 'bg-border-subtle'}`}></div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-label-sm font-label-sm font-semibold truncate ${currentStep >= 3 ? 'text-text-primary' : 'text-text-tertiary'}`}>
                          3. Safety & Permissions
                        </span>
                      </div>
                    </div>
                    {/* Step 4 */}
                    <div className="flex flex-col gap-2 cursor-pointer" onClick={() => setCurrentStep(4)}>
                      <div className={`h-1.5 w-full rounded-full ${currentStep >= 4 ? 'bg-primary-container' : 'bg-border-subtle'}`}></div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-label-sm font-label-sm font-semibold truncate ${currentStep >= 4 ? 'text-text-primary' : 'text-text-tertiary'}`}>
                          4. Testing & Output
                        </span>
                      </div>
                    </div>
                    {/* Step 5 */}
                    <div className="flex flex-col gap-2 cursor-pointer" onClick={() => setCurrentStep(5)}>
                      <div className={`h-1.5 w-full rounded-full ${currentStep >= 5 ? 'bg-primary-container' : 'bg-border-subtle'}`}></div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-label-sm font-label-sm font-semibold truncate ${currentStep >= 5 ? 'text-text-primary' : 'text-text-tertiary'}`}>
                          5. Review & Submit
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prototype Mode Notice */}
              <div className="mb-8 p-3.5 bg-bg-surface border border-border-subtle rounded-xl flex items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">shield_lock</span>
                  <div className="text-body-sm font-body-sm text-text-secondary">
                    <strong className="font-medium text-text-primary">Prototype Sandboxing:</strong> All skill packages undergo an automated 8-point AST security analysis prior to inclusion in the global index.
                  </div>
                </div>
                <div className="shrink-0 hidden sm:block">
                  <span className="text-code-sm font-code-sm text-text-tertiary bg-bg-canvas px-2 py-1 rounded border border-border-subtle">
                    AST-GUARD: ACTIVE
                  </span>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error text-body-sm">
                  {error}
                </div>
              )}

              {/* STEP 1: BASICS */}
              {currentStep === 1 && (
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-6 space-y-6">
                  <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">
                    Step 1: Skill Entity Metadata
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-body-sm font-medium text-text-primary mb-1.5">Skill Display Name</label>
                      <input 
                        value={name}
                        onChange={e => handleNameChange(e.target.value)}
                        placeholder="e.g. OctoCode Architect"
                        className="w-full h-10 px-3 bg-bg-surface border border-border-subtle rounded-lg text-body-sm text-text-primary focus:border-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-body-sm font-medium text-text-primary mb-1.5">Registry Slug</label>
                      <input 
                        value={slug}
                        onChange={e => setSlug(e.target.value)}
                        placeholder="e.g. octocode-architect"
                        className="w-full h-10 px-3 bg-bg-surface border border-border-subtle rounded-lg font-code-sm text-body-sm text-text-primary focus:border-text-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-body-sm font-medium text-text-primary mb-1.5">Category</label>
                    <select 
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full h-10 px-3 bg-bg-surface border border-border-subtle rounded-lg text-body-sm text-text-primary"
                    >
                      <option>Code Intelligence</option>
                      <option>Database & Migrations</option>
                      <option>DevOps & Infra</option>
                      <option>Security & Compliance</option>
                      <option>Autonomous Agents</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-body-sm font-medium text-text-primary mb-1.5">Short Summary</label>
                    <textarea 
                      value={summary}
                      onChange={e => setSummary(e.target.value)}
                      rows={3}
                      placeholder="High-performance autonomous AST analysis, structural migration synthesis, and linting."
                      className="w-full p-3 bg-bg-surface border border-border-subtle rounded-lg text-body-sm text-text-primary focus:border-text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-body-sm font-medium text-text-primary mb-1.5">Keywords & Tags (comma separated)</label>
                    <input 
                      value={tags}
                      onChange={e => setTags(e.target.value)}
                      placeholder="rust, ast, analysis, refactor"
                      className="w-full h-10 px-3 bg-bg-surface border border-border-subtle rounded-lg text-body-sm text-text-primary focus:border-text-primary"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border-subtle">
                    <button 
                      onClick={() => setCurrentStep(2)}
                      className="h-10 px-5 bg-primary-container hover:bg-accent-hover text-white rounded-lg text-body-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <span>Continue to Setup & Protocol</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: SETUP & MCP */}
              {currentStep === 2 && (
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-6 space-y-6">
                  <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">
                    Step 2: Runtime Protocol & MCP Architecture
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div 
                      onClick={() => setProtocol('stdio')}
                      className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex flex-col justify-between ${
                        protocol === 'stdio' 
                          ? 'border-primary-container bg-accent-tint/30' 
                          : 'border-border-subtle bg-bg-canvas hover:border-border-strong'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-primary-container text-[20px]">terminal</span>
                        <span className={`w-3.5 h-3.5 rounded-full border-2 ${protocol === 'stdio' ? 'border-primary-container bg-primary-container' : 'border-border-strong'}`}></span>
                      </div>
                      <div className="font-headline-md font-medium text-text-primary text-body-sm">MCP Stdio / Native</div>
                      <p className="text-xs text-text-secondary mt-1">Direct sub-process execution via stdin/stdout pipe.</p>
                      <span className="text-[11px] font-code-sm text-status-success mt-2">● &lt; 1.2ms latency</span>
                    </div>

                    <div 
                      onClick={() => setProtocol('sse')}
                      className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex flex-col justify-between ${
                        protocol === 'sse' 
                          ? 'border-primary-container bg-accent-tint/30' 
                          : 'border-border-subtle bg-bg-canvas hover:border-border-strong'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-text-secondary text-[20px]">cloud_sync</span>
                        <span className={`w-3.5 h-3.5 rounded-full border-2 ${protocol === 'sse' ? 'border-primary-container bg-primary-container' : 'border-border-strong'}`}></span>
                      </div>
                      <div className="font-headline-md font-medium text-text-primary text-body-sm">MCP SSE Remote</div>
                      <p className="text-xs text-text-secondary mt-1">Server-Sent Events tunnel for remote hosts.</p>
                      <span className="text-[11px] font-code-sm text-text-tertiary mt-2">Stateless streaming</span>
                    </div>

                    <div 
                      onClick={() => setProtocol('rest')}
                      className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex flex-col justify-between ${
                        protocol === 'rest' 
                          ? 'border-primary-container bg-accent-tint/30' 
                          : 'border-border-subtle bg-bg-canvas hover:border-border-strong'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-text-secondary text-[20px]">webhook</span>
                        <span className={`w-3.5 h-3.5 rounded-full border-2 ${protocol === 'rest' ? 'border-primary-container bg-primary-container' : 'border-border-strong'}`}></span>
                      </div>
                      <div className="font-headline-md font-medium text-text-primary text-body-sm">REST Webhook</div>
                      <p className="text-xs text-text-secondary mt-1">Traditional HTTP JSON payload routing.</p>
                      <span className="text-[11px] font-code-sm text-text-tertiary mt-2">Legacy integration</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-body-sm font-medium text-text-primary mb-1.5">NPM Package / Repository</label>
                      <input 
                        value={packageName}
                        onChange={e => setPackageName(e.target.value)}
                        className="w-full h-10 px-3 bg-bg-surface border border-border-subtle rounded-lg font-code-sm text-body-sm text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-body-sm font-medium text-text-primary mb-1.5">Executable Command</label>
                      <input 
                        value={command}
                        onChange={e => setCommand(e.target.value)}
                        className="w-full h-10 px-3 bg-bg-surface border border-border-subtle rounded-lg font-code-sm text-body-sm text-text-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-body-sm font-medium text-text-primary mb-1.5">Default Arguments</label>
                    <input 
                      value={args}
                      onChange={e => setArgs(e.target.value)}
                      className="w-full h-10 px-3 bg-bg-surface border border-border-subtle rounded-lg font-code-sm text-body-sm text-text-primary"
                    />
                  </div>

                  <div className="flex justify-between pt-4 border-t border-border-subtle">
                    <button 
                      onClick={() => setCurrentStep(1)}
                      className="h-10 px-4 bg-bg-surface hover:bg-bg-canvas border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg text-body-sm font-medium"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setCurrentStep(3)}
                      className="h-10 px-5 bg-primary-container hover:bg-accent-hover text-white rounded-lg text-body-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <span>Continue to Safety</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: SAFETY & PERMISSIONS */}
              {currentStep === 3 && (
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-6 space-y-6">
                  <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">
                    Step 3: Security Sandboxing & Permissions
                  </h3>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3.5 bg-bg-surface border border-border-subtle rounded-lg cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={permFs}
                        onChange={e => setPermFs(e.target.checked)}
                        className="w-4 h-4 rounded text-primary-container focus:ring-0"
                      />
                      <div>
                        <div className="text-body-sm font-medium text-text-primary">Workspace Filesystem Access</div>
                        <div className="text-xs text-text-secondary">Allows reading repository files and producing syntactic code diffs.</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3.5 bg-bg-surface border border-border-subtle rounded-lg cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={permNet}
                        onChange={e => setPermNet(e.target.checked)}
                        className="w-4 h-4 rounded text-primary-container focus:ring-0"
                      />
                      <div>
                        <div className="text-body-sm font-medium text-text-primary">Outbound Network Sockets</div>
                        <div className="text-xs text-text-secondary">Permits external HTTP requests to verified endpoint APIs.</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3.5 bg-bg-surface border border-border-subtle rounded-lg cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={permShell}
                        onChange={e => setPermShell(e.target.checked)}
                        className="w-4 h-4 rounded text-primary-container focus:ring-0"
                      />
                      <div>
                        <div className="text-body-sm font-medium text-text-primary">Sub-shell Execution</div>
                        <div className="text-xs text-text-secondary">Requires elevated security tier; runs inside an ephemeral WASM container.</div>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-body-sm font-medium text-text-primary mb-1.5">Isolation Enclave</label>
                    <select 
                      value={isolationTier}
                      onChange={e => setIsolationTier(e.target.value as any)}
                      className="w-full h-10 px-3 bg-bg-surface border border-border-subtle rounded-lg text-body-sm text-text-primary"
                    >
                      <option value="tier0">Tier 0: Pure Hermetic Sandboxing (Zero Data Retention)</option>
                      <option value="tier1">Tier 1: Read-Only Persistent Cache</option>
                    </select>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-border-subtle">
                    <button 
                      onClick={() => setCurrentStep(2)}
                      className="h-10 px-4 bg-bg-surface hover:bg-bg-canvas border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg text-body-sm font-medium"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setCurrentStep(4)}
                      className="h-10 px-5 bg-primary-container hover:bg-accent-hover text-white rounded-lg text-body-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <span>Continue to Testing</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: TESTING & OUTPUT */}
              {currentStep === 4 && (
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-6 space-y-6">
                  <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">
                    Step 4: Sample I/O & AST Test Validation
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-body-sm font-medium text-text-primary mb-1.5">Sample Input Payload (JSON)</label>
                      <textarea 
                        value={sampleInput}
                        onChange={e => setSampleInput(e.target.value)}
                        rows={6}
                        className="w-full p-3 bg-inverse-surface text-inverse-on-surface rounded-lg font-code-sm text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-body-sm font-medium text-text-primary mb-1.5">Expected Output Payload (JSON)</label>
                      <textarea 
                        value={sampleOutput}
                        onChange={e => setSampleOutput(e.target.value)}
                        rows={6}
                        className="w-full p-3 bg-inverse-surface text-inverse-on-surface rounded-lg font-code-sm text-xs"
                      />
                    </div>
                  </div>

                  {/* AST Scanner Box */}
                  <div className="p-4 bg-bg-surface border border-border-subtle rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-container">fact_check</span>
                        <span className="font-headline-md font-semibold text-text-primary text-body-sm">
                          Automated 8-Point AST Static Analysis Test
                        </span>
                      </div>
                      <button 
                        onClick={handleRunAstTest}
                        disabled={astTesting}
                        className="h-8 px-3 bg-bg-canvas border border-border-subtle hover:border-text-primary text-text-primary rounded text-xs font-medium flex items-center gap-1.5"
                      >
                        <span className={`material-symbols-outlined text-[15px] ${astTesting ? 'animate-spin' : ''}`}>sync</span>
                        <span>{astTesting ? 'Scanning AST...' : 'Run AST Verification'}</span>
                      </button>
                    </div>

                    {astTestPassed ? (
                      <div className="p-3 bg-status-success/10 border border-status-success/30 rounded-lg text-xs font-code-sm text-status-success flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>All 8 security checks passed. Zero obfuscation detected. Clean AST syntax.</span>
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary">
                        Click "Run AST Verification" to simulate the sandbox security check before final publishing.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between pt-4 border-t border-border-subtle">
                    <button 
                      onClick={() => setCurrentStep(3)}
                      className="h-10 px-4 bg-bg-surface hover:bg-bg-canvas border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg text-body-sm font-medium"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setCurrentStep(5)}
                      className="h-10 px-5 bg-primary-container hover:bg-accent-hover text-white rounded-lg text-body-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <span>Continue to Review</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW & SUBMIT */}
              {currentStep === 5 && (
                <div className="bg-bg-canvas border border-border-subtle rounded-xl p-6 space-y-6">
                  <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">
                    Step 5: Pricing, Licensing & Final Submission
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-body-sm font-medium text-text-primary mb-1.5">Pricing Model</label>
                      <select 
                        value={pricingType}
                        onChange={e => setPricingType(e.target.value as any)}
                        className="w-full h-10 px-3 bg-bg-surface border border-border-subtle rounded-lg text-body-sm text-text-primary"
                      >
                        <option value="paid">Paid (Per Invocation)</option>
                        <option value="free">Free & Open Source</option>
                      </select>
                    </div>

                    {pricingType === 'paid' && (
                      <div>
                        <label className="block text-body-sm font-medium text-text-primary mb-1.5">Price (USD / call)</label>
                        <input 
                          value={price}
                          onChange={e => setPrice(e.target.value)}
                          placeholder="0.0024"
                          className="w-full h-10 px-3 bg-bg-surface border border-border-subtle rounded-lg font-code-sm text-body-sm text-text-primary"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-body-sm font-medium text-text-primary mb-1.5">License</label>
                      <select 
                        value={license}
                        onChange={e => setLicense(e.target.value)}
                        className="w-full h-10 px-3 bg-bg-surface border border-border-subtle rounded-lg text-body-sm text-text-primary"
                      >
                        <option>Apache-2.0</option>
                        <option>MIT</option>
                        <option>Proprietary Enterprise</option>
                      </select>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="p-4 bg-bg-surface border border-border-subtle rounded-xl space-y-2 text-xs font-code-sm">
                    <div className="text-text-primary font-semibold text-sm font-sans mb-1">Submission Monograph</div>
                    <div>Entity: <span className="text-primary-container font-medium">{name || 'OctoCode Architect'}</span> ({slug || 'octocode-architect'})</div>
                    <div>Protocol: <span className="text-text-primary font-medium">{protocol.toUpperCase()}</span> • Enclave: <span className="text-text-primary font-medium">{isolationTier}</span></div>
                    <div>70% Revenue Share: <span className="text-status-success font-medium">Active (Direct stripe/token payout)</span></div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-border-subtle">
                    <button 
                      onClick={() => setCurrentStep(4)}
                      className="h-10 px-4 bg-bg-surface hover:bg-bg-canvas border border-border-subtle text-text-secondary hover:text-text-primary rounded-lg text-body-sm font-medium"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleFinalSubmit}
                      disabled={publishing}
                      className="h-10 px-6 bg-primary-container hover:bg-accent-hover text-white rounded-lg text-body-sm font-medium transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">publish</span>
                      <span>{publishing ? 'Registering with Kyron...' : 'Publish to Kyron Registry'}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

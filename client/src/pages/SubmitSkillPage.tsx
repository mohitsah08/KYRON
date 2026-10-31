import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { loginPathFor } from '../utils/authHelpers.ts';
import { api } from '../utils/api.ts';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Code,
  Eye,
  Plus,
  Trash2,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  FileCheck,
  Layers,
  Save,
  Send
} from 'lucide-react';

interface SupportingFile {
  path: string;
  name?: string;
  content: string;
}

export function SubmitSkillPage() {
  const { path, navigate } = useRouter();
  const { user } = useAuth();

  // Mode: 'scratch' | 'upload'
  const [mode, setMode] = useState<'scratch' | 'upload'>('scratch');
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');

  // Skill metadata
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Code Intelligence');
  const [version, setVersion] = useState('1.0.0');
  const [license, setLicense] = useState('MIT');
  const [tags, setTags] = useState('agent, workflow, automation');
  const [compatibility, setCompatibility] = useState('Claude Code, Cursor, OpenAI Codex, Antigravity');
  const [pricingType, setPricingType] = useState<'free' | 'paid'>('free');
  const [price, setPrice] = useState('4.99');

  // Instructions & files
  const [instructions, setInstructions] = useState(
    `# Skill Overview\nProvide a clear explanation of what this skill enables for the AI agent.\n\n## Capabilities\n- Inspects project structure\n- Automates key development workflows\n\n## Usage Instructions\nWhen the user requests this workflow, follow the guidelines below...`
  );
  const [supportingFiles, setSupportingFiles] = useState<SupportingFile[]>([]);
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [showAddFileModal, setShowAddFileModal] = useState(false);

  // Upload state
  const [uploadLoading, setUploadLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    converted?: boolean;
    extracted_frontmatter?: any;
    extracted_instructions?: string;
    files_count?: number;
    files?: Array<{ name: string; content: string }> | string[];
    errors?: string[];
    warnings: string[];
    security_scan?: any;
  } | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle slug generation from name
  const handleNameChange = (val: string) => {
    setName(val);
    const generated = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(generated);
    }
  };

  // Upload handler for ZIP, SKILL.md, or plain .md
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadLoading(true);
    setValidationResult(null);

    try {
      const isZip = file.name.endsWith('.zip');
      const isSkillMd = file.name.toLowerCase() === 'skill.md';
      const isMd = file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt');

      if (!isZip && !isMd) {
        throw new Error('Please upload a .zip archive, SKILL.md, or .md markdown file.');
      }

      if (isZip) {
        const base64 = await readFileAsBase64(file);
        const res = await api.validatePackage({
          type: 'zip',
          base64
        });
        setValidationResult(res);

        if (res.extracted_frontmatter) {
          if (res.extracted_frontmatter.name) {
            setName(res.extracted_frontmatter.name);
            setSlug(res.extracted_frontmatter.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
          }
          if (res.extracted_frontmatter.description) setDescription(res.extracted_frontmatter.description);
          if (res.extracted_frontmatter.version) setVersion(res.extracted_frontmatter.version);
          if (res.extracted_frontmatter.license) setLicense(res.extracted_frontmatter.license);
          if (res.extracted_frontmatter.compatibility) setCompatibility(res.extracted_frontmatter.compatibility);
        }
        if (res.extracted_instructions) {
          setInstructions(res.extracted_instructions);
        }
      } else {
        const text = await readFileAsText(file);
        const res = await api.validatePackage({
          type: isSkillMd ? 'skill_md' : 'plain_md',
          content: text,
          filename: file.name
        });
        setValidationResult(res);

        if (res.extracted_frontmatter) {
          if (res.extracted_frontmatter.name) {
            setName(res.extracted_frontmatter.name);
            setSlug(res.extracted_frontmatter.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
          }
          if (res.extracted_frontmatter.description) setDescription(res.extracted_frontmatter.description);
          if (res.extracted_frontmatter.version) setVersion(res.extracted_frontmatter.version);
        }
        if (res.extracted_instructions) {
          setInstructions(res.extracted_instructions);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to inspect uploaded package');
    } finally {
      setUploadLoading(false);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleAddSupportingFile = () => {
    if (!newFilePath.trim()) return;
    const cleanPath = newFilePath.trim().replace(/^\/+/, '');
    if (supportingFiles.some(f => f.path === cleanPath)) {
      setError(`File ${cleanPath} already exists in supporting resources.`);
      return;
    }
    setSupportingFiles([...supportingFiles, { path: cleanPath, content: newFileContent }]);
    setNewFilePath('');
    setNewFileContent('');
    setShowAddFileModal(false);
  };

  const handleRemoveSupportingFile = (index: number) => {
    setSupportingFiles(supportingFiles.filter((_, i) => i !== index));
  };

  const handleSave = async (isDraft: boolean) => {
    if (!user) {
      navigate(loginPathFor(window.location.pathname));
      return;
    }

    if (!name.trim()) {
      setError('Skill Name is required.');
      return;
    }
    if (!description.trim()) {
      setError('Skill Description is required.');
      return;
    }
    if (!instructions.trim()) {
      setError('Markdown instructions are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const parsedTags = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        summary: description.trim(),
        description: description.trim(),
        category,
        version: version.trim() || '1.0.0',
        license: license.trim() || 'MIT',
        compatibility: compatibility.trim() || undefined,
        compatibility_type: compatibility.trim() || undefined,
        tags: parsedTags,
        pricing_type: pricingType,
        price: pricingType === 'paid' ? parseFloat(price) || 0 : 0,
        instructions: instructions.trim(),
        skill_md_content: instructions.trim(),
        supporting_files: supportingFiles,
        files: supportingFiles,
        is_draft: isDraft
      };

      const res = await api.publishSkill(payload);
      setSuccessMessage(
        isDraft
          ? 'Draft saved successfully! You can find it in your Creator Studio.'
          : 'Skill published to Marketplace successfully!'
      );
      setTimeout(() => {
        navigate('/creator');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save skill.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#171717] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E8E8E6]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/creator')}
              className="p-1.5 rounded-lg border border-[#E8E8E6] bg-white text-[#737373] hover:text-[#171717] hover:border-[#D4D4D0] transition-colors"
              title="Back to Creator Studio"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-[#F97316] uppercase tracking-wider">
                  Creator Studio
                </span>
                <span className="text-[#A3A3A3]">/</span>
                <span className="text-xs font-mono text-[#737373]">Skill Editor</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#171717] mt-0.5">
                Create & Publish AI Skill
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(true)}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-[#E8E8E6] bg-white text-sm font-medium text-[#171717] hover:bg-[#F5F5F4] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-[#737373]" />
              <span>Save Draft</span>
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Publishing...' : 'Publish to Marketplace'}</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Action failed</div>
              <div>{error}</div>
            </div>
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="font-medium">{successMessage}</div>
          </div>
        )}

        {/* Mode Selector */}
        <div className="flex gap-2 p-1 bg-[#EDEDEB] rounded-xl w-fit mb-6">
          <button
            onClick={() => setMode('scratch')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              mode === 'scratch'
                ? 'bg-white text-[#171717] shadow-xs'
                : 'text-[#737373] hover:text-[#171717]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Create from Scratch</span>
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              mode === 'upload'
                ? 'bg-white text-[#171717] shadow-xs'
                : 'text-[#737373] hover:text-[#171717]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Existing Skill (ZIP / SKILL.md / MD)</span>
          </button>
        </div>

        {/* Upload Mode Card */}
        {mode === 'upload' && (
          <div className="mb-8 p-6 bg-white rounded-xl border border-[#E8E8E6] shadow-xs">
            <h2 className="text-base font-semibold text-[#171717] mb-1 flex items-center gap-2">
              <FolderArchive className="w-5 h-5 text-[#F97316]" />
              <span>Import Skill Archive or Document</span>
            </h2>
            <p className="text-xs text-[#737373] mb-4">
              Upload an Agent Skills ZIP package, a standalone <code className="font-mono bg-[#F5F5F4] px-1 py-0.5 rounded text-[#171717]">SKILL.md</code>, or a plain Markdown guide. Plain markdown files will be automatically structured into an Agent Skill with valid YAML frontmatter.
            </p>

            <label className="border-2 border-dashed border-[#D4D4D0] hover:border-[#F97316] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[#FAFAF9] transition-colors">
              <input
                type="file"
                accept=".zip,.md,.markdown,.txt"
                onChange={handleFileUpload}
                disabled={uploadLoading}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-[#A3A3A3] mb-2" />
              <span className="text-sm font-semibold text-[#171717]">
                {uploadLoading ? 'Validating package...' : 'Click to select ZIP archive or Markdown file'}
              </span>
              <span className="text-xs text-[#737373] mt-1">
                Supports .zip (max 25MB), SKILL.md, or .md documents
              </span>
            </label>

            {/* Validation & Security Report */}
            {validationResult && (
              <div className="mt-6 border border-[#E8E8E6] rounded-xl p-5 bg-[#FAFAF9]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8E8E6]">
                  <div className="flex items-center gap-2">
                    {validationResult.valid ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Package Validated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Validation Issues Detected
                      </span>
                    )}
                    {validationResult.converted && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <Sparkles className="w-3.5 h-3.5" />
                        Plain Markdown converted with YAML frontmatter
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-[#737373]">
                    {validationResult.files_count ?? 1} file(s) inspected
                  </span>
                </div>

                {/* Security checks grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
                  <div className="p-2.5 rounded-lg bg-white border border-[#E8E8E6] text-xs">
                    <div className="text-[#737373] text-[11px] mb-1">Path Traversal</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Protected
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E8E8E6] text-xs">
                    <div className="text-[#737373] text-[11px] mb-1">Primary Skill File</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" /> Unique SKILL.md
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E8E8E6] text-xs">
                    <div className="text-[#737373] text-[11px] mb-1">Executable Guard</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Safe (Non-exec)
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E8E8E6] text-xs">
                    <div className="text-[#737373] text-[11px] mb-1">Frontmatter Schema</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Standard Name/Desc
                    </div>
                  </div>
                </div>

                {validationResult.files && validationResult.files.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-[#171717] mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#F97316]" />
                      <span>Archive Structure ({validationResult.files.length} items)</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto font-mono text-xs p-3 rounded-lg bg-white border border-[#E8E8E6] text-[#525252] space-y-1">
                      {validationResult.files.map((f, i) => {
                        const fileName = typeof f === 'string' ? f : (f.name || '');
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[#A3A3A3]">├──</span>
                            <span className={fileName.toLowerCase().includes('skill.md') ? 'font-bold text-[#F97316]' : ''}>
                              {fileName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Editor Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Metadata & Config */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-xl border border-[#E8E8E6] p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#737373] pb-2 border-b border-[#E8E8E6]">
                General Metadata
              </h2>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Skill Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. NextJS Architecture Reviewer"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E8E8E6] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Slug (URL Identifier)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="nextjs-architecture-reviewer"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-[#E8E8E6] bg-[#FAFAF9] text-[#525252] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Description / Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Comprehensive evaluation checklist for Next.js App Router projects..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E8E8E6] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E8E8E6] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  >
                    <option>Code Intelligence</option>
                    <option>DevOps & CI/CD</option>
                    <option>Architecture & Design</option>
                    <option>Security & Auditing</option>
                    <option>Data Engineering</option>
                    <option>Testing & QA</option>
                    <option>Documentation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-[#E8E8E6] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    License
                  </label>
                  <input
                    type="text"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    placeholder="MIT"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E8E8E6] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Pricing
                  </label>
                  <select
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value as 'free' | 'paid')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E8E8E6] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  >
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              {pricingType === 'paid' && (
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Price (USD / Credits)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-[#737373]">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.50"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm font-mono rounded-lg border border-[#E8E8E6] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="nextjs, react, security"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E8E8E6] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#171717] mb-1">
                  Agent Compatibility
                </label>
                <input
                  type="text"
                  value={compatibility}
                  onChange={(e) => setCompatibility(e.target.value)}
                  placeholder="Claude Code, Cursor, Codex, Antigravity"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E8E8E6] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                />
              </div>
            </div>

            {/* Supporting Resources Section */}
            <div className="bg-white rounded-xl border border-[#E8E8E6] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E6]">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                    Supporting Resources
                  </h2>
                  <p className="text-[11px] text-[#A3A3A3]">
                    guides, scripts, templates inside ZIP
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddFileModal(true)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-[#E8E8E6] hover:border-[#D4D4D0] bg-[#FAFAF9] text-[#171717] font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Add File</span>
                </button>
              </div>

              {supportingFiles.length === 0 ? (
                <div className="text-xs text-[#737373] py-2 text-center">
                  No extra files added. (Package will include primary SKILL.md)
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {supportingFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAF9] border border-[#E8E8E6] text-xs font-mono"
                    >
                      <span className="truncate max-w-[200px] text-[#171717]">{file.path}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSupportingFile(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Markdown Editor & Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-[#E8E8E6] shadow-xs flex flex-col h-full min-h-[600px]">
              {/* Editor Tabs */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E8E6]">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditorTab('edit')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                      editorTab === 'edit'
                        ? 'bg-[#FFF4EB] text-[#F97316]'
                        : 'text-[#737373] hover:text-[#171717]'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>SKILL.md Editor</span>
                  </button>
                  <button
                    onClick={() => setEditorTab('preview')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                      editorTab === 'preview'
                        ? 'bg-[#FFF4EB] text-[#F97316]'
                        : 'text-[#737373] hover:text-[#171717]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Rendered Preview</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#737373] bg-[#FAFAF9] px-2 py-0.5 rounded border border-[#E8E8E6]">
                    Format: Agent Skills Open Spec
                  </span>
                </div>
              </div>

              {/* Editor / Preview Area */}
              <div className="p-5 flex-1 flex flex-col">
                {editorTab === 'edit' ? (
                  <div className="flex-1 flex flex-col space-y-3">
                    <div className="p-3 bg-[#FAFAF9] rounded-lg border border-[#E8E8E6] text-xs font-mono text-[#737373]">
                      <div className="text-[#A3A3A3] mb-1 font-semibold text-[11px] uppercase">Generated Frontmatter Header:</div>
                      <div>---</div>
                      <div>name: {slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'my-skill'}</div>
                      <div>description: {description || 'Skill description...'}</div>
                      <div>version: {version}</div>
                      <div>license: {license}</div>
                      <div>---</div>
                    </div>

                    <label className="text-xs font-medium text-[#171717]">
                      Instruction Content (Markdown):
                    </label>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="# Skill Instructions\n\nExplain precisely how your AI agent should execute this workflow..."
                      className="w-full flex-1 min-h-[380px] p-4 font-mono text-sm rounded-lg border border-[#E8E8E6] bg-white text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316] leading-relaxed resize-y"
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto prose prose-neutral max-w-none p-4 border border-[#E8E8E6] rounded-lg bg-[#FAFAF9]">
                    <div className="mb-4 pb-3 border-b border-[#E8E8E6]">
                      <span className="text-xs font-mono uppercase bg-[#EDEDEB] px-2 py-1 rounded text-[#525252]">
                        Frontmatter Preview
                      </span>
                      <pre className="mt-2 text-xs font-mono bg-white p-3 rounded border border-[#E8E8E6] text-[#171717]">
{`---
name: ${slug || 'my-skill'}
description: ${description || 'Skill description'}
version: ${version}
license: ${license}
---`}
                      </pre>
                    </div>

                    <div className="whitespace-pre-wrap font-sans text-sm text-[#171717] leading-relaxed">
                      {instructions}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Add Supporting File */}
        {showAddFileModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-[#E8E8E6] max-w-lg w-full p-6 shadow-xl">
              <h3 className="text-base font-bold text-[#171717] mb-1">
                Add Supporting Resource File
              </h3>
              <p className="text-xs text-[#737373] mb-4">
                Include auxiliary guides (e.g. <code className="font-mono">references/guide.md</code>), sample configs, or script templates that package inside the ZIP.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Relative File Path inside package
                  </label>
                  <input
                    type="text"
                    value={newFilePath}
                    onChange={(e) => setNewFilePath(e.target.value)}
                    placeholder="references/cheatsheet.md"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-[#E8E8E6] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    File Content
                  </label>
                  <textarea
                    value={newFileContent}
                    onChange={(e) => setNewFileContent(e.target.value)}
                    rows={6}
                    placeholder="# Additional Guide\n..."
                    className="w-full p-3 font-mono text-xs rounded-lg border border-[#E8E8E6] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[#E8E8E6]">
                <button
                  type="button"
                  onClick={() => setShowAddFileModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#737373] hover:text-[#171717] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddSupportingFile}
                  disabled={!newFilePath.trim()}
                  className="px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  Add File to Package
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

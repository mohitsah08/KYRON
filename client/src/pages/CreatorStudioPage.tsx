import React, { useEffect, useState } from 'react';
import { useRouter, Link } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';
import { Skill } from '../types.ts';
import JSZip from 'jszip';
import {
  Sparkles,
  Plus,
  Eye,
  Edit3,
  Archive,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Download,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag,
  Search,
  Trash2,
  Send,
  Save,
  FolderArchive,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Check,
  Globe,
  Upload,
  User,
  Settings,
  HelpCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { CATEGORIES } from '../constants/categories.ts';

interface SupportingFile {
  name: string;
  content: string;
}

const STANDARD_SECURITY_CHECKS = [
  {
    id: 'RULE_FRONTMATTER',
    name: 'Frontmatter & Metadata Integrity',
    description: 'Validates YAML frontmatter syntax, required fields (name, description), and instruction body.',
    defaultDetails: 'Checks for standard YAML frontmatter specification and non-empty instruction body.'
  },
  {
    id: 'RULE_PROMPT_INJECTION',
    name: 'Prompt Injection & Hijacking Guard',
    description: 'Inspects instruction text for prompt override strings, DAN jailbreaks, or system prompt leaks.',
    defaultDetails: 'Scans for jailbreak patterns and adversarial prompt override attempts.'
  },
  {
    id: 'RULE_DISK_MUTATION',
    name: 'Destructive Disk & OS Operations',
    description: 'Detects unsafe root deletion (rm -rf /), filesystem reformatting, fork bombs, and dangerous chmod operations.',
    defaultDetails: 'Blocks destructive filesystem commands and catastrophic disk mutations.'
  },
  {
    id: 'RULE_EXFILTRATION',
    name: 'Credentials & Secret Exfiltration',
    description: 'Scans for hardcoded AWS keys, OpenAI API tokens, GitHub PATs, private keys, and sensitive shadow/passwd paths.',
    defaultDetails: 'Guards against embedded API secrets, SSH keys, and system credential exfiltration.'
  },
  {
    id: 'RULE_SHELL_EXECUTION',
    name: 'Remote Shell & Unrestricted Execution',
    description: 'Identifies reverse shells (nc -e, /dev/tcp), remote script pipe execution (curl | bash), and raw binary launches.',
    defaultDetails: 'Prevents covert reverse shells and pipe-to-shell remote code execution.'
  },
  {
    id: 'RULE_TELEMETRY_PROBES',
    name: 'Covert Telemetry & Network Beacons',
    description: 'Checks for unauthorized user tracking, keylogging probes, and exfiltration via raw IP socket endpoints.',
    defaultDetails: 'Detects stealth telemetry webhooks, covert beacons, and unauthenticated network tunnels.'
  },
  {
    id: 'RULE_SANITIZED_OUTPUT',
    name: 'Code Obfuscation & Dynamic Eval',
    description: 'Flags base64 execution (eval(atob)), obfuscated hex payloads, and dynamic Buffer code evaluation.',
    defaultDetails: 'Ensures instruction transparency and prevents encoded obfuscation payloads.'
  },
  {
    id: 'RULE_PACKAGE_STRUCTURE',
    name: 'Package Structure & Path Traversal',
    description: 'Prevents directory traversal (../), prohibited binaries (.exe, .dll, .bin), and verifies package size limits.',
    defaultDetails: 'Enforces safe package directory layout and blocks dangerous executable binaries.'
  }
];

export function CreatorStudioPage() {
  const { path, navigate } = useRouter();
  const { user, refreshUser } = useAuth();

  // Active Tab: check URL search params or path
  const [activeTab, setActiveTab] = useState<
    'overview' | 'skills' | 'create' | 'versions' | 'storefront' | 'analytics' | 'earnings' | 'docs'
  >('overview');

  // Overview Metrics State
  const [metrics, setMetrics] = useState<any>(null);
  const [recentSkills, setRecentSkills] = useState<Skill[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // My Skills State
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsSearch, setSkillsSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'submitted' | 'approved' | 'draft' | 'paused' | 'rejected'>('all');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Submissions State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // Version Management State
  const [selectedSkillForVersions, setSelectedSkillForVersions] = useState<string>('');
  const [skillVersions, setSkillVersions] = useState<any[]>([]);
  const [newVersionNumber, setNewVersionNumber] = useState('');
  const [newVersionChangelog, setNewVersionChangelog] = useState('');
  const [showVersionModal, setShowVersionModal] = useState(false);

  // Creator Storefront Profile State
  const [profileName, setProfileName] = useState(user?.display_name || '');
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [profileWebsite, setProfileWebsite] = useState((user as any)?.website_url || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar_url || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Skill Editor State
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<'scratch' | 'upload'>('scratch');
  const [editorSubTab, setEditorSubTab] = useState<'edit' | 'preview'>('edit');
  const [skillName, setSkillName] = useState('');
  const [skillSlug, setSkillSlug] = useState('');
  const [skillSummary, setSkillSummary] = useState('');
  const [skillDescription, setSkillDescription] = useState('');
  const [skillCategory, setSkillCategory] = useState(CATEGORIES[0]?.slug || 'frontend-web-apps');
  const [skillTags, setSkillTags] = useState('agent, workflow, automation');
  const [skillVersion, setSkillVersion] = useState('1.0.0');
  const [skillLicense, setSkillLicense] = useState('MIT');
  const [pricingType, setPricingType] = useState<'free' | 'paid'>('free');
  const [price, setPrice] = useState('9.99');
  const [activeFile, setActiveFile] = useState<string>('SKILL.md');
  const [skillMdContent, setSkillMdContent] = useState(
    `---\nname: my-new-skill\ndescription: Enforces automated engineering standards and quality checks\nversion: 1.0.0\nlicense: MIT\ncompatibility: [claude-code, cursor, codex, antigravity]\n---\n\n# Skill Overview\n\nWhen working on this project, follow the instructions below:\n\n## 1. General Directives\n- Inspect files before modifying.\n- Never delete user data or remove security checks.`
  );
  const [supportingFiles, setSupportingFiles] = useState<SupportingFile[]>([]);
  const [newFileName, setNewFileName] = useState('');
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);

  // Read URL search params on mount (e.g. ?tab=create)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['overview', 'skills', 'create', 'versions', 'storefront', 'analytics', 'earnings', 'docs'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, []);

  // Sync profile fields from user
  useEffect(() => {
    if (user) {
      setProfileName(user.display_name || '');
      setProfileBio(user.bio || '');
      setProfileWebsite((user as any).website_url || '');
      setProfileAvatar(user.avatar_url || '');
    }
  }, [user]);

  // Load Overview Data
  const loadOverview = async () => {
    try {
      setOverviewLoading(true);
      const res = await api.getCreatorOverview();
      setMetrics(res.metrics);
      setRecentSkills(res.recent_skills || []);
      setRecentSubmissions(res.recent_submissions || []);
    } catch (err: any) {
      console.error('Failed to load creator overview:', err);
    } finally {
      setOverviewLoading(false);
    }
  };

  // Load Skills Catalog
  const loadSkills = async () => {
    try {
      setSkillsLoading(true);
      const res = await api.getCreatorSkills();
      setSkills(res.skills || []);
    } catch (err: any) {
      console.error('Failed to load creator skills:', err);
    } finally {
      setSkillsLoading(false);
    }
  };

  // Load Submissions
  const loadSubmissions = async () => {
    try {
      setSubmissionsLoading(true);
      const res = await api.getCreatorSubmissions();
      setSubmissions(res.submissions || []);
    } catch (err: any) {
      console.error('Failed to load submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadSkills();
    loadSubmissions();
  }, []);

  // Quick Action Notification Clearer
  const showNotice = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Switch to Create Tab to start fresh skill
  const startNewSkill = () => {
    setEditingSkillId(null);
    setSkillName('');
    setSkillSlug('');
    setSkillSummary('');
    setSkillDescription('');
    setSkillCategory(CATEGORIES[0]?.slug || 'frontend-web-apps');
    setSkillTags('agent, workflow, automation');
    setSkillVersion('1.0.0');
    setSkillLicense('MIT');
    setPricingType('free');
    setPrice('9.99');
    setSkillMdContent(
      `---\nname: my-new-skill\ndescription: Enforces automated engineering standards and quality checks\nversion: 1.0.0\nlicense: MIT\ncompatibility: [claude-code, cursor, codex, antigravity]\n---\n\n# Skill Overview\n\nWhen working on this project, follow the instructions below:\n\n## 1. General Directives\n- Inspect files before modifying.\n- Never delete user data or remove security checks.`
    );
    setSupportingFiles([]);
    setActiveFile('SKILL.md');
    setValidationReport(null);
    setHasUnsavedChanges(false);
    setActiveTab('create');
  };

  // Load an existing skill into the Editor
  const loadSkillIntoEditor = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await api.getCreatorSkill(id);
      const s = res.skill;
      const pkg = res.package;

      setEditingSkillId(s.id);
      setSkillName(s.name);
      setSkillSlug(s.slug);
      setSkillSummary(s.summary);
      setSkillDescription(s.description);
      setSkillCategory(s.category);
      setSkillTags(Array.isArray(s.tags) ? s.tags.join(', ') : s.tags || '');
      setSkillVersion(pkg?.version || s.current_version || '1.0.0');
      setSkillLicense((s as any).license || 'MIT');
      setPricingType(s.pricing_type as any);
      setPrice(String(s.price || 9.99));
      setSkillMdContent(pkg?.skill_md_content || '');

      const filesList: SupportingFile[] = [];
      if (pkg?.files) {
        Object.entries(pkg.files).forEach(([name, content]) => {
          if (name !== 'SKILL.md') {
            filesList.push({ name, content: content as string });
          }
        });
      }
      setSupportingFiles(filesList);
      setActiveFile('SKILL.md');
      setHasUnsavedChanges(false);
      setActiveTab('create');
      showNotice('success', `Loaded "${s.name}" into Skill Editor.`);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to load skill for editing.');
    } finally {
      setProcessingId(null);
    }
  };

  // Skill Editor: Name change & auto slug
  const handleNameChange = (val: string) => {
    setSkillName(val);
    setHasUnsavedChanges(true);
    const generated = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!editingSkillId && (!skillSlug || skillSlug === skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-'))) {
      setSkillSlug(generated);
    }
  };

  // Skill Editor: Add new file
  const handleAddFile = () => {
    if (!newFileName.trim()) return;
    const cleanPath = newFileName.trim().replace(/^\/+/, '');
    if (cleanPath === 'SKILL.md' || supportingFiles.some(f => f.name === cleanPath)) {
      showNotice('error', 'A file with this name already exists.');
      return;
    }
    const updated = [...supportingFiles, { name: cleanPath, content: `# ${cleanPath}\n` }];
    setSupportingFiles(updated);
    setActiveFile(cleanPath);
    setNewFileName('');
    setShowAddFileModal(false);
    setHasUnsavedChanges(true);
  };

  // Skill Editor: Remove file
  const handleDeleteFile = (fileName: string) => {
    if (fileName === 'SKILL.md') {
      showNotice('error', 'SKILL.md is the root requirement and cannot be deleted.');
      return;
    }
    const updated = supportingFiles.filter(f => f.name !== fileName);
    setSupportingFiles(updated);
    if (activeFile === fileName) {
      setActiveFile('SKILL.md');
    }
    setHasUnsavedChanges(true);
  };

  // Skill Editor: Update current file content
  const handleContentChange = (content: string) => {
    setHasUnsavedChanges(true);
    if (activeFile === 'SKILL.md') {
      setSkillMdContent(content);
    } else {
      setSupportingFiles(supportingFiles.map(f => (f.name === activeFile ? { ...f, content } : f)));
    }
  };

  // Get active file content
  const getActiveContent = () => {
    if (activeFile === 'SKILL.md') return skillMdContent;
    const found = supportingFiles.find(f => f.name === activeFile);
    return found ? found.content : '';
  };

  // Validate current package and run 8-point security check
  const handleValidatePackage = async () => {
    try {
      const res = await api.validatePackage({
        type: 'markdown',
        content: skillMdContent,
        files: supportingFiles,
        nameHint: skillSlug || 'my-skill'
      });
      setValidationReport(res);
      if (res.valid && res.security_scan?.overallStatus === 'pass') {
        showNotice('success', 'Automated security scan completed: All 8 checks passed.');
      } else {
        const failCount = res.security_scan?.results?.filter((r: any) => r.status === 'fail').length || 0;
        showNotice('error', `Security check flagged ${failCount} critical issue(s). Resolve before publishing.`);
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Validation request failed.');
    }
  };

  // Upload handler for ZIP or SKILL.md
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isZip = file.name.endsWith('.zip');
      const reader = new FileReader();

      if (isZip) {
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const valRes = await api.validatePackage({
            type: 'zip',
            content: base64,
            filename: file.name
          });

          if (valRes.skill_md_content) {
            setSkillMdContent(valRes.skill_md_content);
          }
          if (valRes.skillName) {
            setSkillName(valRes.skillName.replace(/-/g, ' '));
            setSkillSlug(valRes.skillName);
          }
          if (valRes.description) {
            setSkillSummary(valRes.description);
            setSkillDescription(valRes.description);
          }
          if (valRes.version) setSkillVersion(valRes.version);
          if (valRes.license) setSkillLicense(valRes.license);
          if (valRes.files) {
            setSupportingFiles(valRes.files.map(f => ({ name: f.name, content: f.content })));
          }
          setValidationReport(valRes);
          setHasUnsavedChanges(true);
          showNotice('success', `Extracted archive "${file.name}" with ${valRes.files_count} file(s).`);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = async () => {
          const text = reader.result as string;
          const valRes = await api.validatePackage({
            type: 'markdown',
            content: text,
            filename: file.name
          });

          setSkillMdContent(valRes.skill_md_content || text);
          if (valRes.skillName) {
            setSkillName(valRes.skillName);
            setSkillSlug(valRes.skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
          }
          if (valRes.description) {
            setSkillSummary(valRes.description);
            setSkillDescription(valRes.description);
          }
          setValidationReport(valRes);
          setHasUnsavedChanges(true);
          showNotice('success', `Loaded ${file.name} successfully.`);
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to process uploaded file.');
    }
  };

  // Save Draft to Server / Supabase
  const handleSaveDraft = async (): Promise<boolean> => {
    if (!skillName.trim() || !skillSummary.trim()) {
      showNotice('error', 'Skill name and summary are required to save a draft.');
      return false;
    }

    try {
      setEditorSaving(true);
      const parsedTags = skillTags.split(',').map(t => t.trim()).filter(Boolean);
      const cleanSlug = skillSlug || skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      if (editingSkillId) {
        // Update existing draft record, preserving ID and preventing duplicate records
        await api.updateSkill(editingSkillId, {
          name: skillName,
          summary: skillSummary,
          description: skillDescription || skillSummary,
          category: skillCategory,
          tags: parsedTags,
          pricing_type: pricingType,
          price: pricingType === 'free' ? 0 : parseFloat(price) || 0,
          version: skillVersion,
          license: skillLicense,
          skill_md_content: skillMdContent,
          files: supportingFiles,
          status: 'draft'
        });
        showNotice('success', 'Draft saved successfully.');
      } else {
        // Create new draft record
        const res = await api.publishSkill({
          name: skillName,
          slug: cleanSlug,
          summary: skillSummary,
          description: skillDescription || skillSummary,
          category: skillCategory,
          tags: parsedTags,
          pricing_type: pricingType,
          price: pricingType === 'free' ? 0 : parseFloat(price) || 0,
          version: skillVersion,
          license: skillLicense,
          skill_md_content: skillMdContent,
          files: supportingFiles,
          is_draft: true
        });
        setEditingSkillId(res.skill_id);
        showNotice('success', 'New draft saved successfully.');
      }

      setHasUnsavedChanges(false);
      await loadSkills();
      await loadOverview();
      return true;
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to save draft.');
      return false;
    } finally {
      setEditorSaving(false);
    }
  };

  // Publish Skill Directly to Marketplace
  const handlePublish = async () => {
    if (!skillName.trim() || !skillSummary.trim()) {
      showNotice('error', 'Skill name and summary are required to publish.');
      return;
    }

    try {
      setEditorSaving(true);

      // 1. Run live security scan on current editor content and supporting files
      const valRes = await api.validatePackage({
        type: 'markdown',
        content: skillMdContent,
        files: supportingFiles,
        nameHint: skillSlug || 'my-skill'
      });
      setValidationReport(valRes);

      if (!valRes.valid || valRes.security_scan?.overallStatus === 'fail') {
        const failedChecks = valRes.security_scan?.results?.filter((r: any) => r.status === 'fail') || [];
        const failureDetails = failedChecks.map((r: any) => r.description || r.details).join('; ') || 'Security check failed';
        showNotice('error', `Publish blocked: ${failureDetails}`);
        return;
      }

      // 2. Persist with status = 'published'
      const parsedTags = skillTags.split(',').map(t => t.trim()).filter(Boolean);
      const cleanSlug = skillSlug || skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      if (editingSkillId) {
        // Publish existing draft, preserving ID
        await api.updateSkill(editingSkillId, {
          name: skillName,
          summary: skillSummary,
          description: skillDescription || skillSummary,
          category: skillCategory,
          tags: parsedTags,
          pricing_type: pricingType,
          price: pricingType === 'free' ? 0 : parseFloat(price) || 0,
          version: skillVersion,
          license: skillLicense,
          skill_md_content: skillMdContent,
          files: supportingFiles,
          status: 'published'
        });
        showNotice('success', `Skill "${skillName}" successfully published to Marketplace!`);
      } else {
        // Publish new skill directly
        const res = await api.publishSkill({
          name: skillName,
          slug: cleanSlug,
          summary: skillSummary,
          description: skillDescription || skillSummary,
          category: skillCategory,
          tags: parsedTags,
          pricing_type: pricingType,
          price: pricingType === 'free' ? 0 : parseFloat(price) || 0,
          version: skillVersion,
          license: skillLicense,
          skill_md_content: skillMdContent,
          files: supportingFiles,
          is_draft: false,
          status: 'published'
        });
        setEditingSkillId(res.skill_id);
        showNotice('success', `Skill "${skillName}" successfully published to Marketplace!`);
      }

      setHasUnsavedChanges(false);
      await loadSkills();
      await loadOverview();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to publish skill.');
    } finally {
      setEditorSaving(false);
    }
  };

  // Download SKILL.md
  const handleExportMarkdown = () => {
    try {
      const currentSlug = (skillSlug || 'skill').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      let finalMd = skillMdContent;
      // Ensure frontmatter is present and valid
      if (!/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]*/m.test(finalMd)) {
        const cleanDesc = (skillSummary || skillName || 'AI Skill').replace(/[\r\n]+/g, ' ');
        finalMd = `---\nname: ${currentSlug}\ndescription: "${cleanDesc}"\nversion: ${skillVersion || '1.0.0'}\nlicense: ${skillLicense || 'MIT'}\ncompatibility: [claude-code, cursor, codex, antigravity]\n---\n\n${finalMd}`;
      }
      const blob = new Blob([finalMd], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSlug}.SKILL.md`;
      a.click();
      URL.revokeObjectURL(url);
      showNotice('success', `Downloaded ${currentSlug}.SKILL.md successfully.`);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to download SKILL.md.');
    }
  };

  // Export ZIP Archive
  const handleExportZip = async () => {
    try {
      const currentSlug = (skillSlug || 'my-skill').toLowerCase().replace(/[^a-z0-9_-]/g, '-');

      // Auto-save draft if needed
      if (hasUnsavedChanges || !editingSkillId) {
        await handleSaveDraft();
      }

      // Format final SKILL.md with frontmatter
      let finalMd = skillMdContent;
      if (!/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]*/m.test(finalMd)) {
        const cleanDesc = (skillSummary || skillName || 'AI Skill').replace(/[\r\n]+/g, ' ');
        finalMd = `---\nname: ${currentSlug}\ndescription: "${cleanDesc}"\nversion: ${skillVersion || '1.0.0'}\nlicense: ${skillLicense || 'MIT'}\ncompatibility: [claude-code, cursor, codex, antigravity]\n---\n\n${finalMd}`;
      }

      // Build zip with directory structure <slug>/SKILL.md and <slug>/<files>
      const zip = new JSZip();
      const folder = zip.folder(currentSlug) || zip;
      folder.file('SKILL.md', finalMd);
      for (const file of supportingFiles) {
        if (file.name !== 'SKILL.md') {
          folder.file(file.name.replace(/^[/\\]+/, ''), file.content);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSlug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showNotice('success', `Exported "${currentSlug}.zip" successfully.`);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to export ZIP package.');
    }
  };

  // Safe table ZIP download without opening blank raw JSON error pages
  const handleDownloadZipForSkill = async (slug: string) => {
    try {
      const token = localStorage.getItem('kyron_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(api.getZipDownloadUrl(slug), { headers });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Download failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showNotice('success', `Downloaded ${slug}.zip successfully.`);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to download ZIP package.');
    }
  };

  // Quick Action: Publish an approved skill
  const handlePublishApproved = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await api.publishApprovedSkill(id);
      showNotice('success', res.message || 'Skill published to Marketplace!');
      await loadSkills();
      await loadOverview();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to publish skill.');
    } finally {
      setProcessingId(null);
    }
  };

  // Quick Action: Pause skill
  const handlePauseSkill = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await api.pauseSkill(id);
      showNotice('success', res.message || 'Skill paused.');
      await loadSkills();
      await loadOverview();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to pause skill.');
    } finally {
      setProcessingId(null);
    }
  };

  // Quick Action: Resume skill
  const handleResumeSkill = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await api.resumeSkill(id);
      showNotice('success', res.message || 'Skill resumed.');
      await loadSkills();
      await loadOverview();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to resume skill.');
    } finally {
      setProcessingId(null);
    }
  };

  // Quick Action: Delete draft skill
  const handleDeleteDraft = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete draft "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      setProcessingId(id);
      await api.deleteSkill(id);
      showNotice('success', `Deleted skill "${name}".`);
      await loadSkills();
      await loadOverview();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to delete skill.');
    } finally {
      setProcessingId(null);
    }
  };

  // Versions: Open version modal
  const openVersionModal = async (skillId: string) => {
    setSelectedSkillForVersions(skillId);
    try {
      const res = await api.getSkillVersions(skillId);
      setSkillVersions(res.versions || []);
      setNewVersionNumber('');
      setNewVersionChangelog('');
      setShowVersionModal(true);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to load versions.');
    }
  };

  // Versions: Create new version
  const handleCreateVersion = async () => {
    if (!newVersionNumber.trim()) {
      showNotice('error', 'Version number is required (e.g. 1.1.0).');
      return;
    }
    try {
      await api.createSkillVersion(selectedSkillForVersions, {
        version_number: newVersionNumber.trim(),
        changelog: newVersionChangelog.trim()
      });
      showNotice('success', `Created version ${newVersionNumber}.`);
      const res = await api.getSkillVersions(selectedSkillForVersions);
      setSkillVersions(res.versions || []);
      setNewVersionNumber('');
      setNewVersionChangelog('');
      await loadSkills();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to record version.');
    }
  };

  // Save Creator Storefront Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      await api.updateCreatorProfile({
        display_name: profileName,
        bio: profileBio,
        website_url: profileWebsite,
        avatar_url: profileAvatar,
        onboarding_completed: true
      });
      if (refreshUser) await refreshUser();
      showNotice('success', 'Creator storefront profile updated successfully.');
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Filter skills for table
  const filteredSkills = skills.filter(s => {
    const matchesSearch =
      skillsSearch === '' ||
      s.name.toLowerCase().includes(skillsSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(skillsSearch.toLowerCase()) ||
      s.slug.toLowerCase().includes(skillsSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'published') return s.status === 'published' || s.status === 'live';
    if (statusFilter === 'submitted') return s.status === 'submitted' || s.status === 'under_review';
    if (statusFilter === 'approved') return s.status === 'approved';
    if (statusFilter === 'draft') return s.status === 'draft';
    if (statusFilter === 'paused') return s.status === 'paused';
    if (statusFilter === 'rejected') return s.status === 'rejected';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#171717] font-sans pb-16">
      {/* Top Banner / Studio Breadcrumb */}
      <div className="bg-white border-b border-[#E8E8E6] sticky top-16 z-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF4EB] border border-[#FED7AA] flex items-center justify-center text-[#F97316] shrink-0 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#171717]">Creator Studio</h1>
                <span className="text-xs font-mono bg-[#FAFAF9] border border-[#E8E8E6] px-2 py-0.5 rounded text-[#737373]">
                  v2.0 Standalone
                </span>
              </div>
              <p className="text-xs text-[#737373]">
                Author, version, package, and publish standalone AI skills for autonomous agents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.username && (
              <Link
                href={`/creators/${user.username}`}
                className="h-8 px-3 rounded-lg border border-[#E8E8E6] hover:border-[#171717] text-[#171717] text-xs font-medium inline-flex items-center gap-1.5 transition-colors bg-white"
              >
                <Eye className="w-3.5 h-3.5 text-[#737373]" />
                <span>My Public Storefront</span>
              </Link>
            )}
            <Link
              href="/creators"
              className="h-8 px-3 rounded-lg border border-[#E8E8E6] hover:border-[#171717] text-[#171717] text-xs font-medium inline-flex items-center gap-1.5 transition-colors bg-white"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#737373]" />
              <span>Creator Hub</span>
            </Link>
            <button
              onClick={startNewSkill}
              className="h-8 px-3.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Skill</span>
            </button>
          </div>
        </div>

        {/* Global Action Notification */}
        {actionNotice && (
          <div
            className={`px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              actionNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-t border-emerald-200'
                : 'bg-red-50 text-red-800 border-t border-red-200'
            }`}
          >
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
        )}

        {/* Studio Sub-Navigation Tabs */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-[#E8E8E6] text-xs font-medium">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'skills', label: `My Skills (${skills.length})`, icon: Layers },
            { id: 'create', label: editingSkillId ? 'Skill Editor (Active)' : 'Create Skill', icon: Edit3 },
            { id: 'versions', label: 'Version History', icon: Clock },
            { id: 'storefront', label: 'Storefront Profile', icon: User },
            { id: 'analytics', label: 'Analytics Funnel', icon: Globe },
            { id: 'earnings', label: 'Earnings & Payouts', icon: DollarSign },
            { id: 'docs', label: 'Documentation', icon: HelpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                  isCurrent
                    ? 'border-[#F97316] text-[#F97316] font-semibold'
                    : 'border-transparent text-[#737373] hover:text-[#171717]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Body */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 shadow-2xs">
                <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider block mb-1">
                  Total Skills
                </span>
                <span className="text-2xl font-bold font-mono text-[#171717]">
                  {metrics?.total_skills ?? skills.length}
                </span>
                <span className="text-[10px] text-[#737373] block mt-1">Authored by you</span>
              </div>

              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 shadow-2xs">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
                  Published Live
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-600">
                  {metrics?.published_count ?? skills.filter(s => s.status === 'published' || s.status === 'live').length}
                </span>
                <span className="text-[10px] text-[#737373] block mt-1">Discoverable in marketplace</span>
              </div>

              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 shadow-2xs">
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block mb-1">
                  Drafts
                </span>
                <span className="text-2xl font-bold font-mono text-amber-600">
                  {metrics?.draft_count ?? skills.filter(s => s.status === 'draft').length}
                </span>
                <span className="text-[10px] text-[#737373] block mt-1">Unpublished work</span>
              </div>

              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 shadow-2xs">
                <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider block mb-1">
                  Total Downloads
                </span>
                <span className="text-2xl font-bold font-mono text-[#171717]">
                  {metrics?.total_downloads ?? 0}
                </span>
                <span className="text-[10px] text-[#737373] block mt-1">ZIP & Markdown</span>
              </div>

              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 shadow-2xs">
                <span className="text-[11px] font-semibold text-[#F97316] uppercase tracking-wider block mb-1">
                  Creator Earnings
                </span>
                <span className="text-2xl font-bold font-mono text-[#171717]">
                  ${(metrics?.net_earnings ?? 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium block mt-1">70% net share</span>
              </div>
            </div>

            {/* Quick Actions & Educational Callout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={startNewSkill}
                className="bg-white border border-[#E8E8E6] hover:border-[#F97316] p-5 rounded-xl cursor-pointer transition-all shadow-xs group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#FFF4EB] text-[#F97316] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <FileCode className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#171717]">Create from Scratch</h3>
                <p className="text-xs text-[#737373] mt-1 leading-relaxed">
                  Author a compliant SKILL.md specification with our live markdown preview and 8-point AST validator.
                </p>
              </div>

              <div
                onClick={() => {
                  startNewSkill();
                  setCreateMode('upload');
                }}
                className="bg-white border border-[#E8E8E6] hover:border-[#F97316] p-5 rounded-xl cursor-pointer transition-all shadow-xs group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#FAFAF9] border border-[#E8E8E6] text-[#171717] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#171717]">Upload Existing ZIP</h3>
                <p className="text-xs text-[#737373] mt-1 leading-relaxed">
                  Extract and import your existing multi-file package containing references, templates, and scripts.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('storefront')}
                className="bg-white border border-[#E8E8E6] hover:border-[#F97316] p-5 rounded-xl cursor-pointer transition-all shadow-xs group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#FAFAF9] border border-[#E8E8E6] text-[#171717] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#171717]">Customize Storefront</h3>
                <p className="text-xs text-[#737373] mt-1 leading-relaxed">
                  Set your creator bio, website URL, and avatar to build trust with buyers and AI developers.
                </p>
              </div>
            </div>

            {/* Recent Activity: Skills & Submissions Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Skills */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E6]">
                  <h3 className="text-sm font-bold text-[#171717]">Your Recent Skills</h3>
                  <button
                    onClick={() => setActiveTab('skills')}
                    className="text-xs font-semibold text-[#F97316] hover:text-[#EA580C] inline-flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {recentSkills.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#737373]">
                    No skills created yet. Click "New Skill" to begin authoring.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSkills.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-[#E8E8E6] bg-[#FAFAF9]"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="font-semibold text-xs text-[#171717] truncate">{s.name}</div>
                          <div className="text-[11px] text-[#737373] font-mono truncate">kyron/{s.slug}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              s.status === 'published' || s.status === 'live'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.status === 'submitted'
                                ? 'bg-blue-100 text-blue-800'
                                : s.status === 'approved'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {s.status}
                          </span>
                          <button
                            onClick={() => loadSkillIntoEditor(s.id)}
                            className="p-1.5 rounded bg-white border border-[#E8E8E6] text-[#737373] hover:text-[#171717]"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Publishing & Quality Standards */}
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E6]">
                  <h3 className="text-sm font-bold text-[#171717]">Publishing & Quality Standards</h3>
                  <button
                    onClick={() => setActiveTab('docs')}
                    className="text-xs font-semibold text-[#F97316] hover:text-[#EA580C] inline-flex items-center gap-1"
                  >
                    <span>Guidelines</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg border border-[#E8E8E6] bg-[#FAFAF9] flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#171717]">Automated 8-Point Security Scanning</div>
                      <div className="text-[11px] text-[#737373] mt-0.5">
                        Every skill undergoes AST analysis for prompt injection, destructive commands, credential exfiltration, and path traversal prior to publishing.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-[#E8E8E6] bg-[#FAFAF9] flex items-start gap-2.5">
                    <FileCode className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#171717]">Direct Draft & Publish Lifecycle</div>
                      <div className="text-[11px] text-[#737373] mt-0.5">
                        Work privately with Save Draft. When ready, click Publish to immediately make your skill discoverable in the KYRON marketplace.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-[#E8E8E6] bg-[#FAFAF9] flex items-start gap-2.5">
                    <FolderArchive className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#171717]">Multi-Agent Package Hierarchy</div>
                      <div className="text-[11px] text-[#737373] mt-0.5">
                        Bundles include standard &lt;slug&gt;/SKILL.md frontmatter, supporting reference files, and scripts ready for Cursor, Codex, Claude Code, and Antigravity.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MY SKILLS ================= */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E8E8E6]">
              {/* Search input */}
              <div className="relative sm:w-72">
                <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={skillsSearch}
                  onChange={(e) => setSkillsSearch(e.target.value)}
                  placeholder="Search skills by name, tag..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                />
              </div>

              {/* Status Filter Badges */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'published', label: 'Published' },
                  { id: 'draft', label: 'Drafts' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      statusFilter === f.id
                        ? 'bg-[#171717] text-white'
                        : 'bg-[#FAFAF9] text-[#737373] hover:text-[#171717] border border-[#E8E8E6]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills Table */}
            {skillsLoading ? (
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-12 text-center text-xs text-[#737373]">
                Loading creator catalog...
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="bg-white border border-[#E8E8E6] rounded-xl p-12 text-center space-y-3">
                <FileText className="w-10 h-10 text-[#A3A3A3] mx-auto" />
                <h3 className="text-base font-semibold text-[#171717]">No matching skills found</h3>
                <p className="text-xs text-[#737373] max-w-sm mx-auto">
                  {statusFilter === 'all'
                    ? 'You have not created any skills yet. Click "New Skill" to start authoring.'
                    : `No skills with status "${statusFilter}".`}
                </p>
                <button
                  onClick={startNewSkill}
                  className="px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Your First Skill</span>
                </button>
              </div>
            ) : (
              <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAFAF9] border-b border-[#E8E8E6] font-mono text-[11px] text-[#737373] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-5">Skill Name</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Version</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Pricing</th>
                        <th className="py-3 px-4">Downloads</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E6]">
                      {filteredSkills.map((s) => (
                        <tr key={s.id} className="hover:bg-[#FAFAF9]/80 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-semibold text-[#171717]">{s.name}</div>
                            <div className="text-[11px] text-[#737373] font-mono truncate max-w-xs">
                              kyron/{s.slug}
                            </div>
                            {s.rejection_feedback && (
                              <div className="text-[11px] text-red-700 bg-red-50 p-1.5 rounded mt-1 border border-red-200">
                                Feedback: {s.rejection_feedback}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                                s.status === 'published' || s.status === 'live'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.status === 'approved'
                                  ? 'bg-purple-100 text-purple-800'
                                  : s.status === 'submitted' || s.status === 'under_review'
                                  ? 'bg-blue-100 text-blue-800'
                                  : s.status === 'paused'
                                  ? 'bg-zinc-200 text-zinc-800'
                                  : s.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {s.status === 'published' || s.status === 'live' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : null}
                              {s.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[#525252]">
                            v{s.current_version || '1.0.0'}
                          </td>

                          <td className="py-3.5 px-4 text-[#525252]">
                            {s.category}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-[#171717]">
                            {s.pricing_type === 'free' ? 'FREE' : `$${Number(s.price || 0).toFixed(2)}`}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[#737373]">
                            {(s as any).install_count || (s as any).downloads_count || 0}
                          </td>

                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit in studio */}
                              <button
                                onClick={() => loadSkillIntoEditor(s.id)}
                                title="Edit in Studio"
                                className="p-1.5 rounded-lg border border-[#E8E8E6] text-[#737373] hover:text-[#171717] hover:bg-white"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Download ZIP */}
                              <button
                                type="button"
                                onClick={() => handleDownloadZipForSkill(s.slug)}
                                title="Download Package ZIP"
                                className="p-1.5 rounded-lg border border-[#E8E8E6] text-[#737373] hover:text-[#171717] hover:bg-white"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* View live in marketplace */}
                              {(s.status === 'published' || s.status === 'live') && (
                                <Link
                                  href={`/skills/${s.slug}`}
                                  title="View Marketplace Listing"
                                  className="p-1.5 rounded-lg border border-[#E8E8E6] text-[#737373] hover:text-[#171717] hover:bg-white"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
                              )}

                              {/* Publish action for approved */}
                              {s.status === 'approved' && (
                                <button
                                  onClick={() => handlePublishApproved(s.id)}
                                  disabled={processingId === s.id}
                                  className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[11px]"
                                >
                                  Publish Now
                                </button>
                              )}

                              {/* Pause / Resume action */}
                              {(s.status === 'published' || s.status === 'live') && (
                                <button
                                  onClick={() => handlePauseSkill(s.id)}
                                  disabled={processingId === s.id}
                                  className="px-2 py-1 rounded border border-[#E8E8E6] text-[#737373] hover:text-amber-800 text-[11px]"
                                >
                                  Pause
                                </button>
                              )}
                              {s.status === 'paused' && (
                                <button
                                  onClick={() => handleResumeSkill(s.id)}
                                  disabled={processingId === s.id}
                                  className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold"
                                >
                                  Resume
                                </button>
                              )}

                              {/* Manage Versions */}
                              <button
                                onClick={() => openVersionModal(s.id)}
                                title="Version History"
                                className="p-1.5 rounded-lg border border-[#E8E8E6] text-[#737373] hover:text-[#171717] hover:bg-white"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Draft */}
                              {(s.status === 'draft' || s.status === 'rejected') && (
                                <button
                                  onClick={() => handleDeleteDraft(s.id, s.name)}
                                  disabled={processingId === s.id}
                                  title="Delete Draft"
                                  className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: CREATE SKILL & MULTI-FILE EDITOR ================= */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Top Editor Bar */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFF4EB] text-[#F97316] flex items-center justify-center font-bold">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#171717]">
                      {editingSkillId ? `Editing: ${skillName || 'Untitled'}` : 'New Skill Authoring'}
                    </h2>
                    {hasUnsavedChanges && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#737373] font-mono">
                    Target: {skillSlug || 'slug'} • v{skillVersion}
                  </div>
                </div>
              </div>

              {/* Actions: Save Draft, Validate, Export ZIP, Submit */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleValidatePackage}
                  className="px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] hover:border-[#171717] rounded-lg text-xs font-semibold text-[#171717] inline-flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Run Security Check</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] hover:border-[#171717] rounded-lg text-xs font-medium text-[#171717] inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#737373]" />
                  <span>SKILL.md</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportZip}
                  className="px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] hover:border-[#171717] rounded-lg text-xs font-medium text-[#171717] inline-flex items-center gap-1.5"
                >
                  <FolderArchive className="w-3.5 h-3.5 text-[#737373]" />
                  <span>Export ZIP</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={editorSaving}
                  className="px-4 py-1.5 bg-white border border-[#171717] text-[#171717] hover:bg-[#FAFAF9] rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editorSaving ? 'Saving...' : 'Save Draft'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={editorSaving}
                  className="px-4 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{editorSaving ? 'Publishing...' : 'Publish'}</span>
                </button>
              </div>
            </div>

            {/* 8-Point Automated Security & Quality Inspection Panel */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E8E6] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${
                    !validationReport
                      ? 'bg-zinc-100 text-zinc-600'
                      : validationReport.security_scan?.overallStatus === 'fail'
                      ? 'bg-red-100 text-red-700'
                      : validationReport.security_scan?.overallStatus === 'warning'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                      <span>Automated 8-Point Security & Quality Scan</span>
                      {validationReport?.security_scan ? (
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          validationReport.security_scan.overallStatus === 'fail'
                            ? 'bg-red-100 text-red-800'
                            : validationReport.security_scan.overallStatus === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {validationReport.security_scan.overallStatus.toUpperCase()} ({validationReport.security_scan.passedChecks}/8 Passed)
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                          Not Run Yet
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-[#737373]">
                      AST and static rule scanner testing prompt instructions, filesystem boundaries, package structure, and exfiltration vectors.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleValidatePackage}
                  className="px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] hover:border-[#171717] rounded-lg text-xs font-semibold text-[#171717] inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#737373]" />
                  <span>{validationReport ? 'Re-run Scan' : 'Run Security Check'}</span>
                </button>
              </div>

              {/* 8-Point Check Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STANDARD_SECURITY_CHECKS.map((defaultCheck) => {
                  const result = validationReport?.security_scan?.results?.find(
                    (r: any) => r.id === defaultCheck.id
                  );
                  const status = result ? result.status : 'not_run';
                  const details = result ? result.details : defaultCheck.defaultDetails;
                  const findings = result?.findings || [];

                  return (
                    <div
                      key={defaultCheck.id}
                      className={`p-3 rounded-lg border text-xs transition-all ${
                        status === 'fail'
                          ? 'bg-red-50/60 border-red-200'
                          : status === 'warning'
                          ? 'bg-amber-50/60 border-amber-200'
                          : status === 'pass'
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-[#FAFAF9] border-[#E8E8E6]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-[#171717] flex items-center gap-1.5">
                            {status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            {status === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                            {status === 'fail' && <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                            {status === 'not_run' && <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                            <span className="truncate">{defaultCheck.name}</span>
                          </div>
                          <p className="text-[11px] text-[#737373] mt-0.5 leading-snug">
                            {defaultCheck.description}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                            status === 'pass'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : status === 'fail'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-zinc-200 text-zinc-700'
                          }`}
                        >
                          {status === 'not_run' ? 'Not Run' : status}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] text-[#525252] font-mono bg-white/70 p-1.5 rounded border border-black/5">
                        {details}
                      </div>

                      {findings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
                            Specific Findings ({findings.length}):
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[10px] text-red-800 font-mono">
                            {findings.slice(0, 3).map((f: string, idx: number) => (
                              <li key={idx} className="truncate">{f}</li>
                            ))}
                            {findings.length > 3 && (
                              <li className="text-[10px] text-red-600 font-sans italic">
                                +{findings.length - 3} additional finding(s)
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Security Diligence Notice */}
              <div className="flex items-start gap-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-amber-900 text-[11px] leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Automated Security Notice:</span> Automated security checks verify against known vulnerabilities, command injections, and policy rules. Passing automated scans does not constitute a guarantee of complete security or fitness for all agent environments.
                </div>
              </div>
            </div>

            {/* Metadata Fields Section */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider">
                Marketplace Listing Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#171717]">Skill Name *</label>
                  <input
                    type="text"
                    value={skillName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Next.js Architecture Rule"
                    className="w-full px-3 py-1.5 text-xs bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:border-[#171717] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#171717]">Slug Identifier *</label>
                  <input
                    type="text"
                    value={skillSlug}
                    onChange={(e) => {
                      setSkillSlug(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. nextjs-architect"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:border-[#171717] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#171717]">Category *</label>
                  <select
                    value={skillCategory}
                    onChange={(e) => {
                      setSkillCategory(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:border-[#171717] focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#171717]">Pricing Model</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={pricingType}
                      onChange={(e) => {
                        setPricingType(e.target.value as any);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-1/2 px-2.5 py-1.5 text-xs bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:border-[#171717] focus:outline-none"
                    >
                      <option value="free">Free ($0.00)</option>
                      <option value="paid">Commercial Paid</option>
                    </select>
                    {pricingType === 'paid' && (
                      <div className="w-1/2 relative">
                        <span className="absolute left-2.5 top-1.5 text-xs text-[#737373]">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={price}
                          onChange={(e) => {
                            setPrice(e.target.value);
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:border-[#171717] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#171717]">One-Sentence Summary *</label>
                  <input
                    type="text"
                    value={skillSummary}
                    onChange={(e) => {
                      setSkillSummary(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Short description displayed in marketplace cards..."
                    className="w-full px-3 py-1.5 text-xs bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:border-[#171717] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#171717]">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={skillTags}
                    onChange={(e) => {
                      setSkillTags(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="react, typescript, architecture, supabase"
                    className="w-full px-3 py-1.5 text-xs bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:border-[#171717] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Multi-File Package Editor */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-4 min-h-[520px]">
              {/* File Tree Sidebar */}
              <div className="border-r border-[#E8E8E6] bg-[#FAFAF9] p-4 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E6]">
                  <span className="text-xs font-bold text-[#171717] uppercase tracking-wider">
                    Package Files
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddFileModal(true)}
                    className="p-1 rounded hover:bg-[#E8E8E6] text-[#171717]"
                    title="Add supporting file"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Upload ZIP / File Drop shortcut */}
                <div>
                  <label className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-[#D4D4D0] hover:border-[#171717] rounded-lg text-xs font-medium text-[#737373] hover:text-[#171717] cursor-pointer bg-white transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload ZIP / File</span>
                    <input
                      type="file"
                      accept=".zip,.md,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Files Tree */}
                <div className="space-y-1">
                  {/* Root SKILL.md */}
                  <div
                    onClick={() => setActiveFile('SKILL.md')}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                      activeFile === 'SKILL.md'
                        ? 'bg-[#171717] text-white'
                        : 'text-[#171717] hover:bg-[#E8E8E6]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileCode className="w-3.5 h-3.5 text-[#F97316]" />
                      <span className="font-mono">SKILL.md</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#F97316]">Root</span>
                  </div>

                  {/* Supporting Files */}
                  {supportingFiles.map((file) => (
                    <div
                      key={file.name}
                      onClick={() => setActiveFile(file.name)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                        activeFile === file.name
                          ? 'bg-[#171717] text-white'
                          : 'text-[#525252] hover:bg-[#E8E8E6]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono truncate">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.name);
                        }}
                        className="text-[#A3A3A3] hover:text-red-500 p-0.5"
                        title="Delete file"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#E8E8E6] text-[11px] text-[#737373] leading-relaxed">
                  Supporting files in <code className="font-mono">references/</code>, <code className="font-mono">templates/</code>, or <code className="font-mono">scripts/</code> are bundled directly into the downloaded ZIP.
                </div>
              </div>

              {/* Editor Workspace Pane */}
              <div className="col-span-3 flex flex-col h-full">
                {/* Editor Tab Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8E8E6] bg-[#FAFAF9]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#171717]">
                      {activeFile}
                    </span>
                    <span className="text-xs text-[#737373]">
                      ({new TextEncoder().encode(getActiveContent() || '').length} bytes)
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-[#EDEDEB] p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditorSubTab('edit')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                        editorSubTab === 'edit'
                          ? 'bg-white text-[#171717] shadow-2xs'
                          : 'text-[#737373] hover:text-[#171717]'
                      }`}
                    >
                      Markdown Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorSubTab('preview')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                        editorSubTab === 'preview'
                          ? 'bg-white text-[#171717] shadow-2xs'
                          : 'text-[#737373] hover:text-[#171717]'
                      }`}
                    >
                      Rendered Preview
                    </button>
                  </div>
                </div>

                {/* Editor Textarea / Preview */}
                <div className="flex-1 p-4 flex flex-col">
                  {editorSubTab === 'edit' ? (
                    <textarea
                      value={getActiveContent()}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="Write your skill instructions and frontmatter in markdown format..."
                      className="w-full flex-1 p-4 font-mono text-xs text-[#171717] bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717] resize-none leading-relaxed min-h-[380px]"
                      spellCheck={false}
                    />
                  ) : (
                    <div className="flex-1 p-5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg overflow-y-auto max-h-[500px] text-xs leading-relaxed space-y-3 prose prose-zinc max-w-none">
                      <pre className="p-3 bg-[#171717] text-white rounded font-mono text-xs overflow-x-auto">
                        <code>{getActiveContent()}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal: Add File */}
            {showAddFileModal && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white border border-[#E8E8E6] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                  <h3 className="text-sm font-bold text-[#171717]">Add Supporting File</h3>
                  <p className="text-xs text-[#737373]">
                    Specify the relative path inside your package (e.g. references/guidelines.md, templates/output.json).
                  </p>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="references/checklist.md"
                    className="w-full px-3 py-2 text-xs font-mono bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddFileModal(false)}
                      className="px-3 py-1.5 border border-[#E8E8E6] rounded-lg text-xs font-medium text-[#737373] hover:text-[#171717]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddFile}
                      className="px-4 py-1.5 bg-[#F97316] text-white rounded-lg text-xs font-semibold hover:bg-[#EA580C]"
                    >
                      Add File
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: VERSIONS ================= */}
        {activeTab === 'versions' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E8E8E6] rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#171717]">Version Management</h2>
                  <p className="text-xs text-[#737373]">
                    Immutable release history and changelog manifests per skill package.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedSkillForVersions}
                    onChange={(e) => {
                      setSelectedSkillForVersions(e.target.value);
                      if (e.target.value) {
                        api.getSkillVersions(e.target.value).then(r => setSkillVersions(r.versions || []));
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none"
                  >
                    <option value="">Select a skill to inspect...</option>
                    {skills.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.slug})
                      </option>
                    ))}
                  </select>

                  {selectedSkillForVersions && (
                    <button
                      onClick={() => setShowVersionModal(true)}
                      className="px-3.5 py-1.5 bg-[#F97316] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tag New Version</span>
                    </button>
                  )}
                </div>
              </div>

              {selectedSkillForVersions && skillVersions.length > 0 ? (
                <div className="divide-y divide-[#E8E8E6] border border-[#E8E8E6] rounded-xl overflow-hidden text-xs">
                  {skillVersions.map(v => (
                    <div key={v.id} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#171717]">v{v.version_number}</span>
                          <span className="text-[11px] text-[#737373] font-mono">
                            Released {new Date(v.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {v.changelog && (
                          <p className="text-xs text-[#525252] mt-1">{v.changelog}</p>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-[#A3A3A3]">ID: {v.id}</span>
                    </div>
                  ))}
                </div>
              ) : selectedSkillForVersions ? (
                <div className="p-8 text-center text-xs text-[#737373] bg-[#FAFAF9] rounded-xl border border-[#E8E8E6]">
                  No versions recorded yet for this skill. Click "Tag New Version" to record v1.0.0.
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#737373] bg-[#FAFAF9] rounded-xl border border-[#E8E8E6]">
                  Select a skill from the dropdown above to view or release version updates.
                </div>
              )}
            </div>

            {/* Modal: New Version */}
            {showVersionModal && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white border border-[#E8E8E6] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                  <h3 className="text-sm font-bold text-[#171717]">Release New Version</h3>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#171717]">Version Number *</label>
                    <input
                      type="text"
                      value={newVersionNumber}
                      onChange={(e) => setNewVersionNumber(e.target.value)}
                      placeholder="e.g. 1.1.0"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#171717]">Changelog Notes</label>
                    <textarea
                      value={newVersionChangelog}
                      onChange={(e) => setNewVersionChangelog(e.target.value)}
                      placeholder="Summary of bug fixes, new capabilities, or agent instructions..."
                      className="w-full px-3 py-1.5 text-xs bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none resize-none h-20"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowVersionModal(false)}
                      className="px-3 py-1.5 border border-[#E8E8E6] rounded-lg text-xs font-medium text-[#737373]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateVersion}
                      className="px-4 py-1.5 bg-[#F97316] text-white rounded-lg text-xs font-semibold"
                    >
                      Save Version
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 6: STOREFRONT PROFILE ================= */}
        {activeTab === 'storefront' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#171717]">Creator Storefront Profile</h2>
                <p className="text-xs text-[#737373] mt-1">
                  This public profile appears on the KYRON Marketplace when developers inspect your published skills.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-[#171717]">Display Name *</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#171717]">Creator Bio</label>
                  <textarea
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="Tell AI developers about your domain expertise, engineering background..."
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717] resize-none h-24"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#171717]">Website or Portfolio URL</label>
                  <input
                    type="url"
                    value={profileWebsite}
                    onChange={(e) => setProfileWebsite(e.target.value)}
                    placeholder="https://yourdomain.com"
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#171717]">Avatar Image URL</label>
                  <input
                    type="url"
                    value={profileAvatar}
                    onChange={(e) => setProfileAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {user?.username && (
                    <Link
                      href={`/creators/${user.username}`}
                      className="text-xs font-semibold text-[#F97316] hover:text-[#EA580C] inline-flex items-center gap-1"
                    >
                      <span>Preview Live Profile</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg font-semibold shadow-xs transition-colors"
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= TAB 7: ANALYTICS ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#171717]">Marketplace Conversion Funnel</h2>
                <p className="text-xs text-[#737373] mt-1">
                  Real traffic and acquisition funnel for your skills catalog.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-5 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9]">
                  <span className="text-xs font-semibold text-[#737373] uppercase">Total Views</span>
                  <div className="text-3xl font-extrabold font-mono text-[#171717] mt-1">
                    {metrics?.total_views ?? 0}
                  </div>
                  <span className="text-[10px] text-[#737373] mt-1 block">Marketplace impressions</span>
                </div>

                <div className="p-5 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9]">
                  <span className="text-xs font-semibold text-[#737373] uppercase">Downloads & Installs</span>
                  <div className="text-3xl font-extrabold font-mono text-[#F97316] mt-1">
                    {metrics?.total_downloads ?? 0}
                  </div>
                  <span className="text-[10px] text-[#737373] mt-1 block">ZIP and standalone MD</span>
                </div>

                <div className="p-5 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9]">
                  <span className="text-xs font-semibold text-[#737373] uppercase">Conversion Rate</span>
                  <div className="text-3xl font-extrabold font-mono text-emerald-600 mt-1">
                    {metrics?.total_views > 0
                      ? (((metrics.total_downloads || 0) / metrics.total_views) * 100).toFixed(1)
                      : '0.0'}%
                  </div>
                  <span className="text-[10px] text-[#737373] mt-1 block">Views to downloads</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 8: EARNINGS ================= */}
        {activeTab === 'earnings' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#171717]">Earnings & Payout Ledger</h2>
                <p className="text-xs text-[#737373] mt-1">
                  KYRON creator revenue share breakdown and transaction ledger.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-2">
                  <span className="text-xs font-semibold text-[#737373] uppercase">Creator Net Balance</span>
                  <div className="text-3xl font-extrabold font-mono text-emerald-600">
                    ${(metrics?.net_earnings ?? 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-[#525252]">
                    70% share from commercial skill purchases on KYRON Marketplace.
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-2">
                  <span className="text-xs font-semibold text-[#737373] uppercase">Platform Quality Fee</span>
                  <div className="text-3xl font-extrabold font-mono text-[#737373]">30%</div>
                  <p className="text-xs text-[#525252]">
                    Covers 8-point automated security scanning, archive CDN hosting, and verified buyer entitlement validation.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Stripe & Banking Payout Integration Status</span>
                </div>
                <p className="leading-relaxed">
                  Creator balance accumulates from wallet purchases. Direct creator bank payouts (via Stripe Connect) will activate upon merchant account verification.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 9: DOCUMENTATION ================= */}
        {activeTab === 'docs' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E6]">
                <div>
                  <h2 className="text-xl font-bold text-[#171717]">Creator Documentation & Guides</h2>
                  <p className="text-xs text-[#737373] mt-1">
                    Quick references to the full educational guides hosted on the Creator Hub.
                  </p>
                </div>
                <Link
                  href="/creators"
                  className="px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-xs"
                >
                  <span>Open Full Creator Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: 'The SKILL.md Standard', desc: 'Required YAML frontmatter format, structure, and clean prompt engineering conventions.' },
                  { title: '8-Point Security Checklist', desc: 'In-depth explanation of prompt injection defense, secret protection, and path safety.' },
                  { title: 'Multi-File Packaging Guide', desc: 'How to structure references/, templates/, and scripts/ in standalone ZIP archives.' },
                  { title: 'Agent Installation Guides', desc: 'Conventions for Claude Code, Cursor, Codex, and Antigravity directory setups.' },
                ].map((g, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-1.5">
                    <h3 className="font-bold text-xs text-[#171717]">{g.title}</h3>
                    <p className="text-xs text-[#525252] leading-relaxed">{g.desc}</p>
                    <Link href="/creators" className="text-xs text-[#F97316] font-semibold inline-flex items-center gap-1 pt-1">
                      <span>Read guide</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

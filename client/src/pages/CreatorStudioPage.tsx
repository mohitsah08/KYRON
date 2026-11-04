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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  X
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

  // Streamlined 4-Tab Workspace: 'skills' | 'create' | 'earnings' | 'docs'
  const [activeTab, setActiveTab] = useState<'skills' | 'create' | 'earnings' | 'docs'>('skills');

  // Overview Metrics State
  const [metrics, setMetrics] = useState<any>(null);
  const [recentSkills, setRecentSkills] = useState<Skill[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // My Skills State
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsSearch, setSkillsSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'paused'>('all');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Storefront Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(user?.display_name || '');
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [profileWebsite, setProfileWebsite] = useState((user as any)?.website_url || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar_url || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Version Management Modal State
  const [selectedSkillForVersions, setSelectedSkillForVersions] = useState<string>('');
  const [skillVersions, setSkillVersions] = useState<any[]>([]);
  const [newVersionNumber, setNewVersionNumber] = useState('');
  const [newVersionChangelog, setNewVersionChangelog] = useState('');
  const [showVersionModal, setShowVersionModal] = useState(false);

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

  // Documentation Sub-Tab
  const [activeDocSection, setActiveDocSection] = useState<'spec' | 'products' | 'packaging' | 'security' | 'pricing' | 'agents' | 'faq'>('spec');
  const [copiedDocCode, setCopiedDocCode] = useState<string | null>(null);

  // Read URL search params on mount (e.g. ?tab=create, ?tab=docs)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      if (['skills', 'overview'].includes(tabParam)) setActiveTab('skills');
      else if (tabParam === 'create') setActiveTab('create');
      else if (['earnings', 'analytics'].includes(tabParam)) setActiveTab('earnings');
      else if (tabParam === 'docs') setActiveTab('docs');
      else if (tabParam === 'storefront') setShowProfileModal(true);
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

  useEffect(() => {
    loadOverview();
    loadSkills();
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

  // Direct Publish Flow: Automated AST scan -> Direct to Marketplace (No manual review queue)
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

      // 2. Persist with status = 'published' directly
      const parsedTags = skillTags.split(',').map(t => t.trim()).filter(Boolean);
      const cleanSlug = skillSlug || skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      if (editingSkillId) {
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
        showNotice('success', `Skill "${skillName}" published live to KYRON Marketplace!`);
      } else {
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
        showNotice('success', `Skill "${skillName}" published live to KYRON Marketplace!`);
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

      if (hasUnsavedChanges || !editingSkillId) {
        await handleSaveDraft();
      }

      let finalMd = skillMdContent;
      if (!/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]*/m.test(finalMd)) {
        const cleanDesc = (skillSummary || skillName || 'AI Skill').replace(/[\r\n]+/g, ' ');
        finalMd = `---\nname: ${currentSlug}\ndescription: "${cleanDesc}"\nversion: ${skillVersion || '1.0.0'}\nlicense: ${skillLicense || 'MIT'}\ncompatibility: [claude-code, cursor, codex, antigravity]\n---\n\n${finalMd}`;
      }

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
      setShowProfileModal(false);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDocCode(id);
    setTimeout(() => setCopiedDocCode(null), 2000);
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
    if (statusFilter === 'draft') return s.status === 'draft';
    if (statusFilter === 'paused') return s.status === 'paused';
    return true;
  });

  // =========================================================================
  // AUTOMATED 4-STEP ONBOARDING TRACKER (Calculated purely from real DB state)
  // =========================================================================
  const isProfileComplete = Boolean(
    user?.display_name &&
    user?.username &&
    (user?.bio || (user as any)?.website_url)
  );

  const hasCreatedSkill = skills.length > 0;

  const hasValidatedSkill = Boolean(
    (validationReport?.valid && validationReport?.security_scan?.overallStatus === 'pass') ||
    skills.some(s => (s as any).security_status === 'pass' || s.status === 'published' || s.status === 'live')
  );

  const hasPublishedSkill = skills.some(s => s.status === 'published' || s.status === 'live');

  const onboardingSteps = [
    {
      id: 'step_profile',
      number: 1,
      title: 'Complete Creator Profile',
      desc: 'Set up your display name, username, and bio for your public marketplace storefront.',
      isDone: isProfileComplete,
      actionLabel: isProfileComplete ? 'Edit Profile' : 'Complete Profile',
      action: () => setShowProfileModal(true)
    },
    {
      id: 'step_create',
      number: 2,
      title: 'Create Your First Skill',
      desc: 'Author a compliant SKILL.md specification or import an existing ZIP package in the Skill Editor.',
      isDone: hasCreatedSkill,
      actionLabel: hasCreatedSkill ? 'View Drafts' : 'Create Skill',
      action: () => startNewSkill()
    },
    {
      id: 'step_validate',
      number: 3,
      title: 'Run Automated Security Validation',
      desc: 'Pass the 8-point AST scan (injection guard, secret protection, disk safety, path traversal checks).',
      isDone: hasValidatedSkill,
      actionLabel: hasValidatedSkill ? 'Re-scan Latest' : 'Run AST Scan',
      action: () => {
        if (skills.length > 0 && skills[0].id) {
          loadSkillIntoEditor(skills[0].id);
        } else {
          setActiveTab('create');
        }
      }
    },
    {
      id: 'step_publish',
      number: 4,
      title: 'Publish to Marketplace',
      desc: 'Deploy your skill directly to the live marketplace with zero review queues once security passes.',
      isDone: hasPublishedSkill,
      actionLabel: hasPublishedSkill ? 'Manage Live Skills' : 'Publish to Marketplace',
      action: () => {
        if (skills.length > 0 && skills[0].id) {
          loadSkillIntoEditor(skills[0].id);
        } else {
          setActiveTab('create');
        }
      }
    }
  ];

  const completedStepsCount = onboardingSteps.filter(s => s.isDone).length;
  const progressPercent = Math.round((completedStepsCount / 4) * 100);
  const isAllComplete = completedStepsCount === 4;

  const [isOnboardingCollapsed, setIsOnboardingCollapsed] = useState(() => {
    try {
      return localStorage.getItem('kyron_creator_onboarding_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleOnboardingCollapse = () => {
    setIsOnboardingCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('kyron_creator_onboarding_collapsed', String(next));
      } catch {}
      return next;
    });
  };

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
                  v2.4 Standalone
                </span>
                {isAllComplete && (
                  <span className="text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified Creator</span>
                  </span>
                )}
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
            <button
              onClick={() => setShowProfileModal(true)}
              className="h-8 px-3 rounded-lg border border-[#E8E8E6] hover:border-[#171717] text-[#171717] text-xs font-medium inline-flex items-center gap-1.5 transition-colors bg-white"
            >
              <User className="w-3.5 h-3.5 text-[#737373]" />
              <span>Storefront Profile</span>
            </button>
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

        {/* Streamlined 4-Tab Navigation */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-[#E8E8E6] text-xs font-medium">
          {[
            { id: 'skills', label: `My Skills (${skills.length})`, icon: Layers },
            { id: 'create', label: editingSkillId ? 'Skill Editor (Active)' : 'Skill Editor', icon: Edit3 },
            { id: 'earnings', label: 'Earnings & Analytics', icon: DollarSign },
            { id: 'docs', label: 'Creator Guide & Docs', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
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
        {/* ========================================================= */}
        {/* TAB 1: MY SKILLS & OVERVIEW (Consolidated primary view)  */}
        {/* ========================================================= */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <span className="text-[10px] text-[#737373] block mt-1">Work in progress</span>
              </div>

              <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 shadow-2xs">
                <span className="text-[11px] font-semibold text-[#F97316] uppercase tracking-wider block mb-1">
                  Total Installs & Runs
                </span>
                <span className="text-2xl font-bold font-mono text-[#171717]">
                  {metrics?.total_downloads ?? 0}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium block mt-1">ZIP & Markdown</span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 4-STEP AUTOMATED ONBOARDING TRACKER (Collapsible Banner) */}
            {/* ======================================================== */}
            <div className="bg-white border border-[#E8E8E6] rounded-2xl overflow-hidden shadow-2xs transition-all">
              <div className="p-5 sm:p-6 border-b border-[#E8E8E6] flex items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-[#FFFBF7]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F97316]"></span>
                    <h2 className="text-base font-bold text-[#171717]">
                      Creator Launchpad — 4-Step Verification & Publishing
                    </h2>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#FFF4EB] text-[#EA580C] border border-[#FED7AA]">
                      {progressPercent}% Complete ({completedStepsCount}/4)
                    </span>
                  </div>
                  <p className="text-xs text-[#737373]">
                    Follow these 4 automated milestones to launch your verified skills on the KYRON Marketplace.
                  </p>
                </div>

                <button
                  onClick={toggleOnboardingCollapse}
                  className="px-3 py-1.5 rounded-lg border border-[#E8E8E6] hover:border-[#171717] text-xs font-medium text-[#525252] hover:text-[#171717] inline-flex items-center gap-1 transition-colors"
                >
                  {isOnboardingCollapsed ? (
                    <>
                      <span>Show Steps</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Minimize</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Progress bar line */}
              <div className="w-full bg-[#EDEDEB] h-1.5">
                <div
                  className="bg-[#F97316] h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Step cards grid (collapsible) */}
              {!isOnboardingCollapsed && (
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#FAFAF9]">
                  {onboardingSteps.map((st) => (
                    <div
                      key={st.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        st.isDone
                          ? 'bg-white border-emerald-200 shadow-2xs'
                          : 'bg-white border-[#E8E8E6] hover:border-[#D4D4D0]'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              st.isDone
                                ? 'bg-emerald-500 text-white'
                                : 'bg-[#F5F5F4] text-[#737373] border border-[#E8E8E6]'
                            }`}
                          >
                            {st.isDone ? <Check className="w-3.5 h-3.5" /> : st.number}
                          </span>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                              st.isDone
                                ? 'bg-emerald-50 text-emerald-700 font-mono'
                                : 'bg-[#FAFAF9] text-[#737373] font-mono'
                            }`}
                          >
                            {st.isDone ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-[#171717]">{st.title}</h3>
                        <p className="text-[11px] text-[#737373] leading-relaxed">{st.desc}</p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-[#F5F5F4]">
                        <button
                          onClick={st.action}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1 transition-colors ${
                            st.isDone
                              ? 'bg-[#FAFAF9] hover:bg-[#F5F5F4] text-[#525252] border border-[#E8E8E6]'
                              : 'bg-[#F97316] hover:bg-[#EA580C] text-white shadow-xs'
                          }`}
                        >
                          <span>{st.actionLabel}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E8E8E6]">
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

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'published', label: 'Published' },
                  { id: 'draft', label: 'Drafts' },
                  { id: 'paused', label: 'Paused' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id as any)}
                    className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                      statusFilter === f.id
                        ? 'bg-[#171717] text-white font-medium'
                        : 'text-[#737373] hover:text-[#171717] hover:bg-[#FAFAF9]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills Table */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-2xs">
              {skillsLoading ? (
                <div className="p-12 text-center text-xs text-[#737373]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A3A3A3]" />
                  Loading your skills catalog...
                </div>
              ) : filteredSkills.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FFF4EB] border border-[#FED7AA] text-[#F97316] flex items-center justify-center mx-auto">
                    <FileCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#171717]">No skills found</h3>
                    <p className="text-xs text-[#737373] mt-1 max-w-sm mx-auto">
                      {skillsSearch
                        ? 'No skills match your filter criteria. Try clearing the search query.'
                        : 'You haven’t created any AI skills yet. Click "New Skill" to create your first package.'}
                    </p>
                  </div>
                  <button
                    onClick={startNewSkill}
                    className="px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-lg shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Your First Skill</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E8E8E6] bg-[#FAFAF9] text-[#737373] font-mono text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Skill Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Version</th>
                        <th className="py-3 px-4">Pricing</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Security Scan</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E6]">
                      {filteredSkills.map((s) => (
                        <tr key={s.id} className="hover:bg-[#FAFAF9] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#171717]">{s.name}</div>
                            <div className="text-[11px] text-[#737373] font-mono">kyron/{s.slug}</div>
                          </td>
                          <td className="py-3.5 px-4 text-[#525252]">
                            <span className="bg-[#FAFAF9] border border-[#E8E8E6] px-2 py-0.5 rounded text-[11px]">
                              {s.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#737373]">
                            v{s.current_version || '1.0.0'}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            {s.pricing_type === 'free' ? (
                              <span className="text-emerald-600 font-semibold">Free</span>
                            ) : (
                              <span className="text-[#171717] font-semibold">${Number(s.price).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                                s.status === 'published' || s.status === 'live'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.status === 'paused'
                                  ? 'bg-neutral-100 text-neutral-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>8/8 Passed</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => loadSkillIntoEditor(s.id)}
                                className="px-2.5 py-1 rounded bg-[#FFF4EB] hover:bg-[#FED7AA] text-[#EA580C] font-semibold text-[11px] inline-flex items-center gap-1"
                                title="Edit in Studio"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => openVersionModal(s.id)}
                                className="p-1.5 rounded border border-[#E8E8E6] text-[#737373] hover:text-[#171717]"
                                title="Version History"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                              {s.status === 'published' || s.status === 'live' ? (
                                <button
                                  onClick={() => handlePauseSkill(s.id)}
                                  disabled={processingId === s.id}
                                  className="p-1.5 rounded border border-[#E8E8E6] text-[#737373] hover:text-amber-600"
                                  title="Pause Listing"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              ) : s.status === 'paused' ? (
                                <button
                                  onClick={() => handleResumeSkill(s.id)}
                                  disabled={processingId === s.id}
                                  className="p-1.5 rounded border border-[#E8E8E6] text-[#737373] hover:text-emerald-600"
                                  title="Resume Listing"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeleteDraft(s.id, s.name)}
                                  disabled={processingId === s.id}
                                  className="p-1.5 rounded border border-[#E8E8E6] text-[#737373] hover:text-red-600"
                                  title="Delete Draft"
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
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SKILL EDITOR & PACKAGING                            */}
        {/* ========================================================= */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Editor Action Toolbar */}
            <div className="bg-white border border-[#E8E8E6] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FFF4EB] text-[#F97316] flex items-center justify-center font-bold shrink-0">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#171717]">
                    {editingSkillId ? `Editing: ${skillName || 'Untitled Skill'}` : 'Authoring New AI Skill'}
                  </h2>
                  <p className="text-[11px] text-[#737373]">
                    Compliant <code className="font-mono text-[#F97316]">SKILL.md</code> specification & standalone multi-file archive.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="px-3 py-1.5 rounded-lg border border-[#E8E8E6] hover:border-[#171717] text-xs font-medium text-[#171717] inline-flex items-center gap-1.5 bg-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#737373]" />
                  <span>Export MD</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportZip}
                  className="px-3 py-1.5 rounded-lg border border-[#E8E8E6] hover:border-[#171717] text-xs font-medium text-[#171717] inline-flex items-center gap-1.5 bg-white transition-colors"
                >
                  <FolderArchive className="w-3.5 h-3.5 text-[#737373]" />
                  <span>Export ZIP</span>
                </button>

                <button
                  type="button"
                  onClick={handleValidatePackage}
                  className="px-3 py-1.5 rounded-lg border border-[#E8E8E6] hover:border-emerald-600 text-xs font-medium text-[#171717] inline-flex items-center gap-1.5 bg-white transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Run AST Scan</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={editorSaving}
                  className="px-3.5 py-1.5 rounded-lg border border-[#E8E8E6] hover:border-[#171717] text-xs font-semibold text-[#171717] inline-flex items-center gap-1.5 bg-white transition-colors"
                >
                  <Save className="w-3.5 h-3.5 text-[#737373]" />
                  <span>{editorSaving ? 'Saving...' : 'Save Draft'}</span>
                </button>

                {/* Direct Publish Button: No review queue once security passes */}
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={editorSaving}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Directly</span>
                </button>
              </div>
            </div>

            {/* Editor Grid: Left Metadata Form & Right Code Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Metadata (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-[#E8E8E6] rounded-xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E6]">
                  <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider">Package Metadata</h3>
                  <label className="text-xs text-[#F97316] hover:text-[#EA580C] font-semibold cursor-pointer inline-flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Import ZIP</span>
                    <input type="file" accept=".zip,.md" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#171717]">Skill Name *</label>
                    <input
                      type="text"
                      value={skillName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Supabase RLS Auditor"
                      className="w-full px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#171717]">Skill Slug (Identifier) *</label>
                    <div className="flex items-center bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-[#737373]">
                      <span>kyron/</span>
                      <input
                        type="text"
                        value={skillSlug}
                        onChange={(e) => {
                          setSkillSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="supabase-rls-auditor"
                        className="bg-transparent w-full text-[#171717] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#171717]">Summary (1-sentence) *</label>
                    <textarea
                      value={skillSummary}
                      onChange={(e) => {
                        setSkillSummary(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Validates PostgreSQL row level security policies and flags leaks."
                      className="w-full px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717] resize-none h-16"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#171717]">Category *</label>
                      <select
                        value={skillCategory}
                        onChange={(e) => {
                          setSkillCategory(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-2.5 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.slug} value={cat.slug}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#171717]">Version</label>
                      <input
                        type="text"
                        value={skillVersion}
                        onChange={(e) => {
                          setSkillVersion(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="1.0.0"
                        className="w-full px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717] font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#171717]">Pricing Model</label>
                      <select
                        value={pricingType}
                        onChange={(e) => {
                          setPricingType(e.target.value as any);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-2.5 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                      >
                        <option value="free">Free (1-Click)</option>
                        <option value="paid">Paid (Commercial)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#171717]">Price (USD)</label>
                      <div className="flex items-center bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg px-2.5 py-1.5 font-mono text-[11px]">
                        <span>$</span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={pricingType === 'free'}
                          value={pricingType === 'free' ? '0.00' : price}
                          onChange={(e) => {
                            setPrice(e.target.value);
                            setHasUnsavedChanges(true);
                          }}
                          className="bg-transparent w-full text-[#171717] focus:outline-none pl-1 disabled:text-[#A3A3A3]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#171717]">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={skillTags}
                      onChange={(e) => {
                        setSkillTags(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="supabase, rls, postgres, security"
                      className="w-full px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Multi-File Editor & AST Security Validation Report (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                {/* File Tabs Header */}
                <div className="bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-2 border-b border-[#E8E8E6] bg-[#FAFAF9] flex items-center justify-between gap-2 overflow-x-auto">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveFile('SKILL.md')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
                          activeFile === 'SKILL.md'
                            ? 'bg-white border border-[#E8E8E6] text-[#F97316] font-bold shadow-2xs'
                            : 'text-[#737373] hover:text-[#171717]'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>SKILL.md</span>
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded">root</span>
                      </button>

                      {supportingFiles.map((f) => (
                        <div
                          key={f.name}
                          className={`flex items-center rounded-lg border text-xs font-mono transition-colors ${
                            activeFile === f.name
                              ? 'bg-white border-[#E8E8E6] text-[#171717] font-semibold shadow-2xs'
                              : 'border-transparent text-[#737373] hover:text-[#171717]'
                          }`}
                        >
                          <button
                            onClick={() => setActiveFile(f.name)}
                            className="px-2.5 py-1.5 flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-[#A3A3A3]" />
                            <span>{f.name}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteFile(f.name)}
                            className="pr-2 text-[#A3A3A3] hover:text-red-600"
                            title="Delete File"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowAddFileModal(true)}
                      className="px-2.5 py-1 rounded-lg border border-dashed border-[#D4D4D0] hover:border-[#171717] text-[#737373] hover:text-[#171717] text-xs font-medium inline-flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add File</span>
                    </button>
                  </div>

                  {/* Code Editor Textarea */}
                  <div className="p-4 bg-white">
                    <textarea
                      value={getActiveContent()}
                      onChange={(e) => handleContentChange(e.target.value)}
                      className="w-full h-[400px] font-mono text-xs text-[#171717] bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg p-3.5 focus:outline-none focus:border-[#171717] leading-relaxed resize-y"
                      placeholder="Write your SKILL.md specification with YAML frontmatter..."
                    />
                  </div>
                </div>

                {/* 8-Point AST Security Scan Report (if run) */}
                {validationReport && (
                  <div className="bg-white border border-[#E8E8E6] rounded-xl p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E6]">
                      <div className="flex items-center gap-2">
                        <ShieldCheck
                          className={`w-5 h-5 ${
                            validationReport.security_scan?.overallStatus === 'pass'
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }`}
                        />
                        <h3 className="text-sm font-bold text-[#171717]">
                          8-Point Automated Security Scan
                        </h3>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          validationReport.security_scan?.overallStatus === 'pass'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {validationReport.security_scan?.overallStatus === 'pass' ? 'PASSED (8/8)' : 'FAILED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {STANDARD_SECURITY_CHECKS.map((chk) => {
                        const res = validationReport.security_scan?.results?.find((r: any) => r.ruleId === chk.id);
                        const isPass = res ? res.status === 'pass' : true;
                        return (
                          <div
                            key={chk.id}
                            className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                              isPass ? 'bg-[#FAFAF9] border-[#E8E8E6]' : 'bg-red-50 border-red-200'
                            }`}
                          >
                            {isPass ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-semibold text-[#171717]">{chk.name}</div>
                              <div className="text-[11px] text-[#737373] mt-0.5">
                                {res?.details || chk.defaultDetails}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: EARNINGS & ANALYTICS                                */}
        {/* ========================================================= */}
        {activeTab === 'earnings' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
              <div>
                <h2 className="text-xl font-bold text-[#171717]">Earnings & Marketplace Analytics</h2>
                <p className="text-xs text-[#737373] mt-1">
                  Transparent 70/30 creator revenue model, conversion funnel, and payout settlement ledger.
                </p>
              </div>

              {/* Revenue Economics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Creator Net Balance
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-emerald-600">
                    ${(metrics?.net_earnings ?? 0).toFixed(2)}
                  </div>
                  <span className="text-[11px] text-emerald-700 block">70% revenue share</span>
                </div>

                <div className="p-5 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-1">
                  <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
                    Gross Volume
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-[#171717]">
                    ${((metrics?.net_earnings ?? 0) / 0.7 || 0).toFixed(2)}
                  </div>
                  <span className="text-[11px] text-[#737373] block">Total buyer payments</span>
                </div>

                <div className="p-5 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-1">
                  <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
                    KYRON Platform Fee
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-[#737373]">30%</div>
                  <span className="text-[11px] text-[#737373] block">Hosting & scanning fee</span>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div className="p-5 rounded-xl border border-[#E8E8E6] bg-white space-y-4">
                <h3 className="text-sm font-bold text-[#171717]">Marketplace Acquisition Funnel</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-[#FAFAF9] border border-[#E8E8E6]">
                    <span className="text-[11px] text-[#737373] uppercase font-semibold">Impressions</span>
                    <div className="text-2xl font-bold font-mono text-[#171717] mt-1">
                      {metrics?.total_views ?? 0}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-[#FAFAF9] border border-[#E8E8E6]">
                    <span className="text-[11px] text-[#737373] uppercase font-semibold">Installs / Runs</span>
                    <div className="text-2xl font-bold font-mono text-[#F97316] mt-1">
                      {metrics?.total_downloads ?? 0}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-[#FAFAF9] border border-[#E8E8E6]">
                    <span className="text-[11px] text-[#737373] uppercase font-semibold">Conversion Rate</span>
                    <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                      {metrics?.total_views > 0
                        ? (((metrics.total_downloads || 0) / metrics.total_views) * 100).toFixed(1)
                        : '0.0'}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Payout Notice */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Stripe & Banking Payout Integration</span>
                </div>
                <p className="leading-relaxed">
                  Creator earnings accumulate instantly from verified buyer credit purchases. Automated payouts execute on the 1st and 15th of each month for balances exceeding $25.00 USD.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: CREATOR GUIDE & COMPREHENSIVE DOCUMENTATION        */}
        {/* ========================================================= */}
        {activeTab === 'docs' && (
          <div className="space-y-6 max-w-5xl">
            <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E8E6]">
                <div>
                  <h2 className="text-xl font-bold text-[#171717]">Creator Documentation & Guides</h2>
                  <p className="text-xs text-[#737373] mt-1">
                    Standards, specs, and best practices for authoring, packaging, and monetizing AI skills.
                  </p>
                </div>
                <button
                  onClick={startNewSkill}
                  className="px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-lg shadow-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Author Skill Now</span>
                </button>
              </div>

              {/* Sub-navigation tabs for documentation */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs border-b border-[#E8E8E6]">
                {[
                  { id: 'spec', label: '1. The SKILL.md Standard' },
                  { id: 'products', label: '2. What You Can Sell' },
                  { id: 'packaging', label: '3. Multi-File ZIP Spec' },
                  { id: 'security', label: '4. 8-Point AST Scan' },
                  { id: 'pricing', label: '5. 70/30 Economics' },
                  { id: 'agents', label: '6. Agent Setup Guide' },
                  { id: 'faq', label: '7. Creator FAQ' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveDocSection(s.id as any)}
                    className={`px-3 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${
                      activeDocSection === s.id
                        ? 'border-[#F97316] text-[#F97316] font-bold'
                        : 'border-transparent text-[#737373] hover:text-[#171717]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* SECTION 1: THE SKILL.MD STANDARD */}
              {activeDocSection === 'spec' && (
                <div className="space-y-4 text-xs">
                  <h3 className="text-sm font-bold text-[#171717]">SKILL.md Specification & Format</h3>
                  <p className="text-[#525252] leading-relaxed">
                    Every skill on KYRON requires a compliant <code className="font-mono text-[#F97316]">SKILL.md</code> file at its root. 
                    It must begin with clean YAML frontmatter demarcated by triple dashes (<code className="font-mono">---</code>).
                  </p>

                  <div className="relative">
                    <pre className="p-4 bg-[#171717] text-[#FAFAF9] rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
{`---
name: my-engineering-skill
description: "Enforces automated coding conventions and strict safety rules."
version: 1.0.0
license: MIT
compatibility: [claude-code, cursor, codex, antigravity]
tags: [architecture, safety, testing]
---

# Skill Directives

## 1. Core Principles
- Always inspect existing code before applying modifications.
- Preserve comments, docstrings, and non-blocking warnings.
- Run tests before finalizing changes.

## 2. Command Workflows
- Build: npm run build
- Test: npm test`}
                    </pre>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `---\nname: my-engineering-skill\ndescription: "Enforces automated coding conventions."\nversion: 1.0.0\nlicense: MIT\ncompatibility: [claude-code, cursor, codex, antigravity]\n---\n\n# Directives\n- Inspect files first.`,
                          'spec-code'
                        )
                      }
                      className="absolute right-3 top-3 p-1.5 rounded-lg bg-[#262626] hover:bg-[#333] text-white text-[11px] inline-flex items-center gap-1"
                    >
                      {copiedDocCode === 'spec-code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDocCode === 'spec-code' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 2: WHAT YOU CAN SELL */}
              {activeDocSection === 'products' && (
                <div className="space-y-4 text-xs">
                  <h3 className="text-sm font-bold text-[#171717]">Supported Product Types & Restrictions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-1">
                      <div className="font-bold text-[#171717]">Autonomous Coding Instructions</div>
                      <p className="text-[#525252]">Domain rules guiding agents for Next.js, Supabase, Flutter, Rust, and Go.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-1">
                      <div className="font-bold text-[#171717]">Multi-File Workflow Bundles</div>
                      <p className="text-[#525252]">Complete packages with templates, architecture references, and helper scripts.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-1">
                      <div className="font-bold text-[#171717]">API & Toolchain Recipes</div>
                      <p className="text-[#525252]">Integration patterns for Stripe, OpenAI, GitHub, and Cloudflare.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-1">
                      <div className="font-bold text-[#171717]">Security & OWASP Checklists</div>
                      <p className="text-[#525252]">Auditing prompts that systematically scan code for vulnerabilities.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1 text-amber-900">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Prohibited Content</span>
                    </div>
                    <p>Compiled binaries (.exe, .dll, .so), obfuscated eval loops, prompt injection attacks, and secret stealing payloads.</p>
                  </div>
                </div>
              )}

              {/* SECTION 3: MULTI-FILE PACKAGING */}
              {activeDocSection === 'packaging' && (
                <div className="space-y-4 text-xs">
                  <h3 className="text-sm font-bold text-[#171717]">Multi-File ZIP Archive Structure</h3>
                  <p className="text-[#525252]">
                    For complex skills requiring templates or helper scripts, package your files into a clean ZIP archive with this standard directory hierarchy:
                  </p>
                  <pre className="p-4 bg-[#171717] text-[#FAFAF9] rounded-xl font-mono text-xs leading-relaxed">
{`<skill-slug>/
├── SKILL.md                 # Required root specification
├── references/              # Architecture guides, API schemas
│   └── database-schema.md
├── templates/               # Boilerplates injected by the agent
│   └── component.tsx
└── scripts/                 # Optional helper scripts (Python/Node)
    └── validator.py`}
                  </pre>
                </div>
              )}

              {/* SECTION 4: 8-POINT AST SCAN */}
              {activeDocSection === 'security' && (
                <div className="space-y-4 text-xs">
                  <h3 className="text-sm font-bold text-[#171717]">The KYRON 8-Point Security Scanning Engine</h3>
                  <p className="text-[#525252]">
                    To protect AI developers, KYRON runs an automated static AST analysis on every submission before it can be published:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {STANDARD_SECURITY_CHECKS.map((chk, i) => (
                      <div key={chk.id} className="p-3 rounded-lg border border-[#E8E8E6] bg-[#FAFAF9]">
                        <div className="font-bold text-[#171717] flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          <span>{chk.name}</span>
                        </div>
                        <p className="text-[11px] text-[#737373] mt-1">{chk.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 5: PRICING & ECONOMICS */}
              {activeDocSection === 'pricing' && (
                <div className="space-y-4 text-xs">
                  <h3 className="text-sm font-bold text-[#171717]">70% Creator Revenue Share Model</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                      <div className="text-2xl font-bold font-mono text-emerald-600">70%</div>
                      <div className="font-bold text-emerald-900 mt-1">Creator Payout</div>
                      <p className="text-[11px] text-emerald-800 mt-0.5">Net share delivered to your wallet or bank account.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9]">
                      <div className="text-2xl font-bold font-mono text-[#737373]">30%</div>
                      <div className="font-bold text-[#171717] mt-1">Platform Infrastructure</div>
                      <p className="text-[11px] text-[#737373] mt-0.5">Covers AST analysis, CDN hosting, payment fees, and license checks.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 6: AGENT SETUP */}
              {activeDocSection === 'agents' && (
                <div className="space-y-4 text-xs">
                  <h3 className="text-sm font-bold text-[#171717]">Autonomous Agent Installation Paths</h3>
                  <div className="space-y-3 font-mono text-[11px]">
                    <div className="p-3 rounded-lg border border-[#E8E8E6] bg-[#FAFAF9]">
                      <div className="font-bold text-[#171717] font-sans">Claude Code</div>
                      <code className="text-[#F97316]">.claude/skills/&lt;skill-slug&gt;/SKILL.md</code>
                    </div>
                    <div className="p-3 rounded-lg border border-[#E8E8E6] bg-[#FAFAF9]">
                      <div className="font-bold text-[#171717] font-sans">Cursor</div>
                      <code className="text-[#F97316]">.cursor/skills/&lt;skill-slug&gt;/SKILL.md</code>
                    </div>
                    <div className="p-3 rounded-lg border border-[#E8E8E6] bg-[#FAFAF9]">
                      <div className="font-bold text-[#171717] font-sans">Google Antigravity</div>
                      <code className="text-[#F97316]">~/.gemini/config/skills/&lt;skill-slug&gt;/SKILL.md</code>
                    </div>
                    <div className="p-3 rounded-lg border border-[#E8E8E6] bg-[#FAFAF9]">
                      <div className="font-bold text-[#171717] font-sans">KYRON CLI 1-Click Execution</div>
                      <code className="text-emerald-600">kyron run &lt;skill-slug&gt;</code>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 7: FAQ */}
              {activeDocSection === 'faq' && (
                <div className="space-y-3 text-xs">
                  <h3 className="text-sm font-bold text-[#171717]">Frequently Asked Questions</h3>
                  {[
                    {
                      q: 'Do I retain intellectual property ownership?',
                      a: 'Yes. You retain full copyright and ownership of your skill instructions, templates, and code.'
                    },
                    {
                      q: 'Does KYRON require Model Context Protocol (MCP)?',
                      a: 'No. KYRON skills are standalone Markdown files and standard ZIP archives. They run locally on any compatible agent without intermediaries.'
                    },
                    {
                      q: 'How does the direct publishing flow work?',
                      a: 'Save your draft, click "Run AST Scan" to confirm 8/8 checks pass, then click "Publish Directly". Your skill appears live on the marketplace immediately!'
                    }
                  ].map((faq, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-[#E8E8E6] bg-[#FAFAF9] space-y-1">
                      <div className="font-bold text-[#171717]">{faq.q}</div>
                      <p className="text-[#525252] leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: STOREFRONT PROFILE MODAL                         */}
      {/* ========================================================= */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-[#E8E8E6] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E6]">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-[#171717]">Creator Storefront Profile</h3>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="text-[#737373] hover:text-[#171717]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#171717]">Display Name *</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#171717]">Creator Bio</label>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="Tell AI developers about your domain expertise, engineering background..."
                  className="w-full px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717] resize-none h-20"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#171717]">Website / Portfolio URL</label>
                <input
                  type="url"
                  value={profileWebsite}
                  onChange={(e) => setProfileWebsite(e.target.value)}
                  placeholder="https://yourdomain.com"
                  className="w-full px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#171717]">Avatar Image URL</label>
                <input
                  type="url"
                  value={profileAvatar}
                  onChange={(e) => setProfileAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-[#E8E8E6]">
                {user?.username ? (
                  <Link
                    href={`/creators/${user.username}`}
                    className="text-xs font-semibold text-[#F97316] hover:text-[#EA580C] inline-flex items-center gap-1"
                  >
                    <span>View Public Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-[#E8E8E6] text-xs font-medium text-[#737373] hover:text-[#171717]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-4 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg font-semibold shadow-xs transition-colors"
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: VERSION HISTORY MODAL                            */}
      {/* ========================================================= */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-[#E8E8E6] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E6]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-base font-bold text-[#171717]">Skill Version History</h3>
              </div>
              <button onClick={() => setShowVersionModal(false)} className="text-[#737373] hover:text-[#171717]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-semibold text-[#171717]">Tag New Version</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVersionNumber}
                    onChange={(e) => setNewVersionNumber(e.target.value)}
                    placeholder="e.g. 1.1.0"
                    className="w-32 px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg font-mono text-[11px] focus:outline-none focus:border-[#171717]"
                  />
                  <input
                    type="text"
                    value={newVersionChangelog}
                    onChange={(e) => setNewVersionChangelog(e.target.value)}
                    placeholder="Changelog: Added AST validation rules"
                    className="flex-1 px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg focus:outline-none focus:border-[#171717]"
                  />
                  <button
                    onClick={handleCreateVersion}
                    className="px-3.5 py-1.5 bg-[#171717] hover:bg-black text-white rounded-lg font-semibold shrink-0"
                  >
                    Tag
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-[#171717]">Published Versions</h4>
                {skillVersions.length === 0 ? (
                  <p className="text-[#737373] py-2">No version history recorded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {skillVersions.map((v) => (
                      <div key={v.id} className="p-2.5 rounded-lg border border-[#E8E8E6] bg-[#FAFAF9] flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-[#171717]">v{v.version_number}</span>
                          <span className="text-[11px] text-[#737373] ml-2">{v.changelog || 'No changelog'}</span>
                        </div>
                        <span className="text-[10px] text-[#A3A3A3] font-mono">
                          {new Date(v.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADD SUPPORTING FILE MODAL                        */}
      {/* ========================================================= */}
      {showAddFileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 border border-[#E8E8E6] shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E6]">
              <h3 className="text-sm font-bold text-[#171717]">Add Supporting File</h3>
              <button onClick={() => setShowAddFileModal(false)} className="text-[#737373] hover:text-[#171717]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <label className="font-semibold text-[#171717]">File Relative Path</label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. templates/config.yaml"
                className="w-full px-3 py-1.5 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg font-mono text-[11px] focus:outline-none focus:border-[#171717]"
              />
              <p className="text-[10px] text-[#737373]">
                Supports files under <code className="font-mono">references/</code>, <code className="font-mono">templates/</code>, or <code className="font-mono">scripts/</code>.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddFileModal(false)}
                className="px-3 py-1.5 text-xs text-[#737373] hover:text-[#171717]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFile}
                className="px-3.5 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Add File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatorStudioPage;

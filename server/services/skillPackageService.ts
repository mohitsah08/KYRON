import JSZip from 'jszip';

export interface PackageFile {
  name: string;
  content: string;
}

export interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  license?: string;
  compatibility?: string[];
  tags?: string[];
  category?: string;
  extra?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: SkillMetadata;
}

export type TargetAgent = 'claude' | 'codex' | 'cursor' | 'antigravity' | 'generic';

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin', '.bat', '.cmd', '.com', '.msi', '.vbs', '.scr', '.pif'
]);

/**
 * Parses and extracts YAML frontmatter from Markdown.
 */
export function parseFrontmatter(markdown: string): { frontmatterText: string | null; body: string; metadata: Record<string, string> } {
  const match = markdown.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/);
  if (!match) {
    return { frontmatterText: null, body: markdown, metadata: {} };
  }

  const frontmatterText = match[1];
  const body = markdown.slice(match[0].length);
  const metadata: Record<string, string> = {};

  for (const line of frontmatterText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      let value = trimmed.slice(colonIdx + 1).trim();
      // Remove enclosing quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      metadata[key] = value;
    }
  }

  return { frontmatterText, body, metadata };
}

/**
 * Validates Agent Skills frontmatter compliance.
 * At minimum, requires name and description.
 */
export function validateSkillMd(markdown: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!markdown || !markdown.trim()) {
    return { valid: false, errors: ['SKILL.md content is empty.'], warnings };
  }

  const { frontmatterText, metadata, body } = parseFrontmatter(markdown);

  if (!frontmatterText) {
    errors.push('SKILL.md is missing YAML frontmatter enclosed in triple dashes (---).');
    return { valid: false, errors, warnings };
  }

  if (!metadata.name || !metadata.name.trim()) {
    errors.push('Frontmatter must include a non-empty "name" field.');
  } else {
    // Validate Agent Skills naming conventions (lowercase, alphanumeric, hyphens/underscores)
    const namePattern = /^[a-z0-9-_]{2,64}$/i;
    if (!namePattern.test(metadata.name.trim())) {
      warnings.push(`Skill name "${metadata.name}" should ideally be 2-64 alphanumeric characters, hyphens, or underscores.`);
    }
  }

  if (!metadata.description || !metadata.description.trim()) {
    errors.push('Frontmatter must include a non-empty "description" field.');
  }

  if (body.trim().length < 20) {
    warnings.push('Skill instructions body is very short. Providing clear guidelines enhances agent reliability.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      name: metadata.name || '',
      description: metadata.description || '',
      version: metadata.version || '1.0.0',
      license: metadata.license || 'MIT',
      category: metadata.category
    }
  };
}

/**
 * Converts a plain Markdown document into valid Agent Skills format.
 */
export function convertPlainMarkdownToSkill(plainMarkdown: string, fallbackName?: string, fallbackDescription?: string): string {
  const { frontmatterText } = parseFrontmatter(plainMarkdown);
  if (frontmatterText) {
    // Already has frontmatter
    return plainMarkdown;
  }

  // Extract first H1 heading for name if available
  let title = fallbackName || '';
  const h1Match = plainMarkdown.match(/^#\s+(.+)$/m);
  if (!title && h1Match) {
    title = h1Match[1].trim();
  }
  if (!title) {
    title = 'my-skill';
  }

  const sanitizedName = title
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'my-skill';

  // Extract first paragraph for description
  let description = fallbackDescription || '';
  if (!description) {
    const lines = plainMarkdown.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (lines.length > 0) {
      description = lines[0].slice(0, 150);
    } else {
      description = `Custom AI skill: ${sanitizedName}`;
    }
  }

  const frontmatter = [
    '---',
    `name: ${sanitizedName}`,
    `description: "${description.replace(/"/g, '\\"')}"`,
    `version: 1.0.0`,
    `license: MIT`,
    '---',
    '',
    plainMarkdown.trim()
  ].join('\n');

  return frontmatter;
}

/**
 * Validates and unpacks an uploaded ZIP package buffer safely.
 */
export async function validateAndExtractZip(zipBuffer: Buffer): Promise<{
  skillMd: string;
  files: PackageFile[];
  skillName: string;
  metadata?: SkillMetadata;
  warnings: string[];
}> {
  if (zipBuffer.length > 15 * 1024 * 1024) {
    throw new Error('ZIP archive exceeds the maximum allowed upload size (15 MB).');
  }

  const zip = await JSZip.loadAsync(zipBuffer);
  const filePaths = Object.keys(zip.files).filter(p => !zip.files[p].dir);

  if (filePaths.length === 0) {
    throw new Error('ZIP archive is empty.');
  }

  if (filePaths.length > 100) {
    throw new Error('ZIP archive contains too many files (maximum 100 files allowed).');
  }

  // Path traversal check & disallowed extension check across ALL entries
  for (const rawPath of Object.keys(zip.files)) {
    if (rawPath.includes('..') || rawPath.startsWith('/') || rawPath.startsWith('\\') || rawPath.includes(':')) {
      throw new Error(`Unsafe path detected in archive: "${rawPath}". Path traversal is prohibited.`);
    }

    const lower = rawPath.toLowerCase();
    for (const ext of DANGEROUS_EXTENSIONS) {
      if (lower.endsWith(ext)) {
        throw new Error(`Archive contains prohibited binary/executable file: "${rawPath}". Only text, markdown, scripts, and documentation files are allowed.`);
      }
    }
  }

  // Detect root folder prefix if present (e.g. "my-skill/SKILL.md")
  let rootPrefix = '';
  const firstPath = filePaths[0];
  const slashIdx = firstPath.indexOf('/');
  if (slashIdx > 0) {
    const candidatePrefix = firstPath.slice(0, slashIdx + 1);
    const allMatch = filePaths.every(p => p.startsWith(candidatePrefix));
    if (allMatch) {
      rootPrefix = candidatePrefix;
    }
  }

  // Find primary SKILL.md
  let skillMdPath = filePaths.find(p => {
    const rel = rootPrefix ? p.slice(rootPrefix.length) : p;
    return rel.toLowerCase() === 'skill.md';
  });

  if (!skillMdPath) {
    // Check if there is any .md file at root
    const rootMd = filePaths.find(p => {
      const rel = rootPrefix ? p.slice(rootPrefix.length) : p;
      return !rel.includes('/') && rel.toLowerCase().endsWith('.md');
    });
    if (rootMd) {
      skillMdPath = rootMd;
    } else {
      throw new Error('Skill package must contain a primary SKILL.md file.');
    }
  }

  const skillMdEntry = zip.files[skillMdPath];
  const rawSkillMd = await skillMdEntry.async('string');

  const validation = validateSkillMd(rawSkillMd);
  const warnings: string[] = [...validation.warnings];

  let finalSkillMd = rawSkillMd;
  if (!validation.valid) {
    warnings.push(`Imported ${skillMdPath} lacked valid frontmatter: ${validation.errors.join(', ')}. Auto-generating frontmatter.`);
    finalSkillMd = convertPlainMarkdownToSkill(rawSkillMd, 'imported-skill');
  }

  // Extract all other supporting files
  const files: PackageFile[] = [];
  for (const p of filePaths) {
    if (p === skillMdPath) continue;
    const relPath = rootPrefix ? p.slice(rootPrefix.length) : p;
    if (!relPath) continue;

    const content = await zip.files[p].async('string');
    files.push({
      name: relPath,
      content
    });
  }

  const finalValidation = validateSkillMd(finalSkillMd);
  const skillName = finalValidation.metadata?.name || 'skill';

  return {
    skillMd: finalSkillMd,
    files,
    skillName,
    metadata: finalValidation.metadata,
    warnings
  };
}

/**
 * Builds a valid Agent Skills ZIP package buffer.
 */
export async function buildSkillZip(
  skillSlug: string,
  skillMdContent: string,
  filesMap: Record<string, string> = {}
): Promise<Buffer> {
  const zip = new JSZip();
  const folder = zip.folder(skillSlug) || zip;

  folder.file('SKILL.md', skillMdContent);

  for (const [relativePath, content] of Object.entries(filesMap)) {
    if (relativePath === 'SKILL.md' || relativePath === `${skillSlug}/SKILL.md`) continue;
    const cleanPath = relativePath.replace(/^[/\\]+/, '');
    folder.file(cleanPath, content);
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return buffer;
}

/**
 * Returns documented installation directories per target agent.
 */
export function getAgentInstallPath(agent: TargetAgent, skillSlug: string): { path: string; description: string } {
  switch (agent) {
    case 'claude':
      return {
        path: `.claude/skills/${skillSlug}/`,
        description: 'Claude Code project skills directory (or ~/.claude/skills/ for user-global skills)'
      };
    case 'codex':
      return {
        path: `.codex/skills/${skillSlug}/`,
        description: 'OpenAI Codex project skills directory (or .agents/skills/ in shared agent environments)'
      };
    case 'cursor':
      return {
        path: `.cursor/skills/${skillSlug}/`,
        description: 'Cursor project skills directory (or .cursor/rules/ for rule-based prompts)'
      };
    case 'antigravity':
      return {
        path: `.agents/skills/${skillSlug}/`,
        description: 'Google Antigravity workspace skills root (or ~/.gemini/config/skills/ for global skills)'
      };
    case 'generic':
    default:
      return {
        path: `.agents/skills/${skillSlug}/`,
        description: 'Standard Open Agent Skills workspace directory (.agents/skills/<skill-name>/)'
      };
  }
}

/**
 * Generates an AI Agent Installation Prompt customized for the selected target agent.
 */
export function generateInstallationPrompt(params: {
  skillName: string;
  skillSlug: string;
  version: string;
  summary: string;
  targetAgent: TargetAgent;
  hasSupportingFiles: boolean;
  fileList?: string[];
}): string {
  const { skillName, skillSlug, version, summary, targetAgent, hasSupportingFiles, fileList = [] } = params;
  const targetInfo = getAgentInstallPath(targetAgent, skillSlug);

  const fileTreeDesc = hasSupportingFiles && fileList.length > 0
    ? [
        `${skillSlug}/`,
        `├── SKILL.md`,
        ...fileList.filter(f => f !== 'SKILL.md').map(f => `├── ${f}`)
      ].join('\n')
    : [
        `${skillSlug}/`,
        `└── SKILL.md`
      ].join('\n');

  return `### KYRON Skill Installation Request

You are installing the KYRON skill package: **"${skillName}"** (v${version}) into this project.

**Skill Overview:**
> ${summary}

**Target Agent:** ${targetAgent.toUpperCase()}
**Recommended Installation Path:** \`${targetInfo.path}\`
*Note:* ${targetInfo.description}.

**Supplied Package Structure:**
\`\`\`text
${fileTreeDesc}
\`\`\`

---

### Step-by-Step Installation Instructions:

1. **Inspect Package Archive:**
   - Unpack or inspect the provided \`${skillSlug}.zip\` package.
   - Confirm that \`SKILL.md\` is present and contains valid YAML frontmatter (with \`name\` and \`description\`).
   ${hasSupportingFiles ? '- Confirm all supporting resources (`references/`, `scripts/`, `assets/`, etc.) match the package structure.' : ''}

2. **Verify Project Environment:**
   - Inspect the current workspace layout.
   - Do NOT overwrite existing unrelated skills or configuration files.
   - If \`${targetInfo.path}\` already contains a previous version of this skill, create a backup or ask before replacing.

3. **Install Skill Files:**
   - Place \`SKILL.md\` into: \`${targetInfo.path}SKILL.md\`
   ${hasSupportingFiles ? `- Preserve supporting directories and relative links under: \`${targetInfo.path}\`` : ''}
   - Maintain exact relative paths so Markdown references remain intact.

4. **Security & Execution Constraints:**
   - **DO NOT** execute any packaged scripts or binaries automatically.
   - Verify that all files are plain-text / human-readable instructions or standard scripts.
   - Ask for confirmation before performing any destructive file modifications.

5. **Validation & Completion Report:**
   - Verify that the target files exist in the expected destination.
   - Report the exact path where the skill was installed, list all installed files, and confirm that the skill is ready for invocation.
`;
}

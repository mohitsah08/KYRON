import { describe, it } from 'node:test';
import assert from 'node:assert';
import JSZip from 'jszip';
import {
  validateSkillMd,
  convertPlainMarkdownToSkill,
  validateAndExtractZip,
  buildSkillZip,
  generateInstallationPrompt,
  getAgentInstallPath
} from '../server/services/skillPackageService.ts';

describe('SkillPackageService Test Suite', () => {
  it('validates a compliant SKILL.md with name and description', () => {
    const validSkill = `---
name: data-cleaner
description: Cleans and transforms tabular datasets into Parquet format.
version: 1.0.0
---

# Data Cleaner
Use this skill to clean noisy tabular data.
`;
    const res = validateSkillMd(validSkill);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.errors.length, 0);
    assert.strictEqual(res.metadata?.name, 'data-cleaner');
    assert.strictEqual(res.metadata?.description, 'Cleans and transforms tabular datasets into Parquet format.');
  });

  it('fails validation when YAML frontmatter is missing or invalid', () => {
    const invalidSkill = `# Just a title
No frontmatter at all.
`;
    const res = validateSkillMd(invalidSkill);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('missing YAML frontmatter')));
  });

  it('fails validation when name or description are omitted in frontmatter', () => {
    const missingDesc = `---
name: only-name
---

# Incomplete
`;
    const res = validateSkillMd(missingDesc);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('"description"')));
  });

  it('converts plain Markdown into valid Agent Skills format with frontmatter preview', () => {
    const plain = `# SQL Optimizer

This skill rewrites slow PostgreSQL queries for performance.
`;
    const converted = convertPlainMarkdownToSkill(plain, 'sql-optimizer');
    const res = validateSkillMd(converted);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.metadata?.name, 'sql-optimizer');
    assert.ok(converted.includes('This skill rewrites slow PostgreSQL queries'));
  });

  it('builds a valid ZIP archive and unpacks it back with structure preserved', async () => {
    const slug = 'test-suite-builder';
    const skillMd = `---
name: test-suite-builder
description: Automates unit test generation.
---

# Test Suite Builder
`;
    const files = {
      'scripts/generator.py': 'print("generate")',
      'references/guide.md': '# Guide'
    };

    const zipBuffer = await buildSkillZip(slug, skillMd, files);
    assert.ok(zipBuffer.length > 0);

    // Extract and verify
    const extracted = await validateAndExtractZip(zipBuffer);
    assert.strictEqual(extracted.skillName, 'test-suite-builder');
    assert.ok(extracted.skillMd.includes('Automates unit test generation'));
    assert.strictEqual(extracted.files.length, 2);
    assert.ok(extracted.files.some(f => f.name === 'scripts/generator.py'));
    assert.ok(extracted.files.some(f => f.name === 'references/guide.md'));
  });

  it('rejects ZIP files with path traversal attacks', async () => {
    const badZip = new JSZip();
    badZip.file('../evil.sh', 'echo evil');
    badZip.file('SKILL.md', '---\nname: bad\ndescription: bad\n---\n');
    const buf = await badZip.generateAsync({ type: 'nodebuffer' });

    await assert.rejects(
      async () => validateAndExtractZip(buf),
      /Unsafe path detected in archive/
    );
  });

  it('rejects ZIP files with prohibited binary executable extensions', async () => {
    const binaryZip = new JSZip();
    binaryZip.file('exploit.exe', 'binary-data');
    binaryZip.file('SKILL.md', '---\nname: binary-bad\ndescription: bad\n---\n');
    const buf = await binaryZip.generateAsync({ type: 'nodebuffer' });

    await assert.rejects(
      async () => validateAndExtractZip(buf),
      /prohibited binary\/executable file/
    );
  });

  it('generates customized installation prompts for Claude, Codex, Cursor, Antigravity, and Generic', () => {
    const agents = ['claude', 'codex', 'cursor', 'antigravity', 'generic'] as const;

    for (const agent of agents) {
      const prompt = generateInstallationPrompt({
        skillName: 'Security Sentinel',
        skillSlug: 'security-sentinel',
        version: '1.2.0',
        summary: 'Scans for vulnerabilities',
        targetAgent: agent,
        hasSupportingFiles: true,
        fileList: ['SKILL.md', 'scripts/scanner.py', 'references/rules.md']
      });

      assert.ok(prompt.includes('Security Sentinel'));
      assert.ok(prompt.includes('v1.2.0'));
      assert.ok(prompt.includes('execute any packaged scripts or binaries automatically'));
      assert.ok(prompt.includes('Ask for confirmation before performing any destructive'));

      const pathInfo = getAgentInstallPath(agent, 'security-sentinel');
      assert.ok(prompt.includes(pathInfo.path));
    }
  });
});

process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import JSZip from 'jszip';
import { app } from '../server/index.ts';
import { db, initDatabase } from '../server/db/database.ts';
import { skillPackageService } from '../server/services/skillPackageService.ts';

function requestRaw(
  server: http.Server,
  path: string,
  method = 'GET',
  body?: any,
  token?: string,
  contentType = 'application/json'
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer; text: string; json: any }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const bodyBuf = body ? (Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))) : Buffer.alloc(0);
    const headers: Record<string, string> = {
      'Content-Type': contentType
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (bodyBuf.length > 0) headers['Content-Length'] = String(bodyBuf.length);

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path,
        method,
        headers
      },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const fullBuf = Buffer.concat(chunks);
          const text = fullBuf.toString('utf-8');
          let json: any = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({
            status: res.statusCode || 200,
            headers: res.headers,
            body: fullBuf,
            text,
            json
          });
        });
      }
    );
    req.on('error', reject);
    if (bodyBuf.length > 0) req.write(bodyBuf);
    req.end();
  });
}

describe('KYRON Standalone AI Skills Marketplace Test Suite', () => {
  let server: http.Server;
  let creatorToken: string;
  let creatorId: string;
  let buyerToken: string;
  let buyerId: string;
  let adminToken: string;
  let adminId: string;
  let draftSkillId: string;

  const runId = Math.random().toString(36).slice(2, 8);
  let freeSkillSlug = `test-free-${runId}`;
  let paidSkillSlug = `test-paid-${runId}`;
  let draftSkillSlug = `test-draft-${runId}`;

  before(async () => {
    await initDatabase();
    server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

    // Register test creator
    const creatorAuth = await requestRaw(server, '/api/auth/register', 'POST', {
      email: `creator_${Date.now()}@test.kyron`,
      password: 'Password123!',
      display_name: 'Lead Creator'
    });
    assert.strictEqual(creatorAuth.status, 201);
    creatorToken = creatorAuth.json.token;
    creatorId = creatorAuth.json.user.id;

    // Register test buyer
    const buyerAuth = await requestRaw(server, '/api/auth/register', 'POST', {
      email: `buyer_${Date.now()}@test.kyron`,
      password: 'Password123!',
      display_name: 'Skill Buyer'
    });
    assert.strictEqual(buyerAuth.status, 201);
    buyerToken = buyerAuth.json.token;
    buyerId = buyerAuth.json.user.id;

    // Register test admin
    const adminAuth = await requestRaw(server, '/api/auth/register', 'POST', {
      email: `admin_${Date.now()}@test.kyron`,
      password: 'Password123!',
      display_name: 'System Admin'
    });
    assert.strictEqual(adminAuth.status, 201);
    adminToken = adminAuth.json.token;
    adminId = adminAuth.json.user.id;
    await db.run(`UPDATE profiles SET role = 'admin', is_unlimited_credit_user = 1 WHERE id = ?`, [adminId]);

    // Grant buyer credits for testing purchase flows
    await db.run('UPDATE profiles SET credit_balance = 100.0 WHERE id = ?', [buyerId]);
  });

  after(async () => {
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it('1. Application startup and health check succeeds without MCP dependencies', async () => {
    const res = await requestRaw(server, '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.status, 'ok');
    assert.strictEqual(res.json.service, 'KYRON AI Agent Skill Gateway');
  });

  it('2. Empty marketplace behavior returns clean empty array when no skills match filters', async () => {
    const res = await requestRaw(server, '/api/skills?q=nonexistent_query_string_xyz');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.json.skills));
    assert.strictEqual(res.json.skills.length, 0);
  });

  it('3. Package validation endpoint validates safe ZIP package', async () => {
    const zip = new JSZip();
    zip.file('SKILL.md', '---\nname: safe-zip-skill\ndescription: A safe ZIP skill\nversion: 1.0.0\n---\n# Instructions\nRun workflow.');
    zip.file('references/guide.md', '# Guide\nFollow steps.');
    const zipBuf = await zip.generateAsync({ type: 'nodebuffer' });
    const base64 = zipBuf.toString('base64');

    const res = await requestRaw(server, '/api/creator/validate-package', 'POST', {
      type: 'zip',
      base64
    }, creatorToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.valid, true);
    assert.strictEqual(res.json.extracted_frontmatter.name, 'safe-zip-skill');
    assert.ok(res.json.files.some((f: any) => (f.name || f) === 'references/guide.md'));
  });

  it('4. Package validation endpoint rejects path traversal attacks', async () => {
    const zip = new JSZip();
    zip.file('SKILL.md', '---\nname: traversal-skill\ndescription: Malicious skill\n---\nContent');
    zip.file('../evil.sh', 'rm -rf /');
    const zipBuf = await zip.generateAsync({ type: 'nodebuffer' });
    const base64 = zipBuf.toString('base64');

    const res = await requestRaw(server, '/api/creator/validate-package', 'POST', {
      type: 'zip',
      base64
    }, creatorToken);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.json.valid, false);
    assert.ok(res.json.errors.some((e: string) => e.includes('Path traversal')));
  });

  it('5. Package validation endpoint converts plain Markdown with generated YAML frontmatter', async () => {
    const plainMd = '# Database Optimization Guide\n\nRun EXPLAIN ANALYZE on all slow queries and add composite indexes.';
    const res = await requestRaw(server, '/api/creator/validate-package', 'POST', {
      type: 'plain_md',
      content: plainMd,
      filename: 'db-optimizer.md'
    }, creatorToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.valid, true);
    assert.strictEqual(res.json.converted, true);
    assert.strictEqual(res.json.extracted_frontmatter.name, 'db-optimizer');
    assert.ok(res.json.extracted_instructions.includes('Run EXPLAIN ANALYZE'));
  });

  it('6. Creator can publish a Free AI Skill with supporting files and license', async () => {
    const res = await requestRaw(server, '/api/creator/publish', 'POST', {
      name: 'Test Free Agent Skill',
      slug: freeSkillSlug,
      summary: 'High performance free agent skill',
      description: 'Full instruction set for autonomous code refactoring',
      category: 'Code Intelligence',
      version: '1.2.0',
      license: 'MIT',
      compatibility: 'Claude Code, Cursor, Antigravity',
      tags: ['free', 'agent', 'refactor'],
      pricing_type: 'free',
      price: 0,
      instructions: '# Free Skill\nExecute refactoring according to standards.',
      supporting_files: [
        { path: 'references/standards.md', content: '# Coding Standards\nUse clean code.' },
        { path: 'scripts/lint.py', content: 'print("Lint OK")' }
      ],
      is_draft: false
    }, creatorToken);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.json.skill.slug, freeSkillSlug);
    assert.strictEqual(res.json.skill.pricing_type, 'free');
  });

  it('7. Creator can publish a Paid AI Skill', async () => {
    const res = await requestRaw(server, '/api/creator/publish', 'POST', {
      name: 'Test Paid Agent Skill',
      slug: paidSkillSlug,
      summary: 'Enterprise paid agent skill',
      description: 'Production architecture security rules for enterprise teams',
      category: 'Security & Auditing',
      version: '2.0.0',
      license: 'Apache-2.0',
      compatibility: 'Claude Code, Cursor, Codex, Antigravity',
      tags: ['security', 'enterprise', 'paid'],
      pricing_type: 'paid',
      price: 9.99,
      instructions: '# Security Checklist\nEnforce strict RLS and JWT verification.',
      supporting_files: [
        { path: 'references/owasp.md', content: '# OWASP Top 10\nRules.' }
      ],
      is_draft: false
    }, creatorToken);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.json.skill.slug, paidSkillSlug);
    assert.strictEqual(res.json.skill.pricing_type, 'paid');
    assert.strictEqual(res.json.skill.price, 9.99);
  });

  it('8. Creator can save a Draft skill, and draft remains private from public marketplace', async () => {
    const res = await requestRaw(server, '/api/creator/publish', 'POST', {
      name: 'Test Draft Private Skill',
      slug: draftSkillSlug,
      summary: 'Private draft not yet published',
      description: 'Work in progress',
      category: 'Testing & QA',
      version: '0.1.0',
      license: 'MIT',
      pricing_type: 'free',
      price: 0,
      instructions: '# Draft\nUnder development.',
      is_draft: true
    }, creatorToken);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.json.skill.is_draft, 1);
    draftSkillId = res.json.skill_id;

    // Public / anonymous user requests the draft slug -> MUST return 404
    const publicFetch = await requestRaw(server, `/api/skills/${draftSkillSlug}`);
    assert.strictEqual(publicFetch.status, 404);

    // Other authenticated user (buyer) requests the draft slug -> MUST return 404
    const buyerFetch = await requestRaw(server, `/api/skills/${draftSkillSlug}`, 'GET', undefined, buyerToken);
    assert.strictEqual(buyerFetch.status, 404);

    // The creator CAN fetch their own draft
    const creatorFetch = await requestRaw(server, `/api/skills/${draftSkillSlug}`, 'GET', undefined, creatorToken);
    assert.strictEqual(creatorFetch.status, 200);
    assert.strictEqual(creatorFetch.json.skill.slug, draftSkillSlug);
  });

  it('9. Creator Studio endpoint lists creator skills including drafts', async () => {
    const res = await requestRaw(server, '/api/creator/skills', 'GET', undefined, creatorToken);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.json.skills));
    const slugs = res.json.skills.map((s: any) => s.slug);
    assert.ok(slugs.includes(freeSkillSlug));
    assert.ok(slugs.includes(paidSkillSlug));
    assert.ok(slugs.includes(draftSkillSlug));
  });

  it('10. Creator can toggle unpublish / publish on a skill', async () => {
    // Unpublish free skill
    const unpubRes = await requestRaw(server, `/api/creator/skills/${freeSkillSlug}/unpublish`, 'POST', {
      is_draft: true
    }, creatorToken);
    assert.strictEqual(unpubRes.status, 200);
    assert.strictEqual(unpubRes.json.is_draft, true);

    // Free skill now inaccessible publicly
    const publicFetch = await requestRaw(server, `/api/skills/${freeSkillSlug}`);
    assert.strictEqual(publicFetch.status, 404);

    // Re-publish free skill
    const repubRes = await requestRaw(server, `/api/creator/skills/${freeSkillSlug}/unpublish`, 'POST', {
      is_draft: false
    }, creatorToken);
    assert.strictEqual(repubRes.status, 200);
    assert.strictEqual(repubRes.json.is_draft, false);

    // Public fetch works again
    const publicFetch2 = await requestRaw(server, `/api/skills/${freeSkillSlug}`);
    assert.strictEqual(publicFetch2.status, 200);
  });

  it('11. Markdown download for free skill returns valid standalone .md file', async () => {
    const res = await requestRaw(server, `/api/skills/${freeSkillSlug}/download/markdown`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-disposition']?.includes('.md'));
    assert.ok(res.text.includes('---'));
    assert.ok(res.text.includes(`name: ${freeSkillSlug}`));
    assert.ok(res.text.includes('# Free Skill'));
  });

  it('12. ZIP download for free skill returns valid ZIP containing complete skill package', async () => {
    const res = await requestRaw(server, `/api/skills/${freeSkillSlug}/download/zip`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-disposition']?.includes('.zip'));

    // Verify ZIP archive integrity
    const zip = await JSZip.loadAsync(res.body);
    const files = Object.keys(zip.files);
    assert.ok(files.some(f => f.endsWith('SKILL.md')));
    assert.ok(files.some(f => f.includes('references/standards.md')));
    assert.ok(files.some(f => f.includes('scripts/lint.py')));

    const skillMdContent = await zip.file(files.find(f => f.endsWith('SKILL.md'))!)!.async('string');
    assert.ok(skillMdContent.includes(`name: ${freeSkillSlug}`));
  });

  it('13. Unauthorized buyer is blocked from downloading paid skill files (403 Forbidden)', async () => {
    // Markdown download blocked
    const mdRes = await requestRaw(server, `/api/skills/${paidSkillSlug}/download/markdown`, 'GET', undefined, buyerToken);
    assert.strictEqual(mdRes.status, 403);
    assert.ok(mdRes.json.error.includes('Purchase required'));

    // ZIP download blocked
    const zipRes = await requestRaw(server, `/api/skills/${paidSkillSlug}/download/zip`, 'GET', undefined, buyerToken);
    assert.strictEqual(zipRes.status, 403);
    assert.ok(zipRes.json.error.includes('Purchase required'));
  });

  it('14. Buyer purchases paid skill with server-verified credit transaction', async () => {
    // Get paid skill ID
    const skillRes = await requestRaw(server, `/api/skills/${paidSkillSlug}`);
    const skillId = skillRes.json.skill.id;

    // Execute verified purchase
    const purchaseRes = await requestRaw(server, '/api/purchases/buy-with-credit', 'POST', {
      skill_id: skillId
    }, buyerToken);

    assert.strictEqual(purchaseRes.status, 200);
    assert.strictEqual(purchaseRes.json.success, true);
    assert.ok(purchaseRes.json.purchase.id);
  });

  it('15. Authorized buyer can now download paid skill Markdown and ZIP files', async () => {
    // Authorized Markdown download
    const mdRes = await requestRaw(server, `/api/skills/${paidSkillSlug}/download/markdown`, 'GET', undefined, buyerToken);
    assert.strictEqual(mdRes.status, 200);
    assert.ok(mdRes.text.includes(`name: ${paidSkillSlug}`));

    // Authorized ZIP download
    const zipRes = await requestRaw(server, `/api/skills/${paidSkillSlug}/download/zip`, 'GET', undefined, buyerToken);
    assert.strictEqual(zipRes.status, 200);
    const zip = await JSZip.loadAsync(zipRes.body);
    const files = Object.keys(zip.files);
    assert.ok(files.some(f => f.endsWith('SKILL.md')));
    assert.ok(files.some(f => f.includes('references/owasp.md')));
  });

  it('16. AI Agent Installation Prompt generator produces customized instructions for all targets', async () => {
    // Claude Code target
    const claudeRes = await requestRaw(server, `/api/skills/${freeSkillSlug}/prompt?agent=claude`);
    assert.strictEqual(claudeRes.status, 200);
    assert.ok(claudeRes.json.prompt.includes('.claude/skills/'));
    assert.ok(claudeRes.json.prompt.includes('Claude Code'));
    assert.ok(claudeRes.json.prompt.includes('execute any packaged scripts or binaries automatically'));

    // Cursor target
    const cursorRes = await requestRaw(server, `/api/skills/${freeSkillSlug}/prompt?agent=cursor`);
    assert.strictEqual(cursorRes.status, 200);
    assert.ok(cursorRes.json.prompt.includes('.cursor/skills/'));
    assert.ok(cursorRes.json.prompt.includes('Cursor'));

    // Antigravity target
    const agyRes = await requestRaw(server, `/api/skills/${freeSkillSlug}/prompt?agent=antigravity`);
    assert.strictEqual(agyRes.status, 200);
    assert.ok(agyRes.json.prompt.includes('.agents/skills/'));
    assert.ok(agyRes.json.prompt.includes('Antigravity'));

    // OpenAI Codex target
    const codexRes = await requestRaw(server, `/api/skills/${freeSkillSlug}/prompt?agent=codex`);
    assert.strictEqual(codexRes.status, 200);
    assert.ok(codexRes.json.prompt.includes('.codex/skills/'));
    assert.ok(codexRes.json.prompt.includes('OpenAI Codex'));

    // Download prompt as text file
    const fileRes = await requestRaw(server, `/api/skills/${freeSkillSlug}/prompt?agent=claude&download=file`);
    assert.strictEqual(fileRes.status, 200);
    assert.ok(fileRes.headers['content-disposition']?.includes('.txt'));
    assert.ok(fileRes.text.includes('.claude/skills/'));
  });

  it('17. Download activity is recorded in skill_downloads ledger', async () => {
    const rows = await db.all('SELECT * FROM skill_downloads ORDER BY downloaded_at DESC');
    assert.ok(Array.isArray(rows));
    assert.ok(rows.length >= 2, 'Download records must be logged');
    assert.ok(rows.some(r => r.download_type === 'markdown'));
    assert.ok(rows.some(r => r.download_type === 'zip'));
  });

  it('18. Creator overview returns accurate aggregation metrics', async () => {
    const res = await requestRaw(server, '/api/creator/overview', 'GET', null, creatorToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.json.metrics);
    assert.strictEqual(typeof res.json.metrics.total_skills, 'number');
    assert.strictEqual(typeof res.json.metrics.draft_count, 'number');
    assert.strictEqual(typeof res.json.metrics.net_earnings, 'number');
  });

  it('19. Creator submits draft skill for review, creating real submission record', async () => {
    // Submit draftSkillId
    const res = await requestRaw(server, `/api/creator/skills/${draftSkillId}/submit`, 'POST', {}, creatorToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.success, true);
    assert.strictEqual(res.json.status, 'submitted');
    assert.ok(res.json.submission_id);

    // Verify submission row
    const sub = await db.get('SELECT * FROM skill_submissions WHERE skill_id = ?', [draftSkillId]);
    assert.ok(sub);
    assert.strictEqual(sub.status, 'submitted');
  });

  it('20. Admin reviews and approves submission in review queue', async () => {
    // Get submissions queue
    const queueRes = await requestRaw(server, '/api/creator/admin/submissions', 'GET', null, adminToken);
    assert.strictEqual(queueRes.status, 200);
    assert.ok(Array.isArray(queueRes.json.submissions));
    const pending = queueRes.json.submissions.find((s: any) => s.skill_id === draftSkillId);
    assert.ok(pending);

    // Approve submission
    const reviewRes = await requestRaw(
      server,
      `/api/creator/admin/submissions/${pending.id}/review`,
      'POST',
      { action: 'approve', feedback: 'Verified compliant with KYRON packaging standards.' },
      adminToken
    );
    assert.strictEqual(reviewRes.status, 200);
    assert.strictEqual(reviewRes.json.status, 'approved');

    // Verify skill status is now approved
    const skill = await db.get('SELECT status FROM skills WHERE id = ?', [draftSkillId]);
    assert.strictEqual(skill.status, 'approved');
  });

  it('21. Creator publishes the approved skill to KYRON Marketplace', async () => {
    const res = await requestRaw(server, `/api/creator/skills/${draftSkillId}/publish`, 'POST', {}, creatorToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.status, 'published');

    const skill = await db.get('SELECT status FROM skills WHERE id = ?', [draftSkillId]);
    assert.strictEqual(skill.status, 'published');
  });

  it('22. Creator pauses and resumes skill publication', async () => {
    // Pause
    const pauseRes = await requestRaw(server, `/api/creator/skills/${draftSkillId}/pause`, 'POST', {}, creatorToken);
    assert.strictEqual(pauseRes.status, 200);
    assert.strictEqual(pauseRes.json.status, 'paused');

    // Resume
    const resumeRes = await requestRaw(server, `/api/creator/skills/${draftSkillId}/resume`, 'POST', {}, creatorToken);
    assert.strictEqual(resumeRes.status, 200);
    assert.strictEqual(resumeRes.json.status, 'published');
  });

  it('23. Creator manages versions and storefront profile', async () => {
    // Create new version
    const verRes = await requestRaw(
      server,
      `/api/creator/skills/${draftSkillId}/versions`,
      'POST',
      { version_number: '1.1.0', changelog: 'Added extended documentation and benchmarks.' },
      creatorToken
    );
    assert.strictEqual(verRes.status, 201);
    assert.strictEqual(verRes.json.version_number, '1.1.0');

    // List versions
    const listVerRes = await requestRaw(server, `/api/creator/skills/${draftSkillId}/versions`, 'GET', null, creatorToken);
    assert.strictEqual(listVerRes.status, 200);
    assert.ok(listVerRes.json.versions.length >= 1);

    // Update profile
    const profileRes = await requestRaw(
      server,
      '/api/creator/profile',
      'PUT',
      { bio: 'Senior AI Engineer creating verified productivity skills.', website_url: 'https://kyron.ai/creators/ai-ninja' },
      creatorToken
    );
    assert.strictEqual(profileRes.status, 200);
    assert.strictEqual(profileRes.json.profile.bio, 'Senior AI Engineer creating verified productivity skills.');
  });
});

process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import JSZip from 'jszip';
import { app } from '../server/index.ts';
import { db, initDatabase } from '../server/db/database.ts';
import { generateToken } from '../server/middleware/auth.ts';

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
          const resBody = Buffer.concat(chunks);
          const text = resBody.toString('utf-8');
          let json: any = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode || 500, headers: res.headers, body: resBody, text, json });
        });
      }
    );

    req.on('error', reject);
    if (bodyBuf.length > 0) req.write(bodyBuf);
    req.end();
  });
}

describe('Creator Studio Bug Fixes Verification', () => {
  let server: http.Server;
  const newUserId = 'usr_studio_test_' + Date.now();
  let userToken: string;
  let savedSkillId: string;
  const testSlug = 'studio-test-skill-' + Date.now();

  before(async () => {
    await initDatabase();
    server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));

    // Sign a token for a user that does NOT yet exist in profiles table
    userToken = generateToken({
      id: newUserId,
      email: `${newUserId}@example.com`,
      username: `user_${newUserId}`,
      role: 'user'
    });
  });

  after(async () => {
    await new Promise<void>(resolve => server.close(resolve));
  });

  it('1. Issue A Fix: Draft save succeeds even when user was not previously seeded in profiles table', async () => {
    // Verify user does not exist in profiles initially
    const initialProfile = await db.get(`SELECT id FROM profiles WHERE id = ?`, [newUserId]);
    assert.ok(!initialProfile, 'Profile should not exist initially');

    const payload = {
      name: 'Test Skill For Verification',
      slug: testSlug,
      summary: 'Summarizes website content into clear, concise key points.',
      description: 'Comprehensive content summarizer.',
      category: 'Security',
      tags: ['agent', 'workflow', 'automation'],
      pricing_type: 'free',
      price: 0,
      version: '1.0.0',
      license: 'MIT',
      skill_md_content: '---\nname: Test Skill\ndescription: Summarizer\n---\n# Instructions\nSummarize websites.',
      files: [{ name: 'helper.py', content: 'print("hello")' }],
      is_draft: true
    };

    const res = await requestRaw(server, '/api/creator/publish', 'POST', payload, userToken);
    assert.strictEqual(res.status, 201, `Expected 201 Created but received ${res.status}: ${res.text}`);
    assert.ok(res.json.success, 'Expected success to be true');
    assert.ok(res.json.skill_id, 'Expected skill_id in response');
    savedSkillId = res.json.skill_id;

    // Verify creator profile was automatically ensured in profiles table
    const profileAfter = await db.get(`SELECT id, username FROM profiles WHERE id = ?`, [newUserId]);
    assert.ok(profileAfter, 'Profile record must exist in profiles table');
    assert.strictEqual(profileAfter.id, newUserId);

    // Verify skill was persisted in database
    const skillRecord = await db.get(`SELECT id, slug, status, creator_id FROM skills WHERE id = ?`, [savedSkillId]);
    assert.ok(skillRecord, 'Skill record must exist in skills table');
    assert.strictEqual(skillRecord.slug, testSlug);
    assert.strictEqual(skillRecord.status, 'draft');
    assert.strictEqual(skillRecord.creator_id, newUserId);
  });

  it('2. Issue B Fix: Submit for review succeeds after draft is saved', async () => {
    assert.ok(savedSkillId, 'Must have a savedSkillId from previous test');

    const res = await requestRaw(server, `/api/creator/skills/${savedSkillId}/submit`, 'POST', {}, userToken);
    assert.strictEqual(res.status, 200, `Expected 200 OK but received ${res.status}: ${res.text}`);
    assert.ok(res.json.success, 'Expected submission to succeed');

    // Verify submission record exists in skill_submissions table
    const subRecord = await db.get(`SELECT skill_id, status FROM skill_submissions WHERE skill_id = ?`, [savedSkillId]);
    assert.ok(subRecord, 'Submission record must exist');
    assert.strictEqual(subRecord.status, 'submitted');

    // Verify skill status transitioned to submitted
    const updatedSkill = await db.get(`SELECT status FROM skills WHERE id = ?`, [savedSkillId]);
    assert.strictEqual(updatedSkill.status, 'submitted');
  });

  it('3. Issue C Fix: ZIP download endpoint returns valid ZIP archive for saved skill', async () => {
    const res = await requestRaw(server, `/api/skills/${testSlug}/download/zip`, 'GET', null, userToken);
    assert.strictEqual(res.status, 200, `Expected 200 OK but received ${res.status}`);
    assert.strictEqual(res.headers['content-type'], 'application/zip');
    assert.ok(res.headers['content-disposition']?.includes(`${testSlug}.zip`));

    // Verify ZIP archive integrity
    const zip = await JSZip.loadAsync(res.body);
    const skillMdFile = zip.file(`${testSlug}/SKILL.md`) || zip.file('SKILL.md');
    assert.ok(skillMdFile, 'ZIP must contain SKILL.md');

    const helperFile = zip.file(`${testSlug}/helper.py`) || zip.file('helper.py');
    assert.ok(helperFile, 'ZIP must contain supporting file helper.py');

    const skillMdText = await skillMdFile.async('text');
    assert.ok(skillMdText.includes('Test Skill'), 'SKILL.md must contain skill content');
  });

  it('4. Issue C Error Handling: Requesting nonexistent skill ZIP returns clean 404 JSON', async () => {
    const res = await requestRaw(server, `/api/skills/nonexistent-skill-slug-12345/download/zip`, 'GET');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.json?.error, 'Skill not found');
  });
});

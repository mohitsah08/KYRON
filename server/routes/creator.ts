import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { SecurityScanner, PackageFile } from '../services/securityScanner.ts';
import {
  validateSkillMd,
  convertPlainMarkdownToSkill,
  validateAndExtractZip
} from '../services/skillPackageService.ts';
import crypto from 'node:crypto';

const router = Router();

// 1. List all skills created by the authenticated creator (live, drafts, etc.)
router.get('/skills', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const creatorId = req.user!.id;
    const skills = await db.all(`
      SELECT s.id, s.name, s.slug, s.summary, s.description, s.category, s.tags,
             s.pricing_type, s.price, s.current_version, s.license, s.status, s.security_status,
             s.install_count, s.view_count, s.net_votes, s.average_rating, s.review_count,
             s.created_at, p.storage_path
      FROM skills s
      LEFT JOIN skill_packages p ON s.id = p.skill_id
      WHERE s.creator_id = ?
      ORDER BY s.created_at DESC
    `, [creatorId]) as any[];

    const formatted = skills.map(s => {
      let tags: string[] = [];
      try { tags = JSON.parse(s.tags); } catch {}
      return {
        ...s,
        price: Number(s.price),
        tags
      };
    });

    res.json({ skills: formatted, count: formatted.length });
  } catch (err: any) {
    console.error('List creator skills error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve creator skills.' });
  }
});

// 2. Get specific skill for editing in Creator Studio
router.get('/skills/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user!.id;

    const skill = await db.get(`
      SELECT * FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found or access denied.' });
      return;
    }

    const pkg = await db.get(`
      SELECT version, skill_md_content, files_json FROM skill_packages WHERE skill_id = ?
    `, [skill.id]) as any;

    let tags: string[] = [];
    try { tags = JSON.parse(skill.tags); } catch {}

    let files: Record<string, string> = {};
    if (pkg) {
      try { files = JSON.parse(pkg.files_json); } catch {}
    }

    res.json({
      skill: {
        ...skill,
        price: Number(skill.price),
        tags
      },
      package: {
        version: pkg?.version || skill.current_version || '1.0.0',
        skill_md_content: pkg?.skill_md_content || '',
        files
      }
    });
  } catch (err: any) {
    console.error('Get creator skill error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve skill for editing.' });
  }
});

// 3. Upload & Validate Skill Package (ZIP, SKILL.md, or plain markdown)
router.post('/validate-package', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, content: bodyContent, base64, filename, nameHint } = req.body;
    const content = bodyContent || base64;

    if (!content) {
      res.status(400).json({ error: 'Package content is required.' });
      return;
    }

    let skillMd = '';
    let files: PackageFile[] = [];
    if (req.body.files && Array.isArray(req.body.files)) {
      files = req.body.files.map((f: any) => ({ name: f.name || f.path, content: f.content || '' }));
    }
    let detectedName = nameHint || (filename ? filename.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-') : 'my-skill');
    let warnings: string[] = [];
    let detectedMetadata: any = null;

    if (type === 'zip') {
      // Buffer from base64
      const zipBuffer = Buffer.from(content, 'base64');
      const extracted = await validateAndExtractZip(zipBuffer);
      skillMd = extracted.skillMd;
      files = extracted.files;
      detectedName = extracted.skillName;
      detectedMetadata = extracted.metadata;
      warnings = extracted.warnings;
    } else if (type === 'plain_md') {
      skillMd = convertPlainMarkdownToSkill(content, detectedName);
      const val = validateSkillMd(skillMd);
      detectedMetadata = val.metadata;
      warnings = [...val.warnings, 'Frontmatter was missing; auto-generated frontmatter from document content.'];
    } else {
      // Standard SKILL.md
      skillMd = content;
      const val = validateSkillMd(skillMd);
      detectedMetadata = val.metadata;
      if (val.metadata?.name) detectedName = val.metadata.name;
      if (!val.valid) {
        warnings.push(...val.warnings);
      }
    }

    // Run 8-Point Security Scanner on actual skill specification and package files
    const scanResult = SecurityScanner.scanPackage(skillMd || content, files);

    const isConverted = type === 'plain_md' || warnings.some(w => w.includes('auto-generated'));
    const scanErrors = scanResult.results.filter(r => r.status === 'fail').map(r => r.details || r.description);

    res.json({
      valid: scanResult.overallStatus === 'pass',
      converted: isConverted,
      skillName: detectedName,
      extracted_frontmatter: detectedMetadata || { name: detectedName },
      extracted_instructions: skillMd,
      description: detectedMetadata?.description || '',
      version: detectedMetadata?.version || '1.0.0',
      license: detectedMetadata?.license || 'MIT',
      skill_md_content: skillMd,
      files,
      files_count: files.length + 1,
      warnings,
      errors: scanErrors,
      security_scan: scanResult
    });
  } catch (err: any) {
    console.error('Validate package error:', err.message);
    res.status(400).json({
      valid: false,
      error: err.message || 'Failed to parse and validate skill package.',
      errors: [err.message || 'Failed to parse and validate skill package.']
    });
  }
});

// 4. Publish or Save Draft of a Skill
router.post('/publish', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const name = req.body.name;
    const summary = req.body.summary || req.body.description;
    const description = req.body.description || req.body.summary;
    const category = req.body.category;
    const tags = req.body.tags || [];
    const pricing_type = req.body.pricing_type || 'paid';
    const price = req.body.price !== undefined ? req.body.price : (pricing_type === 'free' ? 0 : 9.99);
    const subscription_price_monthly = req.body.subscription_price_monthly;
    const logo_url = req.body.logo_url;
    const skill_md_content = req.body.skill_md_content || req.body.instructions;
    const files = (req.body.files || req.body.supporting_files || []).map((f: any) => ({
      name: f.name || f.path,
      content: f.content
    }));
    const version = req.body.version || '1.0.0';
    const license = req.body.license || 'MIT';
    const compatibility_type = req.body.compatibility_type || req.body.compatibility || 'universal';
    const is_draft = Boolean(req.body.is_draft);

    const creatorId = req.user!.id;

    if (!name || !summary || !description || !category || !skill_md_content) {
      res.status(400).json({ error: 'Missing required fields (name, summary, description, category, skill_md_content).' });
      return;
    }

    const requestedId = req.body.id || req.body.skill_id;
    const requestedSlug = (req.body.slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    let existingSkill: any = null;
    if (requestedId) {
      existingSkill = await db.get(`SELECT * FROM skills WHERE id = ? AND creator_id = ?`, [requestedId, creatorId]);
    }
    if (!existingSkill) {
      existingSkill = await db.get(`SELECT * FROM skills WHERE slug = ? AND creator_id = ?`, [requestedSlug, creatorId]);
    }

    let slug = existingSkill ? existingSkill.slug : requestedSlug;
    if (!existingSkill) {
      const existingOtherSlug = await db.get(`SELECT id FROM skills WHERE slug = ?`, [requestedSlug]);
      if (existingOtherSlug) {
        slug = `${requestedSlug}-${crypto.randomBytes(3).toString('hex')}`;
      }
    }

    // Validate SKILL.md Frontmatter
    const mdVal = validateSkillMd(skill_md_content);
    let finalSkillMd = skill_md_content;
    if (!mdVal.valid) {
      finalSkillMd = convertPlainMarkdownToSkill(skill_md_content, slug, summary);
    }

    // Run 8-Point Automated Security Scan
    const scanResult = SecurityScanner.scanPackage(finalSkillMd, files as PackageFile[]);

    const skillId = existingSkill ? existingSkill.id : ('skl_' + crypto.randomUUID());
    const now = new Date().toISOString();

    // Log scan results
    for (const check of scanResult.results) {
      await db.run(`
        INSERT INTO security_audit_logs (id, skill_id, rule_name, status, details, scanned_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING
      `, ['log_' + crypto.randomUUID(), skillId, check.ruleName, check.status, check.details || check.description, now]);
    }

    if (!is_draft && scanResult.overallStatus !== 'pass') {
      res.status(422).json({
        success: false,
        error: 'Security audit failed. Skill cannot be published until all 8 rules pass.',
        security_status: 'fail',
        audit_report: scanResult.results
      });
      return;
    }

    const status = is_draft ? 'draft' : (req.body.status || 'published');
    const securityStatus = scanResult.overallStatus;

    // Build package tree
    const packageTree = {
      name: slug,
      filesCount: 1 + files.length,
      foldersCount: 1,
      children: [
        { name: 'SKILL.md', type: 'file', size: `${(Buffer.byteLength(finalSkillMd) / 1024).toFixed(1)} KB` },
        ...files.map((f: PackageFile) => ({
          name: f.name,
          type: 'file',
          size: `${(Buffer.byteLength(f.content || '') / 1024).toFixed(1)} KB`
        }))
      ]
    };

    // Ensure creator profile exists in DB to prevent foreign key errors
    const existingProfile = await db.get(`SELECT id FROM profiles WHERE id = ?`, [creatorId]);
    if (!existingProfile) {
      let username = req.user?.username || `user_${creatorId.slice(0, 8)}`;
      const takenUser = await db.get(`SELECT id FROM profiles WHERE username = ?`, [username]);
      if (takenUser && takenUser.id !== creatorId) {
        username = `${username}_${crypto.randomBytes(3).toString('hex')}`;
      }

      let email = req.user?.email || `${creatorId}@kyron.local`;
      const takenEmail = await db.get(`SELECT id FROM profiles WHERE email = ?`, [email]);
      if (takenEmail && takenEmail.id !== creatorId) {
        email = `${creatorId}_${crypto.randomBytes(3).toString('hex')}@kyron.local`;
      }

      const displayName = req.user?.displayName || req.user?.username || username;
      try {
        if ((db as any).isPostgres) {
          await db.run(
            `INSERT INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, '', '', 50.00, 0, 'user', ?, ?)
             ON CONFLICT (id) DO NOTHING`,
            [creatorId, email, displayName, username, now, now]
          );
        } else {
          await db.run(
            `INSERT OR IGNORE INTO profiles (id, email, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, '', '', 50.00, 0, 'user', ?, ?)`,
            [creatorId, email, displayName, username, now, now]
          );
        }
      } catch (profErr: any) {
        console.warn('Profile sync check note in publish:', profErr.message);
      }
    }

    // Insert or Update Skill
    if (existingSkill) {
      await db.run(`
        UPDATE skills SET
          name = ?,
          summary = ?,
          description = ?,
          category = ?,
          tags = ?,
          pricing_type = ?,
          price = ?,
          subscription_price_monthly = ?,
          compatibility_type = ?,
          current_version = ?,
          license = ?,
          security_status = ?,
          status = ?,
          package_tree = ?
        WHERE id = ? AND creator_id = ?
      `, [
        name,
        summary,
        description,
        category,
        JSON.stringify(Array.isArray(tags) ? tags : [tags]),
        pricing_type,
        pricing_type === 'free' ? 0.00 : Number(price),
        subscription_price_monthly ? Number(subscription_price_monthly) : null,
        compatibility_type || 'universal',
        version || '1.0.0',
        license || 'MIT',
        securityStatus,
        status,
        JSON.stringify(packageTree),
        skillId,
        creatorId
      ]);
    } else {
      await db.run(`
        INSERT INTO skills (
          id, name, slug, summary, description, category, tags, logo_url,
          pricing_type, price, subscription_price_monthly, compatibility_type,
          current_version, license, creator_id, security_status, status,
          install_count, view_count, net_votes, average_rating, review_count,
          package_tree, session_preview, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0.0, 0, ?, null, ?)
        ON CONFLICT (id) DO NOTHING
      `, [
        skillId,
        name,
        slug,
        summary,
        description,
        category,
        JSON.stringify(Array.isArray(tags) ? tags : [tags]),
        logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&h=96&fit=crop',
        pricing_type,
        pricing_type === 'free' ? 0.00 : Number(price),
        subscription_price_monthly ? Number(subscription_price_monthly) : null,
        compatibility_type || 'universal',
        version || '1.0.0',
        license || 'MIT',
        creatorId,
        securityStatus,
        status,
        JSON.stringify(packageTree),
        now
      ]);
    }

    // Store package content
    const filesMap: Record<string, string> = { 'SKILL.md': finalSkillMd };
    for (const f of files as PackageFile[]) {
      filesMap[f.name] = f.content;
    }

    await db.run(`
      INSERT INTO skill_packages (skill_id, version, skill_md_content, files_json, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (skill_id) DO UPDATE SET
        version = EXCLUDED.version,
        skill_md_content = EXCLUDED.skill_md_content,
        files_json = EXCLUDED.files_json,
        updated_at = EXCLUDED.updated_at
    `, [skillId, version || '1.0.0', finalSkillMd, JSON.stringify(filesMap), now]);

    res.status(201).json({
      success: true,
      skill_id: skillId,
      slug,
      status,
      security_status: securityStatus,
      scan_report: scanResult,
      audit_report: scanResult.results,
      skill: {
        id: skillId,
        slug,
        name,
        pricing_type,
        price,
        status,
        is_draft: status === 'draft' ? 1 : 0
      }
    });
  } catch (err: any) {
    console.error('Publish error:', err.message);
    res.status(500).json({ error: 'Failed to publish skill.' });
  }
});

// 5. Update an existing skill
router.put('/skills/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user!.id;
    const {
      name,
      summary,
      description,
      category,
      tags,
      pricing_type,
      price,
      subscription_price_monthly,
      logo_url,
      skill_md_content,
      files,
      version,
      license,
      compatibility_type,
      status
    } = req.body;

    const existing = await db.get(`SELECT * FROM skills WHERE id = ? AND creator_id = ?`, [id, creatorId]) as any;
    if (!existing) {
      res.status(404).json({ error: 'Skill not found or access denied.' });
      return;
    }

    const now = new Date().toISOString();
    let finalSkillMd = skill_md_content !== undefined ? skill_md_content : null;

    if (finalSkillMd) {
      const val = validateSkillMd(finalSkillMd);
      if (!val.valid) {
        finalSkillMd = convertPlainMarkdownToSkill(finalSkillMd, name || existing.name, summary || existing.summary);
      }
    }

    // If files or skill_md_content changed, update security scan & package
    if (finalSkillMd || files) {
      const pkg = await db.get(`SELECT skill_md_content, files_json FROM skill_packages WHERE skill_id = ?`, [id]) as any;
      const mdToScan = finalSkillMd || pkg?.skill_md_content || '';
      let filesToScan: PackageFile[] = [];
      if (files) {
        filesToScan = files;
      } else if (pkg?.files_json) {
        try {
          const parsed = JSON.parse(pkg.files_json);
          filesToScan = Object.entries(parsed)
            .filter(([k]) => k !== 'SKILL.md')
            .map(([name, content]) => ({ name, content: content as string }));
        } catch {}
      }

      const scanResult = SecurityScanner.scanPackage(mdToScan, filesToScan);
      if ((status === 'live' || status === 'published') && scanResult.overallStatus !== 'pass') {
        res.status(422).json({
          error: 'Security audit failed. Cannot publish with failing checks.',
          scan_report: scanResult
        });
        return;
      }

      const filesMap: Record<string, string> = { 'SKILL.md': mdToScan };
      for (const f of filesToScan) {
        filesMap[f.name] = f.content;
      }

      await db.run(`
        INSERT INTO skill_packages (skill_id, version, skill_md_content, files_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (skill_id) DO UPDATE SET
          version = EXCLUDED.version,
          skill_md_content = EXCLUDED.skill_md_content,
          files_json = EXCLUDED.files_json,
          updated_at = EXCLUDED.updated_at
      `, [id, version || existing.current_version || '1.0.0', mdToScan, JSON.stringify(filesMap), now]);
    }

    const newStatus = status || existing.status;
    const newPricing = pricing_type || existing.pricing_type;
    const newPrice = newPricing === 'free' ? 0.00 : (price !== undefined ? Number(price) : existing.price);

    await db.run(`
      UPDATE skills SET
        name = COALESCE(?, name),
        summary = COALESCE(?, summary),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        tags = COALESCE(?, tags),
        pricing_type = ?,
        price = ?,
        subscription_price_monthly = ?,
        compatibility_type = COALESCE(?, compatibility_type),
        current_version = COALESCE(?, current_version),
        license = COALESCE(?, license),
        logo_url = COALESCE(?, logo_url),
        status = ?
      WHERE id = ? AND creator_id = ?
    `, [
      name || null,
      summary || null,
      description || null,
      category || null,
      tags ? JSON.stringify(Array.isArray(tags) ? tags : [tags]) : null,
      newPricing,
      newPrice,
      subscription_price_monthly ? Number(subscription_price_monthly) : null,
      compatibility_type || null,
      version || null,
      license || null,
      logo_url || null,
      newStatus,
      id,
      creatorId
    ]);

    res.json({ success: true, message: 'Skill updated successfully.' });
  } catch (err: any) {
    console.error('Update skill error:', err.message);
    res.status(500).json({ error: 'Failed to update skill.' });
  }
});

// 6. Unpublish / toggle draft status
router.post('/skills/:id/unpublish', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user!.id;

    const existing = await db.get(
      `SELECT id, status FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?`,
      [id, id, creatorId]
    ) as any;
    if (!existing) {
      res.status(404).json({ error: 'Skill not found or access denied.' });
      return;
    }

    const isCurrentlyPublished = existing.status === 'live' || existing.status === 'published';
    const nextStatus = req.body && typeof req.body.is_draft === 'boolean'
      ? (req.body.is_draft ? 'draft' : 'published')
      : (isCurrentlyPublished ? 'draft' : 'published');
    await db.run(`UPDATE skills SET status = ? WHERE id = ? AND creator_id = ?`, [nextStatus, existing.id, creatorId]);

    res.json({
      success: true,
      status: nextStatus,
      is_draft: nextStatus === 'draft',
      message: nextStatus === 'draft' ? 'Skill unpublished and moved to drafts.' : 'Skill published to marketplace!'
    });
  } catch (err: any) {
    console.error('Unpublish error:', err.message);
    res.status(500).json({ error: 'Failed to update publication status.' });
  }
});

// 7. Creator Studio Analytics Funnel
router.get('/analytics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const creatorId = req.user!.id;

    const mySkills = await db.all(`
      SELECT id, name, slug, price, pricing_type, install_count, view_count, net_votes, average_rating, review_count, status
      FROM skills
      WHERE creator_id = ?
      ORDER BY created_at DESC
    `, [creatorId]) as any[];

    // Compute funnel
    const totalViews = mySkills.reduce((acc, s) => acc + (s.view_count || 0), 0);
    const totalInstalls = mySkills.reduce((acc, s) => acc + (s.install_count || 0), 0);
    const conversionRate = totalViews > 0 ? ((totalInstalls / totalViews) * 100).toFixed(1) : '0.0';

    // Compute revenue (70% net share to creator)
    const sales = await db.get(`
      SELECT SUM(p.amount_paid) as gross_revenue, COUNT(p.id) as sales_count
      FROM user_purchases p
      JOIN skills s ON p.skill_id = s.id
      WHERE s.creator_id = ?
    `, [creatorId]) as any;

    const grossRevenue = sales && sales.gross_revenue ? Number(sales.gross_revenue) : 0;
    const netEarnings = Number((grossRevenue * 0.70).toFixed(2)); // 70% to creator

    res.json({
      funnel: {
        total_views: totalViews,
        total_installs: totalInstalls,
        conversion_rate_percent: conversionRate,
        gross_revenue: grossRevenue,
        creator_net_earnings: netEarnings,
        platform_fee_percent: 30
      },
      skills: mySkills
    });
  } catch (err: any) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve creator analytics.' });
  }
});

// 8. Creator Studio Overview Dashboard Metrics
router.get('/overview', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const creatorId = req.user!.id;
    const skills = await db.all(`
      SELECT id, name, slug, status, install_count, view_count, price, pricing_type, created_at, rejection_feedback
      FROM skills
      WHERE creator_id = ?
      ORDER BY created_at DESC
    `, [creatorId]) as any[];

    const totalSkills = skills.length;
    const draftCount = skills.filter(s => s.status === 'draft').length;
    const submittedCount = skills.filter(s => s.status === 'submitted' || s.status === 'under_review').length;
    const approvedCount = skills.filter(s => s.status === 'approved').length;
    const publishedCount = skills.filter(s => s.status === 'published' || s.status === 'live').length;
    const rejectedCount = skills.filter(s => s.status === 'rejected').length;
    const pausedCount = skills.filter(s => s.status === 'paused').length;

    const totalViews = skills.reduce((acc, s) => acc + (s.view_count || 0), 0);
    const totalDownloads = skills.reduce((acc, s) => acc + (s.install_count || 0), 0);

    const sales = await db.get(`
      SELECT SUM(p.amount_paid) as gross_revenue
      FROM user_purchases p
      JOIN skills s ON p.skill_id = s.id
      WHERE s.creator_id = ?
    `, [creatorId]) as any;

    const grossRevenue = sales?.gross_revenue ? Number(sales.gross_revenue) : 0;
    const netEarnings = Number((grossRevenue * 0.70).toFixed(2));

    const submissions = await db.all(`
      SELECT sub.*, s.name as skill_name, s.slug as skill_slug
      FROM skill_submissions sub
      JOIN skills s ON sub.skill_id = s.id
      WHERE sub.submitted_by = ?
      ORDER BY sub.submitted_at DESC
      LIMIT 10
    `, [creatorId]) as any[];

    res.json({
      metrics: {
        total_skills: totalSkills,
        draft_count: draftCount,
        submitted_count: submittedCount,
        approved_count: approvedCount,
        published_count: publishedCount,
        rejected_count: rejectedCount,
        paused_count: pausedCount,
        total_views: totalViews,
        total_downloads: totalDownloads,
        gross_revenue: grossRevenue,
        net_earnings: netEarnings
      },
      recent_skills: skills.slice(0, 5),
      recent_submissions: submissions
    });
  } catch (err: any) {
    console.error('Creator overview error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve creator overview.' });
  }
});

// 9. Submit a draft skill for review
router.post('/skills/:id/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user!.id;

    const skill = await db.get(`
      SELECT * FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found or access denied.' });
      return;
    }

    const pkg = await db.get(`SELECT skill_md_content, files_json, version FROM skill_packages WHERE skill_id = ?`, [skill.id]) as any;
    if (!pkg || !pkg.skill_md_content) {
      res.status(400).json({ error: 'Cannot submit a skill with no content. Please add SKILL.md content.' });
      return;
    }

    let filesList: PackageFile[] = [];
    if (pkg.files_json) {
      try {
        const parsed = JSON.parse(pkg.files_json);
        filesList = Object.entries(parsed)
          .filter(([k]) => k !== 'SKILL.md')
          .map(([name, content]) => ({ name, content: content as string }));
      } catch {}
    }

    const scanResult = SecurityScanner.scanPackage(pkg.skill_md_content, filesList);
    if (scanResult.overallStatus !== 'pass') {
      res.status(422).json({
        error: 'Skill package has security or validation issues that must be addressed before submitting.',
        validation_report: scanResult
      });
      return;
    }

    const submissionId = 'sub_' + crypto.randomUUID();
    const now = new Date().toISOString();
    const versionNumber = pkg.version || skill.current_version || '1.0.0';

    await db.run(`
      INSERT INTO skill_submissions (id, skill_id, version, submitted_by, status, validation_report, submitted_at)
      VALUES (?, ?, ?, ?, 'submitted', ?, ?)
    `, [submissionId, skill.id, versionNumber, creatorId, JSON.stringify(scanResult), now]);

    await db.run(`
      UPDATE skills SET status = 'submitted', rejection_feedback = NULL WHERE id = ?
    `, [skill.id]);

    res.json({
      success: true,
      submission_id: submissionId,
      status: 'submitted',
      message: 'Skill successfully submitted for marketplace review.'
    });
  } catch (err: any) {
    console.error('Submit skill error:', err.message);
    res.status(500).json({ error: 'Failed to submit skill for review.' });
  }
});

// 10. Publish an approved skill
router.post('/skills/:id/publish', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user!.id;

    const skill = await db.get(`
      SELECT * FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found or access denied.' });
      return;
    }

    // Only approved skills (or already live/published) can be published
    if (skill.status !== 'approved' && skill.status !== 'live' && skill.status !== 'published') {
      res.status(400).json({
        error: `Skill must be in 'approved' status to publish. Current status is '${skill.status}'.`
      });
      return;
    }

    await db.run(`UPDATE skills SET status = 'published' WHERE id = ?`, [skill.id]);

    res.json({
      success: true,
      status: 'published',
      message: 'Skill is now live on KYRON Marketplace!'
    });
  } catch (err: any) {
    console.error('Publish skill error:', err.message);
    res.status(500).json({ error: 'Failed to publish skill.' });
  }
});

// 11. Pause a published skill
router.post('/skills/:id/pause', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user!.id;

    const skill = await db.get(`
      SELECT id, status FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found or access denied.' });
      return;
    }

    if (skill.status !== 'published' && skill.status !== 'live') {
      res.status(400).json({ error: 'Only published skills can be paused.' });
      return;
    }

    await db.run(`UPDATE skills SET status = 'paused' WHERE id = ?`, [skill.id]);
    res.json({ success: true, status: 'paused', message: 'Skill paused and removed from public discovery.' });
  } catch (err: any) {
    console.error('Pause skill error:', err.message);
    res.status(500).json({ error: 'Failed to pause skill.' });
  }
});

// 12. Resume a paused skill
router.post('/skills/:id/resume', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user!.id;

    const skill = await db.get(`
      SELECT id, status FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found or access denied.' });
      return;
    }

    if (skill.status !== 'paused') {
      res.status(400).json({ error: 'Only paused skills can be resumed.' });
      return;
    }

    await db.run(`UPDATE skills SET status = 'published' WHERE id = ?`, [skill.id]);
    res.json({ success: true, status: 'published', message: 'Skill resumed and published to marketplace.' });
  } catch (err: any) {
    console.error('Resume skill error:', err.message);
    res.status(500).json({ error: 'Failed to resume skill.' });
  }
});

// 13. Delete a draft or non-purchased skill
router.delete('/skills/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user!.id;

    const skill = await db.get(`
      SELECT id, status FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?
    `, [id, id, creatorId]) as any;

    if (!skill) {
      res.status(404).json({ error: 'Skill not found or access denied.' });
      return;
    }

    // Safety: check if there are purchases for paid skills
    const purchaseCount = await db.get(`SELECT COUNT(*) as count FROM user_purchases WHERE skill_id = ?`, [skill.id]) as any;
    if (purchaseCount && Number(purchaseCount.count) > 0) {
      res.status(400).json({ error: 'Cannot delete a skill that has active purchases or buyer entitlements. Consider pausing it instead.' });
      return;
    }

    // Cascading clean
    await db.run(`DELETE FROM skill_packages WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM skill_submissions WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM skill_versions WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM security_audit_logs WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM skill_downloads WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM skill_votes WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM saved_skills WHERE skill_id = ?`, [skill.id]);
    await db.run(`DELETE FROM skills WHERE id = ?`, [skill.id]);

    res.json({ success: true, message: 'Skill deleted successfully.' });
  } catch (err: any) {
    console.error('Delete skill error:', err.message);
    res.status(500).json({ error: 'Failed to delete skill.' });
  }
});

// 14. Creator's submission and review history
router.get('/submissions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const creatorId = req.user!.id;
    const submissions = await db.all(`
      SELECT sub.*, s.name as skill_name, s.slug as skill_slug
      FROM skill_submissions sub
      JOIN skills s ON sub.skill_id = s.id
      WHERE sub.submitted_by = ?
      ORDER BY sub.submitted_at DESC
    `, [creatorId]) as any[];

    const formatted = submissions.map(s => {
      let validationReport = null;
      try { validationReport = JSON.parse(s.validation_report); } catch {}
      return {
        ...s,
        validation_report: validationReport
      };
    });

    res.json({ submissions: formatted });
  } catch (err: any) {
    console.error('Get submissions error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve submissions.' });
  }
});

// 15. Manage Skill Versions
router.get('/skills/:id/versions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user!.id;

    const skill = await db.get(`SELECT id FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?`, [id, id, creatorId]) as any;
    if (!skill) {
      res.status(404).json({ error: 'Skill not found or access denied.' });
      return;
    }

    const versions = await db.all(`
      SELECT * FROM skill_versions WHERE skill_id = ? ORDER BY created_at DESC
    `, [skill.id]) as any[];

    res.json({ versions });
  } catch (err: any) {
    console.error('Get versions error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve skill versions.' });
  }
});

router.post('/skills/:id/versions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user!.id;
    const { version_number, changelog, file_manifest } = req.body;

    if (!version_number) {
      res.status(400).json({ error: 'version_number is required.' });
      return;
    }

    const skill = await db.get(`SELECT id, current_version FROM skills WHERE (id = ? OR slug = ?) AND creator_id = ?`, [id, id, creatorId]) as any;
    if (!skill) {
      res.status(404).json({ error: 'Skill not found or access denied.' });
      return;
    }

    const versionId = 'ver_' + crypto.randomUUID();
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO skill_versions (id, skill_id, version_number, changelog, file_manifest, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      versionId,
      skill.id,
      version_number,
      changelog || '',
      file_manifest ? JSON.stringify(file_manifest) : null,
      now
    ]);

    await db.run(`UPDATE skills SET current_version = ? WHERE id = ?`, [version_number, skill.id]);

    res.status(201).json({
      success: true,
      version_id: versionId,
      version_number,
      changelog,
      created_at: now
    });
  } catch (err: any) {
    console.error('Create version error:', err.message);
    res.status(500).json({ error: 'Failed to create skill version.' });
  }
});

// 16. Creator Profile Editor
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const creatorId = req.user!.id;
    const profile = await db.get(`
      SELECT id, email, username, display_name, full_name, bio, website_url, avatar_url, role, onboarding_completed, created_at
      FROM profiles
      WHERE id = ?
    `, [creatorId]) as any;

    if (!profile) {
      res.status(404).json({ error: 'Creator profile not found.' });
      return;
    }

    res.json({ profile });
  } catch (err: any) {
    console.error('Get profile error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const creatorId = req.user!.id;
    const { display_name, bio, website_url, avatar_url, onboarding_completed } = req.body;

    await db.run(`
      UPDATE profiles SET
        display_name = COALESCE(?, display_name),
        bio = COALESCE(?, bio),
        website_url = COALESCE(?, website_url),
        avatar_url = COALESCE(?, avatar_url),
        onboarding_completed = COALESCE(?, onboarding_completed),
        updated_at = ?
      WHERE id = ?
    `, [
      display_name || null,
      bio || null,
      website_url || null,
      avatar_url || null,
      onboarding_completed !== undefined ? (onboarding_completed ? 1 : 0) : null,
      new Date().toISOString(),
      creatorId
    ]);

    const updated = await db.get(`
      SELECT id, email, username, display_name, bio, website_url, avatar_url, onboarding_completed
      FROM profiles WHERE id = ?
    `, [creatorId]) as any;

    res.json({ success: true, profile: updated });
  } catch (err: any) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// 17. Admin Review Queue: List all submissions
router.get('/admin/submissions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && !req.user?.is_unlimited_credit_user) {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }

    const submissions = await db.all(`
      SELECT sub.*, s.name as skill_name, s.slug as skill_slug, s.category, s.pricing_type, s.price,
             p.display_name as creator_name, p.username as creator_username, p.email as creator_email
      FROM skill_submissions sub
      JOIN skills s ON sub.skill_id = s.id
      JOIN profiles p ON sub.submitted_by = p.id
      ORDER BY sub.submitted_at DESC
    `) as any[];

    const formatted = submissions.map(s => {
      let validationReport = null;
      try { validationReport = JSON.parse(s.validation_report); } catch {}
      return { ...s, validation_report: validationReport };
    });

    res.json({ submissions: formatted });
  } catch (err: any) {
    console.error('Admin get submissions error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve review queue.' });
  }
});

// 18. Admin Review Queue: Review a submission (approve or reject with feedback)
router.post('/admin/submissions/:id/review', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin' && !req.user?.is_unlimited_credit_user) {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }

    const { id } = req.params;
    const { action, feedback } = req.body; // action: 'approve' | 'reject'

    if (action !== 'approve' && action !== 'reject') {
      res.status(400).json({ error: "Action must be 'approve' or 'reject'." });
      return;
    }

    const submission = await db.get(`SELECT * FROM skill_submissions WHERE id = ?`, [id]) as any;
    if (!submission) {
      res.status(404).json({ error: 'Submission not found.' });
      return;
    }

    const now = new Date().toISOString();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await db.run(`
      UPDATE skill_submissions SET
        status = ?,
        reviewer_feedback = ?,
        reviewed_at = ?,
        reviewed_by = ?
      WHERE id = ?
    `, [newStatus, feedback || null, now, req.user!.id, id]);

    await db.run(`
      UPDATE skills SET
        status = ?,
        rejection_feedback = ?
      WHERE id = ?
    `, [newStatus, action === 'reject' ? (feedback || 'Submission did not meet quality guidelines.') : null, submission.skill_id]);

    res.json({
      success: true,
      status: newStatus,
      message: `Submission ${newStatus} successfully.`
    });
  } catch (err: any) {
    console.error('Admin review submission error:', err.message);
    res.status(500).json({ error: 'Failed to review submission.' });
  }
});

export default router;

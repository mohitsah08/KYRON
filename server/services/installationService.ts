import crypto from 'node:crypto';
import { db } from '../db/database.ts';
import { validateSkillMd, convertPlainMarkdownToSkill } from './skillPackageService.ts';

export interface InstallSkillResult {
  success: boolean;
  status: 'installed' | 'already_installed';
  is_installed: boolean;
  message: string;
  license_key: string;
  purchase?: {
    id: string;
    skill_id: string;
    amount_paid: number;
    license_key: string;
  };
  skill: {
    id: string;
    name: string;
    slug: string;
    current_version: string;
  };
  package: {
    version: string;
    download_url: string;
    has_supporting_files: boolean;
  };
}

export class InstallationError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'INSTALLATION_FAILED') {
    super(message);
    this.name = 'InstallationError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Unified installation logic for KYRON Agent Skills.
 * Validates authentication, package integrity, records ownership, and prepares delivery.
 */
export async function installSkillForUser(params: {
  userId: string;
  skillIdOrSlug: string;
  targetAgent?: string;
}): Promise<InstallSkillResult> {
  const { userId, skillIdOrSlug } = params;

  if (!userId) {
    throw new InstallationError('Authentication required to install skills.', 401, 'AUTH_REQUIRED');
  }

  if (!skillIdOrSlug) {
    throw new InstallationError('Skill identifier (ID or slug) is required.', 400, 'INVALID_SKILL_ID');
  }

  // 1. Fetch Skill details
  const skill = await db.get(
    `SELECT id, name, slug, price, pricing_type, creator_id, current_version, status 
     FROM skills 
     WHERE id = ? OR slug = ?`,
    [skillIdOrSlug, skillIdOrSlug]
  ) as any;

  if (!skill) {
    throw new InstallationError('Skill not found.', 404, 'SKILL_NOT_FOUND');
  }

  // Check visibility / publication status
  if (skill.status !== 'live' && skill.status !== 'published') {
    const isCreator = skill.creator_id === userId;
    let isAdmin = false;
    if (!isCreator) {
      const profile = await db.get(`SELECT is_unlimited_credit_user FROM profiles WHERE id = ?`, [userId]) as any;
      isAdmin = profile?.is_unlimited_credit_user === 1;
    }
    if (!isCreator && !isAdmin) {
      throw new InstallationError('Skill is not publicly available for installation.', 403, 'SKILL_NOT_AVAILABLE');
    }
  }

  // 2. Check if already installed in user's library
  const existing = await db.get(
    `SELECT id, license_key, purchased_at FROM user_purchases WHERE user_id = ? AND skill_id = ? AND status = 'completed'`,
    [userId, skill.id]
  ) as any;

  // Fetch package metadata
  const pkg = await db.get(
    `SELECT version, skill_md_content, files_json FROM skill_packages WHERE skill_id = ?`,
    [skill.id]
  ) as any;

  let filesMap: Record<string, string> = {};
  if (pkg?.files_json) {
    try {
      filesMap = JSON.parse(pkg.files_json);
    } catch {}
  }
  const hasSupportingFiles = Object.keys(filesMap).filter(k => k !== 'SKILL.md').length > 0;
  const version = pkg?.version || skill.current_version || '1.0.0';

  if (existing) {
    return {
      success: true,
      status: 'already_installed',
      is_installed: true,
      message: `Skill "${skill.name}" is already installed in your workspace library.`,
      license_key: existing.license_key,
      purchase: {
        id: existing.id,
        skill_id: skill.id,
        amount_paid: Number(existing.amount_paid || 0),
        license_key: existing.license_key
      },
      skill: {
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
        current_version: version
      },
      package: {
        version,
        download_url: `/api/skills/${skill.slug}/download/zip`,
        has_supporting_files: hasSupportingFiles
      }
    };
  }

  // 3. Fetch verified package and validate
  let skillMdContent = pkg?.skill_md_content;
  if (!skillMdContent) {
    // Generate valid compliant SKILL.md from skill metadata if package row was not pre-seeded
    skillMdContent = convertPlainMarkdownToSkill(
      skill.description || `# ${skill.name}\n\n${skill.summary || ''}`,
      skill.slug || skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      skill.summary || skill.description || skill.name
    );
  } else {
    const validation = validateSkillMd(skillMdContent);
    if (!validation.valid) {
      skillMdContent = convertPlainMarkdownToSkill(
        skillMdContent,
        skill.slug || skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        skill.summary || skill.description || skill.name
      );
    }
  }

  // 4. Handle Pricing / Credits
  const isPaid = skill.pricing_type === 'paid' && Number(skill.price) > 0;
  let effectivePrice = isPaid ? Number(skill.price) : 0;

  if (isPaid) {
    // Check for active promotional deal
    const deal = await db.get(
      `SELECT discount_percent FROM skill_deals WHERE skill_id = ? AND is_active = 1 AND datetime(expires_at) > datetime('now')`,
      [skill.id]
    ) as any;
    if (deal?.discount_percent) {
      effectivePrice = Number((effectivePrice * (1 - Number(deal.discount_percent) / 100)).toFixed(2));
    }
  }

  // 5. Transactional Installation Recording
  const result = await db.withTransaction(async (tx) => {
    // Re-check existing within transaction to prevent race conditions
    const raceCheck = await tx.get(
      `SELECT id, license_key FROM user_purchases WHERE user_id = ? AND skill_id = ? AND status = 'completed'`,
      [userId, skill.id]
    ) as any;
    if (raceCheck) {
      return {
        alreadyOwned: true,
        license_key: raceCheck.license_key
      };
    }

    // If paid, check user balance and deduct
    if (isPaid && effectivePrice > 0) {
      const profile = await tx.get(
        `SELECT credit_balance, is_unlimited_credit_user FROM profiles WHERE id = ?`,
        [userId]
      ) as any;
      if (!profile) {
        throw new InstallationError('User profile not found.', 404, 'USER_NOT_FOUND');
      }

      const isAdmin = profile.is_unlimited_credit_user === 1;
      const currentBalance = Number(profile.credit_balance || 0);

      if (!isAdmin && currentBalance < effectivePrice) {
        throw new InstallationError(
          `Insufficient credit balance. You have $${currentBalance.toFixed(2)}, but this skill costs $${effectivePrice.toFixed(2)}. Top up to continue.`,
          402,
          'INSUFFICIENT_CREDITS'
        );
      }

      if (!isAdmin) {
        const updateRes = await tx.run(
          `UPDATE profiles SET credit_balance = credit_balance - ? WHERE id = ? AND credit_balance >= ?`,
          [effectivePrice, userId, effectivePrice]
        );
        if (updateRes.changes === 0) {
          throw new InstallationError('Concurrent balance update detected. Please retry.', 409, 'CONCURRENT_MODIFICATION');
        }
      }
    }

    const purchaseId = 'pur_' + crypto.randomUUID();
    const licenseKey = 'KYRON-' + (isPaid ? 'LIC-' : 'FREE-') + crypto.randomBytes(8).toString('hex').toUpperCase();
    const now = new Date().toISOString();

    // Insert purchase / install record
    await tx.run(
      `INSERT INTO user_purchases (id, user_id, skill_id, amount_paid, license_key, purchased_at, status)
       VALUES (?, ?, ?, ?, ?, ?, 'completed')
       ON CONFLICT (id) DO NOTHING`,
      [purchaseId, userId, skill.id, effectivePrice, licenseKey, now]
    );

    // Increment install counter
    await tx.run(`UPDATE skills SET install_count = install_count + 1 WHERE id = ?`, [skill.id]);

    // Record installation download log
    const downloadId = 'dl_' + crypto.randomUUID();
    await tx.run(
      `INSERT INTO skill_downloads (id, skill_id, user_id, version, download_type, downloaded_at)
       VALUES (?, ?, ?, ?, 'zip', ?)`,
      [downloadId, skill.id, userId, version, now]
    );

    return {
      alreadyOwned: false,
      license_key: licenseKey,
      purchaseId: purchaseId
    };
  });

  // 6. Verify that installation completed successfully in database
  const verification = await db.get(
    `SELECT id FROM user_purchases WHERE user_id = ? AND skill_id = ? AND status = 'completed'`,
    [userId, skill.id]
  ) as any;

  if (!verification) {
    throw new InstallationError('Installation verification failed. Database record was not confirmed.', 500, 'VERIFICATION_FAILED');
  }

  return {
    success: true,
    status: result.alreadyOwned ? 'already_installed' : 'installed',
    is_installed: true,
    message: result.alreadyOwned
      ? `Skill "${skill.name}" is already in your workspace library.`
      : `Skill "${skill.name}" successfully installed to your workspace library!`,
    license_key: result.license_key,
    purchase: {
      id: result.purchaseId || verification.id,
      skill_id: skill.id,
      amount_paid: effectivePrice,
      license_key: result.license_key
    },
    skill: {
      id: skill.id,
      name: skill.name,
      slug: skill.slug,
      current_version: version
    },
    package: {
      version,
      download_url: `/api/skills/${skill.slug}/download/zip`,
      has_supporting_files: hasSupportingFiles
    }
  };
}

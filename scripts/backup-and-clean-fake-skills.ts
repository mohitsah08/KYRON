import fs from 'node:fs';
import path from 'node:path';
import { db } from '../server/db/database.ts';

const GENUINE_SKILL_ID = 'skl_d3db6be1-d410-4e2c-9d08-f5d2d13735de';

async function main() {
  console.log('Connecting to database... isPostgres:', db.isPostgres);

  // 1. Check genuine skill existence
  const genuineSkill = await db.get('SELECT * FROM skills WHERE id = ?', [GENUINE_SKILL_ID]);
  if (!genuineSkill) {
    throw new Error(`CRITICAL: Genuine skill ${GENUINE_SKILL_ID} not found! Aborting cleanup.`);
  }
  console.log(`Genuine skill confirmed: "${genuineSkill.name}" (slug: ${genuineSkill.slug}, status: ${genuineSkill.status})`);

  // 2. Fetch all fake/demo skills
  const fakeSkills = await db.all('SELECT * FROM skills WHERE id != ?', [GENUINE_SKILL_ID]);
  console.log(`Found ${fakeSkills.length} fake/demo skills to backup and delete.`);

  const fakeSkillIds = fakeSkills.map(s => s.id);
  const backupData: Record<string, any[]> = {
    skills: fakeSkills,
    skill_packages: [],
    skill_deals: [],
    skill_reviews: [],
    skill_votes: [],
    saved_skills: [],
    user_purchases: [],
    skill_downloads: [],
    skill_submissions: [],
    skill_versions: [],
    security_audit_logs: []
  };

  if (fakeSkillIds.length > 0) {
    for (const id of fakeSkillIds) {
      const packages = await db.all('SELECT * FROM skill_packages WHERE skill_id = ?', [id]);
      backupData.skill_packages.push(...packages);

      const deals = await db.all('SELECT * FROM skill_deals WHERE skill_id = ?', [id]);
      backupData.skill_deals.push(...deals);

      const reviews = await db.all('SELECT * FROM skill_reviews WHERE skill_id = ?', [id]);
      backupData.skill_reviews.push(...reviews);

      const votes = await db.all('SELECT * FROM skill_votes WHERE skill_id = ?', [id]);
      backupData.skill_votes.push(...votes);

      const saved = await db.all('SELECT * FROM saved_skills WHERE skill_id = ?', [id]);
      backupData.saved_skills.push(...saved);

      const purchases = await db.all('SELECT * FROM user_purchases WHERE skill_id = ?', [id]);
      backupData.user_purchases.push(...purchases);

      const downloads = await db.all('SELECT * FROM skill_downloads WHERE skill_id = ?', [id]);
      backupData.skill_downloads.push(...downloads);

      const submissions = await db.all('SELECT * FROM skill_submissions WHERE skill_id = ?', [id]);
      backupData.skill_submissions.push(...submissions);

      const versions = await db.all('SELECT * FROM skill_versions WHERE skill_id = ?', [id]);
      backupData.skill_versions.push(...versions);

      const auditLogs = await db.all('SELECT * FROM security_audit_logs WHERE skill_id = ?', [id]);
      backupData.security_audit_logs.push(...auditLogs);
    }
  }

  // 3. Write backup to file
  const backupPath = path.resolve('data/backup_fake_skills.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`Successfully backed up ${fakeSkills.length} fake skills and associated records to ${backupPath}`);

  // 4. Safely delete associated records for each fake skill
  console.log('Deleting associated records for fake skills...');
  for (const id of fakeSkillIds) {
    await db.run('DELETE FROM skill_deals WHERE skill_id = ?', [id]);
    await db.run('DELETE FROM skill_reviews WHERE skill_id = ?', [id]);
    await db.run('DELETE FROM skill_votes WHERE skill_id = ?', [id]);
    await db.run('DELETE FROM saved_skills WHERE skill_id = ?', [id]);
    await db.run('DELETE FROM user_purchases WHERE skill_id = ?', [id]);
    await db.run('DELETE FROM skill_downloads WHERE skill_id = ?', [id]);
    await db.run('DELETE FROM skill_submissions WHERE skill_id = ?', [id]);
    await db.run('DELETE FROM skill_versions WHERE skill_id = ?', [id]);
    await db.run('DELETE FROM security_audit_logs WHERE skill_id = ?', [id]);
    await db.run('DELETE FROM skill_packages WHERE skill_id = ?', [id]);
    await db.run('DELETE FROM skills WHERE id = ?', [id]);
  }

  // 5. Verify the remaining skills
  const remainingSkills = await db.all('SELECT id, slug, name, creator_id, status FROM skills');
  console.log(`Remaining skills in database (${remainingSkills.length}):`);
  console.log(remainingSkills);

  if (remainingSkills.length === 1 && remainingSkills[0].id === GENUINE_SKILL_ID) {
    console.log('SUCCESS: Only the genuine test skill remains in the database!');
  } else {
    console.warn('WARNING: Unexpected remaining skills count:', remainingSkills.length);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Migration/Cleanup error:', err);
  process.exit(1);
});

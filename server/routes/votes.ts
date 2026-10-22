import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Upvote or downvote a skill
router.post('/skills/:id/vote', requireAuth, (req: AuthRequest, res: Response) => {
  const { id: skillId } = req.params;
  const { vote_type } = req.body; // 1, -1, or 0 (to remove vote)
  const userId = req.user!.id;

  if (vote_type !== 1 && vote_type !== -1 && vote_type !== 0) {
    res.status(400).json({ error: 'Invalid vote_type. Must be 1, -1, or 0.' });
    return;
  }

  // Check current vote
  const currentVoteStmt = db.prepare(`SELECT vote_type FROM skill_votes WHERE skill_id = ? AND user_id = ?`);
  const currentVote = currentVoteStmt.get(skillId, userId) as any;
  const oldVote = currentVote ? currentVote.vote_type : 0;

  if (vote_type === 0 || vote_type === oldVote) {
    // Remove vote
    db.prepare(`DELETE FROM skill_votes WHERE skill_id = ? AND user_id = ?`).run(skillId, userId);
    db.prepare(`UPDATE skills SET net_votes = net_votes - ? WHERE id = ?`).run(oldVote, skillId);
  } else {
    // Insert or update vote
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO skill_votes (skill_id, user_id, vote_type, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(skillId, userId, vote_type, now);

    const diff = vote_type - oldVote;
    db.prepare(`UPDATE skills SET net_votes = net_votes + ? WHERE id = ?`).run(diff, skillId);
  }

  const updatedSkill = db.prepare(`SELECT net_votes FROM skills WHERE id = ?`).get(skillId) as any;
  res.json({ success: true, net_votes: updatedSkill ? updatedSkill.net_votes : 0, user_vote: vote_type === oldVote ? 0 : vote_type });
});

// Save or unsave (bookmark) a skill
router.post('/skills/:id/save', requireAuth, (req: AuthRequest, res: Response) => {
  const { id: skillId } = req.params;
  const userId = req.user!.id;

  const currentSaveStmt = db.prepare(`SELECT skill_id FROM saved_skills WHERE skill_id = ? AND user_id = ?`);
  const currentSave = currentSaveStmt.get(skillId, userId);

  if (currentSave) {
    db.prepare(`DELETE FROM saved_skills WHERE skill_id = ? AND user_id = ?`).run(skillId, userId);
    res.json({ success: true, saved: false, message: 'Removed from saved skills.' });
  } else {
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO saved_skills (skill_id, user_id, created_at) VALUES (?, ?, ?)`).run(skillId, userId, now);
    res.json({ success: true, saved: true, message: 'Saved to library. You will receive updates and price drop alerts.' });
  }
});

// Get user engagement state for a skill
router.get('/skills/:id/state', requireAuth, (req: AuthRequest, res: Response) => {
  const { id: skillId } = req.params;
  const userId = req.user!.id;

  const voteStmt = db.prepare(`SELECT vote_type FROM skill_votes WHERE skill_id = ? AND user_id = ?`);
  const vote = voteStmt.get(skillId, userId) as any;

  const saveStmt = db.prepare(`SELECT skill_id FROM saved_skills WHERE skill_id = ? AND user_id = ?`);
  const save = saveStmt.get(skillId, userId);

  res.json({
    vote_type: vote ? vote.vote_type : 0,
    saved: !!save
  });
});

export default router;

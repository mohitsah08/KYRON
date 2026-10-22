import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Upvote or downvote a skill
router.post('/skills/:id/vote', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id: skillId } = req.params;
    const { vote_type } = req.body; // 1, -1, or 0 (to remove vote)
    const userId = req.user!.id;

    if (vote_type !== 1 && vote_type !== -1 && vote_type !== 0) {
      res.status(400).json({ error: 'Invalid vote_type. Must be 1, -1, or 0.' });
      return;
    }

    // Check current vote
    const currentVote = await db.get(`SELECT vote_type FROM skill_votes WHERE skill_id = ? AND user_id = ?`, [skillId, userId]) as any;
    const oldVote = currentVote ? currentVote.vote_type : 0;

    if (vote_type === 0 || vote_type === oldVote) {
      // Remove vote
      await db.run(`DELETE FROM skill_votes WHERE skill_id = ? AND user_id = ?`, [skillId, userId]);
      await db.run(`UPDATE skills SET net_votes = net_votes - ? WHERE id = ?`, [oldVote, skillId]);
    } else {
      // Insert or update vote
      const now = new Date().toISOString();
      await db.run(`
        INSERT INTO skill_votes (skill_id, user_id, vote_type, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (skill_id, user_id) DO UPDATE SET
          vote_type = EXCLUDED.vote_type,
          updated_at = EXCLUDED.updated_at
      `, [skillId, userId, vote_type, now]);

      const diff = vote_type - oldVote;
      await db.run(`UPDATE skills SET net_votes = net_votes + ? WHERE id = ?`, [diff, skillId]);
    }

    const updatedSkill = await db.get(`SELECT net_votes FROM skills WHERE id = ?`, [skillId]) as any;
    res.json({ success: true, net_votes: updatedSkill ? updatedSkill.net_votes : 0, user_vote: vote_type === oldVote ? 0 : vote_type });
  } catch (err: any) {
    console.error('Vote error:', err.message);
    res.status(500).json({ error: 'Failed to record vote.' });
  }
});

// Save or unsave (bookmark) a skill
router.post('/skills/:id/save', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id: skillId } = req.params;
    const userId = req.user!.id;

    const currentSave = await db.get(`SELECT skill_id FROM saved_skills WHERE skill_id = ? AND user_id = ?`, [skillId, userId]);

    if (currentSave) {
      await db.run(`DELETE FROM saved_skills WHERE skill_id = ? AND user_id = ?`, [skillId, userId]);
      res.json({ success: true, saved: false, message: 'Removed from saved skills.' });
    } else {
      const now = new Date().toISOString();
      await db.run(`
        INSERT INTO saved_skills (skill_id, user_id, created_at)
        VALUES (?, ?, ?)
        ON CONFLICT (skill_id, user_id) DO NOTHING
      `, [skillId, userId, now]);
      res.json({ success: true, saved: true, message: 'Saved to library. You will receive updates and price drop alerts.' });
    }
  } catch (err: any) {
    console.error('Save error:', err.message);
    res.status(500).json({ error: 'Failed to update saved skill.' });
  }
});

// Get user engagement state for a skill
router.get('/skills/:id/state', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id: skillId } = req.params;
    const userId = req.user!.id;

    const vote = await db.get(`SELECT vote_type FROM skill_votes WHERE skill_id = ? AND user_id = ?`, [skillId, userId]) as any;
    const save = await db.get(`SELECT skill_id FROM saved_skills WHERE skill_id = ? AND user_id = ?`, [skillId, userId]);

    res.json({
      vote_type: vote ? vote.vote_type : 0,
      saved: !!save
    });
  } catch (err: any) {
    console.error('State error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve skill engagement state.' });
  }
});

export default router;

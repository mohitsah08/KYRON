import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/database.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Helper: generate secure random API key
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const key = `ky_live_${randomBytes}`;
  const prefix = `ky_live_${randomBytes.slice(0, 6)}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

// 1. GET /api/dashboard — User-specific workspace dashboard metrics & data
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // A. Query User's Active Skills:
    // Defined as:
    // 1) Skills acquired by user (user_purchases with status 'completed')
    // 2) Skills created by user that are published/live/approved (excluding drafts and rejected)
    const activeSkills = await db.all(`
      SELECT DISTINCT s.id, s.name, s.slug, s.summary, s.category, s.logo_url,
             s.current_version, s.pricing_type, s.price, s.average_rating,
             pr.display_name as creator_name, pr.username as creator_username
      FROM (
        SELECT skill_id FROM user_purchases WHERE user_id = ? AND status = 'completed'
        UNION
        SELECT id as skill_id FROM skills WHERE creator_id = ? AND status IN ('published', 'live', 'approved')
      ) ws
      JOIN skills s ON ws.skill_id = s.id
      JOIN profiles pr ON s.creator_id = pr.id
    `, [userId, userId]) as any[];

    const activeSkillsCount = activeSkills.length;

    // B. Monthly Calls (Current calendar month in UTC)
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const startOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString();

    const monthlyStats = await db.get(`
      SELECT 
        COUNT(*) as total_calls,
        COALESCE(SUM(tokens_consumed), 0) as total_tokens
      FROM skill_executions
      WHERE user_id = ? AND executed_at >= ?
    `, [userId, startOfMonth]) as any;

    const prevMonthStats = await db.get(`
      SELECT COUNT(*) as total_calls
      FROM skill_executions
      WHERE user_id = ? AND executed_at >= ? AND executed_at < ?
    `, [userId, startOfPrevMonth, startOfMonth]) as any;

    const monthlyCalls = monthlyStats ? Number(monthlyStats.total_calls) : 0;
    const monthlyTokens = monthlyStats ? Number(monthlyStats.total_tokens) : 0;
    const prevMonthlyCalls = prevMonthStats ? Number(prevMonthStats.total_calls) : 0;

    let callsGrowthPercent: number | null = null;
    if (prevMonthlyCalls > 0) {
      callsGrowthPercent = Math.round(((monthlyCalls - prevMonthlyCalls) / prevMonthlyCalls) * 1000) / 10;
    }

    // C. Average Latency (valid completed executions for user)
    const latencyStats = await db.get(`
      SELECT 
        ROUND(AVG(latency_ms)) as avg_latency,
        COUNT(*) as sample_count
      FROM skill_executions
      WHERE user_id = ? AND status = 'completed' AND latency_ms > 0
    `, [userId]) as any;

    const avgLatency = latencyStats && latencyStats.sample_count > 0 && latencyStats.avg_latency !== null
      ? Number(latencyStats.avg_latency)
      : null;
    const sampleCount = latencyStats ? Number(latencyStats.sample_count) : 0;

    // D. System Health / Workspace Status (honest calculation)
    const executionStats = await db.get(`
      SELECT 
        COUNT(*) as total_executions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_executions
      FROM skill_executions
      WHERE user_id = ?
    `, [userId]) as any;

    const totalExecutions = executionStats ? Number(executionStats.total_executions) : 0;
    const successfulExecutions = executionStats ? Number(executionStats.successful_executions) : 0;

    let healthStatus: string;
    let healthRate: number | null = null;
    let healthDetails: string;

    if (totalExecutions > 0) {
      healthRate = Math.round((successfulExecutions / totalExecutions) * 1000) / 10;
      healthStatus = `${healthRate.toFixed(1)}%`;
      healthDetails = `${successfulExecutions} / ${totalExecutions} executions succeeded`;
    } else {
      healthStatus = 'Workspace ready';
      healthRate = null;
      healthDetails = 'Runtime ready for first execution';
    }

    // E. Frequently Invoked Skills (User's workspace skills sorted by actual invocation count)
    const frequentlyInvoked = await db.all(`
      SELECT 
        s.id, s.name, s.slug, s.summary, s.category, s.current_version, s.pricing_type, s.price,
        s.logo_url, s.average_rating, pr.display_name as creator_name, pr.username as creator_username,
        COUNT(e.id) as invocation_count,
        MAX(e.executed_at) as last_invoked_at
      FROM (
        SELECT skill_id FROM user_purchases WHERE user_id = ? AND status = 'completed'
        UNION
        SELECT id as skill_id FROM skills WHERE creator_id = ? AND status IN ('published', 'live', 'approved')
      ) ws
      JOIN skills s ON ws.skill_id = s.id
      JOIN profiles pr ON s.creator_id = pr.id
      LEFT JOIN skill_executions e ON e.skill_id = s.id AND e.user_id = ?
      GROUP BY s.id, s.name, s.slug, s.summary, s.category, s.current_version, s.pricing_type, s.price, s.logo_url, s.average_rating, pr.display_name, pr.username
      ORDER BY invocation_count DESC, s.name ASC
      LIMIT 6
    `, [userId, userId, userId]) as any[];

    // F. Recent Activity Stream (User's actual executions)
    const recentActivity = await db.all(`
      SELECT id, skill_name, command, status, latency_ms, tokens_consumed, executed_at, payload_json
      FROM skill_executions
      WHERE user_id = ?
      ORDER BY executed_at DESC
      LIMIT 10
    `, [userId]) as any[];

    const formattedActivity = recentActivity.map(act => {
      let payload: any = {};
      if (act.payload_json) {
        try { payload = JSON.parse(act.payload_json); } catch {}
      }
      return {
        id: act.id,
        skillName: act.skill_name,
        command: act.command,
        status: act.status.toUpperCase(),
        latency: `${act.latency_ms}ms`,
        tokens: `${Number(act.tokens_consumed || 0).toLocaleString()} tok`,
        timestamp: act.executed_at,
        payload
      };
    });

    res.json({
      metrics: {
        active_skills: {
          count: activeSkillsCount,
          slots_limit: null, // Honest: no unbacked 20-slot entitlement
          description: activeSkillsCount === 0 ? 'No active skills installed' : `${activeSkillsCount} active workspace skill${activeSkillsCount === 1 ? '' : 's'}`
        },
        monthly_calls: {
          total: monthlyCalls,
          tokens: monthlyTokens,
          growth_percent: callsGrowthPercent,
          period: 'current_calendar_month_utc'
        },
        average_latency: {
          value_ms: avgLatency,
          display: avgLatency !== null ? `${avgLatency} ms` : '--',
          sample_count: sampleCount
        },
        system_health: {
          status: healthStatus,
          success_rate: healthRate,
          details: healthDetails,
          has_monitoring: totalExecutions > 0
        }
      },
      frequently_invoked_skills: frequentlyInvoked.map(item => ({
        ...item,
        price: Number(item.price || 0),
        invocation_count: Number(item.invocation_count || 0)
      })),
      recent_activity: formattedActivity,
      active_skills_list: activeSkills
    });
  } catch (err: any) {
    console.error('Dashboard fetch error:', err.message);
    res.status(500).json({ error: 'Failed to load user workspace dashboard.' });
  }
});

// 2. POST /api/dashboard/executions — Record genuine skill execution
router.post('/executions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { skill_id, skill_name, command, status = 'completed', latency_ms, tokens_consumed = 0, payload } = req.body;

    if (!skill_name || !command || typeof latency_ms !== 'number' || latency_ms < 0) {
      res.status(400).json({ error: 'Missing required fields: skill_name, command, and valid latency_ms.' });
      return;
    }

    const executionId = `exec_${crypto.randomUUID()}`;
    const executedAt = new Date().toISOString();
    const payloadJson = payload ? JSON.stringify(payload) : null;

    await db.run(`
      INSERT INTO skill_executions (
        id, user_id, skill_id, skill_name, command, status, latency_ms, tokens_consumed, payload_json, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      executionId,
      userId,
      skill_id || null,
      skill_name,
      command,
      status,
      Math.round(latency_ms),
      Math.max(0, Math.round(Number(tokens_consumed) || 0)),
      payloadJson,
      executedAt
    ]);

    res.status(201).json({
      success: true,
      execution: {
        id: executionId,
        user_id: userId,
        skill_id: skill_id || null,
        skill_name,
        command,
        status,
        latency_ms: Math.round(latency_ms),
        tokens_consumed: Math.max(0, Math.round(Number(tokens_consumed) || 0)),
        executed_at: executedAt
      }
    });
  } catch (err: any) {
    console.error('Record execution error:', err.message);
    res.status(500).json({ error: 'Failed to record execution log.' });
  }
});

// 3. GET /api/dashboard/api-keys — List user API keys
router.get('/api-keys', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const keys = await db.all(`
      SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
      FROM api_keys
      WHERE user_id = ? AND revoked_at IS NULL
      ORDER BY created_at DESC
    `, [userId]);

    res.json({ keys });
  } catch (err: any) {
    console.error('List API keys error:', err.message);
    res.status(500).json({ error: 'Failed to list API keys.' });
  }
});

// 4. POST /api/dashboard/api-keys — Generate new API key
router.post('/api-keys', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name } = req.body;

    const trimmedName = (name && typeof name === 'string') ? name.trim().slice(0, 80) : 'Personal API Key';
    const { key, prefix, hash } = generateApiKey();
    const keyId = `key_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();

    await db.run(`
      INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [keyId, userId, trimmedName, prefix, hash, createdAt]);

    // Return full key only once upon creation
    res.status(201).json({
      success: true,
      api_key: {
        id: keyId,
        name: trimmedName,
        key_prefix: prefix,
        secret_key: key,
        created_at: createdAt
      }
    });
  } catch (err: any) {
    console.error('Create API key error:', err.message);
    res.status(500).json({ error: 'Failed to create API key.' });
  }
});

// 5. DELETE /api/dashboard/api-keys/:id — Revoke user API key
router.delete('/api-keys/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await db.get(`
      SELECT id, user_id FROM api_keys WHERE id = ?
    `, [id]) as any;

    if (!existing) {
      res.status(404).json({ error: 'API key not found.' });
      return;
    }

    if (existing.user_id !== userId) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to revoke this API key.' });
      return;
    }

    const now = new Date().toISOString();
    await db.run(`
      UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ?
    `, [now, id, userId]);

    res.json({ success: true, message: 'API key revoked successfully.' });
  } catch (err: any) {
    console.error('Revoke API key error:', err.message);
    res.status(500).json({ error: 'Failed to revoke API key.' });
  }
});

export default router;

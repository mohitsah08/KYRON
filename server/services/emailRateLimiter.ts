import crypto from 'node:crypto';
import { db, DatabaseExecutor } from '../db/database.ts';

export type AuthEmailAction = 'signup_verification' | 'password_reset_link' | 'password_reset_otp';

export const VALID_AUTH_EMAIL_ACTIONS: readonly AuthEmailAction[] = [
  'signup_verification',
  'password_reset_link',
  'password_reset_otp'
] as const;

export const EMAIL_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // Rolling 24 hours (86,400,000 ms)
export const EMAIL_RATE_LIMIT_MAX = 3; // Strict 3 per rolling 24 hours
export const IP_RATE_LIMIT_MAX = 25; // Secondary layer: max 25 per rolling 24 hours per IP
export const IP_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const RATE_LIMIT_EXCEEDED_MESSAGE = "You've reached the maximum of 3 email requests within 24 hours. Please try again later.";

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  totalAttemptsInWindow: number;
  totalAttempts?: number;
  limit: number;
  nextEligibleAt?: Date;
  retryAfterSeconds?: number;
  reason?: string;
  message?: string;
  attemptId?: string;
}

export interface RateLimitStatusResult {
  action: AuthEmailAction;
  allowed: boolean;
  remaining: number;
  limit: number;
  totalAttemptsInWindow: number;
  nextEligibleAt: Date | null;
  retryAfterSeconds: number;
}

/**
 * Normalizes email address consistently (lowercase & trimmed).
 */
export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Produces a SHA-256 hex hash of the normalized email for privacy-safe storage and indexing.
 */
export function hashEmail(normalizedEmail: string): string {
  return crypto.createHash('sha256').update(normalizedEmail).digest('hex');
}

/**
 * Atomically checks and reserves an email rate limit slot inside a transaction.
 * Counts attempted email sends BEFORE invoking the auth provider so repeated failures cannot bypass.
 */
export async function consumeEmailRateLimit(
  rawEmail: string,
  action: AuthEmailAction,
  ipAddress?: string
): Promise<RateLimitCheckResult> {
  const normalized = normalizeEmail(rawEmail);
  if (!normalized || !normalized.includes('@')) {
    return {
      allowed: false,
      remaining: 0,
      totalAttemptsInWindow: 0,
      limit: EMAIL_RATE_LIMIT_MAX,
      reason: 'Please provide a valid email address.'
    };
  }

  const emailHash = hashEmail(normalized);
  const now = Date.now();
  const emailWindowStart = now - EMAIL_RATE_LIMIT_WINDOW_MS;
  const ipWindowStart = now - IP_RATE_LIMIT_WINDOW_MS;

  return db.withTransaction(async (tx: DatabaseExecutor) => {
    // If running in Postgres, acquire a transaction-level advisory lock on the email_hash + action
    // to strictly serialize concurrent requests for the exact same target across instances.
    if ((db as any).isPostgres) {
      try {
        await tx.run('SELECT pg_advisory_xact_lock(hashtext(?))', [`email_rate:${emailHash}:${action}`]);
      } catch {}
    }

    // 1. IP-based abuse protection layer
    if (ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== '::1') {
      const ipRows = await tx.all<{ count: number }>(
        `SELECT COUNT(*) as count FROM auth_email_rate_limits
         WHERE ip_address = ? AND created_at_ms >= ? AND outcome IN ('attempt', 'sent', 'provider_error')`,
        [ipAddress, ipWindowStart]
      );
      const ipCount = Number(ipRows[0]?.count || 0);
      if (ipCount >= IP_RATE_LIMIT_MAX) {
        const blockedId = 'rat_ip_' + crypto.randomUUID();
        await tx.run(
          `INSERT INTO auth_email_rate_limits (id, email_hash, action, ip_address, outcome, created_at, created_at_ms)
           VALUES (?, ?, ?, ?, 'ip_blocked', ?, ?)`,
          [blockedId, emailHash, action, ipAddress, new Date(now).toISOString(), now]
        );

        console.warn(JSON.stringify({
          event: 'auth_email_ip_rate_limit_blocked',
          action,
          ip: ipAddress,
          count: ipCount,
          timestamp: new Date(now).toISOString()
        }));

        return {
          allowed: false,
          remaining: 0,
          totalAttemptsInWindow: ipCount,
          limit: IP_RATE_LIMIT_MAX,
          retryAfterSeconds: 3600,
          reason: 'Too many requests from this network. Please try again later.'
        };
      }
    }

    // 2. Query attempts in the rolling 24-hour window for this (email_hash, action)
    const attempts = await tx.all<{ id: string; created_at_ms: number | string }>(
      `SELECT id, created_at_ms FROM auth_email_rate_limits
       WHERE email_hash = ? AND action = ? AND created_at_ms >= ? AND outcome IN ('attempt', 'sent', 'provider_error')
       ORDER BY created_at_ms ASC`,
      [emailHash, action, emailWindowStart]
    );

    const totalInWindow = attempts.length;

    // 3. If 3 or more attempts exist in the rolling 24 hours, BLOCK the 4th request
    if (totalInWindow >= EMAIL_RATE_LIMIT_MAX) {
      const oldestAttempt = attempts[0];
      const oldestMs = Number(oldestAttempt.created_at_ms);
      const nextEligibleMs = oldestMs + EMAIL_RATE_LIMIT_WINDOW_MS;
      const retryAfterSeconds = Math.max(1, Math.ceil((nextEligibleMs - now) / 1000));
      const nextEligibleDate = new Date(nextEligibleMs);

      // Record blocked attempt for security auditing
      const blockedId = 'rat_blk_' + crypto.randomUUID();
      await tx.run(
        `INSERT INTO auth_email_rate_limits (id, email_hash, action, ip_address, outcome, created_at, created_at_ms)
         VALUES (?, ?, ?, ?, 'rate_limited', ?, ?)`,
        [blockedId, emailHash, action, ipAddress || null, new Date(now).toISOString(), now]
      );

      // Log structured security telemetry without leaking sensitive credentials
      console.warn(JSON.stringify({
        event: 'auth_email_rate_limit_blocked',
        action,
        email_hash: emailHash,
        attempts_in_window: totalInWindow,
        next_eligible_at: nextEligibleDate.toISOString(),
        ip: ipAddress || 'unknown',
        timestamp: new Date(now).toISOString()
      }));

      return {
        allowed: false,
        remaining: 0,
        totalAttemptsInWindow: totalInWindow,
        totalAttempts: totalInWindow,
        limit: EMAIL_RATE_LIMIT_MAX,
        nextEligibleAt: nextEligibleDate,
        retryAfterSeconds,
        reason: RATE_LIMIT_EXCEEDED_MESSAGE,
        message: RATE_LIMIT_EXCEEDED_MESSAGE
      };
    }

    // 4. Within quota (0, 1, or 2 prior attempts).
    // Pre-insert the attempt record BEFORE invoking Supabase Auth.
    const attemptId = 'rat_' + crypto.randomUUID();
    await tx.run(
      `INSERT INTO auth_email_rate_limits (id, email_hash, action, ip_address, outcome, created_at, created_at_ms)
       VALUES (?, ?, ?, ?, 'attempt', ?, ?)`,
      [attemptId, emailHash, action, ipAddress || null, new Date(now).toISOString(), now]
    );

    const remaining = EMAIL_RATE_LIMIT_MAX - (totalInWindow + 1);

    console.info(JSON.stringify({
      event: 'auth_email_rate_limit_granted',
      action,
      email_hash: emailHash,
      attempt_number: totalInWindow + 1,
      remaining,
      ip: ipAddress || 'unknown',
      timestamp: new Date(now).toISOString()
    }));

    return {
      allowed: true,
      remaining,
      totalAttemptsInWindow: totalInWindow + 1,
      totalAttempts: totalInWindow + 1,
      limit: EMAIL_RATE_LIMIT_MAX,
      attemptId
    };
  });
}

/**
 * Checks rate limit status without consuming an attempt slot.
 */
export async function checkEmailRateLimit(
  rawEmail: string,
  action: AuthEmailAction
): Promise<RateLimitStatusResult> {
  const normalized = normalizeEmail(rawEmail);
  const emailHash = hashEmail(normalized);
  const now = Date.now();
  const emailWindowStart = now - EMAIL_RATE_LIMIT_WINDOW_MS;

  const attempts = await db.all<{ id: string; created_at_ms: number | string }>(
    `SELECT id, created_at_ms FROM auth_email_rate_limits
     WHERE email_hash = ? AND action = ? AND created_at_ms >= ? AND outcome IN ('attempt', 'sent', 'provider_error')
     ORDER BY created_at_ms ASC`,
    [emailHash, action, emailWindowStart]
  );

  const totalInWindow = attempts.length;
  const allowed = totalInWindow < EMAIL_RATE_LIMIT_MAX;
  const remaining = Math.max(0, EMAIL_RATE_LIMIT_MAX - totalInWindow);

  let nextEligibleAt: Date | null = null;
  let retryAfterSeconds = 0;

  if (totalInWindow >= EMAIL_RATE_LIMIT_MAX) {
    const oldest = attempts[0];
    const oldestMs = Number(oldest.created_at_ms);
    const nextEligibleMs = oldestMs + EMAIL_RATE_LIMIT_WINDOW_MS;
    nextEligibleAt = new Date(nextEligibleMs);
    retryAfterSeconds = Math.max(0, Math.ceil((nextEligibleMs - now) / 1000));
  }

  return {
    action,
    allowed,
    remaining,
    limit: EMAIL_RATE_LIMIT_MAX,
    totalAttemptsInWindow: totalInWindow,
    nextEligibleAt,
    retryAfterSeconds
  };
}

/**
 * Updates an attempt record to 'sent' after successful provider delivery.
 */
export async function markEmailRateLimitSuccess(attemptId: string): Promise<void> {
  if (!attemptId) return;
  try {
    await db.run(
      `UPDATE auth_email_rate_limits SET outcome = 'sent' WHERE id = ?`,
      [attemptId]
    );
  } catch (err: any) {
    console.warn('Failed to mark rate limit success:', err.message);
  }
}

/**
 * Updates an attempt record to 'provider_error' when downstream provider fails.
 */
export async function markEmailRateLimitError(attemptId: string): Promise<void> {
  if (!attemptId) return;
  try {
    await db.run(
      `UPDATE auth_email_rate_limits SET outcome = 'provider_error' WHERE id = ?`,
      [attemptId]
    );
  } catch (err: any) {
    console.warn('Failed to mark rate limit error:', err.message);
  }
}

/**
 * Testing utility to purge rate limits for a specific test email.
 */
export async function resetRateLimitsForTesting(rawEmail?: string, action?: AuthEmailAction): Promise<void> {
  if (rawEmail && action) {
    const hash = hashEmail(normalizeEmail(rawEmail));
    await db.run(`DELETE FROM auth_email_rate_limits WHERE email_hash = ? AND action = ?`, [hash, action]);
  } else if (rawEmail) {
    const hash = hashEmail(normalizeEmail(rawEmail));
    await db.run(`DELETE FROM auth_email_rate_limits WHERE email_hash = ?`, [hash]);
  } else {
    await db.run(`DELETE FROM auth_email_rate_limits`);
  }
}

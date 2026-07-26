import 'server-only';
import { NextRequest } from 'next/server';

/**
 * Verifies that a request to a sync/cron endpoint carries the shared
 * CRON_SECRET, so these endpoints (which trigger real API calls and
 * writes) can't be hit by anyone who finds the URL. Vercel Cron sends
 * this automatically as an Authorization: Bearer header when
 * CRON_SECRET is set in the project's environment variables.
 */
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // If no secret is configured, fail closed in production.
    return process.env.NODE_ENV !== 'production';
  }
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

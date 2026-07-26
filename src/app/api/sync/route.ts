import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { syncBlockchain, ALL_BLOCKCHAINS } from '@/lib/sync-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/sync
 * Triggered by Vercel Cron (see vercel.json) on a schedule. Syncs all
 * four supported blockchains in sequence. Each chain's failure is
 * isolated — one chain being down never prevents the others from
 * syncing.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await Promise.all(ALL_BLOCKCHAINS.map((chain) => syncBlockchain(chain)));

  return NextResponse.json({ synced_at: new Date().toISOString(), results });
}

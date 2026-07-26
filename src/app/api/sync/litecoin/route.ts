import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { syncBlockchain } from '@/lib/sync-engine';

export const dynamic = 'force-dynamic';

/**
 * GET — manual/cron-triggered poll of all enabled Litecoin wallets.
 * Blockchair has no per-address webhook offering on the standard plan,
 * so Litecoin relies on polling only (see vercel.json for the cron
 * schedule).
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await syncBlockchain('litecoin');
  return NextResponse.json(result);
}

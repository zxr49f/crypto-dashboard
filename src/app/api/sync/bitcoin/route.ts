import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { syncBlockchain } from '@/lib/sync-engine';

export const dynamic = 'force-dynamic';

/**
 * GET — manual/cron-triggered poll of all enabled Bitcoin wallets.
 * Blockstream's public API has no outbound webhook support for
 * arbitrary addresses, so Bitcoin relies on polling only (see
 * vercel.json for the cron schedule).
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await syncBlockchain('bitcoin');
  return NextResponse.json(result);
}

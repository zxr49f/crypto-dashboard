import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { syncBlockchain } from '@/lib/sync-engine';

export const dynamic = 'force-dynamic';

/** GET — manual/cron-triggered poll of all enabled Solana wallets. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await syncBlockchain('solana');
  return NextResponse.json(result);
}

/**
 * POST — Helius webhook receiver. For production use, configure a
 * Helius "Enhanced Webhook" (transactionType: TRANSFER) pointed at this
 * URL for instant detection instead of relying purely on the polling
 * cron. Helius signs webhook payloads with an auth-header secret you
 * set when creating the webhook — verify it against HELIUS_WEBHOOK_SECRET
 * before trusting the payload.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.HELIUS_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get('authorization');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Helius webhooks push the transaction directly, but re-running the
  // same polling sync immediately afterward is a simple, reliable way to
  // pick it up via the same idempotent insert path — avoiding a second
  // code path that could get out of sync with the polling logic.
  const result = await syncBlockchain('solana');
  return NextResponse.json(result);
}

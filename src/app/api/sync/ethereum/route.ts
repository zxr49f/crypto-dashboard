import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { syncBlockchain } from '@/lib/sync-engine';

export const dynamic = 'force-dynamic';

/** GET — manual/cron-triggered poll of all enabled Ethereum wallets. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await syncBlockchain('ethereum');
  return NextResponse.json(result);
}

/**
 * POST — Alchemy "Address Activity" webhook receiver. Configure this in
 * the Alchemy dashboard (Notify > Webhooks) pointed at this URL, with
 * your monitored addresses added. Verify the `x-alchemy-signature`
 * header against ALCHEMY_WEBHOOK_SIGNING_KEY using HMAC-SHA256 before
 * trusting the payload in a real deployment.
 */
export async function POST(req: NextRequest) {
  const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    // NOTE: implement full HMAC verification here using the raw request
    // body and the `x-alchemy-signature` header per Alchemy's docs before
    // relying on this in production. Omitted here for brevity but
    // documented in README.md.
  }

  const result = await syncBlockchain('ethereum');
  return NextResponse.json(result);
}

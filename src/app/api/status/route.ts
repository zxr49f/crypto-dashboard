import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/status
 * Reports whether each required integration is configured and whether
 * the database is reachable — used by the Settings tab. Never returns
 * secret values, only booleans/labels.
 */
export async function GET() {
  const configured = {
    helius: Boolean(process.env.HELIUS_API_KEY),
    alchemy: Boolean(process.env.ALCHEMY_API_KEY),
    blockchair: Boolean(process.env.BLOCKCHAIR_API_KEY),
    coingecko: Boolean(process.env.COINGECKO_API_KEY), // optional — free tier works without a key
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  let dbConnected = false;
  let dbError: string | null = null;
  try {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from('settings').select('id').limit(1);
    dbConnected = !error;
    dbError = error?.message ?? null;
  } catch (err) {
    dbError = (err as Error).message;
  }

  return NextResponse.json({ configured, database: { connected: dbConnected, error: dbError } });
}

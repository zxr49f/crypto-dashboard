import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getAllEurPrices } from '@/lib/price';
import { getExplorerTxUrl } from '@/lib/explorers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transactions
 * Query params:
 *   q          — search term (matches tx hash, sender, recipient)
 *   crypto     — SOL | ETH | BTC | LTC
 *   blockchain — solana | ethereum | bitcoin | litecoin
 *   status     — pending | confirming | confirmed | failed
 *   from, to   — ISO date bounds on tx_timestamp
 *   sort       — 'amount' | 'date' (default 'date')
 *   dir        — 'asc' | 'desc' (default 'desc')
 *   page, pageSize
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServiceClient();
  const params = req.nextUrl.searchParams;

  const q = params.get('q')?.trim();
  const crypto = params.get('crypto');
  const blockchain = params.get('blockchain');
  const status = params.get('status');
  const from = params.get('from');
  const to = params.get('to');
  const sort = params.get('sort') === 'amount' ? 'amount' : 'tx_timestamp';
  const dir = params.get('dir') === 'asc';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(params.get('pageSize') ?? '20', 10)));

  let query = supabase.from('transactions').select('*, wallets(name)', { count: 'exact' });

  if (crypto) query = query.eq('cryptocurrency', crypto);
  if (blockchain) query = query.eq('blockchain', blockchain);
  if (status) query = query.eq('status', status);
  if (from) query = query.gte('tx_timestamp', from);
  if (to) query = query.lte('tx_timestamp', to);
  if (q) {
    query = query.or(`tx_hash.ilike.%${q}%,sender_address.ilike.%${q}%,recipient_address.ilike.%${q}%`);
  }

  query = query.order(sort, { ascending: dir });
  const start = (page - 1) * pageSize;
  query = query.range(start, start + pageSize - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const prices = await getAllEurPrices();

  const transactions = (data ?? []).map((tx: any) => ({
    ...tx,
    wallet_name: tx.wallets?.name,
    current_eur_value: Number(tx.amount) * (prices[tx.cryptocurrency as keyof typeof prices] ?? 0),
    explorer_url: getExplorerTxUrl(tx.blockchain, tx.tx_hash),
  }));

  return NextResponse.json({
    transactions,
    pagination: { page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) },
  });
}

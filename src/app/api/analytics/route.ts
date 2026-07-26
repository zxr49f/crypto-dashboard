import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const RANGE_DAYS: Record<string, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  all: null,
};

/** GET /api/analytics?range=7d|30d|90d|1y|all */
export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') ?? '30d';
  const days = RANGE_DAYS[range] ?? 30;

  const supabase = getSupabaseServiceClient();
  let query = supabase.from('transactions').select('*, wallets(name)').in('status', ['confirmed', 'confirming']);

  if (days !== null) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    query = query.gte('tx_timestamp', since.toISOString());
  }

  const { data: transactions, error } = await query.order('tx_timestamp', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const txs = transactions ?? [];

  // Received-over-time (daily buckets)
  const byDay = new Map<string, number>();
  const byBlockchainCount: Record<string, number> = {};
  const byCryptoAmount: Record<string, number> = {};
  const byCryptoEur: Record<string, number> = {};
  const walletCounts = new Map<string, { name: string; count: number }>();

  let largestTx: any = null;
  let totalEur = 0;

  for (const tx of txs) {
    const day = tx.tx_timestamp.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + Number(tx.eur_value_at_detection));

    byBlockchainCount[tx.blockchain] = (byBlockchainCount[tx.blockchain] ?? 0) + 1;
    byCryptoAmount[tx.cryptocurrency] = (byCryptoAmount[tx.cryptocurrency] ?? 0) + Number(tx.amount);
    byCryptoEur[tx.cryptocurrency] = (byCryptoEur[tx.cryptocurrency] ?? 0) + Number(tx.eur_value_at_detection);

    totalEur += Number(tx.eur_value_at_detection);

    if (!largestTx || Number(tx.eur_value_at_detection) > Number(largestTx.eur_value_at_detection)) {
      largestTx = tx;
    }

    const walletName = tx.wallets?.name ?? 'Unknown wallet';
    const cur = walletCounts.get(tx.wallet_id) ?? { name: walletName, count: 0 };
    cur.count += 1;
    walletCounts.set(tx.wallet_id, cur);
  }

  const receivedOverTime = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, eur]) => ({ date, eur }));

  const mostActiveWallet = Array.from(walletCounts.values()).sort((a, b) => b.count - a.count)[0] ?? null;

  return NextResponse.json({
    range,
    received_over_time: receivedOverTime,
    crypto_distribution: byCryptoAmount,
    eur_value_distribution: byCryptoEur,
    transactions_per_blockchain: byBlockchainCount,
    average_transaction_value_eur: txs.length ? totalEur / txs.length : 0,
    largest_transaction: largestTx
      ? { id: largestTx.id, amount: largestTx.amount, cryptocurrency: largestTx.cryptocurrency, eur_value: largestTx.eur_value_at_detection, tx_hash: largestTx.tx_hash }
      : null,
    most_active_wallet: mostActiveWallet,
    total_transactions: txs.length,
    total_received_eur: totalEur,
  });
}

import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getAllEurPrices } from '@/lib/price';
import { getExplorerTxUrl } from '@/lib/explorers';
import { Blockchain, ChainStatus, Cryptocurrency } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseServiceClient();

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*, wallets(name)')
    .in('status', ['confirmed', 'confirming'])
    .order('tx_timestamp', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const prices = await getAllEurPrices();

  const balances: Record<Cryptocurrency, number> = { SOL: 0, ETH: 0, BTC: 0, LTC: 0 };
  let totalReceivedEur = 0;
  let transactionsToday = 0;
  let transactionsThisMonth = 0;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const tx of transactions ?? []) {
    balances[tx.cryptocurrency as Cryptocurrency] += Number(tx.amount);
    totalReceivedEur += Number(tx.eur_value_at_detection);

    const txDate = new Date(tx.tx_timestamp);
    if (txDate >= startOfDay) transactionsToday += 1;
    if (txDate >= startOfMonth) transactionsThisMonth += 1;
  }

  const totalPortfolioEur = (Object.keys(balances) as Cryptocurrency[]).reduce(
    (sum, symbol) => sum + balances[symbol] * (prices[symbol] ?? 0),
    0
  );

  const withCurrentValue = (transactions ?? []).slice(0, 10).map((tx: any) => ({
    ...tx,
    wallet_name: tx.wallets?.name,
    current_eur_value: Number(tx.amount) * (prices[tx.cryptocurrency as Cryptocurrency] ?? 0),
    explorer_url: getExplorerTxUrl(tx.blockchain, tx.tx_hash),
  }));

  const { data: wallets } = await supabase.from('wallets').select('blockchain, last_checked_at, last_sync_error, enabled');

  const chains: Blockchain[] = ['solana', 'ethereum', 'bitcoin', 'litecoin'];
  const chainStatus: Record<Blockchain, ChainStatus> = {} as Record<Blockchain, ChainStatus>;

  for (const chain of chains) {
    const chainWallets = (wallets ?? []).filter((w) => w.blockchain === chain && w.enabled);
    if (chainWallets.length === 0) {
      chainStatus[chain] = { connected: true, last_synced_at: null, error: null };
      continue;
    }
    const withError = chainWallets.find((w) => w.last_sync_error);
    const mostRecent = chainWallets
      .map((w) => w.last_checked_at)
      .filter(Boolean)
      .sort()
      .reverse()[0];

    chainStatus[chain] = {
      connected: !withError,
      last_synced_at: mostRecent ?? null,
      error: withError?.last_sync_error ?? null,
    };
  }

  return NextResponse.json({
    total_portfolio_eur: totalPortfolioEur,
    balances,
    total_transactions: transactions?.length ?? 0,
    total_received_eur: totalReceivedEur,
    transactions_today: transactionsToday,
    transactions_this_month: transactionsThisMonth,
    latest_transaction: withCurrentValue[0] ?? null,
    recent_transactions: withCurrentValue,
    chain_status: chainStatus,
  });
}

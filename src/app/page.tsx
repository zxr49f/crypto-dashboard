'use client';

import { useCallback, useEffect, useState } from 'react';
import { TrendingUp, ArrowDownToLine, Calendar, CalendarDays, Wallet2 } from 'lucide-react';
import { DashboardStats } from '@/types';
import { formatEur, formatCrypto, formatDate, shortenAddress, relativeTime, CHAIN_LABELS } from '@/lib/format';
import { CoinIcon, StatusBadge, ChainStatusDot } from '@/components/StatusBadge';
import { useRealtimeTransactions } from '@/lib/useRealtimeTransactions';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTransactions(load);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-vault-100">Dashboard</h1>
        <p className="text-sm text-vault-400">A live view of everything flowing into your wallets.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 panel panel-noise p-6">
          <div className="text-xs uppercase tracking-wider text-vault-400 mb-2">Total portfolio value</div>
          <div className="font-display text-4xl md:text-5xl text-vault-100 mono-num">
            {loading ? '···' : formatEur(stats?.total_portfolio_eur ?? 0)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {(['SOL', 'ETH', 'BTC', 'LTC'] as const).map((c) => (
              <div key={c} className="rounded-xl border border-vault-700/60 bg-vault-850/60 px-3 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <CoinIcon symbol={c} size="sm" />
                  <span className="text-xs text-vault-400">{c}</span>
                </div>
                <div className="mono-num text-sm text-vault-100">{formatCrypto(stats?.balances?.[c] ?? 0)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel panel-noise p-6">
          <div className="text-xs uppercase tracking-wider text-vault-400 mb-3">System status</div>
          <div className="flex items-center gap-2 mb-4">
            <span className="status-dot online" />
            <span className="text-sm text-vault-100 font-medium">All systems operational</span>
          </div>
          <div className="space-y-3">
            {(['solana', 'ethereum', 'bitcoin', 'litecoin'] as const).map((chain) => {
              const s = stats?.chain_status?.[chain];
              return (
                <div key={chain} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ChainStatusDot connected={s?.connected ?? true} />
                    <span className="text-vault-200">{CHAIN_LABELS[chain]}</span>
                  </div>
                  <span className="text-xs text-vault-500 mono-num">{relativeTime(s?.last_synced_at ?? null)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={ArrowDownToLine} label="Total received" value={formatEur(stats?.total_received_eur ?? 0)} />
        <StatCard icon={TrendingUp} label="Total transactions" value={String(stats?.total_transactions ?? 0)} />
        <StatCard icon={Calendar} label="Today" value={String(stats?.transactions_today ?? 0)} />
        <StatCard icon={CalendarDays} label="This month" value={String(stats?.transactions_this_month ?? 0)} />
      </div>

      <div className="panel panel-noise p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-vault-100">Recent transactions</h2>
          <Link href="/transactions" className="text-xs text-brass-400 link-underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="text-sm text-vault-500 py-8 text-center">Loading…</div>
        ) : !stats?.recent_transactions?.length ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-vault-800">
            {stats.recent_transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-3">
                <CoinIcon symbol={tx.cryptocurrency} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-vault-100 mono-num">
                      {formatCrypto(tx.amount)} {tx.cryptocurrency}
                    </span>
                    <StatusBadge status={tx.status} />
                  </div>
                  <div className="text-xs text-vault-500 mt-0.5">
                    from {shortenAddress(tx.sender_address)} · {formatDate(tx.tx_timestamp)}
                  </div>
                </div>
                <div className="text-sm text-vault-200 mono-num">{formatEur(tx.eur_value_at_detection)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="panel p-4">
      <Icon className="w-4 h-4 text-brass-400 mb-2" />
      <div className="text-xl font-semibold text-vault-100 mono-num">{value}</div>
      <div className="text-xs text-vault-400 mt-0.5">{label}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <Wallet2 className="w-8 h-8 text-vault-600 mx-auto mb-3" />
      <div className="text-sm text-vault-300 font-medium">No transactions yet</div>
      <div className="text-xs text-vault-500 mt-1">
        Add a wallet to start monitoring for incoming payments.
      </div>
      <Link href="/wallets" className="inline-block mt-4 text-xs text-brass-400 link-underline">
        Go to Wallets →
      </Link>
    </div>
  );
}

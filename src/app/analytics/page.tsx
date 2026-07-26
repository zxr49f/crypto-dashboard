'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { formatEur, formatCrypto, CRYPTO_COLORS, CHAIN_LABELS } from '@/lib/format';

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
  { value: 'all', label: 'All time' },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/analytics?range=${range}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const receivedOverTime = data?.received_over_time ?? [];
  const cryptoDist = Object.entries(data?.crypto_distribution ?? {}).map(([name, value]) => ({ name, value }));
  const eurDist = Object.entries(data?.eur_value_distribution ?? {}).map(([name, value]) => ({ name, value }));
  const perChain = Object.entries(data?.transactions_per_blockchain ?? {}).map(([chain, count]) => ({
    chain: CHAIN_LABELS[chain] ?? chain,
    count,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-vault-100">Analytics</h1>
          <p className="text-sm text-vault-400 mt-1">Trends and breakdowns across all monitored wallets.</p>
        </div>
        <div className="flex gap-1 bg-vault-850 border border-vault-700 rounded-lg p-1 w-fit">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                range === r.value ? 'bg-brass-500 text-vault-950 font-semibold' : 'text-vault-400 hover:text-vault-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total received" value={formatEur(data?.total_received_eur ?? 0)} />
        <StatCard label="Transactions" value={String(data?.total_transactions ?? 0)} />
        <StatCard label="Avg. transaction" value={formatEur(data?.average_transaction_value_eur ?? 0)} />
        <StatCard
          label="Largest transaction"
          value={data?.largest_transaction ? `${formatCrypto(data.largest_transaction.amount)} ${data.largest_transaction.cryptocurrency}` : '—'}
        />
      </div>

      <div className="panel panel-noise p-6">
        <h2 className="font-display text-lg text-vault-100 mb-4">Received over time</h2>
        <div className="h-72">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-vault-500">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={receivedOverTime}>
                <defs>
                  <linearGradient id="colorEur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e8b23f" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#e8b23f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#232833" vertical={false} />
                <XAxis dataKey="date" stroke="#4a5164" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#4a5164" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
                <Tooltip
                  contentStyle={{ background: '#12151c', border: '1px solid #232833', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#c2c7d1' }}
                  formatter={(v: number) => [formatEur(v), 'Received']}
                />
                <Area type="monotone" dataKey="eur" stroke="#e8b23f" strokeWidth={2} fill="url(#colorEur)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel panel-noise p-6">
          <h2 className="font-display text-lg text-vault-100 mb-4">Crypto distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={eurDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {eurDist.map((entry) => (
                    <Cell key={entry.name} fill={CRYPTO_COLORS[entry.name] ?? '#4a5164'} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#12151c', border: '1px solid #232833', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => formatEur(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9199a8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel panel-noise p-6">
          <h2 className="font-display text-lg text-vault-100 mb-4">Transactions per blockchain</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perChain}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232833" vertical={false} />
                <XAxis dataKey="chain" stroke="#4a5164" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#4a5164" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#12151c', border: '1px solid #232833', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#e8b23f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel panel-noise p-6">
        <h2 className="font-display text-lg text-vault-100 mb-4">Most active wallet</h2>
        <div className="text-sm text-vault-200">
          {data?.most_active_wallet
            ? `${data.most_active_wallet.name} — ${data.most_active_wallet.count} transactions`
            : 'No data for this range yet.'}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <div className="text-lg font-semibold text-vault-100 mono-num">{value}</div>
      <div className="text-xs text-vault-400 mt-0.5">{label}</div>
    </div>
  );
}

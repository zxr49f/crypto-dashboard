'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { TransactionWithCurrentValue } from '@/types';
import { TransactionTable } from '@/components/TransactionTable';
import { TransactionModal } from '@/components/TransactionModal';
import { useRealtimeTransactions } from '@/lib/useRealtimeTransactions';

const CRYPTOS = ['SOL', 'ETH', 'BTC', 'LTC'];
const CHAINS = [
  { value: 'solana', label: 'Solana' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'litecoin', label: 'Litecoin' },
];
const STATUSES = ['pending', 'confirming', 'confirmed', 'failed'];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithCurrentValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [crypto, setCrypto] = useState('');
  const [blockchain, setBlockchain] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<'amount' | 'date'>('date');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<TransactionWithCurrentValue | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (crypto) params.set('crypto', crypto);
    if (blockchain) params.set('blockchain', blockchain);
    if (status) params.set('status', status);
    params.set('sort', sort);
    params.set('dir', dir);
    params.set('page', String(page));

    const res = await fetch(`/api/transactions?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
      setTotalPages(data.pagination.totalPages || 1);
    }
    setLoading(false);
  }, [q, crypto, blockchain, status, sort, dir, page]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTransactions(load);

  function handleSortChange(newSort: 'amount' | 'date') {
    if (sort === newSort) {
      setDir(dir === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(newSort);
      setDir('desc');
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-vault-100">Transactions</h1>
        <p className="text-sm text-vault-400 mt-1">Every incoming payment across all monitored wallets.</p>
      </header>

      <div className="panel panel-noise p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-vault-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
            placeholder="Search hash, sender, or recipient…"
            className="w-full bg-vault-850 border border-vault-700 rounded-lg pl-9 pr-3 py-2 text-sm text-vault-100 outline-none focus:border-brass-500/60"
          />
        </div>
        <select
          value={crypto}
          onChange={(e) => { setPage(1); setCrypto(e.target.value); }}
          className="bg-vault-850 border border-vault-700 rounded-lg px-3 py-2 text-sm text-vault-200 outline-none"
        >
          <option value="">All coins</option>
          {CRYPTOS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={blockchain}
          onChange={(e) => { setPage(1); setBlockchain(e.target.value); }}
          className="bg-vault-850 border border-vault-700 rounded-lg px-3 py-2 text-sm text-vault-200 outline-none"
        >
          <option value="">All chains</option>
          {CHAINS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          className="bg-vault-850 border border-vault-700 rounded-lg px-3 py-2 text-sm text-vault-200 outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      <div className="panel panel-noise p-4">
        {loading ? (
          <div className="text-sm text-vault-500 py-12 text-center">Loading…</div>
        ) : (
          <>
            <TransactionTable
              transactions={transactions}
              sort={sort}
              dir={dir}
              onSortChange={handleSortChange}
              onSelect={setSelected}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-vault-800">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs text-vault-400 disabled:opacity-30 hover:text-vault-100"
                >
                  ← Previous
                </button>
                <span className="text-xs text-vault-500">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs text-vault-400 disabled:opacity-30 hover:text-vault-100"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && <TransactionModal tx={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

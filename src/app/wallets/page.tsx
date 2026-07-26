'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Wallet2 } from 'lucide-react';
import { WalletWithStats } from '@/types';
import { WalletCard } from '@/components/WalletCard';
import { AddWalletDialog } from '@/components/AddWalletDialog';

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/wallets');
    if (res.ok) {
      const data = await res.json();
      setWallets(data.wallets);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-vault-100">Wallets</h1>
          <p className="text-sm text-vault-400 mt-1">Public addresses being monitored for incoming payments.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-brass-500 hover:bg-brass-400 text-vault-950 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add wallet
        </button>
      </header>

      {loading ? (
        <div className="text-sm text-vault-500 py-12 text-center">Loading…</div>
      ) : wallets.length === 0 ? (
        <div className="panel panel-noise p-12 text-center">
          <Wallet2 className="w-8 h-8 text-vault-600 mx-auto mb-3" />
          <div className="text-sm text-vault-300 font-medium">No wallets yet</div>
          <div className="text-xs text-vault-500 mt-1">Add a public SOL, ETH, BTC, or LTC address to start monitoring.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {wallets.map((w) => (
            <WalletCard key={w.id} wallet={w} onChanged={load} />
          ))}
        </div>
      )}

      {showAdd && <AddWalletDialog onClose={() => setShowAdd(false)} onCreated={load} />}
    </div>
  );
}

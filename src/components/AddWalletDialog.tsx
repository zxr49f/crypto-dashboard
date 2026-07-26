'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Blockchain } from '@/types';
import { useToast } from '@/components/Toast';

const CHAINS: { value: Blockchain; label: string }[] = [
  { value: 'solana', label: 'Solana' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'litecoin', label: 'Litecoin' },
];

export function AddWalletDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [blockchain, setBlockchain] = useState<Blockchain>('solana');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, blockchain, address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to add wallet');
        return;
      }
      push({ title: 'Wallet added', description: `${name} is now being monitored`, variant: 'success' });
      onCreated();
      onClose();
    } catch (err) {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="panel panel-noise w-full max-w-md p-6 animate-rise">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-vault-100">Add wallet</h2>
          <button onClick={onClose} className="text-vault-400 hover:text-vault-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-vault-400 mb-1.5 block">Wallet name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main SOL Wallet"
              required
              className="w-full bg-vault-850 border border-vault-700 rounded-lg px-3 py-2.5 text-sm text-vault-100 outline-none focus:border-brass-500/60"
            />
          </div>

          <div>
            <label className="text-xs text-vault-400 mb-1.5 block">Blockchain</label>
            <div className="grid grid-cols-4 gap-2">
              {CHAINS.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setBlockchain(c.value)}
                  className={`text-xs py-2 rounded-lg border transition-colors ${
                    blockchain === c.value
                      ? 'bg-brass-500/15 border-brass-500/40 text-brass-400'
                      : 'border-vault-700 text-vault-400 hover:text-vault-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-vault-400 mb-1.5 block">Public wallet address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Public address only — never a seed phrase or private key"
              required
              className="w-full bg-vault-850 border border-vault-700 rounded-lg px-3 py-2.5 text-sm text-vault-100 font-mono outline-none focus:border-brass-500/60"
            />
          </div>

          {error && (
            <div className="text-xs text-garnet-400 bg-garnet-500/10 border border-garnet-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brass-500 hover:bg-brass-400 disabled:opacity-50 text-vault-950 font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            {submitting ? 'Adding…' : 'Add wallet'}
          </button>
        </form>
      </div>
    </div>
  );
}

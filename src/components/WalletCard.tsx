'use client';

import { useState } from 'react';
import { Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import { WalletWithStats } from '@/types';
import { formatEur, formatCrypto, shortenAddress, relativeTime, CHAIN_LABELS } from '@/lib/format';
import { getExplorerAddressUrl } from '@/lib/explorers';
import { CoinIcon } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';

const CHAIN_TO_SYMBOL: Record<string, string> = { solana: 'SOL', ethereum: 'ETH', bitcoin: 'BTC', litecoin: 'LTC' };

export function WalletCard({ wallet, onChanged }: { wallet: WalletWithStats; onChanged: () => void }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  async function toggleEnabled() {
    setBusy(true);
    try {
      await fetch(`/api/wallets/${wallet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !wallet.enabled }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await fetch(`/api/wallets/${wallet.id}`, { method: 'DELETE' });
      push({ title: 'Wallet removed', variant: 'success' });
      onChanged();
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  function copyAddress() {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const symbol = CHAIN_TO_SYMBOL[wallet.blockchain];

  return (
    <div className="panel panel-noise p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <CoinIcon symbol={symbol} size="lg" />
          <div>
            <div className="font-medium text-vault-100">{wallet.name}</div>
            <div className="text-xs text-vault-400">{CHAIN_LABELS[wallet.blockchain]}</div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={wallet.enabled} onChange={toggleEnabled} disabled={busy} className="sr-only peer" />
          <div className="w-9 h-5 bg-vault-700 rounded-full peer-checked:bg-emerald-500/70 transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-vault-200 rounded-full peer-checked:translate-x-4 transition-transform" />
        </label>
      </div>

      <button
        onClick={copyAddress}
        className="flex items-center gap-2 text-xs font-mono text-vault-400 hover:text-vault-200 bg-vault-850/60 rounded-lg px-2.5 py-1.5 w-fit"
        title={wallet.address}
      >
        {shortenAddress(wallet.address, 7)}
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-vault-500">Balance</div>
          <div className="mono-num text-vault-100">{formatCrypto(wallet.balance)} {symbol}</div>
        </div>
        <div>
          <div className="text-xs text-vault-500">EUR value</div>
          <div className="mono-num text-vault-100">{formatEur(wallet.balance_eur)}</div>
        </div>
        <div>
          <div className="text-xs text-vault-500">Transactions</div>
          <div className="mono-num text-vault-100">{wallet.transaction_count}</div>
        </div>
        <div>
          <div className="text-xs text-vault-500">Last synced</div>
          <div className="text-vault-100">{relativeTime(wallet.last_checked_at)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-vault-800">
        <a
          href={getExplorerAddressUrl(wallet.blockchain, wallet.address)}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-vault-400 hover:text-brass-400 flex items-center gap-1"
        >
          Explorer <ExternalLink className="w-3 h-3" />
        </a>

        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-vault-400">Delete?</span>
            <button onClick={handleDelete} disabled={busy} className="text-xs text-garnet-400 font-medium">
              Yes
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="text-xs text-vault-400">
              No
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} className="text-vault-500 hover:text-garnet-400">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

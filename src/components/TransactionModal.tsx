'use client';

import { X, ExternalLink } from 'lucide-react';
import { TransactionWithCurrentValue } from '@/types';
import { formatEur, formatCrypto, formatDate, CHAIN_LABELS } from '@/lib/format';
import { CoinIcon, StatusBadge } from '@/components/StatusBadge';

export function TransactionModal({ tx, onClose }: { tx: TransactionWithCurrentValue; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="panel panel-noise w-full max-w-lg p-6 animate-rise max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <CoinIcon symbol={tx.cryptocurrency} size="lg" />
            <div>
              <div className="font-display text-xl text-vault-100">
                {formatCrypto(tx.amount)} {tx.cryptocurrency}
              </div>
              <div className="text-xs text-vault-400">{CHAIN_LABELS[tx.blockchain]}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-vault-400 hover:text-vault-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <Field label="Status"><StatusBadge status={tx.status} /></Field>
          <Field label="Confirmations">{tx.confirmations ?? '—'}</Field>
          <Field label="EUR value at detection">{formatEur(tx.eur_value_at_detection)}</Field>
          <Field label="Current EUR value">{formatEur(tx.current_eur_value)}</Field>
          <Field label="Block number">{tx.block_number ?? '—'}</Field>
          <Field label="Date">{formatDate(tx.tx_timestamp)}</Field>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <div className="text-xs text-vault-500 mb-1">Sender</div>
            <div className="font-mono text-xs text-vault-200 bg-vault-850/60 rounded-lg px-3 py-2 break-all">
              {tx.sender_address ?? 'Unknown'}
            </div>
          </div>
          <div>
            <div className="text-xs text-vault-500 mb-1">Recipient</div>
            <div className="font-mono text-xs text-vault-200 bg-vault-850/60 rounded-lg px-3 py-2 break-all">
              {tx.recipient_address}
            </div>
          </div>
          <div>
            <div className="text-xs text-vault-500 mb-1">Transaction hash</div>
            <div className="font-mono text-xs text-vault-200 bg-vault-850/60 rounded-lg px-3 py-2 break-all">
              {tx.tx_hash}
            </div>
          </div>
        </div>

        <a
          href={tx.explorer_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-vault-800 hover:bg-vault-700 text-vault-100 text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          View on block explorer <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-vault-500 mb-1">{label}</div>
      <div className="text-sm text-vault-100 mono-num">{children}</div>
    </div>
  );
}

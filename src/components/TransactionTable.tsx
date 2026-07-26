'use client';

import { TransactionWithCurrentValue } from '@/types';
import { formatEur, formatCrypto, formatDate, shortenAddress, CHAIN_LABELS } from '@/lib/format';
import { CoinIcon, StatusBadge } from '@/components/StatusBadge';
import { ArrowUpDown } from 'lucide-react';

interface Props {
  transactions: TransactionWithCurrentValue[];
  sort: 'amount' | 'date';
  dir: 'asc' | 'desc';
  onSortChange: (sort: 'amount' | 'date') => void;
  onSelect: (tx: TransactionWithCurrentValue) => void;
}

export function TransactionTable({ transactions, sort, dir, onSortChange, onSelect }: Props) {
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="text-left text-xs text-vault-500 border-b border-vault-800">
            <th className="px-2 py-2.5 font-medium">Status</th>
            <th className="px-2 py-2.5 font-medium">Coin</th>
            <th className="px-2 py-2.5 font-medium">
              <SortHeader label="Amount" active={sort === 'amount'} dir={dir} onClick={() => onSortChange('amount')} />
            </th>
            <th className="px-2 py-2.5 font-medium">EUR value</th>
            <th className="px-2 py-2.5 font-medium">Sender</th>
            <th className="px-2 py-2.5 font-medium">Recipient</th>
            <th className="px-2 py-2.5 font-medium">Blockchain</th>
            <th className="px-2 py-2.5 font-medium">
              <SortHeader label="Date" active={sort === 'date'} dir={dir} onClick={() => onSortChange('date')} />
            </th>
            <th className="px-2 py-2.5 font-medium">Tx hash</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-vault-800/70">
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              onClick={() => onSelect(tx)}
              className="cursor-pointer hover:bg-vault-800/30 transition-colors"
            >
              <td className="px-2 py-3"><StatusBadge status={tx.status} /></td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-2">
                  <CoinIcon symbol={tx.cryptocurrency} size="sm" />
                  <span className="text-vault-200">{tx.cryptocurrency}</span>
                </div>
              </td>
              <td className="px-2 py-3 mono-num text-vault-100">{formatCrypto(tx.amount)}</td>
              <td className="px-2 py-3 mono-num text-vault-100">{formatEur(tx.eur_value_at_detection)}</td>
              <td className="px-2 py-3 font-mono text-xs text-vault-400">{shortenAddress(tx.sender_address)}</td>
              <td className="px-2 py-3 font-mono text-xs text-vault-400">{shortenAddress(tx.recipient_address)}</td>
              <td className="px-2 py-3 text-vault-300">{CHAIN_LABELS[tx.blockchain]}</td>
              <td className="px-2 py-3 text-xs text-vault-400 whitespace-nowrap">{formatDate(tx.tx_timestamp)}</td>
              <td className="px-2 py-3 font-mono text-xs text-vault-500">{shortenAddress(tx.tx_hash, 6)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length === 0 && (
        <div className="text-center py-12 text-sm text-vault-500">No transactions match these filters.</div>
      )}
    </div>
  );
}

function SortHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 ${active ? 'text-brass-400' : 'text-vault-500'}`}>
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );
}

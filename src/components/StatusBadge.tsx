import { clsx } from 'clsx';
import { TransactionStatus } from '@/types';

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={clsx('chip', `chip-${status}`)}>{label}</span>;
}

export function ChainStatusDot({ connected }: { connected: boolean }) {
  return <span className={clsx('status-dot', connected ? 'online' : 'offline')} />;
}

const COIN_GLYPH: Record<string, string> = { SOL: '◎', ETH: 'Ξ', BTC: '₿', LTC: 'Ł' };
const COIN_COLOR: Record<string, string> = {
  SOL: 'text-[#a06bff] bg-[#a06bff]/10 border-[#a06bff]/25',
  ETH: 'text-[#8fa3ff] bg-[#8fa3ff]/10 border-[#8fa3ff]/25',
  BTC: 'text-brass-400 bg-brass-500/10 border-brass-500/25',
  LTC: 'text-vault-200 bg-vault-500/10 border-vault-500/25',
};

export function CoinIcon({ symbol, size = 'md' }: { symbol: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : size === 'lg' ? 'w-11 h-11 text-lg' : 'w-8 h-8 text-sm';
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full border font-semibold shrink-0',
        sizeClass,
        COIN_COLOR[symbol] ?? 'text-vault-300 bg-vault-700/40 border-vault-600'
      )}
    >
      {COIN_GLYPH[symbol] ?? symbol[0]}
    </span>
  );
}

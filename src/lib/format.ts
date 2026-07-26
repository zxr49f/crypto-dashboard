export function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

export function formatCrypto(value: number, decimals = 6): string {
  return (value || 0).toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '') || '0';
}

export function shortenAddress(address: string | null, chars = 5): string {
  if (!address) return 'Unknown';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export const CHAIN_LABELS: Record<string, string> = {
  solana: 'Solana',
  ethereum: 'Ethereum',
  bitcoin: 'Bitcoin',
  litecoin: 'Litecoin',
};

export const CRYPTO_COLORS: Record<string, string> = {
  SOL: '#a06bff',
  ETH: '#8fa3ff',
  BTC: '#f4c95d',
  LTC: '#9db4c0',
};

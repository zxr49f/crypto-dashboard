import { Blockchain } from '@/types';

/**
 * Returns the correct block-explorer URL for a transaction hash on a
 * given chain. Centralized here so the correct explorer is always used
 * and never hardcoded incorrectly in individual components.
 */
export function getExplorerTxUrl(blockchain: Blockchain, txHash: string): string {
  switch (blockchain) {
    case 'solana':
      return `https://solscan.io/tx/${txHash}`;
    case 'ethereum':
      return `https://etherscan.io/tx/${txHash}`;
    case 'bitcoin':
      return `https://blockstream.info/tx/${txHash}`;
    case 'litecoin':
      return `https://blockchair.com/litecoin/transaction/${txHash}`;
    default:
      return '#';
  }
}

export function getExplorerAddressUrl(blockchain: Blockchain, address: string): string {
  switch (blockchain) {
    case 'solana':
      return `https://solscan.io/account/${address}`;
    case 'ethereum':
      return `https://etherscan.io/address/${address}`;
    case 'bitcoin':
      return `https://blockstream.info/address/${address}`;
    case 'litecoin':
      return `https://blockchair.com/litecoin/address/${address}`;
    default:
      return '#';
  }
}

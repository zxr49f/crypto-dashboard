import 'server-only';
import { DetectedPayment } from '@/types';
import { ChainUnavailableError } from './types';

const LAMPORTS_PER_SOL = 1_000_000_000;

function heliusBase(): string {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    throw new ChainUnavailableError('solana', 'HELIUS_API_KEY is not configured.');
  }
  return `https://api.helius.xyz/v0`;
}

interface HeliusTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number; // lamports
}

interface HeliusTx {
  signature: string;
  timestamp: number; // unix seconds
  slot: number;
  nativeTransfers?: HeliusTransfer[];
}

/**
 * Fetches incoming native-SOL transfers to `address` using Helius'
 * enhanced transactions API. Returns only transfers newer than
 * `lastSeenTxHash` (or all recent transfers if none has been seen yet).
 *
 * Note: Helius also supports realtime webhooks (recommended for
 * production — configure one pointed at
 * /api/sync/solana?mode=webhook so you aren't limited to polling).
 * This function implements the polling fallback path.
 */
export async function fetchSolanaIncomingPayments(
  address: string,
  lastSeenTxHash: string | null
): Promise<DetectedPayment[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new ChainUnavailableError('solana', 'HELIUS_API_KEY is not configured.');

  const url = `${heliusBase()}/addresses/${address}/transactions?api-key=${apiKey}&limit=50`;

  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    throw new ChainUnavailableError('solana', `Network error contacting Helius: ${(err as Error).message}`);
  }

  if (!res.ok) {
    throw new ChainUnavailableError('solana', `Helius API returned ${res.status}`);
  }

  const txs: HeliusTx[] = await res.json();
  const payments: DetectedPayment[] = [];

  for (const tx of txs) {
    if (tx.signature === lastSeenTxHash) break; // reached already-processed history

    const transfers = tx.nativeTransfers ?? [];
    for (const transfer of transfers) {
      if (transfer.toUserAccount === address && transfer.amount > 0) {
        payments.push({
          blockchain: 'solana',
          cryptocurrency: 'SOL',
          tx_hash: tx.signature,
          sender_address: transfer.fromUserAccount ?? null,
          recipient_address: address,
          amount: transfer.amount / LAMPORTS_PER_SOL,
          status: 'confirmed', // Solana finality is fast; Helius only returns finalized txs by default
          confirmations: null,
          block_number: tx.slot,
          tx_timestamp: new Date(tx.timestamp * 1000).toISOString(),
        });
      }
    }
  }

  return payments;
}

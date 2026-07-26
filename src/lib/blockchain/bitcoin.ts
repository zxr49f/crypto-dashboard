import 'server-only';
import { DetectedPayment } from '@/types';
import { ChainUnavailableError } from './types';

const SATS_PER_BTC = 100_000_000;
const BLOCKSTREAM_API = 'https://blockstream.info/api';

interface EsploraVout {
  scriptpubkey_address?: string;
  value: number; // sats
}
interface EsploraVin {
  prevout?: { scriptpubkey_address?: string };
}
interface EsploraTx {
  txid: string;
  vin: EsploraVin[];
  vout: EsploraVout[];
  status: { confirmed: boolean; block_height?: number; block_time?: number };
}

/**
 * Fetches incoming payments to a Bitcoin address using the Blockstream
 * Esplora REST API (no API key required for reasonable usage; set
 * BLOCKSTREAM_API_BASE if you're running your own Esplora instance).
 *
 * UTXO model: an "incoming payment" is any transaction with an output
 * (vout) paying our address, as long as none of the transaction's inputs
 * (vin) also belong to us (which would make it an outgoing/change tx).
 */
export async function fetchBitcoinIncomingPayments(
  address: string,
  lastSeenTxHash: string | null,
  requiredConfirmations: number
): Promise<DetectedPayment[]> {
  const base = process.env.BLOCKSTREAM_API_BASE || BLOCKSTREAM_API;
  let res: Response;

  try {
    res = await fetch(`${base}/address/${address}/txs`, { cache: 'no-store' });
  } catch (err) {
    throw new ChainUnavailableError('bitcoin', `Network error contacting Blockstream: ${(err as Error).message}`);
  }

  if (!res.ok) {
    throw new ChainUnavailableError('bitcoin', `Blockstream API returned ${res.status}`);
  }

  const txs: EsploraTx[] = await res.json();

  let tipHeight: number | null = null;
  const payments: DetectedPayment[] = [];

  for (const tx of txs) {
    if (tx.txid === lastSeenTxHash) break;

    const isOutgoing = tx.vin.some((v) => v.prevout?.scriptpubkey_address === address);
    if (isOutgoing) continue;

    const incomingVouts = tx.vout.filter((v) => v.scriptpubkey_address === address);
    if (incomingVouts.length === 0) continue;

    const totalSats = incomingVouts.reduce((sum, v) => sum + v.value, 0);
    const senderAddress = tx.vin[0]?.prevout?.scriptpubkey_address ?? null;

    let confirmations = 0;
    if (tx.status.confirmed && tx.status.block_height) {
      if (tipHeight === null) {
        try {
          const tipRes = await fetch(`${base}/blocks/tip/height`, { cache: 'no-store' });
          tipHeight = tipRes.ok ? await tipRes.json() : tx.status.block_height;
        } catch {
          tipHeight = tx.status.block_height;
        }
      }
      confirmations = Math.max(0, (tipHeight ?? tx.status.block_height) - tx.status.block_height + 1);
    }

    const status = !tx.status.confirmed
      ? 'pending'
      : confirmations >= requiredConfirmations
        ? 'confirmed'
        : 'confirming';

    payments.push({
      blockchain: 'bitcoin',
      cryptocurrency: 'BTC',
      tx_hash: tx.txid,
      sender_address: senderAddress,
      recipient_address: address,
      amount: totalSats / SATS_PER_BTC,
      status,
      confirmations: tx.status.confirmed ? confirmations : 0,
      block_number: tx.status.block_height ?? null,
      tx_timestamp: tx.status.block_time
        ? new Date(tx.status.block_time * 1000).toISOString()
        : new Date().toISOString(),
    });
  }

  return payments;
}

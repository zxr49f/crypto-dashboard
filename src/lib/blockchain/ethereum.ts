import 'server-only';
import { ethers } from 'ethers';
import { DetectedPayment } from '@/types';
import { ChainUnavailableError } from './types';

const REQUIRED_CONFIRMATIONS = 12; // standard Ethereum finality-ish threshold

function getProvider(): ethers.JsonRpcProvider {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new ChainUnavailableError('ethereum', 'ALCHEMY_API_KEY is not configured.');
  return new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${apiKey}`);
}

/**
 * Fetches incoming native-ETH transfers to `address` using Alchemy's
 * `alchemy_getAssetTransfers` endpoint, which — unlike raw eth_getLogs —
 * can find plain ETH sends, not just ERC-20/contract events.
 *
 * Note: for production use, prefer Alchemy's Notify webhooks (Address
 * Activity webhook) over polling — configure one pointed at
 * /api/sync/ethereum?mode=webhook. This function implements the polling
 * fallback path used by the cron-triggered sync route.
 */
export async function fetchEthereumIncomingPayments(
  address: string,
  lastSeenTxHash: string | null
): Promise<DetectedPayment[]> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new ChainUnavailableError('ethereum', 'ALCHEMY_API_KEY is not configured.');

  const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'alchemy_getAssetTransfers',
    params: [
      {
        toAddress: address,
        category: ['external'],
        withMetadata: true,
        excludeZeroValue: true,
        maxCount: '0x32', // 50
        order: 'desc',
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (err) {
    throw new ChainUnavailableError('ethereum', `Network error contacting Alchemy: ${(err as Error).message}`);
  }

  if (!res.ok) {
    throw new ChainUnavailableError('ethereum', `Alchemy API returned ${res.status}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new ChainUnavailableError('ethereum', `Alchemy error: ${json.error.message}`);
  }

  const transfers = json.result?.transfers ?? [];
  const provider = getProvider();
  let currentBlock: number | null = null;

  const payments: DetectedPayment[] = [];

  for (const t of transfers) {
    if (t.hash === lastSeenTxHash) break;

    const blockNumber = parseInt(t.blockNum, 16);

    let confirmations = 0;
    try {
      if (currentBlock === null) currentBlock = await provider.getBlockNumber();
      confirmations = Math.max(0, currentBlock - blockNumber + 1);
    } catch {
      // If we can't reach the RPC for the current block height, still
      // record the transfer as pending rather than dropping it.
      confirmations = 0;
    }

    payments.push({
      blockchain: 'ethereum',
      cryptocurrency: 'ETH',
      tx_hash: t.hash,
      sender_address: t.from ?? null,
      recipient_address: address,
      amount: parseFloat(t.value ?? '0'),
      status: confirmations >= REQUIRED_CONFIRMATIONS ? 'confirmed' : confirmations > 0 ? 'confirming' : 'pending',
      confirmations,
      block_number: blockNumber,
      tx_timestamp: t.metadata?.blockTimestamp ?? new Date().toISOString(),
    });
  }

  return payments;
}

import 'server-only';
import { DetectedPayment } from '@/types';
import { ChainUnavailableError } from './types';

const LITOSHIS_PER_LTC = 100_000_000;

/**
 * Fetches incoming payments to a Litecoin address using the Blockchair
 * "dashboards/address" endpoint, which returns recent transactions plus
 * enough context (inputs/outputs) to determine direction and amount.
 */
export async function fetchLitecoinIncomingPayments(
  address: string,
  lastSeenTxHash: string | null,
  requiredConfirmations: number
): Promise<DetectedPayment[]> {
  const apiKey = process.env.BLOCKCHAIR_API_KEY;
  const keyParam = apiKey ? `?key=${apiKey}` : '';
  const url = `https://api.blockchair.com/litecoin/dashboards/address/${address}${keyParam}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    throw new ChainUnavailableError('litecoin', `Network error contacting Blockchair: ${(err as Error).message}`);
  }

  if (res.status === 402 || res.status === 429) {
    throw new ChainUnavailableError('litecoin', 'Blockchair rate limit reached. Configure BLOCKCHAIR_API_KEY for higher limits.');
  }
  if (!res.ok) {
    throw new ChainUnavailableError('litecoin', `Blockchair API returned ${res.status}`);
  }

  const json = await res.json();
  const addrData = json?.data?.[address];
  if (!addrData) return [];

  const txHashes: string[] = addrData.transactions ?? [];
  const context = json?.context ?? {};
  const tipHeight: number | undefined = context?.state;

  const payments: DetectedPayment[] = [];

  // Blockchair's address dashboard gives us tx hashes; fetch details for
  // the newest ones (bounded batch) to determine amounts/direction.
  const toFetch = txHashes.slice(0, 20);
  if (toFetch.length === 0) return [];

  const detailUrl = `https://api.blockchair.com/litecoin/dashboards/transactions/${toFetch.join(',')}${keyParam}`;
  let detailRes: Response;
  try {
    detailRes = await fetch(detailUrl, { cache: 'no-store' });
  } catch (err) {
    throw new ChainUnavailableError('litecoin', `Network error fetching Blockchair tx details: ${(err as Error).message}`);
  }
  if (!detailRes.ok) {
    throw new ChainUnavailableError('litecoin', `Blockchair tx-details API returned ${detailRes.status}`);
  }

  const detailJson = await detailRes.json();

  for (const hash of toFetch) {
    if (hash === lastSeenTxHash) break;

    const txData = detailJson?.data?.[hash];
    if (!txData) continue;

    const outputs = txData.outputs ?? [];
    const inputs = txData.inputs ?? [];

    const isOutgoing = inputs.some((i: any) => i.recipient === address);
    if (isOutgoing) continue;

    const incomingOutputs = outputs.filter((o: any) => o.recipient === address);
    if (incomingOutputs.length === 0) continue;

    const totalLitoshis = incomingOutputs.reduce((sum: number, o: any) => sum + (o.value ?? 0), 0);
    const senderAddress = inputs[0]?.recipient ?? null;
    const blockId: number | undefined = txData.transaction?.block_id;
    const confirmations = blockId && blockId > 0 && tipHeight ? Math.max(0, tipHeight - blockId + 1) : 0;

    const status = !blockId || blockId <= 0
      ? 'pending'
      : confirmations >= requiredConfirmations
        ? 'confirmed'
        : 'confirming';

    payments.push({
      blockchain: 'litecoin',
      cryptocurrency: 'LTC',
      tx_hash: hash,
      sender_address: senderAddress,
      recipient_address: address,
      amount: totalLitoshis / LITOSHIS_PER_LTC,
      status,
      confirmations,
      block_number: blockId && blockId > 0 ? blockId : null,
      tx_timestamp: txData.transaction?.time ? new Date(txData.transaction.time + 'Z').toISOString() : new Date().toISOString(),
    });
  }

  return payments;
}

import 'server-only';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getEurPrice } from '@/lib/price';
import { sendDiscordPaymentNotification } from '@/lib/discord';
import { fetchSolanaIncomingPayments } from '@/lib/blockchain/solana';
import { fetchEthereumIncomingPayments } from '@/lib/blockchain/ethereum';
import { fetchBitcoinIncomingPayments } from '@/lib/blockchain/bitcoin';
import { fetchLitecoinIncomingPayments } from '@/lib/blockchain/litecoin';
import { ChainUnavailableError } from '@/lib/blockchain/types';
import { Blockchain, DetectedPayment, Wallet } from '@/types';

export interface SyncResult {
  blockchain: Blockchain;
  walletsChecked: number;
  paymentsInserted: number;
  error: string | null;
}

/**
 * Syncs a single blockchain: loads all enabled wallets for that chain,
 * polls the appropriate client for new incoming payments, and persists
 * any new ones with full idempotency (unique constraint on
 * (blockchain, tx_hash, recipient_address) makes duplicate inserts a
 * harmless no-op rather than an error).
 */
export async function syncBlockchain(blockchain: Blockchain): Promise<SyncResult> {
  const supabase = getSupabaseServiceClient();

  const { data: wallets, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('blockchain', blockchain)
    .eq('enabled', true);

  if (walletError) {
    return { blockchain, walletsChecked: 0, paymentsInserted: 0, error: walletError.message };
  }
  if (!wallets || wallets.length === 0) {
    return { blockchain, walletsChecked: 0, paymentsInserted: 0, error: null };
  }

  const { data: settingsRow } = await supabase.from('settings').select('*').eq('id', true).single();
  const requiredConfBtc = settingsRow?.required_confirmations_btc ?? 2;
  const requiredConfLtc = settingsRow?.required_confirmations_ltc ?? 6;

  let totalInserted = 0;
  let lastError: string | null = null;

  for (const wallet of wallets as Wallet[]) {
    try {
      const lastTx = await getLastSeenTxHash(wallet.id);
      const payments = await fetchForChain(blockchain, wallet.address, lastTx, requiredConfBtc, requiredConfLtc);

      // Insert oldest-first so lastSeenTxHash bookkeeping and notification
      // ordering both make chronological sense.
      const ordered = [...payments].reverse();

      for (const payment of ordered) {
        const inserted = await persistPayment(wallet, payment, settingsRow);
        if (inserted) totalInserted += 1;
      }

      await supabase
        .from('wallets')
        .update({ last_checked_at: new Date().toISOString(), last_sync_error: null })
        .eq('id', wallet.id);
    } catch (err) {
      const message = err instanceof ChainUnavailableError ? err.message : (err as Error).message;
      lastError = message;
      await supabase.from('wallets').update({ last_sync_error: message }).eq('id', wallet.id);
      await supabase.from('notifications').insert({
        type: 'sync_error',
        message: `${blockchain.toUpperCase()} sync failed for wallet "${wallet.name}": ${message}`,
      });
      // Continue to the next wallet rather than aborting the whole chain.
    }
  }

  return { blockchain, walletsChecked: wallets.length, paymentsInserted: totalInserted, error: lastError };
}

async function fetchForChain(
  blockchain: Blockchain,
  address: string,
  lastSeenTxHash: string | null,
  requiredConfBtc: number,
  requiredConfLtc: number
): Promise<DetectedPayment[]> {
  switch (blockchain) {
    case 'solana':
      return fetchSolanaIncomingPayments(address, lastSeenTxHash);
    case 'ethereum':
      return fetchEthereumIncomingPayments(address, lastSeenTxHash);
    case 'bitcoin':
      return fetchBitcoinIncomingPayments(address, lastSeenTxHash, requiredConfBtc);
    case 'litecoin':
      return fetchLitecoinIncomingPayments(address, lastSeenTxHash, requiredConfLtc);
  }
}

async function getLastSeenTxHash(walletId: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from('transactions')
    .select('tx_hash')
    .eq('wallet_id', walletId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.tx_hash ?? null;
}

/**
 * Inserts a detected payment if it doesn't already exist. Relies on the
 * unique (blockchain, tx_hash, recipient_address) DB constraint as the
 * ultimate source of truth for idempotency — even if this function were
 * called twice concurrently for the same payment, only one row would
 * ever be created.
 */
async function persistPayment(wallet: Wallet, payment: DetectedPayment, settingsRow: any): Promise<boolean> {
  const supabase = getSupabaseServiceClient();

  const eurPrice = await getEurPrice(payment.cryptocurrency);
  const eurValue = payment.amount * eurPrice;

  const { data: inserted, error } = await supabase
    .from('transactions')
    .insert({
      wallet_id: wallet.id,
      blockchain: payment.blockchain,
      cryptocurrency: payment.cryptocurrency,
      tx_hash: payment.tx_hash,
      sender_address: payment.sender_address,
      recipient_address: payment.recipient_address,
      amount: payment.amount,
      eur_price_at_detection: eurPrice,
      eur_value_at_detection: eurValue,
      status: payment.status,
      confirmations: payment.confirmations,
      block_number: payment.block_number,
      tx_timestamp: payment.tx_timestamp,
    })
    .select()
    .single();

  if (error) {
    // Unique violation (code 23505) means we've already recorded this tx —
    // that's expected and not an error condition, just skip notifications.
    if (error.code === '23505') return false;
    throw new Error(`Failed to insert transaction: ${error.message}`);
  }
  if (!inserted) return false;

  const minAmount = settingsRow?.min_notification_amount_eur ?? 0;
  const notifyOnlyConfirmed = settingsRow?.notify_only_on_confirmation ?? false;

  const shouldNotify = eurValue >= minAmount && (!notifyOnlyConfirmed || payment.status === 'confirmed');

  if (shouldNotify) {
    await supabase.from('notifications').insert({
      type: 'payment_received',
      message: `Received ${payment.amount.toFixed(6)} ${payment.cryptocurrency} (€${eurValue.toFixed(2)}) to "${wallet.name}"`,
      cryptocurrency: payment.cryptocurrency,
      amount: payment.amount,
      eur_value: eurValue,
      transaction_id: inserted.id,
    });

    if (settingsRow?.discord_notifications_enabled && settingsRow?.discord_webhook_url) {
      await sendDiscordPaymentNotification(payment, wallet.name, eurValue, settingsRow.discord_webhook_url);
    }
  }

  return true;
}

export const ALL_BLOCKCHAINS: Blockchain[] = ['solana', 'ethereum', 'bitcoin', 'litecoin'];

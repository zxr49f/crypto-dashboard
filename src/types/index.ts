export type Blockchain = 'solana' | 'ethereum' | 'bitcoin' | 'litecoin';

export type Cryptocurrency = 'SOL' | 'ETH' | 'BTC' | 'LTC';

export type TransactionStatus = 'pending' | 'confirming' | 'confirmed' | 'failed';

export interface Wallet {
  id: string;
  name: string;
  blockchain: Blockchain;
  address: string;
  enabled: boolean;
  created_at: string;
  last_checked_at: string | null;
}

export interface WalletWithStats extends Wallet {
  balance: number;
  balance_eur: number;
  transaction_count: number;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  blockchain: Blockchain;
  cryptocurrency: Cryptocurrency;
  tx_hash: string;
  sender_address: string | null;
  recipient_address: string;
  amount: number;
  eur_price_at_detection: number;
  eur_value_at_detection: number;
  status: TransactionStatus;
  confirmations: number | null;
  block_number: number | null;
  tx_timestamp: string;
  created_at: string;
}

export interface TransactionWithCurrentValue extends Transaction {
  current_eur_value: number;
  wallet_name?: string;
  explorer_url: string;
}

export type NotificationType = 'payment_received' | 'payment_confirmed' | 'sync_error' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  cryptocurrency: Cryptocurrency | null;
  amount: number | null;
  eur_value: number | null;
  is_read: boolean;
  created_at: string;
  transaction_id: string | null;
}

export interface AppSettings {
  id: string;
  currency_display: 'EUR';
  theme: 'dark' | 'light';
  browser_notifications_enabled: boolean;
  discord_notifications_enabled: boolean;
  discord_webhook_configured: boolean;
  sound_notifications_enabled: boolean;
  notify_on_pending: boolean;
  notify_only_on_confirmation: boolean;
  min_notification_amount_eur: number;
  required_confirmations_btc: number;
  required_confirmations_ltc: number;
}

export interface DashboardStats {
  total_portfolio_eur: number;
  balances: Record<Cryptocurrency, number>;
  total_transactions: number;
  total_received_eur: number;
  transactions_today: number;
  transactions_this_month: number;
  latest_transaction: TransactionWithCurrentValue | null;
  recent_transactions: TransactionWithCurrentValue[];
  chain_status: Record<Blockchain, ChainStatus>;
}

export interface ChainStatus {
  connected: boolean;
  last_synced_at: string | null;
  error: string | null;
}

export interface DetectedPayment {
  blockchain: Blockchain;
  cryptocurrency: Cryptocurrency;
  tx_hash: string;
  sender_address: string | null;
  recipient_address: string;
  amount: number;
  status: TransactionStatus;
  confirmations: number | null;
  block_number: number | null;
  tx_timestamp: string;
}

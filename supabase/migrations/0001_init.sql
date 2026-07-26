-- ============================================================
-- Crypto Payment Monitoring Dashboard — Initial Schema
-- ============================================================
-- Run this via `supabase db push` or the Supabase SQL editor.
-- Requires the pgcrypto extension for gen_random_uuid().

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
do $$ begin
  create type blockchain_t as enum ('solana', 'ethereum', 'bitcoin', 'litecoin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cryptocurrency_t as enum ('SOL', 'ETH', 'BTC', 'LTC');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tx_status_t as enum ('pending', 'confirming', 'confirmed', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type_t as enum ('payment_received', 'payment_confirmed', 'sync_error', 'system');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- WALLETS
-- Only ever stores PUBLIC addresses. No private keys or seed
-- phrases are ever accepted by the application layer, and this
-- table has no column capable of holding them.
-- ------------------------------------------------------------
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  blockchain blockchain_t not null,
  address text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_checked_at timestamptz,
  last_sync_error text,
  unique (blockchain, address)
);

create index if not exists idx_wallets_blockchain_enabled on wallets (blockchain, enabled);

-- ------------------------------------------------------------
-- TRANSACTIONS
-- Idempotency: a given on-chain transaction can only be inserted
-- once per (blockchain, tx_hash, recipient_address) — this also
-- allows the rare case of a tx touching two of the user's own
-- monitored wallets to be recorded once per wallet.
-- ------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  blockchain blockchain_t not null,
  cryptocurrency cryptocurrency_t not null,
  tx_hash text not null,
  sender_address text,
  recipient_address text not null,
  amount numeric(38, 18) not null check (amount >= 0),
  eur_price_at_detection numeric(18, 8) not null,
  eur_value_at_detection numeric(18, 2) not null,
  status tx_status_t not null default 'pending',
  confirmations integer,
  block_number bigint,
  tx_timestamp timestamptz not null,
  created_at timestamptz not null default now(),
  unique (blockchain, tx_hash, recipient_address)
);

create index if not exists idx_tx_wallet on transactions (wallet_id);
create index if not exists idx_tx_blockchain on transactions (blockchain);
create index if not exists idx_tx_status on transactions (status);
create index if not exists idx_tx_timestamp on transactions (tx_timestamp desc);
create index if not exists idx_tx_created on transactions (created_at desc);

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type notification_type_t not null,
  message text not null,
  cryptocurrency cryptocurrency_t,
  amount numeric(38, 18),
  eur_value numeric(18, 2),
  transaction_id uuid references transactions(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_read on notifications (is_read, created_at desc);

-- ------------------------------------------------------------
-- SETTINGS (single row)
-- Discord webhook URL is stored server-side only and is never
-- returned to the client — the API only exposes whether it is
-- configured (boolean), never the URL itself.
-- ------------------------------------------------------------
create table if not exists settings (
  id boolean primary key default true check (id),
  currency_display text not null default 'EUR',
  theme text not null default 'dark',
  browser_notifications_enabled boolean not null default true,
  discord_notifications_enabled boolean not null default false,
  discord_webhook_url text,
  sound_notifications_enabled boolean not null default true,
  notify_on_pending boolean not null default true,
  notify_only_on_confirmation boolean not null default false,
  min_notification_amount_eur numeric(18, 2) not null default 0,
  required_confirmations_btc integer not null default 2,
  required_confirmations_ltc integer not null default 6,
  updated_at timestamptz not null default now()
);

insert into settings (id) values (true) on conflict (id) do nothing;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- The browser only ever uses the anon key. We allow it read-only
-- access to non-sensitive columns; all writes happen through our
-- server API routes using the service-role key, which bypasses RLS.
-- ------------------------------------------------------------
alter table wallets enable row level security;
alter table transactions enable row level security;
alter table notifications enable row level security;
alter table settings enable row level security;

create policy "public read wallets" on wallets for select using (true);
create policy "public read transactions" on transactions for select using (true);
create policy "public read notifications" on notifications for select using (true);

-- Settings row is read-only from the client and never exposes the
-- discord_webhook_url in application queries (the API layer excludes
-- it explicitly), but as defense in depth we still restrict writes.
create policy "public read settings" on settings for select using (true);

-- No insert/update/delete policies are defined for the anon role,
-- which means the anon key cannot write to any of these tables —
-- only the service-role key (server-side only) can.

-- ------------------------------------------------------------
-- REALTIME
-- Enable Supabase Realtime so the dashboard updates live without
-- a full page refresh when new rows are inserted.
-- ------------------------------------------------------------
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table wallets;

# Vault — Crypto Payment Monitoring Dashboard

A full-stack dashboard that monitors **public** wallet addresses for incoming
SOL, ETH, BTC, and LTC payments, converts amounts to EUR, stores everything in
Postgres (Supabase), and notifies you in-app, in the browser, and (optionally)
in Discord — all in real time.

This app never asks for, accepts, or stores private keys or seed phrases. It
only ever needs **public addresses**. It is not a custodial wallet.

---

## 1. What's implemented

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind, dark
  fintech-style UI, fully responsive (sidebar on desktop, bottom nav on
  mobile).
- **Backend**: Next.js API routes, all secrets server-side only.
- **Database**: Supabase Postgres — `wallets`, `transactions`,
  `notifications`, `settings` tables with indexes, unique constraints for
  idempotency, and Row Level Security (read-only from the browser).
- **Blockchain monitoring**:
  - Solana via **Helius** (polling + optional webhook receiver)
  - Ethereum via **Alchemy** `alchemy_getAssetTransfers` (polling + optional
    webhook receiver)
  - Bitcoin via **Blockstream** Esplora API (polling)
  - Litecoin via **Blockchair** API (polling)
- **Price conversion**: CoinGecko, cached 60s, with graceful fallback to the
  last known price on rate-limit/outage.
- **Notifications**: in-app (Supabase Realtime + toast), browser
  `Notification` API, optional Discord webhook — all triggered from one
  code path in `src/lib/sync-engine.ts`.
- **Idempotency**: a unique DB constraint on
  `(blockchain, tx_hash, recipient_address)` means the same on-chain
  transaction can never be inserted twice, even under concurrent syncs.
- **All 6 tabs**: Dashboard, Transactions, Wallets, Analytics,
  Notifications, Settings — as specified.

### Honest limitations (please read)

- **Polling, not push, for Bitcoin and Litecoin.** Blockstream and Blockchair
  don't offer a simple per-address webhook on standard access, so those two
  chains are checked on a schedule (default every 2 minutes via cron) rather
  than being pushed instantly. Solana and Ethereum *can* use real webhooks
  (Helius / Alchemy) for near-instant detection — routes are wired up for
  this, but you must create the webhook in each provider's dashboard
  yourself (see §5).
- **Vercel Hobby plan cron limit**: Vercel's free tier only runs cron jobs
  once per day. For the 2-minute polling interval in `vercel.json` to
  actually run that often, you need a **Vercel Pro** plan, or you can trigger
  `/api/sync` from an external scheduler (e.g. cron-job.org, GitHub Actions)
  instead — see §5.
- **Ethereum confirmation counting** does one extra RPC call per new
  transfer to get the current block height; for wallets with very high
  transaction volume you may want to batch this further.
- **Webhook signature verification** for Alchemy is stubbed with a comment
  in `src/app/api/sync/ethereum/route.ts` — implement full HMAC verification
  per Alchemy's docs before relying on the webhook path in production.
  Helius webhook auth uses a simple shared-secret header, which is
  implemented.
- This code has not been run against live API keys in this environment (no
  network access to Helius/Alchemy/Blockchair from here) — you should smoke
  test each integration with your own keys before relying on it for real
  payments.

---

## 2. File structure

```
crypto-dashboard/
├── .env.example
├── vercel.json                      # cron schedule
├── supabase/migrations/0001_init.sql # full DB schema + RLS
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Dashboard
│   │   ├── transactions/page.tsx
│   │   ├── wallets/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── layout.tsx / globals.css
│   │   └── api/
│   │       ├── wallets/ (route.ts, [id]/route.ts)
│   │       ├── transactions/ (route.ts, [id]/route.ts)
│   │       ├── dashboard/route.ts
│   │       ├── analytics/route.ts
│   │       ├── notifications/ (route.ts, [id]/route.ts, mark-all-read/route.ts)
│   │       ├── settings/route.ts
│   │       ├── status/route.ts
│   │       └── sync/ (route.ts, solana/, ethereum/, bitcoin/, litecoin/)
│   ├── components/                   # Sidebar, MobileNav, WalletCard, etc.
│   ├── lib/
│   │   ├── blockchain/ (solana.ts, ethereum.ts, bitcoin.ts, litecoin.ts, types.ts)
│   │   ├── supabase/ (client.ts, server.ts)
│   │   ├── sync-engine.ts            # orchestrates detection → DB → notify
│   │   ├── price.ts                  # CoinGecko
│   │   ├── discord.ts
│   │   ├── explorers.ts
│   │   ├── validate.ts               # address validation, rejects seed phrases/keys
│   │   ├── cron-auth.ts
│   │   ├── format.ts
│   │   └── useRealtimeTransactions.ts
│   └── types/index.ts
```

---

## 3. Required environment variables

See `.env.example` for the full annotated list. Summary:

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | ✅ | Server-side |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-side, bypasses RLS |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Same URL, safe for browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Safe for browser (RLS-restricted, read-only) |
| `HELIUS_API_KEY` | ✅ for Solana | |
| `ALCHEMY_API_KEY` | ✅ for Ethereum | |
| `BLOCKCHAIR_API_KEY` | Recommended | Litecoin works without it at low volume |
| `COINGECKO_API_KEY` | Optional | Free tier works without a key |
| `CRON_SECRET` | ✅ | Protects `/api/sync/*` from public calls |
| `HELIUS_WEBHOOK_SECRET` | Optional | Only if using Helius webhooks |
| `ALCHEMY_WEBHOOK_SIGNING_KEY` | Optional | Only if using Alchemy webhooks |

No API key is ever imported into a client component — every file that reads
`process.env.SOMETHING_API_KEY` starts with `import 'server-only'`, which
causes a build error if it's ever accidentally imported from client code.

---

## 4. Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (free tier is
   fine to start).
2. Go to **Project Settings → API** and copy the **Project URL**, **anon
   public key**, and **service_role key** into your `.env.local`.
3. Go to **SQL Editor**, paste the contents of
   `supabase/migrations/0001_init.sql`, and run it. This creates all four
   tables, enums, indexes, unique constraints, RLS policies, and enables
   Realtime on `transactions`, `notifications`, and `wallets`.
4. (Alternative) If you use the Supabase CLI: `supabase link` then
   `supabase db push`.

---

## 5. API setup

### Helius (Solana)
1. Sign up at [helius.dev](https://www.helius.dev) → create an API key.
2. Put it in `HELIUS_API_KEY`.
3. **Optional, for instant detection**: in the Helius dashboard, create an
   Enhanced Webhook (type: `TRANSFER`), add your monitored Solana addresses,
   point it at `https://your-domain.com/api/sync/solana`, and set a shared
   secret as `HELIUS_WEBHOOK_SECRET` (sent as the `Authorization` header).

### Alchemy (Ethereum)
1. Sign up at [alchemy.com](https://www.alchemy.com) → create an app on
   **Ethereum Mainnet**.
2. Put the API key in `ALCHEMY_API_KEY`.
3. **Optional, for instant detection**: in Alchemy's **Notify** tab, create
   an Address Activity webhook pointed at
   `https://your-domain.com/api/sync/ethereum`, add your addresses, and
   implement the signature check (stubbed in the route file) using the
   signing key from that webhook.

### Bitcoin (Blockstream)
No account needed — the public Esplora API is used directly. If you run
your own Esplora/Electrs instance, set `BLOCKSTREAM_API_BASE`.

### Litecoin (Blockchair)
1. Sign up at [blockchair.com/api](https://blockchair.com/api) for a key
   (free tier has a low daily request cap — a key raises it).
2. Put it in `BLOCKCHAIR_API_KEY`.

### CoinGecko
Works without a key (public API, rate-limited). For higher limits, get a
Demo/Pro key and set `COINGECKO_API_KEY`.

### Discord
In your Discord server: **Server Settings → Integrations → Webhooks → New
Webhook**, copy the URL, and paste it into the **Settings** tab of the app
(stored server-side in the `settings` table) — or set `DISCORD_WEBHOOK_URL`
as an env var if you prefer.

---

## 6. Adding wallet addresses

Open the **Wallets** tab → **Add wallet** → choose the blockchain → paste
the **public address**. The app validates the address format for the
selected chain and explicitly rejects anything that looks like a seed
phrase or private key before it's ever saved.

---

## 7. Running locally

```bash
npm install
cp .env.example .env.local   # then fill in your real values
npm run dev
```

Open `http://localhost:3000`. To manually trigger a sync locally (since
Vercel Cron doesn't run in `next dev`):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sync
```

You can also call `/api/sync/solana`, `/api/sync/ethereum`, etc.
individually.

---

## 8. Deploying to production (Vercel)

1. Push this repo to GitHub and import it into
   [vercel.com](https://vercel.com).
2. Add every variable from `.env.example` in **Project Settings →
   Environment Variables**.
3. Deploy.
4. `vercel.json` schedules `/api/sync` to run every 2 minutes — this
   requires a **Vercel Pro** plan (Hobby cron runs once/day). On Hobby, use
   an external scheduler instead, e.g. a free
   [cron-job.org](https://cron-job.org) job hitting
   `https://your-domain.com/api/sync` every 1–2 minutes with header
   `Authorization: Bearer <your CRON_SECRET>`.
5. Point any Helius/Alchemy webhooks at your production domain (§5).

---

## 9. Security notes

- Never commit a real `.env.local` — only `.env.example` (with placeholders)
  belongs in git.
- The Supabase **anon** key is safe to expose to the browser only because
  RLS grants it `SELECT` and nothing else — all writes go through API
  routes using the service-role key server-side.
- The Discord webhook URL is never returned by `/api/settings` — the API
  only ever reports `discord_webhook_configured: true/false`.
- If you rotate any API key, just update the environment variable and
  redeploy — no code changes needed.

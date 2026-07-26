'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-safe Supabase client. Uses the ANON key only (never the service
 * role key). Row Level Security policies (see supabase/migrations) restrict
 * this client to read-only access on public tables — it cannot write
 * wallets, transactions, or settings. All writes go through our own API
 * routes, which use the service-role client server-side.
 */
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createBrowserClient(url, anonKey);
}

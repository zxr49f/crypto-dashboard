import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { validateWalletAddress } from '@/lib/validate';
import { Blockchain } from '@/types';

export const dynamic = 'force-dynamic';

const createWalletSchema = z.object({
  name: z.string().min(1).max(100),
  blockchain: z.enum(['solana', 'ethereum', 'bitcoin', 'litecoin']),
  address: z.string().min(1).max(200),
});

/** GET /api/wallets — list all wallets with computed balance/tx stats. */
export async function GET() {
  const supabase = getSupabaseServiceClient();

  const { data: wallets, error } = await supabase
    .from('wallets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: txAgg } = await supabase
    .from('transactions')
    .select('wallet_id, amount, eur_value_at_detection')
    .in('status', ['confirmed', 'confirming']);

  const statsByWallet = new Map<string, { balance: number; balanceEur: number; count: number }>();
  for (const tx of txAgg ?? []) {
    const cur = statsByWallet.get(tx.wallet_id) ?? { balance: 0, balanceEur: 0, count: 0 };
    cur.balance += Number(tx.amount);
    cur.balanceEur += Number(tx.eur_value_at_detection);
    cur.count += 1;
    statsByWallet.set(tx.wallet_id, cur);
  }

  const withStats = (wallets ?? []).map((w) => {
    const s = statsByWallet.get(w.id) ?? { balance: 0, balanceEur: 0, count: 0 };
    return {
      ...w,
      balance: s.balance,
      balance_eur: s.balanceEur,
      transaction_count: s.count,
    };
  });

  return NextResponse.json({ wallets: withStats });
}

/** POST /api/wallets — add a new wallet after validating it's a public address. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createWalletSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, blockchain, address } = parsed.data;

  const validation = validateWalletAddress(blockchain as Blockchain, address);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('wallets')
    .insert({ name, blockchain, address: address.trim(), enabled: true })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This wallet address is already being monitored.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ wallet: data }, { status: 201 });
}

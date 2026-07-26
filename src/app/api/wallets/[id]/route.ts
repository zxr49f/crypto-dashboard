import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { validateWalletAddress } from '@/lib/validate';
import { Blockchain } from '@/types';

export const dynamic = 'force-dynamic';

const updateWalletSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
});

/** GET /api/wallets/:id — wallet detail plus its transaction history. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServiceClient();

  const { data: wallet, error } = await supabase.from('wallets').select('*').eq('id', params.id).single();
  if (error || !wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('wallet_id', params.id)
    .order('tx_timestamp', { ascending: false });

  return NextResponse.json({ wallet, transactions: transactions ?? [] });
}

/** PATCH /api/wallets/:id — edit name/address or toggle enabled/disabled. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = updateWalletSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  if (parsed.data.address) {
    const { data: existing } = await supabase.from('wallets').select('blockchain').eq('id', params.id).single();
    if (!existing) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

    const validation = validateWalletAddress(existing.blockchain as Blockchain, parsed.data.address);
    if (!validation.valid) return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('wallets')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wallet: data });
}

/** DELETE /api/wallets/:id */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from('wallets').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

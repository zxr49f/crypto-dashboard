import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getEurPrice } from '@/lib/price';
import { getExplorerTxUrl } from '@/lib/explorers';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServiceClient();

  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*, wallets(name)')
    .eq('id', params.id)
    .single();

  if (error || !tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

  const currentPrice = await getEurPrice(tx.cryptocurrency);

  return NextResponse.json({
    transaction: {
      ...tx,
      wallet_name: tx.wallets?.name,
      current_eur_value: Number(tx.amount) * currentPrice,
      explorer_url: getExplorerTxUrl(tx.blockchain, tx.tx_hash),
    },
  });
}

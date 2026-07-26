import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** POST /api/notifications/mark-all-read */
export async function POST() {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

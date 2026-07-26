import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** PATCH /api/notifications/:id — mark a single notification read/unread. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const isRead = typeof body.is_read === 'boolean' ? body.is_read : true;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: isRead })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notification: data });
}

/** DELETE /api/notifications/:id */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from('notifications').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

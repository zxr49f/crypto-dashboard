import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const updateSettingsSchema = z.object({
  browser_notifications_enabled: z.boolean().optional(),
  discord_notifications_enabled: z.boolean().optional(),
  discord_webhook_url: z.string().url().optional().or(z.literal('')),
  sound_notifications_enabled: z.boolean().optional(),
  notify_on_pending: z.boolean().optional(),
  notify_only_on_confirmation: z.boolean().optional(),
  min_notification_amount_eur: z.number().min(0).optional(),
  required_confirmations_btc: z.number().int().min(0).max(20).optional(),
  required_confirmations_ltc: z.number().int().min(0).max(50).optional(),
  theme: z.enum(['dark', 'light']).optional(),
});

function serialize(row: any) {
  // Deliberately omit discord_webhook_url — the client only ever learns
  // whether one is configured, never its value.
  const { discord_webhook_url, ...rest } = row;
  return { ...rest, discord_webhook_configured: Boolean(discord_webhook_url) };
}

export async function GET() {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from('settings').select('*').eq('id', true).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: serialize(data) });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('settings')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', true)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: serialize(data) });
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Volume2, MessageSquare, ShieldCheck, Database, Radio, Save } from 'lucide-react';
import { AppSettings } from '@/types';
import { requestBrowserNotificationPermission } from '@/lib/useRealtimeTransactions';
import { useToast } from '@/components/Toast';

interface StatusResponse {
  configured: Record<string, boolean>;
  database: { connected: boolean; error: string | null };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [webhookInput, setWebhookInput] = useState('');
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const load = useCallback(async () => {
    const [settingsRes, statusRes] = await Promise.all([fetch('/api/settings'), fetch('/api/status')]);
    if (settingsRes.ok) setSettings((await settingsRes.json()).settings);
    if (statusRes.ok) setStatus(await statusRes.json());
    if (typeof window !== 'undefined' && 'Notification' in window) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateSetting(patch: Partial<AppSettings> & { discord_webhook_url?: string }) {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        if ('browser_notifications_enabled' in patch) {
          localStorage.setItem('vault:browser_notifications', String(patch.browser_notifications_enabled));
        }
        if ('sound_notifications_enabled' in patch) {
          localStorage.setItem('vault:sound_notifications', String(patch.sound_notifications_enabled));
        }
        push({ title: 'Settings saved', variant: 'success' });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleEnableBrowserNotifications(checked: boolean) {
    if (checked) {
      const result = await requestBrowserNotificationPermission();
      setPermission(result);
      if (result !== 'granted') {
        push({ title: 'Browser notifications blocked', description: 'Enable them in your browser settings.', variant: 'error' });
        return;
      }
    }
    updateSetting({ browser_notifications_enabled: checked });
  }

  if (!settings) {
    return <div className="text-sm text-vault-500 py-12 text-center">Loading…</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="font-display text-3xl text-vault-100">Settings</h1>
        <p className="text-sm text-vault-400 mt-1">Notification preferences, thresholds, and connection status.</p>
      </header>

      <Section icon={Bell} title="Notification preferences">
        <Toggle
          label="Browser notifications"
          description="Show a system notification when a payment is detected"
          checked={settings.browser_notifications_enabled && permission === 'granted'}
          onChange={handleEnableBrowserNotifications}
        />
        <Toggle
          label="Sound notifications"
          checked={settings.sound_notifications_enabled}
          onChange={(v) => updateSetting({ sound_notifications_enabled: v })}
        />
        <Toggle
          label="Notify on pending transactions"
          description="Otherwise only confirmed payments trigger a notification"
          checked={settings.notify_on_pending}
          onChange={(v) => updateSetting({ notify_on_pending: v })}
        />
        <Toggle
          label="Only notify after confirmation"
          checked={settings.notify_only_on_confirmation}
          onChange={(v) => updateSetting({ notify_only_on_confirmation: v })}
        />
        <div className="pt-1">
          <label className="text-sm text-vault-200 block mb-1.5">Minimum notification amount (EUR)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            defaultValue={settings.min_notification_amount_eur}
            onBlur={(e) => updateSetting({ min_notification_amount_eur: parseFloat(e.target.value) || 0 })}
            className="w-40 bg-vault-850 border border-vault-700 rounded-lg px-3 py-2 text-sm text-vault-100 outline-none focus:border-brass-500/60"
          />
        </div>
      </Section>

      <Section icon={MessageSquare} title="Discord notifications">
        <Toggle
          label="Enable Discord notifications"
          checked={settings.discord_notifications_enabled}
          onChange={(v) => updateSetting({ discord_notifications_enabled: v })}
        />
        <div>
          <label className="text-sm text-vault-200 block mb-1.5">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder={settings.discord_webhook_configured ? '•••••••••••••••••••••• (configured)' : 'https://discord.com/api/webhooks/...'}
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              className="flex-1 bg-vault-850 border border-vault-700 rounded-lg px-3 py-2 text-sm text-vault-100 outline-none focus:border-brass-500/60"
            />
            <button
              onClick={() => { updateSetting({ discord_webhook_url: webhookInput }); setWebhookInput(''); }}
              disabled={!webhookInput || saving}
              className="flex items-center gap-1.5 bg-vault-800 hover:bg-vault-700 disabled:opacity-40 text-vault-100 text-sm px-3 py-2 rounded-lg"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          </div>
          <p className="text-xs text-vault-500 mt-1.5">
            Stored server-side only — never sent to or displayed in the browser after saving.
          </p>
        </div>
      </Section>

      <Section icon={ShieldCheck} title="Confirmation requirements">
        <NumberField
          label="Bitcoin confirmations required"
          value={settings.required_confirmations_btc}
          onCommit={(v) => updateSetting({ required_confirmations_btc: v })}
        />
        <NumberField
          label="Litecoin confirmations required"
          value={settings.required_confirmations_ltc}
          onCommit={(v) => updateSetting({ required_confirmations_ltc: v })}
        />
      </Section>

      <Section icon={Radio} title="API connection status">
        <div className="grid grid-cols-2 gap-3">
          <StatusRow label="Helius (Solana)" ok={status?.configured.helius} />
          <StatusRow label="Alchemy (Ethereum)" ok={status?.configured.alchemy} />
          <StatusRow label="Blockstream (Bitcoin)" ok={true} note="No key required" />
          <StatusRow label="Blockchair (Litecoin)" ok={status?.configured.blockchair} note="Key optional" />
        </div>
      </Section>

      <Section icon={Database} title="Database connection">
        <StatusRow label="Supabase" ok={status?.database.connected} note={status?.database.error ?? undefined} />
      </Section>

      <div className="text-xs text-vault-500 pb-8">
        Currency display: EUR (fixed). API keys are configured via server-side environment variables only — see{' '}
        <code className="text-vault-400">.env.example</code> and the README for setup instructions.
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="panel panel-noise p-6 space-y-4">
      <div className="flex items-center gap-2 text-vault-100 font-medium">
        <Icon className="w-4 h-4 text-brass-400" /> {title}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm text-vault-200">{label}</div>
        {description && <div className="text-xs text-vault-500 mt-0.5">{description}</div>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-9 h-5 bg-vault-700 rounded-full peer-checked:bg-emerald-500/70 transition-colors" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-vault-200 rounded-full peer-checked:translate-x-4 transition-transform" />
      </label>
    </div>
  );
}

function NumberField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-vault-200">{label}</label>
      <input
        type="number"
        min={0}
        defaultValue={value}
        onBlur={(e) => onCommit(parseInt(e.target.value, 10) || 0)}
        className="w-24 bg-vault-850 border border-vault-700 rounded-lg px-3 py-1.5 text-sm text-vault-100 outline-none focus:border-brass-500/60"
      />
    </div>
  );
}

function StatusRow({ label, ok, note }: { label: string; ok?: boolean; note?: string }) {
  return (
    <div className="flex items-center justify-between bg-vault-850/60 rounded-lg px-3 py-2.5">
      <div>
        <div className="text-sm text-vault-200">{label}</div>
        {note && <div className="text-xs text-vault-500 mt-0.5">{note}</div>}
      </div>
      <span className={`status-dot ${ok ? 'online' : 'offline'}`} />
    </div>
  );
}

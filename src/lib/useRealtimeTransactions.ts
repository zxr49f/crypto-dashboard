'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

/**
 * Subscribes to Supabase Realtime for new rows in `transactions` and
 * `notifications`. When a new transaction arrives, shows an in-app toast,
 * fires a browser notification (if permission was granted), plays a sound
 * (if enabled), and invokes the caller's `onNewTransaction` so the page
 * can refresh its data — all without a full page reload.
 */
export function useRealtimeTransactions(onNewTransaction: () => void) {
  const { push } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      return; // Supabase env vars not configured yet — skip realtime silently.
    }

    const channel = supabase
      .channel('public:transactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, async (payload) => {
        const tx = payload.new as any;

        push({
          title: `New ${tx.cryptocurrency} payment received`,
          description: `${Number(tx.amount).toFixed(6)} ${tx.cryptocurrency} · €${Number(tx.eur_value_at_detection).toFixed(2)}`,
          variant: 'payment',
        });

        maybeNotifyBrowser(tx);
        maybePlaySound(audioRef);
        onNewTransaction();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function maybeNotifyBrowser(tx: any) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const enabled = localStorage.getItem('vault:browser_notifications') !== 'false';
  if (!enabled) return;

  new Notification('💰 New payment received', {
    body: `${Number(tx.amount).toFixed(6)} ${tx.cryptocurrency} · €${Number(tx.eur_value_at_detection).toFixed(2)}`,
    icon: '/icon.png',
  });
}

function maybePlaySound(audioRef: React.MutableRefObject<HTMLAudioElement | null>) {
  if (typeof window === 'undefined') return;
  const enabled = localStorage.getItem('vault:sound_notifications') !== 'false';
  if (!enabled) return;

  try {
    if (!audioRef.current) {
      audioRef.current = new Audio(
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      );
    }
    audioRef.current.currentTime = 0;
    void audioRef.current.play();
  } catch {
    // Autoplay restrictions may block this until the user interacts with
    // the page at least once — that's fine, it's a non-critical nicety.
  }
}

/** Requests browser notification permission — call from a user gesture. */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

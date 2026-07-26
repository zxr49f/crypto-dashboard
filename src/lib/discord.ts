import 'server-only';
import { DetectedPayment } from '@/types';
import { getExplorerTxUrl } from '@/lib/explorers';

function shorten(addr: string | null): string {
  if (!addr) return 'Unknown';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Sends a Discord webhook notification for a detected payment.
 * The webhook URL is read from the server-side environment variable only
 * (or the settings table, populated server-side) and is never sent to,
 * or requested from, the browser.
 */
export async function sendDiscordPaymentNotification(
  payment: DetectedPayment,
  walletName: string,
  eurValue: number,
  webhookUrl: string
): Promise<void> {
  if (!webhookUrl) return;

  const statusEmoji =
    payment.status === 'confirmed' ? '✅' : payment.status === 'confirming' ? '⏳' : payment.status === 'failed' ? '❌' : '🕐';

  const embed = {
    title: '💰 New Payment Received',
    color: 0xe8b23f,
    fields: [
      { name: 'Coin', value: payment.cryptocurrency, inline: true },
      { name: 'Amount', value: `${payment.amount.toFixed(6)} ${payment.cryptocurrency}`, inline: true },
      { name: 'Value', value: `€${eurValue.toFixed(2)}`, inline: true },
      { name: 'Wallet', value: walletName, inline: true },
      { name: 'Sender', value: shorten(payment.sender_address), inline: true },
      { name: 'Status', value: `${statusEmoji} ${payment.status}`, inline: true },
      { name: 'Transaction', value: `[${shorten(payment.tx_hash)}](${getExplorerTxUrl(payment.blockchain, payment.tx_hash)})` },
    ],
    timestamp: payment.tx_timestamp,
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      console.error(`Discord webhook responded with ${res.status}`);
    }
  } catch (err) {
    // Never let a failed Discord notification break payment detection.
    console.error('Failed to send Discord webhook notification:', err);
  }
}

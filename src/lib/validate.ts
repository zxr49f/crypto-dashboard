import { Blockchain } from '@/types';

const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ETHEREUM_RE = /^0x[a-fA-F0-9]{40}$/;
// Bitcoin: legacy (1...), P2SH (3...), bech32 (bc1...)
const BITCOIN_RE = /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{25,90})$/;
// Litecoin: legacy (L...), P2SH (M... or 3...), bech32 (ltc1...)
const LITECOIN_RE = /^(L[a-km-zA-HJ-NP-Z1-9]{26,34}|M[a-km-zA-HJ-NP-Z1-9]{26,34}|ltc1[a-z0-9]{25,90})$/;

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates that a string is a well-formed PUBLIC address for the given
 * blockchain. This function also actively rejects input that resembles a
 * private key or BIP-39 seed phrase, as an extra safety net on top of the
 * fact that we never ask for or store such material anywhere in this app.
 */
export function validateWalletAddress(blockchain: Blockchain, address: string): ValidationResult {
  const trimmed = address.trim();

  if (!trimmed) return { valid: false, reason: 'Address is required.' };

  // Reject anything that looks like a BIP-39 seed phrase (12/15/18/21/24
  // space-separated words) regardless of which blockchain was selected.
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount >= 11) {
    return {
      valid: false,
      reason:
        'This looks like a seed phrase, not a public address. This app never stores seed phrases or private keys — only public addresses.',
    };
  }

  // Reject common private-key formats (64-char hex, or WIF-looking strings
  // starting with 5/K/L that are the right length for a Bitcoin WIF key).
  if (/^(0x)?[a-fA-F0-9]{64}$/.test(trimmed)) {
    return {
      valid: false,
      reason: 'This looks like a private key, not a public address. Private keys are never accepted.',
    };
  }
  if (blockchain === 'bitcoin' && /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(trimmed)) {
    return {
      valid: false,
      reason: 'This looks like a WIF private key, not a public address. Private keys are never accepted.',
    };
  }

  switch (blockchain) {
    case 'solana':
      return SOLANA_RE.test(trimmed)
        ? { valid: true }
        : { valid: false, reason: 'Not a valid Solana public address.' };
    case 'ethereum':
      return ETHEREUM_RE.test(trimmed)
        ? { valid: true }
        : { valid: false, reason: 'Not a valid Ethereum address (expected 0x + 40 hex chars).' };
    case 'bitcoin':
      return BITCOIN_RE.test(trimmed)
        ? { valid: true }
        : { valid: false, reason: 'Not a valid Bitcoin address (legacy, P2SH, or bech32).' };
    case 'litecoin':
      return LITECOIN_RE.test(trimmed)
        ? { valid: true }
        : { valid: false, reason: 'Not a valid Litecoin address (legacy, P2SH, or bech32).' };
    default:
      return { valid: false, reason: 'Unsupported blockchain.' };
  }
}

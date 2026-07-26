import { DetectedPayment } from '@/types';

/**
 * Every chain-specific client implements this interface so the sync
 * routes (src/app/api/sync/*) can treat all four chains uniformly.
 */
export interface ChainClient {
  /**
   * Fetches incoming payments to `address` that have not been seen
   * before, given the hash of the last-known transaction (if any).
   * Implementations should be safe to call repeatedly (polling) and
   * must not throw on a temporary upstream outage — instead they
   * should throw a ChainUnavailableError so the caller can mark the
   * chain as degraded without crashing the whole sync cycle.
   */
  fetchIncomingPayments(address: string, lastSeenTxHash: string | null): Promise<DetectedPayment[]>;
}

export class ChainUnavailableError extends Error {
  constructor(public chain: string, message: string) {
    super(message);
    this.name = 'ChainUnavailableError';
  }
}

import 'server-only';
import { Cryptocurrency } from '@/types';

const COINGECKO_IDS: Record<Cryptocurrency, string> = {
  SOL: 'solana',
  ETH: 'ethereum',
  BTC: 'bitcoin',
  LTC: 'litecoin',
};

const CACHE_TTL_MS = 60_000; // 1 minute — respects CoinGecko free-tier rate limits

interface CacheEntry {
  price: number;
  fetchedAt: number;
}

const priceCache = new Map<Cryptocurrency, CacheEntry>();

/**
 * Fetches the current EUR price for a cryptocurrency from CoinGecko,
 * using a short-lived in-memory cache so repeated calls during a single
 * sync cycle (or from multiple dashboard requests) don't hammer the API
 * and trip rate limits.
 */
export async function getEurPrice(symbol: Cryptocurrency): Promise<number> {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.price;
  }

  const id = COINGECKO_IDS[symbol];
  const apiKey = process.env.COINGECKO_API_KEY;
  const base = apiKey
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3';

  const url = `${base}/simple/price?ids=${id}&vs_currencies=eur`;

  try {
    const res = await fetch(url, {
      headers: apiKey ? { 'x-cg-pro-api-key': apiKey } : {},
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      if (res.status === 429) {
        console.error(`CoinGecko rate limit hit for ${symbol}; serving last known price if available.`);
      } else {
        console.error(`CoinGecko error ${res.status} for ${symbol}`);
      }
      // Fall back to stale cache rather than throwing, so a transient
      // price-API outage never blocks transaction detection.
      if (cached) return cached.price;
      throw new Error(`Unable to fetch EUR price for ${symbol} and no cached price available.`);
    }

    const data = await res.json();
    const price = data?.[id]?.eur;

    if (typeof price !== 'number') {
      if (cached) return cached.price;
      throw new Error(`CoinGecko returned no EUR price for ${symbol}.`);
    }

    priceCache.set(symbol, { price, fetchedAt: Date.now() });
    return price;
  } catch (err) {
    if (cached) return cached.price;
    throw err;
  }
}

/** Fetches EUR prices for all four supported currencies in one batched call. */
export async function getAllEurPrices(): Promise<Record<Cryptocurrency, number>> {
  const ids = Object.values(COINGECKO_IDS).join(',');
  const apiKey = process.env.COINGECKO_API_KEY;
  const base = apiKey ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';
  const url = `${base}/simple/price?ids=${ids}&vs_currencies=eur`;

  const result: Partial<Record<Cryptocurrency, number>> = {};

  try {
    const res = await fetch(url, {
      headers: apiKey ? { 'x-cg-pro-api-key': apiKey } : {},
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      for (const [symbol, id] of Object.entries(COINGECKO_IDS) as [Cryptocurrency, string][]) {
        const price = data?.[id]?.eur;
        if (typeof price === 'number') {
          result[symbol] = price;
          priceCache.set(symbol, { price, fetchedAt: Date.now() });
        }
      }
    }
  } catch (err) {
    console.error('Batched CoinGecko price fetch failed:', err);
  }

  // Fill in any gaps from cache (or 0 as last resort) so the caller always
  // gets a complete map even during a partial outage.
  for (const symbol of Object.keys(COINGECKO_IDS) as Cryptocurrency[]) {
    if (result[symbol] === undefined) {
      const cached = priceCache.get(symbol);
      result[symbol] = cached?.price ?? 0;
    }
  }

  return result as Record<Cryptocurrency, number>;
}

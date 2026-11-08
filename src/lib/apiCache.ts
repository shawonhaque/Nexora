/**
 * Caching fetch layer for the public APIs.
 *
 * Responsibilities:
 *  - one in-flight request per URL, so several components mounting at once do
 *    not fire duplicate calls
 *  - a TTL cache in sessionStorage, so a refresh does not hammer rate limits
 *  - a per-host minimum interval, because the free APIs used here are
 *    rate-limited and a burst will get the whole origin blocked
 *  - honest errors: a failed request returns a message, never stale-looking
 *    fake data
 *
 * Nothing here fabricates a response. If the network fails, the caller is told.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const STORAGE_PREFIX = 'nexora-cache:';
const inflight = new Map<string, Promise<unknown>>();
const lastCallByHost = new Map<string, number>();

/** Minimum gap between calls to the same host. */
const HOST_INTERVAL_MS: Record<string, number> = {
  'hn.algolia.com': 400,
  'hacker-news.firebaseio.com': 200,
  'huggingface.co': 800,
  'api.github.com': 1200,
  'en.wikipedia.org': 300,
};
const DEFAULT_HOST_INTERVAL_MS = 250;

interface CacheEntry<T> {
  value: T;
  storedAt: number;
}

function readCache<T>(key: string, ttl: number): { value: T; age: number } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    const age = Date.now() - entry.storedAt;
    if (age > ttl) return null;
    return { value: entry.value, age };
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ value, storedAt: Date.now() } satisfies CacheEntry<T>));
  } catch {
    /* storage may be full or unavailable; the in-memory result still works */
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'unknown';
  }
}

/** Serialises calls per host so we stay inside the documented rate limits. */
async function respectHostRate(url: string): Promise<void> {
  const host = hostOf(url);
  const interval = HOST_INTERVAL_MS[host] ?? DEFAULT_HOST_INTERVAL_MS;
  const now = Date.now();
  const last = lastCallByHost.get(host) ?? 0;
  const wait = last + interval - now;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCallByHost.set(host, Date.now());
}

export class ApiError extends Error {
  constructor(message: string, readonly status?: number, readonly retryable = false) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface CachedFetchOptions {
  /** How long a cached value stays usable. */
  ttlMs?: number;
  /** Force a network call even when a cached value exists. */
  force?: boolean;
  timeoutMs?: number;
}

/**
 * Fetches JSON with caching, de-duplication and rate limiting.
 *
 * `key` identifies the logical resource; `url` is what is actually requested.
 */
export async function cachedJson<T>(
  key: string,
  url: string,
  options: CachedFetchOptions = {}
): Promise<{ value: T; fromCache: boolean; ageMs: number }> {
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;

  if (!options.force) {
    const cached = readCache<T>(key, ttl);
    if (cached) return { value: cached.value, fromCache: true, ageMs: cached.age };
  }

  const existing = inflight.get(key);
  if (existing) {
    const value = (await existing) as T;
    return { value, fromCache: false, ageMs: 0 };
  }

  const task = (async () => {
    await respectHostRate(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });

      if (response.status === 429) {
        throw new ApiError('Rate limit reached. Try again in a few minutes.', 429, true);
      }
      if (response.status === 403) {
        throw new ApiError('This source declined the request.', 403, false);
      }
      if (!response.ok) {
        throw new ApiError(`Source returned ${response.status}.`, response.status, response.status >= 500);
      }

      const value = (await response.json()) as T;
      writeCache(key, value);
      return value;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('The request timed out.', undefined, true);
      }
      throw new ApiError('Could not reach the source. Check your connection.', undefined, true);
    } finally {
      clearTimeout(timer);
    }
  })();

  inflight.set(key, task);
  try {
    const value = (await task) as T;
    return { value, fromCache: false, ageMs: 0 };
  } finally {
    inflight.delete(key);
  }
}

/** Age of a cached entry in ms, or null when absent. */
export function cacheAge(key: string): number | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return Date.now() - (JSON.parse(raw) as CacheEntry<unknown>).storedAt;
  } catch {
    return null;
  }
}

/** Drops every cached entry, used by the global "refresh everything" action. */
export function clearApiCache(): void {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    /* nothing to clear */
  }
}

// High-speed in-memory TTL response cache for read-heavy API routes
// Drastically speeds up page loading by avoiding repetitive MongoDB Atlas roundtrips

const store = new Map();

/**
 * Retrieves data from cache or computes it using fetcher function.
 * @param {string} key - Unique cache key
 * @param {number} ttlMs - Time to live in milliseconds
 * @param {Function} fetcher - Async function to fetch data if cache misses
 */
export async function getCached(key, ttlMs, fetcher) {
  const now = Date.now();
  const cached = store.get(key);

  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }

  const freshData = await fetcher();
  store.set(key, { data: freshData, timestamp: now });
  return freshData;
}

/**
 * Invalidates cache entries matching a prefix or all entries.
 * @param {string} [prefix] - Prefix pattern to match (e.g. 'projects', 'roles')
 */
export function invalidateCache(prefix) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

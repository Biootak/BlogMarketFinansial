import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
  max: 500, // Maximum size of cache
  ttl: 1000 * 60 * 60, // Items live for 1 hour
});

export function getFromCache<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setInCache<T>(key: string, value: T): void {
  cache.set(key, value);
}

export function clearCache(): void {
  cache.clear();
}

export default cache;

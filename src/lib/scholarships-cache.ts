// src/lib/scholarships-cache.ts

import type { Scholarship } from '@/lib/types';

interface CacheEntry {
  data: Scholarship[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let _cache: CacheEntry | null = null;

export const scholarshipsCache = {
  get(): Scholarship[] | null {
    if (!_cache) return null;
    if (Date.now() - _cache.fetchedAt > CACHE_TTL_MS) {
      _cache = null;
      return null;
    }
    return _cache.data;
  },

  set(data: Scholarship[]): void {
    _cache = { data, fetchedAt: Date.now() };
  },

  invalidate(): void {
    _cache = null;
  },

  isStale(): boolean {
    if (!_cache) return true;
    return Date.now() - _cache.fetchedAt > CACHE_TTL_MS;
  },
};

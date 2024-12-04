import { cache } from '@/utils/cache';

let isCacheEnabled = true;

export const getCacheStatus = () => isCacheEnabled;

export const setCacheStatus = (status: boolean) => {
  isCacheEnabled = status;
  if (!status) {
    // Clear all cache when disabled
    cache.clear();
  }
};

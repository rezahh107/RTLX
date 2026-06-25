import { hasStorageArea, storageSetAccessLevel, type StorageAreaName } from '../shared/api-adapter';

export interface StorageAccessResult {
  area: StorageAreaName;
  status: 'applied' | 'unsupported' | 'failed';
  error: string | null;
}

export async function restrictStorageToTrustedContexts(): Promise<readonly StorageAccessResult[]> {
  const results: StorageAccessResult[] = [];
  for (const area of ['local', 'sync', 'session'] as const) {
    if (!hasStorageArea(area)) {
      results.push(Object.freeze({ area, status: 'unsupported', error: null }));
      continue;
    }
    try {
      const status = await storageSetAccessLevel(area, 'TRUSTED_CONTEXTS');
      results.push(Object.freeze({ area, status, error: null }));
    } catch (error) {
      results.push(
        Object.freeze({
          area,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown storage access error',
        })
      );
    }
  }
  return Object.freeze(results);
}

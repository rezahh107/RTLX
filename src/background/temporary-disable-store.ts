import { storageGet } from '../shared/api-adapter';
import { runStorageTransaction } from './storage-transaction';

interface TemporaryDisableRecord {
  until: string;
  reason: 'user' | 'automatic';
}

function key(hostname: string): string {
  return `rtlx:temporary-disable:${hostname.toLowerCase()}`;
}

export async function getTemporaryDisable(hostname: string): Promise<string | null> {
  const storageKey = key(hostname);
  const record = await storageGet<TemporaryDisableRecord>('local', storageKey);
  if (!record || Number.isNaN(Date.parse(record.until))) return null;
  if (Date.parse(record.until) <= Date.now()) {
    await runStorageTransaction({ kind: 'expire-temporary-disable', removeKeys: [storageKey] });
    return null;
  }
  return record.until;
}

export async function setTemporaryDisable(
  hostname: string,
  minutes: number,
  reason: TemporaryDisableRecord['reason'] = 'user'
): Promise<string> {
  const boundedMinutes = Math.max(1, Math.min(60, Math.trunc(minutes)));
  const until = new Date(Date.now() + boundedMinutes * 60_000).toISOString();
  await runStorageTransaction({
    kind: 'set-temporary-disable',
    setItems: { [key(hostname)]: { until, reason } },
  });
  return until;
}

export async function resetTemporaryDisable(hostname: string): Promise<void> {
  await runStorageTransaction({
    kind: 'reset-temporary-disable',
    removeKeys: [key(hostname)],
  });
}

import { PROFILE_UPDATE_ALARM } from '../shared/constants';
import { alarmMissed, readAlarmLease } from './alarm-lease';

const PERIOD_MINUTES = 24 * 60;
const PERIOD_MS = PERIOD_MINUTES * 60_000;

export async function ensureProfileAlarm(enabled: boolean): Promise<void> {
  const existing = await getAlarm(PROFILE_UPDATE_ALARM);
  if (!enabled) {
    if (existing) await clearAlarm(PROFILE_UPDATE_ALARM);
    return;
  }
  const state = await readAlarmLease(PROFILE_UPDATE_ALARM);
  const missed = alarmMissed(state, PERIOD_MS);
  if (!existing || missed)
    await createAlarm(PROFILE_UPDATE_ALARM, {
      delayInMinutes: missed ? 1 : PERIOD_MINUTES,
      periodInMinutes: PERIOD_MINUTES,
    });
}

function getAlarm(name: string): Promise<chrome.alarms.Alarm | undefined> {
  return new Promise((resolve, reject) =>
    chrome.alarms.get(name, (alarm) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(alarm);
    })
  );
}

function clearAlarm(name: string): Promise<void> {
  return new Promise((resolve, reject) =>
    chrome.alarms.clear(name, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    })
  );
}

function createAlarm(name: string, info: chrome.alarms.AlarmCreateInfo): Promise<void> {
  try {
    const result = chrome.alarms.create(name, info);
    return result instanceof Promise ? result : Promise.resolve();
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

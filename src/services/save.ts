import AsyncStorage from '@react-native-async-storage/async-storage';

import { cloudGet, cloudSet } from './cloud';

/** The game's own storage: key -> JSON text, exactly as game/index.html reads and writes it. */
export type Save = Record<string, string>;

const KEY = 'save.v1';

function parse(raw: string | null): Save | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    return s && typeof s === 'object' ? (s as Save) : null;
  } catch {
    return null;
  }
}

/** How far a save got: stones climbed across all mountains, then levels cleared. */
export function progress(s: Save): number {
  try {
    const p = JSON.parse(s.prog ?? 'null') as { m: number; s: number } | null;
    const clears = Number(JSON.parse(s.clears ?? '0')) || 0;
    return (p ? p.m * 10 + p.s : 0) * 1e6 + clears;
  } catch {
    return 0;
  }
}

/** The save that got further wins, so a fresh install never wipes progress kept in iCloud. */
export function pick(local: Save | null, cloud: Save | null): Save {
  if (!local) return cloud ?? {};
  if (!cloud) return local;
  return progress(cloud) > progress(local) ? cloud : local;
}

export async function loadSave(): Promise<Save> {
  const local = parse(await AsyncStorage.getItem(KEY).catch(() => null));
  return pick(local, parse(cloudGet(KEY)));
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Saves on the phone and in iCloud (Apple ID), a moment after the last change. */
export function writeSave(s: Save) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const raw = JSON.stringify(s);
    AsyncStorage.setItem(KEY, raw).catch(() => {});
    const cur = parse(cloudGet(KEY));
    if (!cur || progress(cur) <= progress(s)) cloudSet(KEY, raw);
  }, 400);
}

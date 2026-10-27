import { requireOptionalNativeModule } from 'expo';

// iCloud key-value storage, from modules/cloud-save. Missing on Android, where these do nothing.
type Native = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  isAvailable(): boolean;
  addListener(event: 'onChange', fn: () => void): { remove(): void };
};

const native = requireOptionalNativeModule<Native>('CloudSave');

export function cloudGet(key: string): string | null {
  try {
    return native?.get(key) ?? null;
  } catch {
    return null;
  }
}

/** Whether saves reach iCloud on this phone. Always false on Android. */
export function cloudOn(): boolean {
  try {
    return native?.isAvailable() ?? false;
  } catch {
    return false;
  }
}

export function cloudSet(key: string, value: string) {
  try {
    native?.set(key, value);
  } catch {
    // iCloud off or full: the copy on the phone still holds.
  }
}

/** Called when iCloud brings in a change from another device, or the first download after a reinstall. */
export function onCloudChange(fn: () => void): () => void {
  const sub = native?.addListener('onChange', fn);
  return () => sub?.remove();
}

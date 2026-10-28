import { getCrashlytics, log, recordError, setAttribute } from '@react-native-firebase/crashlytics';
import * as Updates from 'expo-updates';

// Firebase Crashlytics: native crashes and uncaught JS errors are sent on their own (next launch).
// This file adds what it can't see: errors inside the game's WebView, and the WebView being killed.
// No names or ad ID. Reporting never blocks or breaks the game.

let sent = 0;
const seen = new Set<string>();

/** Tags reports with the OTA update so a crash can be tied to the code that was running. */
export function startCrashReports(): void {
  if (__DEV__) return;
  try {
    setAttribute(getCrashlytics(), 'update', Updates.updateId ?? 'embedded').catch(() => {});
  } catch {
    // No native Firebase in this build.
  }
}

/** Records one non-fatal error. The same message is sent once per launch, at most 20 a launch. */
export function reportError(kind: string, message: string, stack?: string): void {
  if (__DEV__ || sent >= 20 || seen.has(kind + message)) return;
  seen.add(kind + message);
  sent++;
  try {
    const e = new Error(message.slice(0, 500));
    e.name = kind;
    if (stack) e.stack = `${kind}: ${message}\n${stack}`.slice(0, 4000);
    recordError(getCrashlytics(), e, kind);
  } catch {
    // No native Firebase in this build.
  }
}

/** A short breadcrumb that shows up with the next report. */
export function note(message: string): void {
  if (__DEV__) return;
  try {
    log(getCrashlytics(), message);
  } catch {
    // No native Firebase in this build.
  }
}

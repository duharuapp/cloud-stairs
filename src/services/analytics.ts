import { getAnalytics, logEvent } from '@react-native-firebase/analytics';

// Firebase Analytics: anonymous events to see how far players get. No ad ID (see firebase.json and
// the withoutAdIdSupport plugin option), no names. Sending never blocks or breaks the game.

type Params = Record<string, number | string>;

/** Sends one event. Does nothing in development, in Expo Go, or when Firebase is not set up. */
export function sendEvent(name: string, params?: Params): void {
  if (__DEV__) return;
  try {
    Promise.resolve(logEvent(getAnalytics(), name, params)).catch(() => {});
  } catch {
    // No native Firebase in this build.
  }
}

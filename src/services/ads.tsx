import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import mobileAds, {
  AdsConsent,
  BannerAd,
  BannerAdSize,
  TestIds,
  useInterstitialAd,
  useRewardedAd,
} from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

import { t } from '../i18n';

// Fill these from the AdMob console (Apps > Ad units), and the app ID in app.json. Until all three IDs of a
// platform are in, it shows test ads, and debug builds always do. Clicking real ads in your own app can get
// the AdMob account suspended.
const REAL_UNITS = {
  banner: Platform.select({ ios: 'ca-app-pub-1360445328557534/6055439662', android: '' }) ?? '',
  interstitial: Platform.select({ ios: 'ca-app-pub-1360445328557534/2510946326', android: '' }) ?? '',
  rewarded: Platform.select({ ios: 'ca-app-pub-1360445328557534/1169732469', android: '' }) ?? '',
};
// Builds for our own phones force test ads: EXPO_PUBLIC_TEST_ADS=1 npx expo run:ios --device --configuration Release.
// Never set for store builds (scripts/store-guard.js stops them).
const USE_TEST_ADS =
  !REAL_UNITS.banner || !REAL_UNITS.interstitial || !REAL_UNITS.rewarded || process.env.EXPO_PUBLIC_TEST_ADS === '1';

const UNITS =
  USE_TEST_ADS || __DEV__
    ? { banner: TestIds.ADAPTIVE_BANNER, interstitial: TestIds.INTERSTITIAL, rewarded: TestIds.REWARDED }
    : REAL_UNITS;

export type AdKind = 'rewarded' | 'interstitial';

type AdsApi = {
  ready: boolean;
  /** Plays an ad full screen. Resolves when it closes: `ok` is true when a rewarded ad was watched to the end. */
  show: (kind: AdKind) => Promise<{ ok: boolean }>;
};

const AdsContext = createContext<AdsApi>({ ready: false, show: async () => ({ ok: false }) });
export const useAds = () => useContext(AdsContext);

export function AdsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Consent (EU and some US states) must be settled before the SDK starts and requests ads.
    (async () => {
      try {
        await AdsConsent.gatherConsent();
      } catch {
        // The form failing to load is fine; ads may still be allowed from an earlier answer.
      }
      if (Platform.OS === 'ios') {
        // Apple's tracking question comes after the consent form. Saying no still shows ads, just not personalized.
        await requestTrackingPermissionsAsync().catch(() => {});
      }
      try {
        const info = await AdsConsent.getConsentInfo();
        if (!info.canRequestAds) return;
        await mobileAds().initialize();
        setReady(true);
      } catch {
        // No ads this session. The game works the same without them.
      }
    })();
  }, []);

  const rewarded = useRewardedAd({ adUnitId: UNITS.rewarded, autoLoad: ready });
  const interstitial = useInterstitialAd({ adUnitId: UNITS.interstitial, autoLoad: ready });
  // The game waits on this until the ad closes.
  const pending = useRef<{ kind: AdKind; done: (r: { ok: boolean }) => void } | null>(null);

  useEffect(() => {
    if (rewarded.status !== 'closed') return;
    const p = pending.current;
    if (p?.kind === 'rewarded') {
      pending.current = null;
      p.done({ ok: rewarded.earnedReward });
    }
    rewarded.load();
  }, [rewarded.status, rewarded.earnedReward, rewarded.load]);

  useEffect(() => {
    if (interstitial.status !== 'closed') return;
    const p = pending.current;
    if (p?.kind === 'interstitial') {
      pending.current = null;
      p.done({ ok: true });
    }
    interstitial.load();
  }, [interstitial.status, interstitial.load]);

  const show = useCallback(
    (kind: AdKind) =>
      new Promise<{ ok: boolean }>((done) => {
        const ad = kind === 'rewarded' ? rewarded : interstitial;
        if (ad.status === 'loaded') {
          pending.current = { kind, done };
          ad.show();
          return;
        }
        if (ready && (ad.status === 'error' || ad.status === 'no-fill' || ad.status === 'idle')) ad.load();
        // No interstitial ready: just carry on. A rewarded one was asked for, so say why nothing happened.
        if (kind === 'rewarded') Alert.alert(t.adLoadingTitle, t.adLoadingBody);
        done({ ok: false });
      }),
    [rewarded, interstitial, ready],
  );

  return <AdsContext.Provider value={{ ready, show }}>{children}</AdsContext.Provider>;
}

/** Bottom banner under the game. Renders nothing after the player buys ad removal. */
export function BottomBanner({ hidden }: { hidden: boolean }) {
  const { ready } = useAds();
  const [failed, setFailed] = useState(false);
  if (hidden) return null;
  return (
    <View style={styles.banner}>
      {ready && !failed && (
        <BannerAd
          unitId={UNITS.banner}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdFailedToLoad={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { minHeight: 50, alignItems: 'center', justifyContent: 'center' },
});

import * as Haptics from 'expo-haptics';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import type { ComponentType, Ref } from 'react';

import GAME_HTML from './src/game/html';
import { t } from './src/i18n';
import { AdsProvider, BottomBanner, useAds, type AdKind } from './src/services/ads';
import { sendEvent } from './src/services/analytics';
import { note, reportError, startCrashReports } from './src/services/crash';
import { loadSave, writeSave, type Save } from './src/services/save';
import { PRODUCTS, useStore, type Sku } from './src/services/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

// The library's types leave out the ref it forwards; this is the part of it the app uses.
type GameView = { injectJavaScript: (js: string) => void };
const GameWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<GameView> }>;

// Runs in the page before the game: sends the game's uncaught errors to the app for Crashlytics.
const CATCH_ERRORS = `(function(){
  function send(msg, stack){ try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', msg: String(msg), stack: stack ? String(stack) : '' })); } catch (_) {} }
  window.addEventListener('error', function(e){ send(e.message + ' @' + e.lineno + ':' + e.colno, e.error && e.error.stack); });
  window.addEventListener('unhandledrejection', function(e){ var r = e.reason; send(r && r.message ? r.message : r, r && r.stack); });
})();`;

/** What game/index.html sends through window.ReactNativeWebView.postMessage. */
type Msg =
  | { type: 'save'; k: string; v: string }
  | { type: 'banner'; on: boolean }
  | { type: 'buzz'; ms: number }
  | { type: 'track'; name: string; p: Record<string, number | string> }
  | { type: 'error'; msg: string; stack: string }
  | { id: number; type: 'ad'; kind: AdKind }
  | { id: number; type: 'buy'; sku: Sku }
  | { id: number; type: 'restore' };

export default function App() {
  const [save, setSave] = useState<Save | null>(null);
  useEffect(() => {
    startCrashReports();
    loadSave().then(setSave);
  }, []);
  if (!save) return null;
  return (
    <SafeAreaProvider>
      <AdsProvider>
        <Game initial={save} />
      </AdsProvider>
    </SafeAreaProvider>
  );
}

function Game({ initial }: { initial: Save }) {
  const web = useRef<GameView>(null);
  const save = useRef<Save>({ ...initial });
  const [banner, setBanner] = useState(initial.noads !== 'true');
  // Bumped when the system kills the WebView, which would leave a blank screen; the new one gets the latest save.
  const [life, setLife] = useState(0);
  const ads = useAds();

  const run = (js: string) => web.current?.injectJavaScript(js + ';true;');
  const reply = (id: number, r: object) => run(`window.__nativeReply(${id}, ${JSON.stringify(r)})`);

  const store = useStore({
    onPrices: useCallback((p) => run(`window.__setPrices && window.__setPrices(${JSON.stringify(p)})`), []),
    onUnclaimed: useCallback((sku: Sku) => run(`window.__grant && window.__grant(${JSON.stringify(sku)})`), []),
    onNoAds: useCallback(() => {
      if (save.current.noads !== 'true') run(`window.__grant && window.__grant("noads")`);
    }, []),
    onError: useCallback(() => Alert.alert('', t.buyFailed), []),
  });

  // Write the last change straight away when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') writeSave(save.current);
    });
    return () => sub.remove();
  }, []);

  const onMessage = async (e: WebViewMessageEvent) => {
    let m: Msg;
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    switch (m.type) {
      case 'save':
        save.current[m.k] = m.v;
        writeSave(save.current);
        break;
      case 'banner':
        setBanner(m.on);
        break;
      case 'buzz':
        Haptics.impactAsync(m.ms >= 40 ? Haptics.ImpactFeedbackStyle.Heavy : m.ms >= 15 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        break;
      case 'track':
        sendEvent(m.name, m.p);
        break;
      case 'error':
        reportError('GameError', m.msg, m.stack);
        break;
      case 'ad':
        note(`ad ${m.kind}`);
        reply(m.id, await ads.show(m.kind));
        break;
      case 'buy':
        note(`buy ${m.sku}`);
        reply(m.id, { ok: m.sku in PRODUCTS ? await store.buy(m.sku) : false });
        break;
      case 'restore':
        try {
          const noads = await store.restore();
          if (!noads) Alert.alert('', t.restoreNone);
          reply(m.id, { noads });
        } catch {
          Alert.alert('', t.restoreFailed);
          reply(m.id, { noads: false });
        }
        break;
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <GameWebView
        key={life}
        ref={web}
        style={styles.web}
        source={{ html: GAME_HTML, baseUrl: 'https://game.local/' }}
        originWhitelist={['*']}
        injectedJavaScriptBeforeContentLoaded={`window.__save = ${JSON.stringify(save.current)};${CATCH_ERRORS}true;`}
        onMessage={onMessage}
        onContentProcessDidTerminate={() => {
          reportError('WebViewKilled', 'iOS ended the game page');
          setLife((n) => n + 1);
        }}
        onRenderProcessGone={() => {
          reportError('WebViewKilled', 'Android ended the game page');
          setLife((n) => n + 1);
        }}
        onLoadEnd={() => SplashScreen.hideAsync().catch(() => {})}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsLinkPreview={false}
        textInteractionEnabled={false}
        setSupportMultipleWindows={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        // The game is one page; nothing should ever navigate it away.
        onShouldStartLoadWithRequest={(r: { url: string }) => r.url.startsWith('https://game.local') || r.url === 'about:blank'}
      />
      {banner && (
        <SafeAreaView edges={['bottom']} style={styles.bannerBar}>
          <BottomBanner hidden={false} />
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#8fd3ff' },
  web: { flex: 1, backgroundColor: 'transparent' },
  bannerBar: { backgroundColor: '#2b3140' },
});

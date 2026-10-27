import { getAvailablePurchases as fetchOwnedPurchases, isUserCancelledError, useIAP, type Purchase } from 'expo-iap';
import { useCallback, useEffect, useRef } from 'react';

// Product IDs in App Store Connect and Play Console. The game names them by the short key.
const PREFIX = 'com.duharuapp.hoppeak.';
export const PRODUCTS = {
  coins1000: 'consumable',
  coins3000: 'consumable',
  coins9000: 'consumable',
  coins20000: 'consumable',
  noads: 'lifetime',
} as const;
export type Sku = keyof typeof PRODUCTS;

const ALL = Object.keys(PRODUCTS).map((k) => PREFIX + k);
const short = (productId: string) => (productId.startsWith(PREFIX) ? (productId.slice(PREFIX.length) as Sku) : null);

/**
 * Coin packs and remove-ads. The game gives the coins; a purchase is finished with the store only after that,
 * so an app closed mid-purchase gets it again on the next start (through `onUnclaimed`).
 */
export function useStore({
  onPrices,
  onUnclaimed,
  onNoAds,
  onError,
}: {
  /** Localized prices by short key, once the store has them. */
  onPrices: (prices: Partial<Record<Sku, string>>) => void;
  /** A paid purchase nothing in the game was waiting for. */
  onUnclaimed: (sku: Sku) => void;
  /** Remove-ads found on this Apple ID (restore or reinstall). */
  onNoAds: () => void;
  onError: () => void;
}) {
  const waiting = useRef<{ sku: Sku; done: (ok: boolean) => void } | null>(null);

  const { connected, products, availablePurchases, fetchProducts, getAvailablePurchases, requestPurchase, finishTransaction, restorePurchases } =
    useIAP({
      onPurchaseSuccess: async (purchase: Purchase) => {
        const sku = short(purchase.productId);
        if (!sku) return;
        const w = waiting.current;
        if (w && w.sku === sku) {
          waiting.current = null;
          w.done(true);
        } else onUnclaimed(sku);
        await finishTransaction({ purchase, isConsumable: PRODUCTS[sku] === 'consumable' }).catch(() => {});
      },
      onPurchaseError: (e) => {
        const w = waiting.current;
        waiting.current = null;
        w?.done(false);
        if (!isUserCancelledError(e)) onError();
      },
    });

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: ALL, type: 'in-app' }).catch(() => {});
    getAvailablePurchases().catch(() => {});
  }, [connected, fetchProducts, getAvailablePurchases]);

  useEffect(() => {
    if (!products.length) return;
    const prices: Partial<Record<Sku, string>> = {};
    for (const p of products) {
      const sku = short(p.id);
      if (sku && p.displayPrice) prices[sku] = p.displayPrice;
    }
    onPrices(prices);
  }, [products, onPrices]);

  useEffect(() => {
    if (availablePurchases.some((p) => short(p.productId) === 'noads')) onNoAds();
  }, [availablePurchases, onNoAds]);

  /** Opens the store's purchase sheet. Resolves true once paid. */
  const buy = useCallback(
    (sku: Sku) =>
      new Promise<boolean>((done) => {
        if (!(sku in PRODUCTS) || waiting.current) return done(false);
        waiting.current = { sku, done };
        requestPurchase({ type: 'in-app', request: { apple: { sku: PREFIX + sku }, google: { skus: [PREFIX + sku] } } }).catch((e) => {
          waiting.current = null;
          done(false);
          if (!isUserCancelledError(e)) onError();
        });
      }),
    [requestPurchase, onError],
  );

  /** Whether remove-ads is owned. Throws when the store can't be reached. */
  const restore = useCallback(async () => {
    await restorePurchases();
    const owned = await fetchOwnedPurchases();
    return owned.some((p) => short(p.productId) === 'noads');
  }, [restorePurchases]);

  return { buy, restore };
}

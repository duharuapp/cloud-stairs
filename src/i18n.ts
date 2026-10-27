import { getLocales } from 'expo-localization';

// The game itself is nearly all icons and numbers; these are the few native messages.
const STRINGS = {
  ko: {
    adLoadingTitle: '광고 준비 중',
    adLoadingBody: '광고를 불러오는 중이에요. 잠시 후 다시 눌러 주세요.',
    buyFailed: '구매하지 못했어요. 잠시 후 다시 시도해 주세요.',
    restoreNone: '복원할 구매가 없어요.',
    restoreFailed: '구매 내역을 불러오지 못했어요.',
  },
  en: {
    adLoadingTitle: 'Ad loading',
    adLoadingBody: 'The ad is still loading. Please try again in a moment.',
    buyFailed: "The purchase didn't go through. Please try again later.",
    restoreNone: 'No purchases to restore.',
    restoreFailed: "Couldn't load your purchases.",
  },
  ja: {
    adLoadingTitle: '広告を準備中',
    adLoadingBody: '広告を読み込んでいます。少ししてからもう一度押してください。',
    buyFailed: '購入できませんでした。しばらくしてからもう一度お試しください。',
    restoreNone: '復元できる購入はありません。',
    restoreFailed: '購入履歴を読み込めませんでした。',
  },
};

const lang = getLocales()[0]?.languageCode ?? 'en';
export const t = STRINGS[lang === 'ko' || lang === 'ja' ? lang : 'en'];

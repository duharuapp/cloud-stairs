# 꼭대기 가자 / Hoppeak / ぴょこっと山頂 작업 규칙

- 게임은 `game/index.html` 한 파일(three.js 3D). 앱은 Expo + WebView로 이 파일을 그대로 띄운다.
- `game/index.html`을 고치면 `npm run game`으로 `src/game/html.ts`를 다시 만들고 둘 다 커밋한다 (three.js와 Jua 글꼴이 안에 들어가서 인터넷 없이 돈다).
- 게임과 앱 사이 다리: 게임은 `window.ReactNativeWebView.postMessage`로 save / banner / buzz / ad / buy / restore를 보내고, 앱은 `window.__nativeReply`, `__setPrices`, `__grant`로 답한다 (`App.tsx`). 브라우저에서 열면 예전 프로토타입처럼 동작한다.
- 저장: 게임의 키-값을 그대로 폰(AsyncStorage)과 iCloud에 저장. 더 멀리 간 기록이 이긴다 (`src/services/save.ts`).
- 상품 ID: `com.duharuapp.hoppeak.` + coins1000 / coins3000 / coins9000 / coins20000(소모성), noads(비소모성).
- 기능을 넣을 때마다: 기획서 갱신, 다른 기능 영향 확인, 화면 흐름도 갱신, 스토어 업데이트마다 새 프로모션 문구(한·영·일).
- 출시 빌드에 `EXPO_PUBLIC_TEST_ADS`를 넣지 않는다 (scripts/store-guard.js가 막는다). 테스트는 TestFlight로.
- 확인: `npx tsc --noEmit`, `npx expo export --platform ios`.

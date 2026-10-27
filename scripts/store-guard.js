// Stops a store build (Xcode archive, or `npm run update`) when a test-only switch is on,
// so a test build can never reach players. Metro loads this before it bundles the app's JS.
const fs = require('fs');
const path = require('path');

const TEST_ONLY = ['EXPO_PUBLIC_TEST_ADS', 'EXPO_PUBLIC_SHOTS'];

/** Names set to a non-empty value in the shell or in any .env file Expo would read. */
function switchesOn(root) {
  const on = new Set(TEST_ONLY.filter((name) => process.env[name]));
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    let text = '';
    try {
      text = fs.readFileSync(path.join(root, file), 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && TEST_ONLY.includes(m[1]) && m[2].replace(/["'\s]/g, '')) on.add(m[1]);
    }
  }
  return [...on];
}

function checkStoreBuild(root) {
  // Xcode sets ACTION=install for Archive, EAS names the profile, and `npm run update` sets STORE_BUILD=1.
  const store =
    process.env.ACTION === 'install' || process.env.EAS_BUILD_PROFILE === 'production' || process.env.STORE_BUILD === '1';
  if (!store) return;
  const on = switchesOn(root);
  if (on.length) {
    throw new Error(`Store build stopped: test-only ${on.join(', ')} is set. Unset it (and remove it from .env files), then build again.`);
  }
}

module.exports = { checkStoreBuild, switchesOn };

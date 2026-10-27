// Builds Expo's iOS modules from source instead of their prebuilt xcframeworks.
// With expo 58.0.19 the prebuilt ExpoFileSystem (58.0.12) calls a symbol the prebuilt
// ExpoModulesCore (58.0.26) lacks, so the app crashed at launch (dyld "Symbol not found").
const { withPodfileProperties } = require('expo/config-plugins');

module.exports = function withNoPrecompiledModules(config) {
  return withPodfileProperties(config, (c) => {
    c.modResults.EXPO_USE_PRECOMPILED_MODULES = 'false';
    return c;
  });
};

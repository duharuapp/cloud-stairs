const { getDefaultConfig } = require('expo/metro-config');

const { checkStoreBuild } = require('./scripts/store-guard');

checkStoreBuild(__dirname);

module.exports = getDefaultConfig(__dirname);

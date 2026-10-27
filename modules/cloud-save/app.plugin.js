// Turns on iCloud key-value storage for the save (see src/services/cloud.ts).
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withCloudSave(config) {
  return withEntitlementsPlist(config, (c) => {
    c.modResults['com.apple.developer.ubiquity-kvstore-identifier'] = '$(TeamIdentifierPrefix)$(CFBundleIdentifier)';
    return c;
  });
};

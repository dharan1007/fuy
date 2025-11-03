const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use default Expo configuration
// We're using relative imports so we don't need path aliases

module.exports = config;

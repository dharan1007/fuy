const { getDefaultConfig } = require("expo/metro-config");

let config;
try {
    config = getDefaultConfig(__dirname);

    // Custom extensions
    config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'];
    config.resolver.assetExts = [...config.resolver.assetExts, 'glb', 'gltf', 'png', 'jpg', 'obj', 'mtl'];

    try {
        const { withNativeWind } = require("nativewind/metro");
        config = withNativeWind(config, { input: "./global.css" });
        console.log("✅ Successfully applied NativeWind config");
    } catch (nwError) {
        console.warn("⚠️ Failed to apply NativeWind config:", nwError);
        // Continue with default config to allow build debugging
    }

} catch (e) {
    console.error("🔥 Critical Error loading Metro config:", e);
    // Fallback minimal config if everything explodes
    config = getDefaultConfig(__dirname);
}

module.exports = config;

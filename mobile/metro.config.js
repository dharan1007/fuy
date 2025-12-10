const { getDefaultConfig } = require("expo/metro-config");

let config;
try {
    config = getDefaultConfig(__dirname);

    // Custom extensions - Safely append
    const extraSourceExts = ['cjs', 'mjs'];
    const extraAssetExts = ['glb', 'gltf', 'png', 'jpg', 'obj', 'mtl'];

    extraSourceExts.forEach(ext => {
        if (config.resolver.sourceExts && !config.resolver.sourceExts.includes(ext)) {
            config.resolver.sourceExts.push(ext);
        }
    });

    extraAssetExts.forEach(ext => {
        if (config.resolver.assetExts && !config.resolver.assetExts.includes(ext)) {
            config.resolver.assetExts.push(ext);
        }
    });

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
    // Fallback minimal config
    config = getDefaultConfig(__dirname);
}

module.exports = config;

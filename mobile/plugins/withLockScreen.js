const { withAndroidManifest, withMainActivity, AndroidConfig } = require('@expo/config-plugins');

const withLockScreen = (config) => {
    // 1. Add Permissions to AndroidManifest.xml
    config = withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;
        const permissions = androidManifest.manifest['uses-permission'] || [];

        if (!permissions.find(p => p.$['android:name'] === 'android.permission.USE_FULL_SCREEN_INTENT')) {
            permissions.push({ $: { 'android:name': 'android.permission.USE_FULL_SCREEN_INTENT' } });
        }

        // Ensure Keyguard permissions are present just in case
        if (!permissions.find(p => p.$['android:name'] === 'android.permission.DISABLE_KEYGUARD')) {
            permissions.push({ $: { 'android:name': 'android.permission.DISABLE_KEYGUARD' } });
        }

        androidManifest.manifest['uses-permission'] = permissions;
        return config;
    });

    // 2. Modify MainActivity to show over lock screen
    config = withMainActivity(config, async (config) => {
        const src = config.modResults.contents;

        // We need to add imports and the onCreate logic
        // This is a naive string replacement, but sufficient for Expo managed workflow patching.

        const imports = `
import android.os.Build;
import android.view.WindowManager;
`;

        const onCreateAddition = `
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
    } else {
      getWindow().addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
      );
    }
`;

        // Add imports if not present
        let newSrc = src;
        if (!newSrc.includes('import android.os.Build;')) {
            newSrc = newSrc.replace(/package .*;/, `package ${AndroidConfig.Manifest.getPackage(config.android)};\n${imports}`);
        }

        // Add onCreate logic inside onCreate method
        // Look for super.onCreate or the opening brace of onCreate
        if (!newSrc.includes('setShowWhenLocked(true)')) {
            // Find inside onCreate(Bundle savedInstanceState) {
            // Insert after super.onCreate(savedInstanceState);
            newSrc = newSrc.replace(
                /super\.onCreate\(.*\);/,
                `super.onCreate(savedInstanceState);\n${onCreateAddition}`
            );
        }

        config.modResults.contents = newSrc;
        return config;
    });

    return config;
};

module.exports = withLockScreen;

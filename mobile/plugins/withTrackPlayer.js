const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const withTrackPlayerService = (config) => {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;
        const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

        // Define the service we need to add
        const serviceName = 'com.doublesymmetry.trackplayer.service.MusicService';

        // Check if it already exists to avoid duplicates
        if (mainApplication.service?.some(s => s.$['android:name'] === serviceName)) {
            return config;
        }

        // Add the service
        const service = {
            $: {
                'android:name': serviceName,
                'android:enabled': 'true',
                'android:exported': 'true',
                'android:foregroundServiceType': 'mediaPlayback' // Required for Android 14+
            },
            'intent-filter': [{
                action: [{ $: { 'android:name': 'android.media.browse.MediaBrowserService' } }]
            }]
        };

        if (!mainApplication.service) {
            mainApplication.service = [];
        }

        mainApplication.service.push(service);

        return config;
    });
};

module.exports = withTrackPlayerService;

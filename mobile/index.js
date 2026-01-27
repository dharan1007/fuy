import TrackPlayer from 'react-native-track-player';
import notifee, { EventType } from '@notifee/react-native';

// Register the service BEFORE any other imports to ensure it handles background events
// TrackPlayer.registerPlaybackService(() => require('./service'));

// Register Notifee background event handler (required for foreground services)
notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction } = detail;

    // Handle notification press - brings app to foreground
    if (type === EventType.PRESS) {
        console.log('Notifee: User pressed notification');
    }

    // Handle action button press
    if (type === EventType.ACTION_PRESS && pressAction?.id === 'open') {
        console.log('Notifee: User pressed Open App action');
    }
});

// Import the Expo Router entry point which sets up the app
import 'expo-router/entry';

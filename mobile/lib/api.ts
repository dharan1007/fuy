import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const getApiUrl = () => {
    // 1. Development: Always use local server for auth and API calls
    if (__DEV__) {
        const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.debuggerHost;
        if (hostUri) {
            const ip = hostUri.split(':')[0];
            // Returns http://192.168.x.x:3000 for physical device or emulator
            return `http://${ip}:3000`;
        }
        // Fallback for Android Emulator if detection fails
        if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
        // Fallback for iOS Simulator
        return 'http://localhost:3000';
    }

    // 2. Production: Use environment variable or default
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

    return 'https://www.fuymedia.org';
};

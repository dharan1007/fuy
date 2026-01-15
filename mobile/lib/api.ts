import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const getApiUrl = () => {
    // 1. Explicit environment variable override
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

    // 2. Development: Auto-detect LAN IP from Expo Go / Dev Client
    if (__DEV__) {
        const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
        if (hostUri) {
            const ip = hostUri.split(':')[0];
            // Returns http://192.168.x.x:3000 for physical device or emulator
            return `http://${ip}:3000`;
        }
        // Fallback for Android Emulator if detection fails
        if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
    }

    // 3. Default Production
    return 'https://www.fuymedia.org';
};

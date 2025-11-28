import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';

/**
 * Device security checks for mobile app
 * Detects rooted/jailbroken devices and debug mode
 */

export interface SecurityCheckResult {
    isSecure: boolean;
    warnings: string[];
    criticalIssues: string[];
}

/**
 * Check if device is rooted (Android) or jailbroken (iOS)
 */
export async function checkDeviceSecurity(): Promise<SecurityCheckResult> {
    const warnings: string[] = [];
    const criticalIssues: string[] = [];

    // Check if running in development mode
    if (__DEV__) {
        warnings.push('App is running in development mode');
    }

    // Check for debugging
    if (Constants.isDevice === false) {
        warnings.push('App is running on emulator/simulator');
    }

    // Platform-specific checks
    if (Platform.OS === 'android') {
        // Android root detection
        const isRooted = await checkAndroidRoot();
        if (isRooted) {
            criticalIssues.push('Device appears to be rooted');
        }
    } else if (Platform.OS === 'ios') {
        // iOS jailbreak detection
        const isJailbroken = await checkIOSJailbreak();
        if (isJailbroken) {
            criticalIssues.push('Device appears to be jailbroken');
        }
    }

    return {
        isSecure: criticalIssues.length === 0,
        warnings,
        criticalIssues,
    };
}

/**
 * Check if Android device is rooted
 */
async function checkAndroidRoot(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    // Note: This is a basic check. For production, use a library like
    // react-native-device-info or react-native-root-detection

    // Check for common root indicators
    const rootIndicators = [
        '/system/app/Superuser.apk',
        '/sbin/su',
        '/system/bin/su',
        '/system/xbin/su',
        '/data/local/xbin/su',
        '/data/local/bin/su',
        '/system/sd/xbin/su',
        '/system/bin/failsafe/su',
        '/data/local/su',
    ];

    // In a real implementation, you would check if these files exist
    // For now, we'll return false (not rooted) as file system access
    // is restricted in React Native

    return false;
}

/**
 * Check if iOS device is jailbroken
 */
async function checkIOSJailbreak(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;

    // Note: This is a basic check. For production, use a library like
    // react-native-jailbreak-detect

    // Check for common jailbreak indicators
    const jailbreakIndicators = [
        '/Applications/Cydia.app',
        ' /Library/MobileSubstrate/MobileSubstrate.dylib',
        '/bin/bash',
        '/usr/sbin/sshd',
        '/etc/apt',
        '/private/var/lib/apt/',
    ];

    // In a real implementation, you would check if these paths exist
    // For now, we'll return false (not jailbroken)

    return false;
}

/**
 * Generate app integrity hash
 * Can be used to verify app hasn't been tampered with
 */
export async function generateAppIntegrityHash(): Promise<string> {
    try {
        // In a real implementation, you would hash critical app files
        // For now, generate a hash based on app version and build ID
        const appInfo = `${Constants.expoConfig?.version || '1.0.0'}_${Constants.sessionId}`;
        const digest = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            appInfo
        );
        return digest;
    } catch (error) {
        console.error('Error generating integrity hash:', error);
        return '';
    }
}

/**
 * Verify app integrity
 */
export async function verifyAppIntegrity(
    expectedHash: string
): Promise<boolean> {
    const currentHash = await generateAppIntegrityHash();
    return currentHash === expectedHash;
}

/**
 * Security recommendations based on checks
 */
export function getSecurityRecommendations(
    result: SecurityCheckResult
): string[] {
    const recommendations: string[] = [];

    if (!result.isSecure) {
        recommendations.push(
            'For your security, please use this app on a non-rooted/jailbroken device'
        );
    }

    if (result.warnings.includes('App is running in development mode')) {
        recommendations.push('Development mode detected - use production build');
    }

    if (result.warnings.includes('App is running on emulator/simulator')) {
        recommendations.push('For best security, use a physical device');
    }

    return recommendations;
}

/**
 * Log security event
 */
export function logSecurityEvent(event: string, details?: any): void {
    console.log('[MOBILE SECURITY]', {
        event,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        details,
    });

    // In production, send to analytics/monitoring service
}

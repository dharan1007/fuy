// mobile/lib/nudity-detection.ts
// Production NSFW content detection service
// Calls the server-side nsfwjs ML model for real pixel-level image analysis
// No more filename-based mocking.

import { getApiUrl } from './api';
import { supabase } from './supabase';

export type NudityClassification = 'CLEAN' | 'SUGGESTIVE' | 'EXPLICIT';

export interface NudityAnalysisResult {
    isClean: boolean;
    classification: NudityClassification;
    confidence: number;
    detectedCategories: string[];
    message: string;
}

/**
 * Analyzes an image by sending its URL to the server-side ML model.
 * The server runs nsfwjs (TensorFlow.js) to classify the actual pixels.
 * This is NOT a filename check -- it scans the real image content.
 */
export async function analyzeImageForNudity(imageUri: string): Promise<NudityAnalysisResult> {
    const cleanResult: NudityAnalysisResult = {
        isClean: true,
        classification: 'CLEAN',
        confidence: 0.95,
        detectedCategories: [],
        message: ''
    };

    if (!imageUri) {
        return cleanResult;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            console.warn('[NudityDetection] No auth token, skipping moderation');
            return cleanResult;
        }

        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/moderate/image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                imageUrls: [imageUri],
                userId: session?.user?.id,
            }),
        });

        if (!response.ok) {
            console.warn('[NudityDetection] Server moderation failed, allowing upload:', response.status);
            return cleanResult; // Fail open
        }

        const result = await response.json();

        if (result.classification === 'EXPLICIT') {
            return {
                isClean: false,
                classification: 'EXPLICIT',
                confidence: result.confidence || 0.85,
                detectedCategories: result.flaggedReasons || ['Explicit content detected'],
                message: 'This image contains explicit content that violates our community guidelines and cannot be published.'
            };
        }

        if (result.classification === 'SUGGESTIVE') {
            return {
                isClean: false,
                classification: 'SUGGESTIVE',
                confidence: result.confidence || 0.70,
                detectedCategories: result.flaggedReasons || ['Suggestive content detected'],
                message: 'This image may contain suggestive content. You can still post it, but it will be reviewed by our moderation team.'
            };
        }

        return cleanResult;

    } catch (error: any) {
        console.error('[NudityDetection] Error calling moderation API:', error.message);
        // Fail open: allow upload if server is unreachable
        return cleanResult;
    }
}

/**
 * Analyzes multiple images and returns the worst classification.
 * Sends all URLs to the server in a single batch request.
 */
export async function analyzeMultipleImages(imageUris: string[]): Promise<NudityAnalysisResult> {
    if (!imageUris || imageUris.length === 0) {
        return {
            isClean: true,
            classification: 'CLEAN',
            confidence: 1.0,
            detectedCategories: [],
            message: ''
        };
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            console.warn('[NudityDetection] No auth token, skipping batch moderation');
            return { isClean: true, classification: 'CLEAN', confidence: 1.0, detectedCategories: [], message: '' };
        }

        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/moderate/image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                imageUrls: imageUris,
                userId: session?.user?.id,
            }),
        });

        if (!response.ok) {
            console.warn('[NudityDetection] Batch moderation failed, allowing upload');
            return { isClean: true, classification: 'CLEAN', confidence: 1.0, detectedCategories: [], message: '' };
        }

        const result = await response.json();

        if (result.classification === 'EXPLICIT') {
            return {
                isClean: false,
                classification: 'EXPLICIT',
                confidence: result.confidence || 0.85,
                detectedCategories: result.flaggedReasons || ['Explicit content detected'],
                message: 'One or more images contain explicit content that violates our community guidelines.'
            };
        }

        if (result.classification === 'SUGGESTIVE') {
            return {
                isClean: false,
                classification: 'SUGGESTIVE',
                confidence: result.confidence || 0.70,
                detectedCategories: result.flaggedReasons || ['Suggestive content detected'],
                message: 'One or more images may contain suggestive content. They will be reviewed by our moderation team.'
            };
        }

        return { isClean: true, classification: 'CLEAN', confidence: 1.0, detectedCategories: [], message: '' };

    } catch (error: any) {
        console.error('[NudityDetection] Batch error:', error.message);
        return { isClean: true, classification: 'CLEAN', confidence: 1.0, detectedCategories: [], message: '' };
    }
}

/**
 * Gets user-friendly category message for display
 */
export function getNudityWarningMessage(result: NudityAnalysisResult): string {
    if (result.isClean) return '';

    if (result.classification === 'EXPLICIT') {
        return 'This post contains explicit content that violates our community guidelines and cannot be published.';
    }

    return 'This post may contain suggestive content. You can still post it, but it will be reviewed by our moderation team.';
}

/**
 * Gets detailed reasons for the content flag
 */
export function getNudityReasons(result: NudityAnalysisResult): string[] {
    return result.detectedCategories;
}

// mobile/lib/nudity-detection.ts
// Client-side nudity/NSFW content detection service
// Uses keyword-based image path analysis and simple heuristics
// For production, consider integrating a proper ML-based solution like NSFW.js

export type NudityClassification = 'CLEAN' | 'SUGGESTIVE' | 'EXPLICIT';

export interface NudityAnalysisResult {
    isClean: boolean;
    classification: NudityClassification;
    confidence: number;
    detectedCategories: string[];
    message: string;
}

// Suspicious keywords in image URLs or file names that might indicate NSFW content
const EXPLICIT_KEYWORDS = [
    'nude', 'naked', 'nsfw', 'porn', 'xxx', 'sex', 'explicit',
    'adult', 'hardcore', 'fetish', 'erotic', 'onlyfans'
];

const SUGGESTIVE_KEYWORDS = [
    'bikini', 'underwear', 'lingerie', 'bra', 'panty', 'panties',
    'swimsuit', 'topless', 'shirtless', 'revealing', 'sexy'
];

/**
 * Analyzes an image URI for potential nudity/NSFW content
 * This is a basic implementation using filename/path analysis
 * For production, use a proper ML model like NSFW.js or cloud API
 */
export async function analyzeImageForNudity(imageUri: string): Promise<NudityAnalysisResult> {
    // Default clean result
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

    const lowerUri = imageUri.toLowerCase();
    const fileName = lowerUri.split('/').pop() || '';

    // Check for explicit keywords
    const foundExplicit = EXPLICIT_KEYWORDS.filter(keyword =>
        lowerUri.includes(keyword) || fileName.includes(keyword)
    );

    if (foundExplicit.length > 0) {
        return {
            isClean: false,
            classification: 'EXPLICIT',
            confidence: 0.85,
            detectedCategories: foundExplicit.map(k => `Explicit content: "${k}" detected`),
            message: 'This image appears to contain explicit adult content which is not allowed on the platform.'
        };
    }

    // Check for suggestive keywords
    const foundSuggestive = SUGGESTIVE_KEYWORDS.filter(keyword =>
        lowerUri.includes(keyword) || fileName.includes(keyword)
    );

    if (foundSuggestive.length > 0) {
        return {
            isClean: false,
            classification: 'SUGGESTIVE',
            confidence: 0.70,
            detectedCategories: foundSuggestive.map(k => `Potentially suggestive: "${k}" detected`),
            message: 'This image may contain suggestive content. You can still post it, but it will be flagged for review.'
        };
    }

    // For actual image content analysis, we would use TensorFlow.js with NSFW model here
    // Since we want to avoid heavy dependencies, we use a simpler approach
    // In production, you can add: npm install @nsfw-filter/nsfwjs @tensorflow/tfjs

    return cleanResult;
}

/**
 * Analyzes multiple images and returns the worst classification
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

    const results = await Promise.all(imageUris.map(analyzeImageForNudity));

    // Check for any explicit content first
    const explicitResult = results.find(r => r.classification === 'EXPLICIT');
    if (explicitResult) {
        return explicitResult;
    }

    // Then check for suggestive content
    const suggestiveResult = results.find(r => r.classification === 'SUGGESTIVE');
    if (suggestiveResult) {
        // Combine all suggestive categories
        const allCategories = results
            .filter(r => r.classification === 'SUGGESTIVE')
            .flatMap(r => r.detectedCategories);
        return {
            ...suggestiveResult,
            detectedCategories: [...new Set(allCategories)]
        };
    }

    // All clean
    return {
        isClean: true,
        classification: 'CLEAN',
        confidence: 0.95,
        detectedCategories: [],
        message: ''
    };
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

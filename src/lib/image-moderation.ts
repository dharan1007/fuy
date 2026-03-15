// src/lib/image-moderation.ts
// Server-side NSFW image classification using nsfwjs + TensorFlow.js + Jimp
// Runs entirely locally on the server -- no external API calls.
// Uses Jimp (pure JS) for image decoding so it works on Vercel serverless.

import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import Jimp from 'jimp';

// Singleton model instance (cached across warm serverless invocations)
let cachedModel: nsfwjs.NSFWJS | null = null;

async function getModel(): Promise<nsfwjs.NSFWJS> {
    if (cachedModel) return cachedModel;
    // Load the MobileNetV2 NSFW model (~5MB, smallest/fastest)
    cachedModel = await nsfwjs.load('MobileNetV2');
    return cachedModel;
}

export type ImageModerationClassification = 'CLEAN' | 'SUGGESTIVE' | 'EXPLICIT';

export interface ImageModerationResult {
    classification: ImageModerationClassification;
    isClean: boolean;
    confidence: number;
    categories: {
        porn: number;
        sexy: number;
        hentai: number;
        neutral: number;
        drawing: number;
    };
    flaggedReasons: string[];
}

/**
 * Classify an image from a URL for NSFW content.
 *
 * Thresholds:
 *   EXPLICIT: Porn > 0.60 or Hentai > 0.60
 *   SUGGESTIVE: Sexy > 0.70 or Porn > 0.30 or Hentai > 0.30
 *   CLEAN: Everything else
 */
export async function classifyImage(imageUrl: string): Promise<ImageModerationResult> {
    const cleanResult: ImageModerationResult = {
        classification: 'CLEAN',
        isClean: true,
        confidence: 1.0,
        categories: { porn: 0, sexy: 0, hentai: 0, neutral: 1, drawing: 0 },
        flaggedReasons: [],
    };

    try {
        // 1. Download the image
        const response = await fetch(imageUrl);
        if (!response.ok) {
            console.error('[ImageMod] Failed to fetch image:', imageUrl, response.status);
            return cleanResult;
        }

        const imageBuffer = Buffer.from(await response.arrayBuffer());

        // 2. Decode with Jimp (pure JS, works on Vercel serverless)
        const image = await Jimp.read(imageBuffer);

        // Resize to 224x224 for the model (MobileNetV2 input size)
        image.resize(224, 224);

        const width = image.bitmap.width;
        const height = image.bitmap.height;

        // 3. Convert Jimp bitmap to a TensorFlow 3D tensor [height, width, 3]
        const numPixels = width * height;
        const values = new Float32Array(numPixels * 3);

        for (let i = 0; i < numPixels; i++) {
            const pixelOffset = i * 4; // RGBA in Jimp
            values[i * 3] = image.bitmap.data[pixelOffset];       // R
            values[i * 3 + 1] = image.bitmap.data[pixelOffset + 1]; // G
            values[i * 3 + 2] = image.bitmap.data[pixelOffset + 2]; // B
        }

        const imageTensor = tf.tensor3d(values, [height, width, 3]);

        // 4. Run nsfwjs classification
        const model = await getModel();
        const predictions = await model.classify(imageTensor as any);

        // Dispose tensor to free memory
        imageTensor.dispose();

        // 5. Parse predictions
        const categories = { porn: 0, sexy: 0, hentai: 0, neutral: 0, drawing: 0 };

        for (const pred of predictions) {
            const name = pred.className.toLowerCase() as keyof typeof categories;
            if (name in categories) {
                categories[name] = pred.probability;
            }
        }

        // 6. Apply classification thresholds
        const flaggedReasons: string[] = [];
        let classification: ImageModerationClassification = 'CLEAN';

        if (categories.porn > 0.60) {
            classification = 'EXPLICIT';
            flaggedReasons.push(`Pornographic content detected (${(categories.porn * 100).toFixed(1)}% confidence)`);
        }
        if (categories.hentai > 0.60) {
            classification = 'EXPLICIT';
            flaggedReasons.push(`Explicit animated content detected (${(categories.hentai * 100).toFixed(1)}% confidence)`);
        }

        if (classification === 'CLEAN') {
            if (categories.sexy > 0.70) {
                classification = 'SUGGESTIVE';
                flaggedReasons.push(`Suggestive content detected (${(categories.sexy * 100).toFixed(1)}% confidence)`);
            }
            if (categories.porn > 0.30) {
                classification = 'SUGGESTIVE';
                flaggedReasons.push(`Potentially explicit content (${(categories.porn * 100).toFixed(1)}% confidence)`);
            }
            if (categories.hentai > 0.30) {
                classification = 'SUGGESTIVE';
                flaggedReasons.push(`Potentially explicit animated content (${(categories.hentai * 100).toFixed(1)}% confidence)`);
            }
        }

        const topConfidence = Math.max(...Object.values(categories));

        return {
            classification,
            isClean: classification === 'CLEAN',
            confidence: topConfidence,
            categories,
            flaggedReasons,
        };

    } catch (error: any) {
        console.error('[ImageMod] Classification error:', error.message);
        // Fail open: if ML fails, allow the content through but log the failure
        return cleanResult;
    }
}

/**
 * Classify multiple images and return the WORST classification.
 */
export async function classifyMultipleImages(imageUrls: string[]): Promise<ImageModerationResult> {
    if (!imageUrls || imageUrls.length === 0) {
        return {
            classification: 'CLEAN',
            isClean: true,
            confidence: 1.0,
            categories: { porn: 0, sexy: 0, hentai: 0, neutral: 1, drawing: 0 },
            flaggedReasons: [],
        };
    }

    const results = await Promise.all(imageUrls.map(classifyImage));

    const explicitResult = results.find(r => r.classification === 'EXPLICIT');
    if (explicitResult) return explicitResult;

    const suggestiveResult = results.find(r => r.classification === 'SUGGESTIVE');
    if (suggestiveResult) {
        const allReasons = results
            .filter(r => r.classification === 'SUGGESTIVE')
            .flatMap(r => r.flaggedReasons);
        return { ...suggestiveResult, flaggedReasons: [...new Set(allReasons)] };
    }

    return results[0];
}

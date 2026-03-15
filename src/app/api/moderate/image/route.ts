// src/app/api/moderate/image/route.ts
// Server-side image moderation endpoint
// Mobile app calls this after uploading media to R2 to verify it's safe

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { classifyImage, classifyMultipleImages } from '@/lib/image-moderation';

export const runtime = 'nodejs';
export const maxDuration = 30; // Allow up to 30s for model loading + inference

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { imageUrls, userId, postId } = body;

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return NextResponse.json({ error: 'imageUrls array is required' }, { status: 400 });
        }

        // Classify images
        const result = await classifyMultipleImages(imageUrls);

        // Log flagged content to ModerationLog for admin review
        if (!result.isClean) {
            await prisma.moderationLog.create({
                data: {
                    userId: userId || 'unknown',
                    content: JSON.stringify(imageUrls.slice(0, 5)),
                    reason: result.classification === 'EXPLICIT' ? 'BLOCK' : 'FLAG',
                    violations: JSON.stringify(result.flaggedReasons),
                    severity: result.classification === 'EXPLICIT' ? 'high' : 'medium',
                },
            });

            // If a postId was provided, update the post's moderation status
            if (postId) {
                await prisma.post.update({
                    where: { id: postId },
                    data: {
                        moderationStatus: result.classification === 'EXPLICIT' ? 'REMOVED' : 'FLAGGED',
                        moderationReason: result.flaggedReasons.join('; '),
                    },
                });
            }
        }

        return NextResponse.json({
            classification: result.classification,
            isClean: result.isClean,
            confidence: result.confidence,
            flaggedReasons: result.flaggedReasons,
            categories: result.categories,
        });

    } catch (error: any) {
        console.error('[API/moderate/image] Error:', error);
        return NextResponse.json({ error: 'Moderation check failed' }, { status: 500 });
    }
}

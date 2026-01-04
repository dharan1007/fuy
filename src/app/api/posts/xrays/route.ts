export const dynamic = 'force-dynamic';
// src/app/api/posts/xrays/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    const {
      content,
      visibility = 'PUBLIC',
      feature = 'OTHER',
      topLayerUrl,
      topLayerType,
      bottomLayerUrl,
      bottomLayerType,
      scratchPattern = 'RANDOM',
      status = 'PUBLISHED',
    } = body;

    if (!topLayerUrl || !bottomLayerUrl) {
      return NextResponse.json(
        { error: 'Both top and bottom layer URLs are required' },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        userId,
        postType: 'XRAY',
        feature,
        content: content || 'Scratch to reveal!',
        visibility,
        status,
        xrayData: {
          create: {
            scratchPattern,
          },
        },
        // Add layers via PostMedia
        postMedia: {
          create: [
            {
              orderIndex: 0,
              media: {
                create: {
                  userId,
                  url: topLayerUrl,
                  type: topLayerType || 'IMAGE',
                  variant: 'xray-top'
                }
              }
            },
            {
              orderIndex: 1,
              media: {
                create: {
                  userId,
                  url: bottomLayerUrl,
                  type: bottomLayerType || 'IMAGE',
                  variant: 'xray-bottom'
                }
              }
            }
          ]
        }
      },
      include: {
        xrayData: true,
        user: {
          include: { profile: true },
        },
        postMedia: { include: { media: true } }
      },
    });

    // B. Create FeedItem (Denormalized)
    const mediaPreviews = [
      { type: topLayerType || 'IMAGE', url: topLayerUrl, variant: 'xray-top', aspect: 1 },
      { type: bottomLayerType || 'IMAGE', url: bottomLayerUrl, variant: 'xray-bottom', aspect: 1 }
    ];

    await prisma.feedItem.create({
      data: {
        userId,
        postId: post.id,
        authorName: post.user.profile?.displayName || 'User',
        authorAvatarUrl: post.user.profile?.avatarUrl,
        postType: 'XRAY',
        feature: feature || 'OTHER',
        contentSnippet: (post.content || '').slice(0, 200),
        mediaPreviews: JSON.stringify(mediaPreviews),
        createdAt: post.createdAt,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0
      }
    });

    return NextResponse.json(post);
  } catch (error: any) {
    console.error('Xray creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create xray' },
      { status: 500 }
    );
  }
}

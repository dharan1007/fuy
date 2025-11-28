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
        xrayData: {
          create: {
            topLayerUrl,
            topLayerType: topLayerType || 'IMAGE',
            bottomLayerUrl,
            bottomLayerType: bottomLayerType || 'IMAGE',
            scratchPattern,
          },
        },
      },
      include: {
        xrayData: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
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

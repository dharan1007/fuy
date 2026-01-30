/**
 * Audio Report API - Report audio for abuse/issues
 * POST: Create an audio report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { reason, details } = body;

        if (!reason) {
            return NextResponse.json(
                { error: 'Report reason is required' },
                { status: 400 }
            );
        }

        const validReasons = ['DUPLICATE', 'INAPPROPRIATE', 'COPYRIGHT', 'SPAM', 'OTHER'];
        if (!validReasons.includes(reason)) {
            return NextResponse.json(
                { error: 'Invalid report reason' },
                { status: 400 }
            );
        }

        // Check if audio asset exists
        const audioAsset = await prisma.audioAsset.findUnique({
            where: { id: params.id },
            select: { id: true },
        });

        if (!audioAsset) {
            return NextResponse.json(
                { error: 'Audio asset not found' },
                { status: 404 }
            );
        }

        // Check if user already reported this audio
        const existingReport = await prisma.audioReport.findFirst({
            where: {
                audioAssetId: params.id,
                reporterId: session.user.id,
                status: 'PENDING',
            },
        });

        if (existingReport) {
            return NextResponse.json(
                { error: 'You have already reported this audio' },
                { status: 400 }
            );
        }

        // Create the report
        const report = await prisma.audioReport.create({
            data: {
                audioAssetId: params.id,
                reporterId: session.user.id,
                reason,
                details: details || null,
                status: 'PENDING',
            },
        });

        // Check if this audio has received many reports
        const reportCount = await prisma.audioReport.count({
            where: {
                audioAssetId: params.id,
                status: 'PENDING',
            },
        });

        // Auto-mute if too many reports (threshold: 5)
        if (reportCount >= 5) {
            await prisma.audioAsset.update({
                where: { id: params.id },
                data: {
                    status: 'MUTED',
                    moderationReason: 'Auto-muted due to multiple reports',
                },
            });
        }

        return NextResponse.json({
            success: true,
            report: {
                id: report.id,
                reason: report.reason,
                status: report.status,
                createdAt: report.createdAt,
            },
        });
    } catch (error) {
        console.error('Error reporting audio:', error);
        return NextResponse.json(
            { error: 'Failed to report audio' },
            { status: 500 }
        );
    }
}

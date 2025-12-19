import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get('profileId');
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // If no profileId, we could return list of bonded profiles (using conversations)
        // But for now, the UI will likely direct here with a profileId
        if (!profileId) {
            return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
        }

        // 1. Fetch Tags
        const tags = await prisma.messageTag.findMany({
            where: {
                userId: user.id,
                profileId: profileId,
            },
            include: {
                message: {
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        sender: {
                            select: {
                                name: true,
                                profile: { select: { displayName: true, avatarUrl: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // 2. Fetch Facts
        const facts = await prisma.factWarning.findMany({
            where: {
                userId: user.id,
                profileId: profileId,
            },
            orderBy: { createdAt: 'desc' },
        });

        // 3. Calculate Counts
        const tagCounts = tags.reduce((acc, tag) => {
            acc[tag.tagType] = (acc[tag.tagType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            tags,
            facts,
            tagCounts,
        });

    } catch (error) {
        console.error('Error fetching bonding data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const { profileId, keyword, warningText } = body;

        if (!profileId || !keyword || !warningText) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const fact = await prisma.factWarning.create({
            data: {
                userId: user.id,
                profileId,
                keyword: keyword.toLowerCase().trim(),
                warningText: warningText.trim(),
            },
        });

        return NextResponse.json(fact);

    } catch (error) {
        console.error('Error creating fact warning:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

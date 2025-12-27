import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true },
        });

        return NextResponse.json({ interests: user?.profile?.shoppingInterests || [] });
    } catch (error) {
        console.error('Error fetching interests:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { interests } = await req.json();

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { profile: true, id: true },
        });

        if (user) {
            // Use upsert to handle case where profile doesn't exist
            await prisma.profile.upsert({
                where: { userId: user.id },
                update: { shoppingInterests: interests },
                create: {
                    userId: user.id,
                    shoppingInterests: interests,
                    displayName: session.user.name || 'User'
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating interests:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Fetch current privacy settings
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: (session.user as any).id },
            // @ts-ignore
            select: {
                defaultPostVisibility: true,
                profileCardPrivacy: true,
                stalkMePrivacy: true,
            }
        });

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

// PUT: Update privacy settings
export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { defaultPostVisibility, profileCardPrivacy, stalkMePrivacy } = body;

        const updateData: any = {};
        if (defaultPostVisibility) updateData.defaultPostVisibility = defaultPostVisibility;
        if (profileCardPrivacy) updateData.profileCardPrivacy = profileCardPrivacy;
        if (stalkMePrivacy) updateData.stalkMePrivacy = stalkMePrivacy;

        const user = await prisma.user.update({
            where: { id: (session.user as any).id },
            data: updateData,
            // @ts-ignore
            select: {
                defaultPostVisibility: true,
                profileCardPrivacy: true,
                stalkMePrivacy: true,
            }
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("Privacy update error:", error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}

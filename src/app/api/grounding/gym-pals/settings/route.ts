import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET: Check current status
// POST: Toggle status
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const profile = await prisma.profile.findUnique({
            where: { userId: session.user.id },
            select: { isOpenToWorkout: true }
        });

        return NextResponse.json({ isOpen: profile?.isOpenToWorkout || false });
    } catch (error) {
        return new NextResponse("Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { isOpen } = await req.json();

        const updated = await prisma.profile.update({
            where: { userId: session.user.id },
            data: { isOpenToWorkout: isOpen }
        });

        return NextResponse.json(updated);
    } catch (error) {
        return new NextResponse("Error", { status: 500 });
    }
}

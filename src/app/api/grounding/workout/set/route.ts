import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// PUT: Toggle Set Completion
// Payload: { setId, isPartner }
export async function PUT(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { setId, isPartner, completed } = await req.json();
        // isPartner: logic to know IF the requester is the partner or the owner?
        // Better logic: fetch set, check relationship.

        const set = await prisma.workoutSet.findUnique({
            where: { id: setId },
            include: {
                exercise: {
                    include: { session: true }
                }
            }
        });

        if (!set) return new NextResponse("Set not found", { status: 404 });

        const isOwner = set.exercise.session.userId === session.user.id;
        const isAssignedPartner = set.exercise.session.partnerId === session.user.id;

        if (!isOwner && !isAssignedPartner) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const updated = await prisma.workoutSet.update({
            where: { id: setId },
            data: isOwner
                ? { completed: completed }
                : { completedByPartner: completed }
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error("Set Update Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

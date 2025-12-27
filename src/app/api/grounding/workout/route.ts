import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET: Fetch workouts 
// POST: Create/Log a detailed workout
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const url = new URL(req.url);
        const date = url.searchParams.get("date");

        const whereClause: any = {
            OR: [
                { userId: session.user.id },
                { partnerId: session.user.id }
            ]
        };

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            whereClause.date = {
                gte: start,
                lte: end
            };
        }

        const workouts = await prisma.workoutSession.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            include: {
                partner: { select: { name: true, profile: { select: { avatarUrl: true } } } },
                exercises: {
                    orderBy: { order: 'asc' },
                    include: {
                        sets: { orderBy: { id: 'asc' } } // Ideally order by index if we had one, ID is okayish
                    }
                }
            }
        });

        return NextResponse.json(workouts);
    } catch (error) {
        console.error("Workout Fetch Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { name, date, exercises, partnerId, completed } = await req.json();
        // exercises: [{ name: "Squat", sets: [{ reps: 10, weight: 100, rest: 60 }] }]

        const workout = await prisma.workoutSession.create({
            data: {
                userId: session.user.id,
                name,
                date: new Date(date),
                completed: completed || false,
                partnerId: partnerId || null,
                exercises: {
                    create: exercises?.map((ex: any, i: number) => ({
                        name: ex.name,
                        order: i,
                        sets: {
                            create: ex.sets?.map((s: any) => ({
                                reps: Number(s.reps),
                                weight: Number(s.weight),
                                restSeconds: Number(s.rest) || 60
                            }))
                        }
                    }))
                }
            },
            include: {
                exercises: { include: { sets: true } }
            }
        });

        return NextResponse.json(workout);

    } catch (error) {
        console.error("Workout Create Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) return new NextResponse("ID required", { status: 400 });

        // Verify ownership
        const workout = await prisma.workoutSession.findUnique({ where: { id } });
        if (!workout || workout.userId !== session.user.id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        await prisma.workoutSession.delete({ where: { id } });
        return NextResponse.json({ status: "DELETED" });

    } catch (error) {
        return new NextResponse("Delete Error", { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { id, name, date, exercises, completed, calories } = await req.json();

        // Verify
        const existing = await prisma.workoutSession.findUnique({ where: { id } });
        if (!existing || existing.userId !== session.user.id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Transaction: updates session, deletes old exercises, creates new ones (simplest for deep updates)
        const updated = await prisma.$transaction(async (tx) => {
            // Update base
            await tx.workoutSession.update({
                where: { id },
                data: { name, date: new Date(date), completed, calories: Number(calories || 0) }
            });

            // Delete old exercises (cascades sets)
            await tx.workoutExercise.deleteMany({ where: { sessionId: id } });

            // Re-create
            if (exercises && exercises.length > 0) {
                for (let i = 0; i < exercises.length; i++) {
                    const ex = exercises[i];
                    await tx.workoutExercise.create({
                        data: {
                            sessionId: id,
                            name: ex.name,
                            order: i,
                            sets: {
                                create: ex.sets.map((s: any) => ({
                                    reps: Number(s.reps),
                                    weight: Number(s.weight),
                                    restSeconds: Number(s.restSeconds || 60),
                                    completed: Boolean(s.completed),
                                    completedByPartner: Boolean(s.completedByPartner)
                                }))
                            }
                        }
                    });
                }
            }
            return { id };
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error("Update Error", error);
        return new NextResponse("Update Error", { status: 500 });
    }
}

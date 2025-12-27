import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        // Get last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await prisma.biometricLog.findMany({
            where: {
                userId: session.user.id,
                date: { gte: thirtyDaysAgo }
            },
            orderBy: { date: 'asc' }
        });

        // Also get profile stats (current weight/height logic fallback if logs empty? 
        // Actually lets keep it strictly logs for now to show trends)
        return NextResponse.json(logs);

    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { weight, heartRate, sleepHours, hydration, mood, date } = await req.json();

        const logDate = date ? new Date(date) : new Date();

        // Check if log exists for this day (simple day check)
        // Adjust for timezone potentially, but standard simplified logic:
        const startOfDay = new Date(logDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(logDate); endOfDay.setHours(23, 59, 59, 999);

        const existing = await prisma.biometricLog.findFirst({
            where: {
                userId: session.user.id,
                date: { gte: startOfDay, lte: endOfDay }
            }
        });

        if (existing) {
            // Update
            const updated = await prisma.biometricLog.update({
                where: { id: existing.id },
                data: { weight: Number(weight) || undefined, heartRate: Number(heartRate) || undefined, sleepHours: Number(sleepHours) || undefined, hydration: Number(hydration) || undefined, mood: mood || undefined }
            });
            return NextResponse.json(updated);
        } else {
            // Create
            const created = await prisma.biometricLog.create({
                data: {
                    userId: session.user.id,
                    date: logDate,
                    weight: Number(weight) || null,
                    heartRate: Number(heartRate) || null,
                    sleepHours: Number(sleepHours) || null,
                    hydration: Number(hydration) || null,
                    mood: mood || null
                }
            });
            return NextResponse.json(created);
        }

    } catch (error) {
        console.error(error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

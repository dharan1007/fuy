import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const userId = session.user.id;

        // 1. Fetch all completed sessions dates
        const workouts = await prisma.workoutSession.findMany({
            where: {
                OR: [{ userId }, { partnerId: userId }],
                completed: true
            },
            select: { date: true, calories: true },
            orderBy: { date: 'desc' }
        });

        // 2. Calculate Weekly Consistency (Last 7 days)
        const now = new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);

        const sessionsThisWeek = workouts.filter((w: { date: Date }) => new Date(w.date) >= oneWeekAgo).length;
        // Limit to 7 if they worked out multiple times a day, though "Consistency" usually means days active
        const uniqueDaysThisWeek = new Set(workouts.filter((w: { date: Date }) => new Date(w.date) >= oneWeekAgo).map((w: { date: Date }) => new Date(w.date).toDateString())).size;

        // 3. Calculate Streak
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate Calories Today
        const caloriesToday = workouts
            // @ts-ignore
            .filter((w: { date: Date, calories?: number }) => {
                const d = new Date(w.date);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
                // @ts-ignore
            }).reduce((acc, curr) => acc + (curr.calories || 0), 0);

        // Check if worked out today
        const workedOutToday = workouts.some((w: { date: Date }) => {
            const d = new Date(w.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
        });

        if (workedOutToday) streak++;

        // Iterate backwards
        let checkDate = new Date(today);
        if (workedOutToday) checkDate.setDate(checkDate.getDate() - 1); // Start checking yesterday
        // If simply didn't work out today, streak might be 0, OR if they worked out yesterday streak continues.
        // Logic: specific implementation often forgives "today" until end of day.
        // Simple Logic: Count consecutive days backwards from yesterday (or today)

        const uniqueDates = Array.from(new Set(workouts.map((w: { date: Date }) => new Date(w.date).toDateString())));
        // Sort newest first
        uniqueDates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());

        // Re-calc strict streak
        streak = 0;
        let currentCheck = new Date();
        currentCheck.setHours(0, 0, 0, 0);

        // If today is not in list, check yesterday
        if (!uniqueDates.includes(currentCheck.toDateString())) {
            currentCheck.setDate(currentCheck.getDate() - 1);
        }

        while (uniqueDates.includes(currentCheck.toDateString())) {
            streak++;
            currentCheck.setDate(currentCheck.getDate() - 1);
        }


        return NextResponse.json({
            weekDays: uniqueDaysThisWeek,
            streak,
            total: workouts.length,
            caloriesToday
        });

    } catch (error) {
        console.error("Stats Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

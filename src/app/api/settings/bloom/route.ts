
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { slashes } = body;

        if (!Array.isArray(slashes)) {
            return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
        }

        // Clean slashes: remove empty, duplicates, limit length?
        // Let's clean them gently.
        const cleanedSlashes = Array.from(new Set(
            slashes
                .map(s => String(s).trim().toLowerCase()) // consistent case
                .filter(s => s.length > 0)
        )).slice(0, 50); // Limit to 50 tags

        const user = await prisma.user.update({
            where: { email: session.user.email },
            data: { bloomSlashes: cleanedSlashes },
            select: { bloomSlashes: true }
        });

        return NextResponse.json({ slashes: user.bloomSlashes });

    } catch (error) {
        console.error('Error updating bloom slashes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { bloomSlashes: true }
        });

        return NextResponse.json({ slashes: user?.bloomSlashes || [] });

    } catch (error) {
        console.error('Error fetching bloom slashes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

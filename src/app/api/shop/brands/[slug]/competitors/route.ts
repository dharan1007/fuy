import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(
    req: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { slug } = params;
        const body = await req.json();
        const { competitorBrandId } = body;

        const brand = await prisma.brand.findUnique({ where: { slug } });
        if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

        if (brand.ownerId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.brand.update({
            where: { id: brand.id },
            data: {
                competitors: {
                    connect: { id: competitorBrandId }
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding competitor:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

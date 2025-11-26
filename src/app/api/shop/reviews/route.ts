import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { type, targetId, rating, comment } = body; // type: 'PRODUCT' | 'BRAND'

        if (!targetId || !rating) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        if (type === 'PRODUCT') {
            const review = await prisma.productReview.create({
                data: {
                    productId: targetId,
                    userId: session.user.id,
                    rating: parseInt(rating),
                    comment
                }
            });
            return NextResponse.json(review);
        } else if (type === 'BRAND') {
            const review = await prisma.brandReview.create({
                data: {
                    brandId: targetId,
                    userId: session.user.id,
                    rating: parseInt(rating),
                    comment
                }
            });
            return NextResponse.json(review);
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        console.error('Error creating review:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const targetId = searchParams.get('targetId');

        if (!targetId) return NextResponse.json({ error: 'Target ID required' }, { status: 400 });

        if (type === 'PRODUCT') {
            const reviews = await prisma.productReview.findMany({
                where: { productId: targetId },
                include: {
                    user: {
                        select: {
                            name: true,
                            profile: {
                                select: { avatarUrl: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json(reviews);
        } else if (type === 'BRAND') {
            const reviews = await prisma.brandReview.findMany({
                where: { brandId: targetId },
                include: {
                    user: {
                        select: {
                            name: true,
                            profile: {
                                select: { avatarUrl: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json(reviews);
        }

        return NextResponse.json([]);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

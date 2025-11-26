import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
    req: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const brand = await prisma.brand.findUnique({
            where: { slug: params.slug },
            include: {
                products: {
                    where: { status: 'ACTIVE' },
                    orderBy: { createdAt: 'desc' }
                },
                competitors: {
                    select: { name: true, slug: true, logoUrl: true }
                },
                _count: {
                    select: { products: true, reviews: true }
                }
            }
        });

        if (!brand) {
            return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
        }

        return NextResponse.json(brand);
    } catch (error) {
        console.error('Error fetching brand:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const brand = await prisma.brand.findUnique({
            where: { slug: params.slug }
        });

        if (!brand) {
            return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
        }

        if (brand.ownerId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, logoUrl, bannerUrl, websiteUrl, competitors } = body;

        // Update basic info
        const updatedBrand = await prisma.brand.update({
            where: { id: brand.id },
            data: {
                name,
                description,
                logoUrl,
                bannerUrl,
                websiteUrl,
                // Handle competitors update if provided (list of IDs or slugs)
                // For simplicity, we'll assume the UI handles the logic of adding/removing one by one via a different endpoint or we just replace here if needed.
                // But for now let's just update fields.
                competitors: competitors ? {
                    set: [], // Clear existing
                    connect: competitors.map((c: string) => ({ id: c })) // Connect new
                } : undefined
            }
        });

        return NextResponse.json(updatedBrand);
    } catch (error) {
        console.error('Error updating brand:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

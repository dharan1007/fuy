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
    const { name, description, logoUrl, bannerUrl, websiteUrl } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Brand name already taken' }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        description,
        logoUrl,
        bannerUrl,
        websiteUrl,
        ownerId: session.user.id,
        status: 'ACTIVE',
        analyticsLog: {
          create: {
            totalViews: 0,
            totalOrders: 0,
            totalRevenue: 0,
            activeUsers: 0,
            avgRating: 0
          }
        }
      },
    });

    return NextResponse.json(brand);
  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const mine = searchParams.get('mine');

    let whereClause: any = { status: 'ACTIVE' };

    if (mine === 'true') {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      whereClause = { ownerId: session.user.id };
    } else if (query) {
      whereClause = {
        ...whereClause,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ]
      };
    }

    const brands = await prisma.brand.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Also fetch new arrivals if not searching for specific brand ownership
    let newArrivals: any[] = [];
    if (!mine && !query) {
      newArrivals = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { brand: { select: { name: true, slug: true } } }
      });
    }

    return NextResponse.json({ brands, newArrivals });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

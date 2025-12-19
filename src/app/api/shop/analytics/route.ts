import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// POST: Track an event (View or Redirect)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, brandId, productId } = body; // type: 'VIEW' | 'REDIRECT'

        if (type === 'VIEW') {
            if (productId) {
                await prisma.productAnalytics.update({
                    where: { productId },
                    data: { views: { increment: 1 } }
                });
            }
            if (brandId) {
                await prisma.brandAnalytics.update({
                    where: { brandId },
                    data: { totalViews: { increment: 1 } }
                });
            }
        } else if (type === 'REDIRECT') {
            if (productId) {
                await prisma.productAnalytics.update({
                    where: { productId },
                    data: { purchases: { increment: 1 } } // Using 'purchases' field to track redirects/intents for now
                });
            }
            if (brandId) {
                await prisma.brandAnalytics.update({
                    where: { brandId },
                    data: { totalOrders: { increment: 1 } } // Using 'totalOrders' for redirects
                });
            }
        } else if (type === 'IMPRESSION') {
            if (productId) {
                await prisma.productAnalytics.update({
                    where: { productId },
                    data: { impressions: { increment: 1 } }
                });
            }
            if (brandId) {
                await prisma.brandAnalytics.update({
                    where: { brandId },
                    data: { totalImpressions: { increment: 1 } }
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error tracking analytics:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET: Fetch analytics for a brand OR for a user's personal store
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const brandId = searchParams.get('brandId');
        const userStore = searchParams.get('userStore'); // flag to fetch user's own products

        if (brandId) {
            const brand = await prisma.brand.findUnique({
                where: { id: brandId },
                include: {
                    analyticsLog: true,
                    products: {
                        include: {
                            analyticsLog: true
                        }
                    }
                }
            });

            if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
            if (brand.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

            return NextResponse.json({
                brandAnalytics: brand.analyticsLog,
                productAnalytics: brand.products.map(p => ({
                    id: p.id,
                    name: p.name,
                    views: p.analyticsLog?.views || 0,
                    impressions: p.analyticsLog?.impressions || 0,
                    redirects: p.analyticsLog?.purchases || 0
                }))
            });
        }

        // Fetch User Personal Store Analytics (Direct listings)
        if (userStore === 'true') {
            const userProducts = await prisma.product.findMany({
                where: { sellerId: session.user.id },
                include: { analyticsLog: true }
            });

            // Aggregate stats for the user
            const aggregated = userProducts.reduce((acc, p) => ({
                totalViews: acc.totalViews + (p.analyticsLog?.views || 0),
                totalImpressions: acc.totalImpressions + (p.analyticsLog?.impressions || 0),
                totalOrders: acc.totalOrders + (p.analyticsLog?.purchases || 0),
                totalRevenue: 0 // Calculated elsewhere or stubbed
            }), { totalViews: 0, totalImpressions: 0, totalOrders: 0, totalRevenue: 0 });

            return NextResponse.json({
                brandAnalytics: aggregated, // formatted same as brand analytics for frontend reuse
                productAnalytics: userProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    views: p.analyticsLog?.views || 0,
                    impressions: p.analyticsLog?.impressions || 0,
                    redirects: p.analyticsLog?.purchases || 0
                }))
            });
        }

        return NextResponse.json({ error: 'Brand ID or userStore flag required' }, { status: 400 });

    } catch (error) {
        console.error('Error fetching analytics:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

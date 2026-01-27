
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Fetch allowlist for a specific feature
// Query: ?feature=POSTS | CARD | STALK_ME
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const feature = searchParams.get('feature');

    if (!feature) return NextResponse.json({ error: 'Feature required' }, { status: 400 });

    try {
        // @ts-ignore
        const allowlist = await prisma.privacyAllowlist.findMany({
            where: {
                ownerId: (session!.user as any).id,
                feature: feature
            },
            include: {
                viewer: {
                    select: {
                        id: true,
                        name: true,
                        profile: {
                            select: {
                                displayName: true,
                                avatarUrl: true
                            }
                        }
                    }
                }
            }
        });

        // Flatten structure for easier frontend consumption
        const users = allowlist.map((item: any) => ({
            id: item.viewer.id,
            name: item.viewer.name,
            displayName: item.viewer.profile?.displayName,
            avatarUrl: item.viewer.profile?.avatarUrl
        }));

        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch allowlist' }, { status: 500 });
    }
}

// POST: Add users to allowlist
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!(session?.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ownerId = (session!.user as any).id;

    try {
        const body = await req.json();
        const { userIds, feature } = body; // userIds is array of strings

        if (!userIds || !Array.isArray(userIds) || !feature) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        // Use transaction to ensure data integrity
        await prisma.$transaction(
            userIds.map((viewerId: string) =>
                // @ts-ignore
                prisma.privacyAllowlist.upsert({
                    where: {
                        ownerId_viewerId_feature: {
                            ownerId,
                            viewerId,
                            feature
                        }
                    },
                    update: {}, // Already exists, do nothing
                    create: {
                        ownerId,
                        viewerId,
                        feature
                    }
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Allowlist add error:", error);
        return NextResponse.json({ error: 'Failed to add users' }, { status: 500 });
    }
}

// DELETE: Remove users from allowlist
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { userIds, feature } = body;

        if (!userIds || !Array.isArray(userIds) || !feature) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        // @ts-ignore
        await prisma.privacyAllowlist.deleteMany({
            where: {
                ownerId: (session!.user as any).id,
                feature: feature,
                viewerId: { in: userIds }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to remove users' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // Find users who have subscribed to the current user
        const subscriptions = await prisma.subscription.findMany({
            where: {
                subscribedToId: session.user.id
            },
            include: {
                subscriber: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                displayName: true,
                                avatarUrl: true,
                                bio: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const subscribers = subscriptions.map(s => s.subscriber);

        return NextResponse.json({
            subscribers
        });
    } catch (error) {
        console.error("Error fetching subscribers", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

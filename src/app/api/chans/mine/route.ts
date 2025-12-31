export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth"; // user responsible for providing this
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find Chan post where userId matches
    const chanPost = await prisma.post.findFirst({
        where: {
            userId: session.user.id,
            feature: 'CHAN',
        },
        include: {
            chanData: {
                include: {
                    shows: {
                        include: {
                            episodes: true
                        }
                    }
                }
            }
        }
    });

    if (!chanPost || !chanPost.chanData) {
        return NextResponse.json(null); // No channel yet
    }

    return NextResponse.json({
        ...chanPost.chanData,
        id: chanPost.chanData.id,
        postId: chanPost.id
    });
}


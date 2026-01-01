export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { channelName, description, coverImageUrl, showOnProfile } = body;

        // Find the channel owned by this user
        const chan = await prisma.chan.findFirst({
            where: {
                post: {
                    userId: session.user.id
                }
            }
        });

        if (!chan) {
            return new NextResponse("Channel not found", { status: 404 });
        }

        const updatedChan = await prisma.chan.update({
            where: { id: chan.id },
            data: {
                channelName,
                description,
                coverImageUrl,
                showOnProfile: showOnProfile === undefined ? undefined : showOnProfile
            } as any
        });

        return NextResponse.json(updatedChan);
    } catch (error) {
        console.error("Error updating channel settings", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

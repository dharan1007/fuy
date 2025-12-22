
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, description, coverImageUrl } = body;

    try {
        // Create a Post of type CHAN
        const post = await prisma.post.create({
            data: {
                userId: session.user.id,
                feature: 'CHAN',
                postType: 'CHAN',
                content: description || 'New Channel',
                chanData: {
                    create: {
                        channelName: name,
                        description: description,
                        coverImageUrl: coverImageUrl,
                        // Initialize with empty shows
                        subscriberCount: 0
                    }
                }
            },
            include: {
                chanData: true
            }
        });

        return NextResponse.json(post);
    } catch (error) {
        console.error("Error creating channel post", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/bonding/tags - Get all tags for a user, optionally filtered
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get("profileId");
        const tagType = searchParams.get("tagType");
        const lockerType = searchParams.get("lockerType"); // blacklist | happy | fact

        // Build where clause
        const where: any = { userId: currentUser.id };
        if (profileId) where.profileId = profileId;
        if (tagType) where.tagType = tagType;

        // Filter by locker type (group of tag types)
        if (lockerType === "blacklist") {
            where.tagType = { in: ["BLACKLIST", "ANGRY", "SAD"] };
        } else if (lockerType === "happy") {
            where.tagType = { in: ["HAPPY", "JOY", "FUNNY"] };
        } else if (lockerType === "fact") {
            where.tagType = "FACT";
        }

        const tags = await prisma.messageTag.findMany({
            where,
            include: {
                message: {
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        senderId: true,
                        sender: {
                            select: {
                                name: true,
                                profile: { select: { displayName: true, avatarUrl: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(tags);
    } catch (error) {
        console.error("Error fetching tags:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/bonding/tags - Create a new message tag
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await request.json();
        const { messageId, profileId, tagType, taggedContent, note } = body;

        if (!messageId || !profileId || !tagType) {
            return NextResponse.json(
                { error: "messageId, profileId, and tagType are required" },
                { status: 400 }
            );
        }

        // Validate tagType
        const validTagTypes = ["BLACKLIST", "ANGRY", "SAD", "HAPPY", "JOY", "FUNNY", "FACT"];
        if (!validTagTypes.includes(tagType)) {
            return NextResponse.json({ error: "Invalid tagType" }, { status: 400 });
        }

        // Get the message to find the other participant for notification
        const message = await prisma.message.findUnique({
            where: { id: messageId },
            include: {
                conversation: {
                    select: { participantA: true, participantB: true },
                },
            },
        });

        if (!message) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        // Create the tag
        const tag = await prisma.messageTag.create({
            data: {
                messageId,
                userId: currentUser.id,
                profileId,
                tagType,
                taggedContent,
                note,
            },
        });

        // Notify both users (create notifications)
        const otherUserId = message.senderId === currentUser.id
            ? profileId
            : message.senderId;

        const notificationMessage = `A message was tagged as ${tagType.toLowerCase()}`;

        // Create notifications for both users
        await prisma.notification.createMany({
            data: [
                {
                    userId: currentUser.id,
                    type: "MESSAGE_TAGGED",
                    message: notificationMessage,
                    postId: null,
                },
                {
                    userId: otherUserId,
                    type: "MESSAGE_TAGGED",
                    message: notificationMessage,
                    postId: null,
                },
            ],
        });

        return NextResponse.json(tag, { status: 201 });
    } catch (error) {
        console.error("Error creating tag:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/bonding/tags?id=xxx - Delete a tag
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const tagId = searchParams.get("id");

        if (!tagId) {
            return NextResponse.json({ error: "Tag ID required" }, { status: 400 });
        }

        // Verify ownership before deleting
        const tag = await prisma.messageTag.findFirst({
            where: { id: tagId, userId: currentUser.id },
        });

        if (!tag) {
            return NextResponse.json({ error: "Tag not found or unauthorized" }, { status: 404 });
        }

        await prisma.messageTag.delete({ where: { id: tagId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting tag:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

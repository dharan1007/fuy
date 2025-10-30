// src/app/api/collaboration/invite/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// Invite user to collaborate on a feature (journaling, hopping, etc.)
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { sessionId, inviteeId, type } = body; // type: "JOURNALING" | "HOPPING" | etc.

    if (!sessionId || !inviteeId) {
      return NextResponse.json(
        { error: "Session ID and invitee ID are required" },
        { status: 400 }
      );
    }

    // Verify the session exists and user is creator
    const session = await prisma.featureSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.creatorId !== userId) {
      return NextResponse.json(
        { error: "Only creator can invite participants" },
        { status: 403 }
      );
    }

    // Check if user is already invited
    const existing = await prisma.featureSessionParticipant.findUnique({
      where: { sessionId_userId: { sessionId, userId: inviteeId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User is already invited to this session" },
        { status: 400 }
      );
    }

    // Create invitation
    const participant = await prisma.featureSessionParticipant.create({
      data: {
        sessionId,
        userId: inviteeId,
        status: "INVITED",
      },
    });

    // Create notification and send chat message
    await prisma.notification.create({
      data: {
        userId: inviteeId,
        type: "FEATURE_INVITE",
        message: `invited you to a ${type.toLowerCase()} session: "${session.title}"`,
        postId: sessionId,
        read: false,
      },
    });

    // Also try to send via chat if conversation exists
    const conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participantA: userId, participantB: inviteeId },
          { participantA: inviteeId, participantB: userId },
        ],
      },
    });

    if (conversation) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          content: `🎉 I've invited you to a ${type.toLowerCase()} session: "${session.title}". Join me?`,
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: `Invited to ${type.toLowerCase()} session`,
          lastMessageAt: new Date(),
        },
      });
    }

    return NextResponse.json({ participant }, { status: 201 });
  } catch (error: any) {
    console.error("Send invite error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to send invite" },
      { status: 500 }
    );
  }
}

// Accept or decline invitation
export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { participantId, action } = body; // action: "ACCEPT" or "DECLINE"

    if (!participantId || !action) {
      return NextResponse.json(
        { error: "Participant ID and action are required" },
        { status: 400 }
      );
    }

    const participant = await prisma.featureSessionParticipant.findUnique({
      where: { id: participantId },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (participant.userId !== userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    if (action === "ACCEPT") {
      const updated = await prisma.featureSessionParticipant.update({
        where: { id: participantId },
        data: { status: "ACTIVE" },
      });

      return NextResponse.json({ participant: updated });
    } else if (action === "DECLINE") {
      await prisma.featureSessionParticipant.update({
        where: { id: participantId },
        data: { status: "LEFT" },
      });

      return NextResponse.json({ message: "Invitation declined" });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Handle invite error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to handle invitation" },
      { status: 500 }
    );
  }
}

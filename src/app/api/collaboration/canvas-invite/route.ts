import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { uid } from "@/lib/templates";

/**
 * POST - Send a canvas collaboration invite through messaging
 * When a user is in a conversation and clicks "Collaborate on Canvas",
 * this creates an invite and notifies the other user
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { conversationId, recipientId, featureType = "CANVAS", title = "Canvas Session" } = body;

    if (!conversationId || !recipientId) {
      return NextResponse.json(
        { error: "Conversation ID and recipient ID are required" },
        { status: 400 }
      );
    }

    // Verify conversation exists and user is a participant
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const isParticipant = conversation.participantA === userId || conversation.participantB === userId;
    if (!isParticipant) {
      return NextResponse.json(
        { error: "Not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Create a collaboration session
    const session = await prisma.featureSession.create({
      data: {
        id: uid(),
        type: featureType || "CANVAS",
        creatorId: userId,
        title,
        status: "ACTIVE",
      },
    });

    // Create collaboration invite
    const invite = await prisma.collaborationInvite.create({
      data: {
        id: uid(),
        sessionId: session.id,
        fromUserId: userId,
        toUserId: recipientId,
        featureType,
        conversationId,
        status: "PENDING",
      },
    });

    // Send notification message in conversation (with inviteId encoded)
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: `🎨 I'd like to collaborate with you on a Canvas session. Would you like to join? [INVITE_ID:${invite.id}]`,
      },
    });

    // Create notification for the recipient
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: "COLLABORATION_INVITE",
        message: `${sender?.profile?.displayName || sender?.name || "Someone"} invited you to collaborate on Canvas`,
        postId: session.id,
        read: false,
      },
    });

    // Update conversation last message
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: "Canvas collaboration invite",
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        session,
        invite,
        message,
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error("Send canvas invite error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to send collaboration invite" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Accept/reject a canvas collaboration invite
 */
export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { inviteId, action } = body; // action: "ACCEPT" or "REJECT"

    if (!inviteId || !action) {
      return NextResponse.json(
        { error: "Invite ID and action are required" },
        { status: 400 }
      );
    }

    const invite = await prisma.collaborationInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    if (invite.toUserId !== userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    if (action === "ACCEPT") {
      // Update invite status
      const updated = await prisma.collaborationInvite.update({
        where: { id: inviteId },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
      });

      // Add user as a participant to the session
      await prisma.featureSessionParticipant.upsert({
        where: {
          sessionId_userId: {
            sessionId: invite.sessionId,
            userId,
          },
        },
        create: {
          sessionId: invite.sessionId,
          userId,
          status: "ACTIVE",
        },
        update: {
          status: "ACTIVE",
        },
      });

      // Send acceptance message in conversation
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      });

      await prisma.message.create({
        data: {
          conversationId: invite.conversationId,
          senderId: userId,
          content: `✅ ${sender?.profile?.displayName || sender?.name || "I"} accepted the collaboration invite!`,
        },
      });

      return NextResponse.json({
        success: true,
        invite: updated,
        sessionId: invite.sessionId,
        featureType: invite.featureType,
      });
    } else if (action === "REJECT") {
      const updated = await prisma.collaborationInvite.update({
        where: { id: inviteId },
        data: {
          status: "REJECTED",
          respondedAt: new Date(),
        },
      });

      // Send rejection message
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      });

      await prisma.message.create({
        data: {
          conversationId: invite.conversationId,
          senderId: userId,
          content: `❌ ${sender?.profile?.displayName || sender?.name || "I"} declined the collaboration invite.`,
        },
      });

      return NextResponse.json({ success: true, invite: updated });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    logger.error("Handle canvas invite error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to handle collaboration invite" },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { uid } from "@/lib/templates";

/**
 * POST - Send a collaboration invite through messaging
 * Generic for Canvas, Journal, Bonding, etc.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { conversationId, recipientId, featureType = "CANVAS", title = "Collaboration Session" } = body;

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
    const sessionId = uid();
    const session = await prisma.featureSession.create({
      data: {
        id: sessionId,
        type: featureType,
        creatorId: userId,
        title,
        status: "ACTIVE",
      },
    });

    // IF HOPIN: Create a Plan with the same ID
    if (featureType === "HOPIN") {
      await prisma.plan.create({
        data: {
          id: sessionId, // Unified ID
          title: title || "New Plan",
          creatorId: userId,
          members: {
            create: {
              userId: userId,
              status: "ACCEPTED"
            }
          }
        }
      });
    }

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
    // Detailed emoji map
    const emojiMap: Record<string, string> = {
      CANVAS: '🎨',
      JOURNAL: '📔',
      BONDING: '👥',
      HOPIN: '🎉',
      GROUNDING: '🧘',
      BREATHING: '💨',
      PLANS: '📋',
      RANKING: '🏆',
    };
    const emoji = emojiMap[featureType] || '✨';

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: `${emoji} I'd like to collaborate with you on a ${featureType.toLowerCase()} session. Would you like to join? [INVITE_ID:${invite.id}]`,
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
        message: `${sender?.profile?.displayName || sender?.name || "Someone"} invited you to collaborate on ${featureType}`,
        postId: session.id,
        read: false,
      },
    });

    // Update conversation last message
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: `${featureType} invite sent`,
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
    logger.error("Send invite error:", error);
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
 * GET - Fetch invite details
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Invite ID required" }, { status: 400 });
    }

    const invite = await prisma.collaborationInvite.findUnique({
      where: { id },
      include: {
        session: true
      }
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    return NextResponse.json({ invite });
  } catch (error) {
    logger.error("Fetch invite error:", error);
    return NextResponse.json({ error: "Failed to fetch invite" }, { status: 500 });
  }
}

/**
 * PATCH - Accept/reject a collaboration invite
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

    // Check expiration (5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    // @ts-ignore
    if (new Date(invite.createdAt) < fiveMinutesAgo && invite.status === 'PENDING') {
      const updated = await prisma.collaborationInvite.update({
        where: { id: inviteId },
        data: { status: 'REJECTED', respondedAt: new Date() } // Using REJECTED as 'EXPIRED' might not be in enum
      });

      return NextResponse.json(
        { error: "Invitation expired (5 minutes timeout)" },
        { status: 400 }
      );
    }

    // Idempotency check
    if (invite.status !== 'PENDING') {
      if (invite.status === action) {
        // Already in desired state, return success for "Rejoin" logic
        return NextResponse.json({
          success: true,
          invite,
          sessionId: invite.sessionId,
          featureType: invite.featureType,
          alreadyProcessed: true
        });
      } else {
        return NextResponse.json(
          { error: `Invite already ${invite.status.toLowerCase()}` },
          { status: 400 }
        );
      }
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

      // IF HOPIN: Add user as Plan Member
      if (invite.featureType === 'HOPIN') {
        const planExists = await prisma.plan.findUnique({ where: { id: invite.sessionId } });
        if (planExists) {
          await prisma.planMember.create({
            data: {
              planId: invite.sessionId,
              userId: userId,
              status: "ACCEPTED"
            }
          }).catch(e => {
            // Ignore if already member
            logger.warn("User already plan member or failed to add", e);
          });
        }
      }

      // LOG BONDING ACTIVITY
      // Track for both users
      await prisma.bondingActivity.createMany({
        data: [
          {
            userId: invite.fromUserId,
            partnerId: invite.toUserId,
            type: invite.featureType,
            status: "STARTED",
            details: JSON.stringify({ sessionId: invite.sessionId, conversationId: invite.conversationId }),
          },
          {
            userId: invite.toUserId,
            partnerId: invite.fromUserId,
            type: invite.featureType,
            status: "STARTED",
            details: JSON.stringify({ sessionId: invite.sessionId, conversationId: invite.conversationId }),
          }
        ]
      });

      // Broadcast 'collaboration:started' event
      // We use a detached promise to avoid blocking response, assuming the environment allows it (e.g. Node vs Edge)
      // Or we try to await it if possible.
      const broadcastInvite = async () => {
        const { supabaseAdmin } = await import('@/lib/supabase-admin');
        const channel = supabaseAdmin.channel(`conversation:${invite.conversationId}`);
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.send({
              type: 'broadcast',
              event: 'collaboration:started',
              payload: {
                sessionId: invite.sessionId,
                featureType: invite.featureType,
                conversationId: invite.conversationId,
                accepterId: userId
              }
            });
            supabaseAdmin.removeChannel(channel);
          }
        });
      };
      await broadcastInvite();

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
          content: `✅ ${sender?.profile?.displayName || sender?.name || "I"} accepted the ${invite.featureType.toLowerCase()} invite!`,
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
          content: `❌ ${sender?.profile?.displayName || sender?.name || "I"} declined the invite.`,
        },
      });

      return NextResponse.json({ success: true, invite: updated });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    logger.error("Handle invite error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to handle collaboration invite" },
      { status: 500 }
    );
  }
}


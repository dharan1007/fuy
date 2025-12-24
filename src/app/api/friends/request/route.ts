import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { friendId: session.user.id },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { displayName: true, avatarUrl: true, bio: true } },
          },
        },
        friend: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { displayName: true, avatarUrl: true, bio: true } },
          },
        },
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friendId } = await req.json();

    if (!friendId || friendId === session.user.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    // Check existing friendship
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId: friendId },
          { userId: friendId, friendId: session.user.id },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Friendship already exists or pending" }, { status: 400 });
    }

    // Create friendship request
    await prisma.friendship.create({
      data: {
        userId: session.user.id,
        friendId: friendId,
        status: "PENDING",
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: friendId,
        type: "FRIEND_REQUEST",
        message: `${session.user.name || "Someone"} sent you a friend request.`,
        postId: session.user.id, // Using postId to store the requester ID for navigation
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friendshipId, action } = await req.json();

    if (!friendshipId || !["ACCEPT", "REJECT", "GHOST", "UNDO"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    // Verify permission (only the recipient can accept/reject/ghost/undo)
    if (friendship.friendId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (action === "ACCEPT") {
      // Transaction: Update status, increment counts, create subscription
      await prisma.$transaction(async (tx) => {
        // 1. Update Friendship
        await tx.friendship.update({
          where: { id: friendshipId },
          data: { status: "ACCEPTED" },
        });

        // 2. Increment ACCEPTER's (Session User) follower count? 
        // Wait, if I accept a request, the sender becomes my friend. In standard social models:
        // If it's bidirectional (Friendship), usually both follow each other or it's just "Friends".
        // The prompt says: "followers count of the person who accepted (Session User) should increase"
        // "following count of the user who sent the request (Sender) should change"
        // This implies the Sender is *following* the Accepter.

        // 3. Create Subscription (Sender follows Accepter)
        // Check if exists first to avoid unique constraint error
        const existingSub = await tx.subscription.findUnique({
          where: {
            subscriberId_subscribedToId: {
              subscriberId: friendship.userId, // Sender
              subscribedToId: session.user.id, // Accepter
            }
          }
        });

        if (!existingSub) {
          await tx.subscription.create({
            data: {
              subscriberId: friendship.userId,
              subscribedToId: session.user.id,
            },
          });

          await tx.user.update({
            where: { id: session.user.id },
            data: { followersCount: { increment: 1 } },
          });

          await tx.user.update({
            where: { id: friendship.userId }, // The sender
            data: { followingCount: { increment: 1 } },
          });
        }

        // Notify the sender
        await tx.notification.create({
          data: {
            userId: friendship.userId,
            type: "FRIEND_ACCEPT",
            message: `${session.user.name || "Someone"} accepted your friend request.`,
            postId: session.user.id,
          },
        });
      });

    } else if (action === "REJECT") {
      await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "REJECTED" },
      });

    } else if (action === "GHOST") {
      await prisma.friendship.update({
        where: { id: friendshipId },
        data: { isGhosted: true, ghostedBy: session.user.id },
      });

    } else if (action === "UNDO") {
      // UNDO Logic
      await prisma.$transaction(async (tx) => {
        // We need to know what the previous state was to undo correctly.
        // If it was ACCEPTED, we decrement.
        // If it was REJECTED, we just set to PENDING.
        // If it was GHOSTED, we set ghosted to false.

        // We use the current state of 'friendship' fetched above, but be careful of race conditions.
        // Ideally we fetch inside transaction or check logic.
        // For simplicity, we check the current status.

        if (friendship.status === "ACCEPTED") {
          // Revert counts
          await tx.user.update({
            where: { id: session.user.id },
            data: { followersCount: { decrement: 1 } },
          });

          await tx.user.update({
            where: { id: friendship.userId },
            data: { followingCount: { decrement: 1 } },
          });

          // Remove Subscription
          try {
            await tx.subscription.delete({
              where: {
                subscriberId_subscribedToId: {
                  subscriberId: friendship.userId,
                  subscribedToId: session.user.id,
                }
              }
            });
          } catch (e) {
            // Subscription might not exist or already deleted, ignore
          }
        }

        // Reset to PENDING
        await tx.friendship.update({
          where: { id: friendshipId },
          data: {
            status: "PENDING",
            isGhosted: false,
            ghostedBy: null
          },
        });
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating friend request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friendshipId } = await req.json();

    if (!friendshipId) {
      return NextResponse.json({ error: "Friendship ID required" }, { status: 400 });
    }

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    if (friendship.userId !== session.user.id && friendship.friendId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting friendship:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

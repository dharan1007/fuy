import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'followers' or 'following'
        const targetUserId = searchParams.get('userId') || userId; // Defaults to current user if not specified
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        if (type !== 'followers' && type !== 'following') {
            return NextResponse.json({ error: "Invalid type. Must be 'followers' or 'following'" }, { status: 400 });
        }

        let users;
        let total = 0;

        if (type === 'followers') {
            // Who follows the target user? (Friendship where friendId is target)
            // Wait, usually:
            // friendshipsA: user -> friend (Following)
            // friendshipsB: friend -> user (Follower) -> Wait, let's check schema via logic.
            // If I follow X, I create a record { userId: Me, friendId: X }.
            // So X's followers are records where friendId = X.

            const whereCondition = {
                friendId: targetUserId,
                status: 'ACCEPTED'
            };

            [users, total] = await Promise.all([
                prisma.friendship.findMany({
                    where: whereCondition,
                    skip,
                    take: limit,
                    include: {
                        user: { // The person following me
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
                }),
                prisma.friendship.count({ where: whereCondition })
            ]);

            // Transform to common User shape
            users = users.map(f => ({
                friendshipId: f.id,
                id: f.user.id,
                name: f.user.name,
                displayName: f.user.profile?.displayName,
                avatarUrl: f.user.profile?.avatarUrl,
                isMe: f.user.id === userId
            }));

        } else {
            // Who does the target user follow? (Friendship where userId is target)
            const whereCondition = {
                userId: targetUserId,
                status: 'ACCEPTED'
            };

            [users, total] = await Promise.all([
                prisma.friendship.findMany({
                    where: whereCondition,
                    skip,
                    take: limit,
                    include: {
                        friend: { // The person I am following
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
                }),
                prisma.friendship.count({ where: whereCondition })
            ]);

            // Transform
            users = users.map(f => ({
                friendshipId: f.id,
                id: f.friend.id,
                name: f.friend.name,
                displayName: f.friend.profile?.displayName,
                avatarUrl: f.friend.profile?.avatarUrl,
                isMe: f.friend.id === userId // Should be false if I'm viewing my own following list, but logic holds
            }));
        }

        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total,
                hasMore: skip + users.length < total
            }
        });

    } catch (error) {
        console.error("Social API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

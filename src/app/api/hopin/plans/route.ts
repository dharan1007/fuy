export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserSlashPreferences, extractProfileTags, calculateTagOverlap } from "@/lib/recommendation";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { title, description } = await req.json();

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const plan = await prisma.plan.create({
            data: {
                title,
                description,
                creatorId: session.user.id,
                members: {
                    create: {
                        userId: session.user.id,
                        status: "ACCEPTED",
                    },
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                profile: { select: { avatarUrl: true } },
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(plan);
    } catch (error) {
        console.error("Error creating plan:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get("mode");

        let whereClause: any = {
            OR: [
                { creatorId: session.user.id },
                { members: { some: { userId: session.user.id } } },
            ],
        };

        if (mode === "map" || mode === "public") {
            whereClause = {
                OR: [
                    { visibility: "PUBLIC" },
                    { creatorId: session.user.id },
                    { members: { some: { userId: session.user.id } } }
                ]
            };
        }

        const plans = await prisma.plan.findMany({
            where: whereClause,
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                profile: { select: { avatarUrl: true } },
                            },
                        },
                    },
                },
                _count: {
                    select: { members: true }
                }
            },
            take: mode === "public" ? 50 : undefined,
            orderBy: { createdAt: "desc" },
        });

        // Get user preferences for scoring
        let slashPrefs: Record<string, number> = {};
        let userTags: string[] = [];
        let friendIds: string[] = [];

        if (mode === "map" || mode === "public") {
            const [prefs, profileTags, friendships] = await Promise.all([
                getUserSlashPreferences(session.user.id),
                extractProfileTags(session.user.id),
                prisma.friendship.findMany({
                    where: {
                        OR: [{ userId: session.user.id }, { friendId: session.user.id }],
                        status: 'ACCEPTED'
                    },
                    select: { userId: true, friendId: true }
                })
            ]);
            slashPrefs = prefs;
            userTags = [
                ...profileTags.values,
                ...profileTags.skills,
                ...profileTags.genres,
                ...profileTags.currentlyInto,
            ];
            friendIds = friendships.map((f: { userId: string; friendId: string }) =>
                f.userId === session.user.id ? f.friendId : f.userId
            );
        }

        // Score and sort plans
        const scoredPlans = plans.map(plan => {
            let recoScore = 0;
            const planSlashes: string[] = plan.slashes ?
                (typeof plan.slashes === 'string' ? JSON.parse(plan.slashes) : plan.slashes) : [];

            // Slash preference matching
            for (const tag of planSlashes) {
                recoScore += slashPrefs[tag] || 0;
            }

            // Profile tag overlap
            if (userTags.length > 0 && planSlashes.length > 0) {
                recoScore += calculateTagOverlap(userTags, planSlashes) * 5;
            }

            // Friend attendance boost
            const friendsAttending = plan.members.filter((m: any) =>
                friendIds.includes(m.userId) && m.status === 'ACCEPTED'
            ).length;
            recoScore += friendsAttending * 2;

            // Popularity boost
            recoScore += Math.min((plan._count?.members || 0) / 5, 2);

            return {
                ...plan,
                recoScore: Math.round(recoScore * 100) / 100,
                slashTags: planSlashes,
                friendsAttending
            };
        });

        // Sort by recommendation score for public/map mode
        if (mode === "map" || mode === "public") {
            scoredPlans.sort((a, b) => b.recoScore - a.recoScore);
        }

        // Sanitize verification codes
        const sanitizedPlans = scoredPlans.map(plan => ({
            ...plan,
            members: plan.members.map((m: any) => {
                if (m.userId === session.user.id || plan.creatorId === session.user.id) {
                    return m;
                }
                const { verificationCode, ...rest } = m;
                return rest;
            })
        }));

        return NextResponse.json(sanitizedPlans);
    } catch (error) {
        console.error("Error fetching plans:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

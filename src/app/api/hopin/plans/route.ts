export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
                        status: "ACCEPTED", // Owner is automatically accepted
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
        const mode = searchParams.get("mode"); // "map" (public/global) or undefined (dashboard/my plans)

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
                    // Also include my own private plans on the map so I can see them
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
            take: mode === "public" ? 20 : undefined,
            orderBy: { createdAt: "desc" },
        });

        // Sanitize verification codes
        const sanitizedParams = plans.map(plan => ({
            ...plan,
            members: plan.members.map(m => {
                if (m.userId === session.user.id || plan.creatorId === session.user.id) {
                    return m;
                }
                const { verificationCode, ...rest } = m;
                return rest;
            })
        }));

        return NextResponse.json(sanitizedParams);
    } catch (error) {
        console.error("Error fetching plans:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


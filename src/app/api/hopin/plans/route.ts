import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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
                ownerId: session.user.id,
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

        // Fetch plans where user is owner OR a member
        const plans = await prisma.plan.findMany({
            where: {
                OR: [
                    { ownerId: session.user.id },
                    { members: { some: { userId: session.user.id } } },
                ],
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
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(plans);
    } catch (error) {
        console.error("Error fetching plans:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

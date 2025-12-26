
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const entries = await prisma.stressMapEntry.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 100,
        });

        return NextResponse.json(entries);
    } catch (error) {
        console.error("Error fetching stress map entries:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { entries } = body;
        // Expecting entries: { region, x, y, intensity, quality, side, note }[]

        if (!Array.isArray(entries)) {
            return new NextResponse("Invalid payload", { status: 400 });
        }

        const created = await Promise.all(
            entries.map((entry: any) =>
                prisma.stressMapEntry.create({
                    data: {
                        userId: session.user.id,
                        region: entry.region,
                        x: entry.x,
                        y: entry.y,
                        z: entry.z,
                        intensity: entry.intensity,
                        quality: entry.quality,
                        side: entry.side,
                        note: entry.note || null,
                    },
                })
            )
        );

        return NextResponse.json(created);
    } catch (error) {
        console.error("Error saving stress map entries:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

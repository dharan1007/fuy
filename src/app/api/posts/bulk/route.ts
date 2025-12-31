export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { ids, action } = body;

        // Validation
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }
        if (!['ARCHIVE', 'RESTORE', 'DELETE'].includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        // Verify Ownership: Check that ALL posts belong to the user
        // We can do this by counting how many of the requested IDs belong to the user.
        // If the count matches the length of the IDs array, then they own all of them.
        const count = await prisma.post.count({
            where: {
                id: { in: ids },
                userId: userId
            }
        });

        if (count !== ids.length) {
            return NextResponse.json({ error: "Unauthorized or some posts not found" }, { status: 403 });
        }

        // Perform Action
        if (action === 'DELETE') {
            await prisma.post.deleteMany({
                where: {
                    id: { in: ids },
                    userId: userId // Data integrity double-check
                }
            });
            return NextResponse.json({ success: true, count, message: "Posts deleted" });
        } else {
            // Archive / Restore
            const status = action === 'ARCHIVE' ? 'ARCHIVED' : 'PUBLISHED';
            await prisma.post.updateMany({
                where: {
                    id: { in: ids },
                    userId: userId
                },
                data: {
                    status: status
                }
            });
            return NextResponse.json({ success: true, count, message: `Posts ${status.toLowerCase()}` });
        }

    } catch (error) {
        console.error("Bulk action failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


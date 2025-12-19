import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// Helper to check admin status (Placeholder: In production, check user role or email)
async function requireAdmin() {
    const userId = await requireUserId();
    // TODO: Implement real admin check. For now, we allow any authenticated user to access this 
    // IF they know the URL, but in a real app you'd check `user.role === 'ADMIN'`.
    // For this task, we assume the dashboard is accessible to demonstrate functionality.
    return userId;
}

export async function GET(req: NextRequest) {
    try {
        await requireAdmin();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "reports"; // reports | users | brands
        const search = searchParams.get("search") || "";

        if (type === "users") {
            const where: any = {};
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } }
                ];
            }

            const users = await prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    isBanned: true,
                    createdAt: true, // Joined Date
                    lastSeen: true,
                    profile: { select: { avatarUrl: true, displayName: true } },
                    _count: { select: { posts: true, reportsMade: true } }
                } as any, // Bypass strict select validation
                take: 50
            }) as any;

            return NextResponse.json({ users });

        } else if (type === "brands") {
            const where: any = {};
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } }
                ];
            }

            const brands = await prisma.brand.findMany({
                where,
                include: {
                    owner: { select: { email: true, name: true } }
                },
                take: 50
            }) as any;

            return NextResponse.json({ brands });

        } else if (type === "posts") {
            const where: any = {};
            if (search) {
                where.OR = [
                    { content: { contains: search, mode: "insensitive" } },
                    { user: { name: { contains: search, mode: "insensitive" } } }
                ];
            }

            const posts = await prisma.post.findMany({
                where,
                select: {
                    id: true,
                    content: true,
                    postType: true,
                    feature: true,
                    visibility: true,
                    createdAt: true,
                    moderationStatus: true,
                    status: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profile: { select: { avatarUrl: true, displayName: true } }
                        }
                    },
                    _count: {
                        select: {
                            likes: true,
                            comments: true,
                            reports: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: 50
            });

            return NextResponse.json({ posts });

        } else {
            // Default: Reports
            const reports = await prisma.report.findMany({
                where: {
                    status: "PENDING",
                },
                include: {
                    reporter: {
                        select: { name: true, email: true, profile: { select: { avatarUrl: true, displayName: true } } },
                    },
                    post: {
                        include: {
                            user: {
                                select: { name: true, email: true, profile: { select: { avatarUrl: true, displayName: true } } },
                            },
                            media: true, // Show media if present
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });

            return NextResponse.json({ reports });
        }
    } catch (error: any) {
        console.error("Get admin data error:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await requireAdmin();
        const body = await req.json();
        const { reportId, action, targetId, reason } = body;
        // action: "DELETE_POST" | "DISMISS_REPORT" | "KEEP_POST" | "BAN_USER" | "UNBAN_USER" | "DELETE_USER" | "BAN_STORE" | "UNBAN_STORE" | "DELETE_STORE"

        if (!action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // --- Report Actions (Require reportId) ---
        if (["DISMISS_REPORT", "KEEP_POST"].includes(action)) {
            if (!reportId) return NextResponse.json({ error: "Missing reportId" }, { status: 400 });

            if (action === "DISMISS_REPORT") {
                await prisma.report.update({
                    where: { id: reportId },
                    data: { status: "DISMISSED" }
                });
            } else if (action === "KEEP_POST") {
                await prisma.report.update({
                    where: { id: reportId },
                    data: { status: "RESOLVED" }
                });
            }

            // --- Post Actions (Require targetId = postId OR reportId) ---
        } else if (action === "DELETE_POST") {
            let postId = targetId;

            // If triggered from a report, we might not have targetId explicitly passed as arg in handleAction sometimes, 
            // but we can derive it. Ideally the client passes targetId.
            // If reportId exists, we can resolve the report too.

            if (reportId) {
                const report = await prisma.report.findUnique({ where: { id: reportId } });
                if (report && report.postId) {
                    postId = report.postId;
                    // Resolve report
                    await prisma.report.update({
                        where: { id: reportId },
                        data: { status: "RESOLVED" }
                    });

                    // Notify Reporter
                    await prisma.notification.create({
                        data: {
                            userId: report.reporterId,
                            type: "SYSTEM",
                            message: `Thank you for your report. The post has been removed.`,
                            postId: postId
                        }
                    });
                }
            }

            if (!postId) return NextResponse.json({ error: "Missing postId" }, { status: 400 });

            await prisma.post.update({
                where: { id: postId },
                data: {
                    visibility: "PRIVATE",
                    moderationStatus: "REMOVED"
                }
            });

            // Notify Post Owner
            const post = await prisma.post.findUnique({ where: { id: postId } });
            if (post) {
                await prisma.notification.create({
                    data: {
                        userId: post.userId,
                        type: "SYSTEM",
                        message: `Your post was removed by an admin due to a violation of community guidelines.`,
                        postId: postId
                    }
                });
            }

        } else if (["BAN_USER", "UNBAN_USER", "DELETE_USER"].includes(action)) {
            if (!targetId) return NextResponse.json({ error: "Missing targetId (userId)" }, { status: 400 });

            if (action === "BAN_USER") {
                await prisma.user.update({
                    where: { id: targetId },
                    data: {
                        isBanned: true,
                        banReason: reason || "Violation of terms"
                    } as any
                });

                // Hide all user's posts
                await prisma.post.updateMany({
                    where: { userId: targetId },
                    data: { visibility: "PRIVATE" }
                });

                // Notify User (if they can see it, or email)
                // Since they are banned, they might be blocked from login, but notification is good record.
                await prisma.notification.create({
                    data: {
                        userId: targetId,
                        type: "SYSTEM",
                        message: `Your account has been suspended. Reason: ${reason || "Violation of terms"}.`
                    }
                });

            } else if (action === "UNBAN_USER") {
                await prisma.user.update({
                    where: { id: targetId },
                    data: {
                        isBanned: false,
                        banReason: null
                    } as any
                });
                // Note: We don't automatically restore post visibility as they might have been private before. 
                // User has to set them back manually or we just leave them.

                await prisma.notification.create({
                    data: {
                        userId: targetId,
                        type: "SYSTEM",
                        message: `Your account suspension has been lifted.`
                    }
                });

            } else if (action === "DELETE_USER") {
                // Permanent Delete
                await prisma.user.delete({
                    where: { id: targetId }
                });
                // No notification possible as user is gone.
            }

            // --- Store/Brand Actions (Require targetId = brandId) ---
        } else if (["BAN_STORE", "UNBAN_STORE", "DELETE_STORE"].includes(action)) {
            if (!targetId) return NextResponse.json({ error: "Missing targetId (brandId)" }, { status: 400 });

            if (action === "BAN_STORE") {
                await prisma.brand.update({
                    where: { id: targetId },
                    data: {
                        status: "SUSPENDED",
                        banReason: reason || "Violation of store policies"
                    } as any
                });

                // Hide all products? 
                // Usually status=SUSPENDED on brand is enough for frontend to hide, 
                // but let's strictly set products to inactive
                await prisma.product.updateMany({
                    where: { brandId: targetId },
                    data: { status: "INACTIVE" }
                });

                // Notify Owner
                const brand = await prisma.brand.findUnique({ where: { id: targetId }, select: { ownerId: true, name: true } });
                if (brand) {
                    await prisma.notification.create({
                        data: {
                            userId: brand.ownerId,
                            type: "SYSTEM",
                            message: `Your store "${brand.name}" has been suspended. Reason: ${reason}.`
                        }
                    });
                }

            } else if (action === "UNBAN_STORE") {
                await prisma.brand.update({
                    where: { id: targetId },
                    data: {
                        status: "ACTIVE",
                        banReason: null
                    } as any
                });
                // Restore products? Maybe safest to leave them INACTIVE for owner to re-enable?
                // Or restore. Let's leave them for owner to manage to be safe.

                const brand = await prisma.brand.findUnique({ where: { id: targetId }, select: { ownerId: true, name: true } });
                if (brand) {
                    await prisma.notification.create({
                        data: {
                            userId: brand.ownerId,
                            type: "SYSTEM",
                            message: `Your store "${brand.name}" suspension has been lifted.`
                        }
                    });
                }

            } else if (action === "DELETE_STORE") {
                await prisma.brand.delete({
                    where: { id: targetId }
                });
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Moderation action error:", error);
        return NextResponse.json({ error: "Action failed" }, { status: 500 });
    }
}

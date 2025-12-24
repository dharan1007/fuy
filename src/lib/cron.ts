
import { prisma } from "@/lib/prisma";

/**
 * Deletes all posts of type 'STORY' that have an expiration date in the past.
 * This should be called before fetching stories to ensure only active ones are returned.
 */
export async function cleanupExpiredStories() {
    try {
        const now = new Date();
        const result = await prisma.post.deleteMany({
            where: {
                postType: "STORY",
                expiresAt: {
                    lt: now,
                },
            },
        });

        if (result.count > 0) {
            console.log(`[Cleanup] Deleted ${result.count} expired stories.`);
        }

        return result.count;
    } catch (error) {
        console.error("[Cleanup] Failed to delete expired stories:", error);
        return 0;
    }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$executeRawUnsafe('ALTER TABLE "ReactionBubble" DISABLE ROW LEVEL SECURITY;');
        console.log('Row Level Security DISABLED for ReactionBubble table.');
    } catch (e) {
        console.error('Error disabling RLS:', e);
    } finally {
        await prisma.$disconnect();
    }
}
main();

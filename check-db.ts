import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');
        await prisma.$connect();
        console.log('Successfully connected to database!');

        // Try a simple query
        const count = await prisma.user.count();
        console.log(`User count: ${count}`);

        await prisma.$disconnect();
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

main();

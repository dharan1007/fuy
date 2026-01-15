import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateProfileCode(): string {
    // Generate a random 7-digit number string
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

async function main() {
    console.log('Start backfilling profile codes...');

    // Target User model as profileCode is on User
    const users = await prisma.user.findMany({
        where: { profileCode: null },
        select: { id: true }
    });

    console.log(`Found ${users.length} users without codes.`);

    for (const user of users) {
        let unique = false;
        let code = '';
        while (!unique) {
            code = generateProfileCode();
            const existing = await prisma.user.findUnique({
                where: { profileCode: code }
            });
            if (!existing) unique = true;
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { profileCode: code }
        });
        console.log(`Updated user ${user.id} with code ${code}`);
    }

    console.log('Backfill complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

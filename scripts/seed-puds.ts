
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst();

    if (!user) {
        console.log('No user found to attach posts to.');
        return;
    }

    const puds = [
        {
            question: 'Best way to spend a Sunday?',
            options: ['Hiking', 'Reading', 'Coding', 'Sleeping'],
        },
        {
            question: 'Favorite Programming Language?',
            options: ['TypeScript', 'Rust', 'Python', 'Go'],
        },
        {
            question: 'Coffee or Tea?',
            options: ['Coffee', 'Tea', 'Neither', 'Both'],
        }
    ];

    for (const pud of puds) {
        await prisma.post.create({
            data: {
                userId: user.id,
                postType: 'PULLUPDOWN',
                content: pud.question,
                visibility: 'PUBLIC',
                status: 'PUBLISHED',
                pullUpDownData: {
                    create: {
                        question: pud.question,
                        options: {
                            create: pud.options.map(opt => ({
                                text: opt,
                                tagStatus: 'ACCEPTED'
                            }))
                        }
                    }
                }
            }
        });
    }

    console.log('Seeded 3 PUDs');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

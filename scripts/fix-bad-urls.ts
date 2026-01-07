
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting DB Fix...');

    // Fix Chan
    try {
        const { count } = await prisma.chan.updateMany({
            where: {
                OR: [
                    { coverImageUrl: { contains: 'localhost' } },
                    { coverImageUrl: { contains: 'blob:' } }
                ]
            },
            data: {
                coverImageUrl: null
            }
        });
        console.log(`Fixed ${count} bad Chan coverImageUrls (set to null).`);
    } catch (e: any) { console.error('Error fixing Chan: ' + e.message); }

    // Fix Media (just in case, though none found)
    try {
        const { count } = await prisma.media.updateMany({
            where: {
                OR: [
                    { url: { contains: 'localhost' } },
                    { url: { contains: 'blob:' } }
                ]
            },
            data: {
                url: 'https://www.fuymedia.org/placeholder.png' // Safe fallback
            }
        });
        if (count > 0) console.log(`Fixed ${count} bad Media URLs.`);
    } catch (e) { }

    // Fix Profiles
    try {
        const { count } = await prisma.profile.updateMany({
            where: {
                OR: [
                    { avatarUrl: { contains: 'localhost' } },
                    { avatarUrl: { contains: 'blob:' } }
                ]
            },
            data: { avatarUrl: null }
        });
        if (count > 0) console.log(`Fixed ${count} bad Profile avatars.`);
    } catch (e) { }


    console.log('DB Fix Complete.');
}

main()
    .catch(e => console.error('Fatal Error: ' + e.message))
    .finally(async () => {
        await prisma.$disconnect();
    });


import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const LOG_FILE = 'scripts/db-check-results.txt';

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function main() {
    fs.writeFileSync(LOG_FILE, 'Starting DB Check...\n');
    log('Checking for bad URLs in database...');

    try {
        // Check Media table (Centralized media)
        const badMedia = await prisma.media.findMany({
            where: {
                url: {
                    contains: 'localhost'
                }
            },
            select: { id: true, url: true, type: true, userId: true }
        });

        // Also check for blob:
        const blobMedia = await prisma.media.findMany({
            where: {
                url: {
                    contains: 'blob:'
                }
            },
            select: { id: true, url: true, type: true, userId: true }
        });

        const allBadMedia = [...badMedia, ...blobMedia];

        if (allBadMedia.length > 0) {
            log('Found bad Media: ' + JSON.stringify(allBadMedia, null, 2));
        } else {
            log('No bad Media found.');
        }
    } catch (e: any) { log('Error checking Media: ' + e.message); }

    try {
        // Check User Profiles
        const badProfiles = await prisma.profile.findMany({
            where: {
                OR: [
                    { avatarUrl: { contains: 'localhost' } },
                    { avatarUrl: { contains: 'blob:' } },
                    { coverImageUrl: { contains: 'localhost' } },
                    { coverImageUrl: { contains: 'blob:' } },
                    { coverVideoUrl: { contains: 'localhost' } },
                    { coverVideoUrl: { contains: 'blob:' } }
                ]
            },
            select: { userId: true, avatarUrl: true, coverImageUrl: true, coverVideoUrl: true }
        });

        if (badProfiles.length > 0) {
            log('Found bad Profiles: ' + JSON.stringify(badProfiles, null, 2));
        } else {
            log('No bad Profiles found.');
        }
    } catch (e: any) { log('Error checking Profiles: ' + e.message); }

    // Check Chan
    try {
        const badChans = await prisma.chan.findMany({
            where: {
                OR: [
                    { coverImageUrl: { contains: 'localhost' } },
                    { coverImageUrl: { contains: 'blob:' } }
                ]
            },
            select: { id: true, coverImageUrl: true }
        });
        if (badChans.length > 0) log('Found bad Chan: ' + JSON.stringify(badChans, null, 2));
        else log('No bad Chan found.');
    } catch (e: any) { log('Error checking Chan: ' + e.message); }

    // Lill
    try {
        const badLills = await prisma.lill.findMany({
            where: {
                OR: [
                    { thumbnailUrl: { contains: 'localhost' } },
                    { thumbnailUrl: { contains: 'blob:' } }
                ]
            },
            select: { id: true, thumbnailUrl: true }
        });
        if (badLills.length > 0) log('Found bad Lill: ' + JSON.stringify(badLills, null, 2));
        else log('No bad Lill found.');
    } catch (e) { }

    // Fill
    try {
        const badFills = await prisma.fill.findMany({
            where: {
                OR: [
                    { thumbnailUrl: { contains: 'localhost' } },
                    { thumbnailUrl: { contains: 'blob:' } }
                ]
            },
            select: { id: true, thumbnailUrl: true }
        });
        if (badFills.length > 0) log('Found bad Fill: ' + JSON.stringify(badFills, null, 2));
        else log('No bad Fill found.');
    } catch (e) { }

    // Aud
    try {
        const badAuds = await prisma.aud.findMany({
            where: {
                OR: [
                    { coverImageUrl: { contains: 'localhost' } },
                    { coverImageUrl: { contains: 'blob:' } }
                ]
            },
            select: { id: true, coverImageUrl: true }
        });
        if (badAuds.length > 0) log('Found bad Aud: ' + JSON.stringify(badAuds, null, 2));
        else log('No bad Aud found.');
    } catch (e) { }
}

main()
    .catch(e => log('Fatal Error: ' + e.message))
    .finally(async () => {
        await prisma.$disconnect();
    });


import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();

const accountId = process.env.R2_ACCOUNT_ID || '';
const cleanAccountId = accountId.replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com$/, '');
const R2_BUCKET = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${cleanAccountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

const SUPABASE_URL_KEYWORD = 'supabase.co/storage';

async function migrateUrl(oldUrl: string, userId: string, type: 'images' | 'videos' | 'audio'): Promise<string | null> {
    if (!oldUrl || !oldUrl.includes(SUPABASE_URL_KEYWORD)) return null;

    try {
        console.log(`Downloading: ${oldUrl}`);
        const response = await fetch(oldUrl);
        if (!response.ok) {
            console.error(`Failed to download ${oldUrl}: ${response.status}`);
            return null;
        }

        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        const filename = oldUrl.split('/').pop()?.split('?')[0] || `file-${Date.now()}`;
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const key = `${userId}/${type}/${Date.now()}-${sanitizedFilename}`;

        await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        }));

        const newUrl = R2_PUBLIC_DOMAIN ? `${R2_PUBLIC_DOMAIN}/${key}` : key;
        console.log(`  -> Migrated: ${newUrl}`);
        return newUrl;
    } catch (e) {
        console.error(`Error migrating ${oldUrl}:`, e);
        return null;
    }
}

async function migratePlanTable() {
    console.log('\n--- Migrating Plan Table (mediaUrls JSON) ---');
    const plans = await prisma.plan.findMany({
        where: { mediaUrls: { contains: SUPABASE_URL_KEYWORD } }
    });
    console.log(`Found ${plans.length} plans with legacy mediaUrls.`);

    for (const plan of plans) {
        if (!plan.mediaUrls) continue;
        try {
            const urls = JSON.parse(plan.mediaUrls);
            if (!Array.isArray(urls)) continue;

            const newUrls = [];
            let changed = false;
            for (const url of urls) {
                if (typeof url === 'string' && url.includes(SUPABASE_URL_KEYWORD)) {
                    // Determine type based on extension or assume image?
                    const isVideo = url.match(/\.(mp4|mov|webm)$/i);
                    const newUrl = await migrateUrl(url, plan.creatorId, isVideo ? 'videos' : 'images');
                    if (newUrl) {
                        newUrls.push(newUrl);
                        changed = true;
                    } else {
                        newUrls.push(url); // Keep old if failed
                    }
                } else {
                    newUrls.push(url);
                }
            }

            if (changed) {
                await prisma.plan.update({
                    where: { id: plan.id },
                    data: { mediaUrls: JSON.stringify(newUrls) }
                });
            }
        } catch (e) {
            console.error(`Failed to parse/migrate plan ${plan.id}:`, e);
        }
    }
}

async function migrateMiscTables() {
    console.log('\n--- Migrating Misc Tables (Show, Episode, Chan, Aud, Lill, Fill) ---');

    // 1. Show coverUrl
    const shows = await prisma.show.findMany({ where: { coverUrl: { contains: SUPABASE_URL_KEYWORD } } });
    for (const s of shows) {
        if (!s.coverUrl) continue;
        // Need user ID? Show doesn't have direct userId usually, linked to Chan -> Post -> User?
        // Let's use 'system' or fetch creator.
        // Chan has postId -> Post has userId.
        // Too complex for now, use 'migrated-content' as userId placeholder or 'system'.
        const newUrl = await migrateUrl(s.coverUrl, 'system-migration', 'images');
        if (newUrl) await prisma.show.update({ where: { id: s.id }, data: { coverUrl: newUrl } });
    }

    // 2. Episode
    const episodes = await prisma.episode.findMany({
        where: {
            OR: [
                { coverUrl: { contains: SUPABASE_URL_KEYWORD } },
                { trailerUrl: { contains: SUPABASE_URL_KEYWORD } },
                { videoUrl: { contains: SUPABASE_URL_KEYWORD } }
            ]
        }
    });

    for (const ep of episodes) {
        let updateData: any = {};
        if (ep.coverUrl && ep.coverUrl.includes(SUPABASE_URL_KEYWORD)) {
            const u = await migrateUrl(ep.coverUrl, 'system-migration', 'images');
            if (u) updateData.coverUrl = u;
        }
        if (ep.trailerUrl && ep.trailerUrl.includes(SUPABASE_URL_KEYWORD)) {
            const u = await migrateUrl(ep.trailerUrl, 'system-migration', 'videos');
            if (u) updateData.trailerUrl = u;
        }
        if (ep.videoUrl && ep.videoUrl.includes(SUPABASE_URL_KEYWORD)) {
            const u = await migrateUrl(ep.videoUrl, 'system-migration', 'videos');
            if (u) updateData.videoUrl = u;
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.episode.update({ where: { id: ep.id }, data: updateData });
        }
    }

    // 3. Chan
    const chans = await prisma.chan.findMany({ where: { coverImageUrl: { contains: SUPABASE_URL_KEYWORD } } });
    for (const c of chans) {
        if (!c.coverImageUrl) continue;
        const newUrl = await migrateUrl(c.coverImageUrl, 'system-migration', 'images');
        if (newUrl) await prisma.chan.update({ where: { id: c.id }, data: { coverImageUrl: newUrl } });
    }

    // 4. Aud (Cover)
    const auds = await prisma.aud.findMany({ where: { coverImageUrl: { contains: SUPABASE_URL_KEYWORD } } });
    for (const a of auds) {
        if (!a.coverImageUrl) continue;
        // Aud -> Post -> User
        // Need fetch post to get userId? 
        // Or just use 'system-migration'.
        const newUrl = await migrateUrl(a.coverImageUrl, 'system-migration', 'images');
        if (newUrl) await prisma.aud.update({ where: { id: a.id }, data: { coverImageUrl: newUrl } });
    }

    // 5. Lill (Thumbnail)
    const lills = await prisma.lill.findMany({ where: { thumbnailUrl: { contains: SUPABASE_URL_KEYWORD } } });
    for (const l of lills) {
        if (!l.thumbnailUrl) continue;
        const newUrl = await migrateUrl(l.thumbnailUrl, 'system-migration', 'images');
        if (newUrl) await prisma.lill.update({ where: { id: l.id }, data: { thumbnailUrl: newUrl } });
    }

    // 6. Fill (Thumbnail, Subtitles)
    const fills = await prisma.fill.findMany({ where: { thumbnailUrl: { contains: SUPABASE_URL_KEYWORD } } });
    for (const f of fills) {
        if (!f.thumbnailUrl) continue;
        const newUrl = await migrateUrl(f.thumbnailUrl, 'system-migration', 'images');
        if (newUrl) await prisma.fill.update({ where: { id: f.id }, data: { thumbnailUrl: newUrl } });
    }
}

async function main() {
    console.log('Starting Migration Part 2...');
    try {
        await migratePlanTable();
        await migrateMiscTables();
        console.log('\nMigration Part 2 Complete!');
    } catch (e) {
        console.error('\nMigration Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

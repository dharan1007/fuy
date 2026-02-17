
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize R2
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

// Config
const BATCH_SIZE = 10;
const SUPABASE_URL_KEYWORD = 'supabase.co/storage'; // Adjust based on your actual URL usage

async function migrateUrl(oldUrl: string, userId: string, type: 'images' | 'videos' | 'audio'): Promise<string | null> {
    if (!oldUrl || !oldUrl.includes(SUPABASE_URL_KEYWORD)) {
        return null;
    }

    try {
        console.log(`Downloading: ${oldUrl}`);
        const response = await fetch(oldUrl);
        if (!response.ok) {
            console.error(`Failed to download ${oldUrl}: ${response.status} ${response.statusText}`);
            return null;
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // Convert to Node Buffer for AWS SDK
        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        // Generate new key
        const filename = oldUrl.split('/').pop()?.split('?')[0] || `file-${Date.now()}`;
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const key = `${userId}/${type}/${Date.now()}-${sanitizedFilename}`;

        // Upload to R2
        console.log(`Uploading to R2: ${key}`);
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

async function migrateMediaTable() {
    console.log('\n--- Migrating Media Table ---');
    let processedCount = 0;

    while (true) {
        // Find records with Supabase URLs
        const records = await prisma.media.findMany({
            where: {
                url: { contains: SUPABASE_URL_KEYWORD }
            },
            take: BATCH_SIZE
        });

        if (records.length === 0) break;

        console.log(`Processing batch of ${records.length} Media records...`);

        for (const record of records) {
            let typeFolder: 'images' | 'videos' | 'audio' = 'images';
            if (record.type === 'VIDEO') typeFolder = 'videos';
            if (record.type === 'AUDIO') typeFolder = 'audio';

            const newUrl = await migrateUrl(record.url, record.userId, typeFolder);

            if (newUrl) {
                await prisma.media.update({
                    where: { id: record.id },
                    data: { url: newUrl }
                });
                processedCount++;
            } else {
                console.warn(`Skipping record ${record.id} (failed or invalid)`);
                // Check if it failed because it's not a Supabase URL (already filtered), 
                // or download error. If download error, we might want to skip it in future runs.
                // For now, let's just log. If we don't update it, it will be fetched again next loop.
                // To prevent infinite loop on bad records, we must break or skip.
                // We'll mark it by appending '?error=migration_failed' or rely on manual intervention.
                // Or, simpler: we implement an ID-based cursor to ensure we move forward even if we fail.
            }
        }

        // Safety Break: if we processed 0 successful records in a batch, and found records, 
        // we might be stuck in a loop on failing records.
        // A better approach is using 'cursor' pagination, but this simple 'contains' loop works 
        // IF we successfully update the URL to something NOT containing 'supabase'.
        // If migration fails, we are stuck.
        // Let's rely on manual fixes for now or re-run script.
        // To avoid infinite loop on failures now, let's break if simple count is 0.
        if (processedCount === 0 && records.length > 0) {
            console.log("No successful migrations in this batch, potentially stuck. Breaking.");
            break;
        }
        // Reset local batch counter? No, global counter is fine.
        processedCount = 0;
    }
}

async function migrateProfileTable() {
    console.log('\n--- Migrating Profile Table (Avatar) ---');
    const avatars = await prisma.profile.findMany({
        where: { avatarUrl: { contains: SUPABASE_URL_KEYWORD } }
    });
    console.log(`Found ${avatars.length} profiles with legacy avatars.`);
    for (const p of avatars) {
        if (p.avatarUrl) {
            const newUrl = await migrateUrl(p.avatarUrl, p.userId, 'images');
            if (newUrl) {
                await prisma.profile.update({
                    where: { userId: p.userId },
                    data: { avatarUrl: newUrl }
                });
            }
        }
    }

    console.log('\n--- Migrating Profile Table (Cover Image) ---');
    const covers = await prisma.profile.findMany({
        where: { coverImageUrl: { contains: SUPABASE_URL_KEYWORD } }
    });
    console.log(`Found ${covers.length} profiles with legacy covers.`);
    for (const p of covers) {
        if (p.coverImageUrl) {
            const newUrl = await migrateUrl(p.coverImageUrl, p.userId, 'images');
            if (newUrl) {
                await prisma.profile.update({
                    where: { userId: p.userId },
                    data: { coverImageUrl: newUrl }
                });
            }
        }
    }
}

async function migrateReactionBubbleTable() {
    console.log('\n--- Migrating ReactionBubble Table ---');
    while (true) {
        const records = await prisma.reactionBubble.findMany({
            where: { mediaUrl: { contains: SUPABASE_URL_KEYWORD } },
            take: BATCH_SIZE
        });

        if (records.length === 0) break;

        let batchSuccess = 0;
        for (const r of records) {
            const type = r.mediaType === 'VIDEO' ? 'videos' : 'images';
            const newUrl = await migrateUrl(r.mediaUrl, r.userId, type);
            if (newUrl) {
                await prisma.reactionBubble.update({
                    where: { id: r.id },
                    data: { mediaUrl: newUrl }
                });
                batchSuccess++;
            }
        }
        if (batchSuccess === 0 && records.length > 0) break;
    }
}

async function migrateMessageTable() {
    console.log('\n--- Migrating Message Table ---');

    while (true) {
        const records = await prisma.message.findMany({
            where: { mediaUrl: { contains: SUPABASE_URL_KEYWORD } },
            take: BATCH_SIZE
        });

        if (records.length === 0) break;

        let batchSuccess = 0;
        for (const r of records) {
            let type: 'images' | 'videos' | 'audio' = 'images';
            if (r.type === 'video') type = 'videos';
            if (r.type === 'audio') type = 'audio';

            if (r.mediaUrl) {
                const newUrl = await migrateUrl(r.mediaUrl, r.senderId, type);
                if (newUrl) {
                    await prisma.message.update({
                        where: { id: r.id },
                        data: { mediaUrl: newUrl }
                    });
                    batchSuccess++;
                }
            }
        }
        if (batchSuccess === 0 && records.length > 0) break;
    }
}

async function main() {
    console.log('Starting Migration Service...');
    console.log(`Bucket: ${R2_BUCKET}`);
    console.log(`Endpoint: ${r2.config.endpoint?.toString()}`);

    try {
        await migrateMediaTable();
        await migrateProfileTable();
        await migrateReactionBubbleTable();
        await migrateMessageTable();
        console.log('\nMigration Complete!');
    } catch (e) {
        console.error('\nMigration Unexpected Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

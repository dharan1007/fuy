
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

import path from 'path';

import fs from 'fs';

// Load environment variables manually to avoid dependency issues
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
}

const prisma = new PrismaClient();

// Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!; // MUST be service role for Storage Admin
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// R2 Client
const accountId = process.env.R2_ACCOUNT_ID || '';
const cleanAccountId = accountId.replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com$/, '');

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${cleanAccountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME!;
const SUPABASE_BUCKET = 'media';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN!; // e.g. https://pub-xxx.r2.dev

async function migrate() {
    console.log('🚀 Starting Migration: Supabase -> Cloudflare R2');

    // 1. List all files in Supabase 'media' bucket
    console.log('📦 Listing files from Supabase...');
    let allFiles: any[] = [];
    let page = 0;
    const pageSize = 100;

    // Recursive listing (Supabase list limits to 100 usually, but let's try a loop if folders/pagination needed)
    // Actually, supabase.storage.from().list() is per folder.
    // If we have folders (userId/folder/...), we need to traverse.
    // Simplifying assumption: We will list root folders (users) then subfolders? 
    // Or does list('') return everything? Usually no.
    // Hack: We can query the DB 'Media' table to get the paths!

    // Strategy: Use DB as source of truth for paths to migrate.
    // PLUS verify if they exist in Supabase.

    const mediaRecords = await prisma.media.findMany();
    console.log(`Found ${mediaRecords.length} media records in DB`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const media of mediaRecords) {
        // Extract path from URL
        // URL format: https://[project].supabase.co/storage/v1/object/public/media/[path]
        const supabasePrefix = `${supabaseUrl}/storage/v1/object/public/${SUPABASE_BUCKET}/`;

        if (!media.url.includes(supabasePrefix)) {
            // Already R2 or external?
            if (media.url.includes(R2_PUBLIC_DOMAIN)) {
                // console.log(`Skipping ${media.id} (Already R2)`);
                skippedCount++;
            } else {
                console.warn(`⚠️ Unknown URL format for media ${media.id}: ${media.url}`);
            }
            continue;
        }

        const filePath = media.url.replace(supabasePrefix, '');
        console.log(`Processing: ${filePath}`);

        try {
            // 2. Download from Supabase
            const { data: fileData, error: downloadError } = await supabase.storage
                .from(SUPABASE_BUCKET)
                .download(filePath);

            if (downloadError) {
                console.error(`❌ Failed to download ${filePath}:`, downloadError.message);
                failCount++;
                continue;
            }

            // 3. Upload to R2 (Only if it doesn't already exist)
            try {
                await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: filePath }));
                // If this succeeds, the file already exists in R2. Skip upload.
                // console.log(`⏩ Already in R2: ${filePath}`);
            } catch (headError: any) {
                // File does not exist in R2 (or error checking), safe to upload
                if (headError.name === 'NotFound' || headError.$metadata?.httpStatusCode === 404) {
                    const buffer = Buffer.from(await fileData.arrayBuffer());
                    const contentType = media.mimeType || fileData.type || 'application/octet-stream';

                    await r2.send(new PutObjectCommand({
                        Bucket: R2_BUCKET,
                        Key: filePath,
                        Body: buffer,
                        ContentType: contentType,
                    }));
                } else {
                    throw headError; // Rethrow unexpected errors (like auth issues)
                }
            }

            // 4. Update Database Record
            const newUrl = `${R2_PUBLIC_DOMAIN}/${filePath}`;
            await prisma.media.update({
                where: { id: media.id },
                data: { url: newUrl }
            });

            // console.log(`✅ Migrated: ${filePath}`);
            successCount++;

        } catch (e: any) {
            console.error(`❌ Error migrating ${filePath}:`, e.message);
            failCount++;
        }
    }

    // Also handle Profile avatars/covers
    console.log('👤 Checking Profiles...');
    const profiles = await prisma.profile.findMany();
    for (const profile of profiles) {
        await migrateField(profile, 'avatarUrl', 'profile', 'userId', profile.userId); // Model name lowercase for dynamic access if needed, but here we iterate
        await migrateField(profile, 'coverImageUrl', 'profile', 'userId', profile.userId);
        // StalkMe... (JSON parsing needed, TODO: check structure)
        if (profile.stalkMe) {
            try {
                const stalkMe = JSON.parse(profile.stalkMe);
                let modified = false;
                if (Array.isArray(stalkMe)) {
                    for (const item of stalkMe) {
                        if (item.url && item.url.includes(`${supabaseUrl}/storage/v1/object/public/${SUPABASE_BUCKET}/`)) {
                            const newUrl = await migrateUrl(item.url);
                            if (newUrl) {
                                item.url = newUrl;
                                modified = true;
                            }
                        }
                    }
                }
                if (modified) {
                    await prisma.profile.update({
                        where: { userId: profile.userId },
                        data: { stalkMe: JSON.stringify(stalkMe) }
                    });
                    console.log(`✅ Updated Profile.stalkMe for ${profile.userId}`);
                }
            } catch (e) { }
        }
    }

    // Lill
    console.log('🎥 Checking Lills...');
    const lills = await prisma.lill.findMany();
    for (const item of lills) {
        await migrateField(item, 'thumbnailUrl', 'lill', 'id', item.id);
        await migrateField(item, 'musicUrl', 'lill', 'id', item.id);
    }

    // Fill
    console.log('🎬 Checking Fills...');
    const fills = await prisma.fill.findMany();
    for (const item of fills) {
        await migrateField(item, 'thumbnailUrl', 'fill', 'id', item.id);
        await migrateField(item, 'subtitlesUrl', 'fill', 'id', item.id);
    }

    // Aud
    console.log('🎧 Checking Auds...');
    const auds = await prisma.aud.findMany();
    for (const item of auds) {
        await migrateField(item, 'coverImageUrl', 'aud', 'id', item.id);
    }

    // Chan
    console.log('📺 Checking Chans...');
    const chans = await prisma.chan.findMany();
    for (const item of chans) {
        await migrateField(item, 'coverImageUrl', 'chan', 'id', item.id);
    }

    // FeedItem
    console.log('📰 Checking FeedItems...');
    const feedItems = await prisma.feedItem.findMany();
    for (const item of feedItems) {
        await migrateField(item, 'authorAvatarUrl', 'feedItem', 'id', item.id);

        // mediaPreviews JSON
        if (item.mediaPreviews) {
            try {
                const previews = JSON.parse(item.mediaPreviews);
                let modified = false;
                if (Array.isArray(previews)) {
                    for (const prev of previews) {
                        if (prev.url && prev.url.includes(`${supabaseUrl}/storage/v1/object/public/${SUPABASE_BUCKET}/`)) {
                            const newUrl = await migrateUrl(prev.url);
                            if (newUrl) {
                                prev.url = newUrl;
                                modified = true;
                            }
                        }
                    }
                }
                if (modified) {
                    await prisma.feedItem.update({
                        where: { id: item.id },
                        data: { mediaPreviews: JSON.stringify(previews) }
                    });
                    // console.log(`✅ Updated FeedItem.mediaPreviews for ${item.id}`);
                }
            } catch (e) { }
        }
    }

    console.log('✅ Migration Complete');
    console.log(`Success: ${successCount}, Failed: ${failCount}, Skipped: ${skippedCount}`);

    // NOTE: Deletion is separate. Better to verify first.
}

// Helper to reuse the download/upload logic for a single URL string
async function migrateUrl(url: string): Promise<string | null> {
    const supabasePrefix = `${supabaseUrl}/storage/v1/object/public/${SUPABASE_BUCKET}/`;
    if (!url.startsWith(supabasePrefix)) return null;

    const filePath = url.replace(supabasePrefix, '');

    // Check if already migrated? (Not easy without checking R2, but we assume if we are here we need to migrate)
    // Optimization: check if we already processed this filePath in this run? 
    // For now, just try to download/upload. R2 overwrite is fine.

    try {
        const { data: fileData, error } = await supabase.storage.from(SUPABASE_BUCKET).download(filePath);
        if (error) {
            // console.error(`Failed to download ${filePath}: ${error.message}`);
            return null;
        }

        const buffer = Buffer.from(await fileData.arrayBuffer());
        await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: filePath,
            Body: buffer,
            ContentType: fileData.type || 'image/jpeg',
        }));

        return `${R2_PUBLIC_DOMAIN}/${filePath}`;
    } catch (e) {
        return null;
    }
}

async function migrateField(record: any, field: string, model: string, idField: string, idValue: string) {
    const url = record[field];
    if (!url || typeof url !== 'string') return;

    const newUrl = await migrateUrl(url);
    if (newUrl) {
        // @ts-ignore
        await prisma[model].update({
            where: { [idField]: idValue },
            data: { [field]: newUrl }
        });
        console.log(`✅ Updated ${model}.${field}`);
    }
}

migrate()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

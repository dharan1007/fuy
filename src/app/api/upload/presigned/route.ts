// src/app/api/upload/presigned/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/session';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { userRateLimit } from '@/lib/rate-limit';

const accountId = process.env.R2_ACCOUNT_ID || '';
const cleanAccountId = accountId.replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com$/, '');

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${cleanAccountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
    // Prevent "bucket.account.r2..." domain generation which can fail DNS or be malformed
    forcePathStyle: true,
});

// Rate limit: 50 uploads per hour
const limiter = userRateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 50,
    getUser: (req) => req.headers.get('x-user-id')
});

async function uploadHandler(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const { filename, contentType, type } = await req.json();

        if (!filename || !contentType || !type) {
            return NextResponse.json({ error: 'Missing filename, contentType, or type' }, { status: 400 });
        }

        // 1. Validate Media Type
        const allowedTypes = ['image/', 'video/', 'audio/'];
        if (!allowedTypes.some(t => contentType.startsWith(t))) {
            return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
        }

        // 2. Validate declared type matches content type
        if (type === 'IMAGE' && !contentType.startsWith('image/')) return NextResponse.json({ error: 'Type mismatch' }, { status: 400 });
        if (type === 'VIDEO' && !contentType.startsWith('video/')) return NextResponse.json({ error: 'Type mismatch' }, { status: 400 });
        if (type === 'AUDIO' && !contentType.startsWith('audio/')) return NextResponse.json({ error: 'Type mismatch' }, { status: 400 });

        // 3. Sanitize Filename
        const baseFilename = filename.split('/').pop() || 'file';
        const sanitizedFilename = baseFilename.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const timestamp = Date.now();

        // 4. Structure Key: userId/{type}s/{timestamp}-{filename}
        // Pluralize type: 'IMAGE' -> 'images', 'VIDEO' -> 'videos'
        const folder = type.toLowerCase() + 's';
        const key = `${userId}/${folder}/${timestamp}-${sanitizedFilename}`;

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        // Generate a pre-signed URL that expires in 1 hour
        const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

        const publicDomain = process.env.R2_PUBLIC_DOMAIN || '';
        const publicUrl = publicDomain ? `${publicDomain}/${key}` : '';

        return NextResponse.json({
            signedUrl,
            publicUrl,
            key,
            provider: 'r2'
        });
    } catch (error: any) {
        console.error('Presigned URL error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate presigned URL' },
            { status: 500 }
        );
    }
}

export const POST = limiter(uploadHandler);

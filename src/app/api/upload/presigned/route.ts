// src/app/api/upload/presigned/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/session';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const { filename, contentType } = await req.json();

        if (!filename || !contentType) {
            return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
        }

        // 1. Validate Media Type
        const allowedTypes = ['image/', 'video/', 'audio/'];
        if (!allowedTypes.some(type => contentType.startsWith(type))) {
            return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
        }

        // 2. Sanitize Filename (remove .., /, etc. to prevent path traversal within the user's scope)
        // We'll allow alphanumeric, dashes, dots, and underscores.
        const baseFilename = filename.split('/').pop() || 'file'; // Get just the filename
        const sanitizedFilename = baseFilename.replace(/[^a-zA-Z0-9.\-_]/g, '');

        // 3. Force isolation by prefixing with userId
        // The final key will always be "userId/pathPrefix/timestamp-sanitizedFilename"
        // But the client sends "pathPrefix/timestamp-filename"
        const parts = filename.split('/');
        const prefix = parts.length > 1 ? parts.slice(0, -1).join('/') : 'uploads';
        const safeFilename = `${userId}/${prefix}/${sanitizedFilename}`;

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: safeFilename,
            ContentType: contentType,
        });

        // Generate a pre-signed URL that expires in 1 hour
        const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

        const publicDomain = process.env.R2_PUBLIC_DOMAIN || '';
        const publicUrl = publicDomain ? `${publicDomain}/${safeFilename}` : '';

        return NextResponse.json({
            signedUrl,
            publicUrl,
            key: safeFilename
        });
    } catch (error: any) {
        console.error('Presigned URL error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate presigned URL' },
            { status: 500 }
        );
    }
}

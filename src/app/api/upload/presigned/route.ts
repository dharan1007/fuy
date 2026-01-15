// src/app/api/upload/presigned/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/session';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { userRateLimit } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { prisma } from '@/lib/prisma';

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
    const start = Date.now();
    console.log('[API] /upload/presigned called');
    try {
        let userId: string | null = null;

        // 1. Try Authorization Header (for mobile/API clients)
        const authHeader = req.headers.get('Authorization');
        console.log('[API] Auth header present:', !!authHeader);

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            console.log('[API] Verifying Supabase token...');
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            console.log('[API] Token verification result:', { hasUser: !!user, error: error?.message });

            if (user && !error) {
                // Verify user exists in Prisma DB (sync check) - assumes DB triggers keep them in sync
                // Or just trust the ID since it matches
                userId = user.id;
            } else {
                console.warn('[API] Invalid JWT token:', error);
            }
        }

        // 2. Fallback to Web Session (cookies)
        if (!userId) {
            console.log('[API] Checking web session...');
            try {
                userId = await requireUserId();
                console.log('[API] Web session found for:', userId);
            } catch (e) {
                console.log('[API] No web session');
            }
        }

        if (!userId) {
            console.log('[API] Unauthorized request');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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

        const response = NextResponse.json({
            signedUrl,
            publicUrl,
            key,
            provider: 'r2'
        });

        // Add CORS headers to response
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return response;
    } catch (error: any) {
        console.error('Presigned URL error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate presigned URL' },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

// Bypass limiter for now to debug
export const POST = uploadHandler;

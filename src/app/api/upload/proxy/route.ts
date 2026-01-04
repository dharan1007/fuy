
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs'; // Required for buffer manipulation

const accountId = process.env.R2_ACCOUNT_ID || '';
const cleanAccountId = accountId.replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com$/, '');

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${cleanAccountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
    // Important: Force path style for R2
    forcePathStyle: true,
});

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string || 'IMAGE';

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Structure Key similar to presigned route
        const timestamp = Date.now();
        const folder = type.toLowerCase() + 's';
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const key = `${user.id}/${folder}/${timestamp}-${sanitizedFilename}`;
        const contentType = file.type || 'image/jpeg';

        const uploadParams = {
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        };

        // Upload to R2
        await r2.send(new PutObjectCommand(uploadParams));

        const publicDomain = process.env.R2_PUBLIC_DOMAIN || '';
        // Same logic as presigned: if domain exists, combine it. Else maybe just return key?
        // Actually uploadFileClientSide expects a full URL if possible.
        // If publicDomain is missing, returning empty string or just the key might be confusing.
        // But the presigned route did exactly that: `const publicUrl = publicDomain ? ... : '';`
        // We will follow suit but maybe fallback to a 'safe' guess or error if critical?
        // Ideally user has R2_PUBLIC_DOMAIN set.

        const publicUrl = publicDomain ? `${publicDomain}/${key}` : key;

        return NextResponse.json({ url: publicUrl });

    } catch (error: any) {
        console.error("Proxy upload failed:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}

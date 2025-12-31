export const dynamic = 'force-dynamic';
// src/app/api/upload/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/session';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE) {
  console.warn('⚠️ WARNING: SUPABASE_SERVICE_ROLE is missing. Uploads may fail due to RLS policies.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize R2 Client
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const FILE_SIZE_LIMITS = {
  image: 20 * 1024 * 1024, // 20MB
  video: 2 * 1024 * 1024 * 1024, // 2GB
  audio: 100 * 1024 * 1024, // 100MB
};

const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-m4a'],
};

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'image' | 'video' | 'audio';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type || !['image', 'video', 'audio'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Validate file size
    if (file.size > FILE_SIZE_LIMITS[type]) {
      const limitMB = FILE_SIZE_LIMITS[type] / (1024 * 1024);
      return NextResponse.json(
        { error: `File size exceeds ${limitMB}MB limit` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES[type].includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES[type].join(', ')}` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop();
    const filename = `${userId}/${type}s/${timestamp}-${randomStr}.${ext}`;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // --- HYBRID UPLOAD STRATEGY ---

    // 1. IF VIDEO OR AUDIO -> Upload to Cloudflare R2
    // This covers "Fills" (Video), "Chans" (Video), and "Auds" (Audio)
    if (type === 'video' || type === 'audio') {
      try {
        await r2.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: filename,
          Body: buffer,
          ContentType: file.type,
        }));

        // Construct Public URL
        const publicDomain = process.env.R2_PUBLIC_DOMAIN || '';
        const publicUrl = publicDomain ? `${publicDomain}/${filename}` : '';

        if (!publicUrl) {
          console.warn('R2_PUBLIC_DOMAIN not set, returning empty URL');
        }

        return NextResponse.json({
          success: true,
          url: publicUrl,
          path: filename,
          type,
          size: file.size,
          provider: 'r2'
        });

      } catch (r2Error: any) {
        console.error('R2 Upload Error:', r2Error);
        return NextResponse.json({ error: `${type} upload failed` }, { status: 500 });
      }
    }

    // 2. IF IMAGE -> Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);

      // Check for RLS error
      if (error.message.includes('row-level security') || (error as any).statusCode === '403') {
        return NextResponse.json({
          error: 'Upload failed: Row-Level Security violation. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env file to allow server-side uploads.'
        }, { status: 500 });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filename);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filename,
      type,
      size: file.size,
      provider: 'supabase'
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove files
export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 });
    }

    // Verify the file belongs to the user
    if (!path.startsWith(`${userId}/`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase.storage.from('media').remove([path]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Delete failed' },
      { status: 500 }
    );
  }
}


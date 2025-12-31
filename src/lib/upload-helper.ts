import { supabase } from './supabase-client';

export async function uploadFileClientSide(file: File, pathPrefix: string): Promise<string> {
    const isLargeFile = file.type.startsWith('video/') || file.type.startsWith('audio/');

    // 1. IF VIDEO OR AUDIO -> Upload to Cloudflare R2 using Presigned URL
    if (isLargeFile) {
        const res = await fetch('/api/upload/presigned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: `${pathPrefix}/${Date.now()}-${file.name}`,
                contentType: file.type
            })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to get presigned URL');
        }

        const { signedUrl, publicUrl } = await res.json();

        const uploadRes = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type }
        });

        if (!uploadRes.ok) {
            throw new Error('Failed to upload to R2');
        }

        return publicUrl;
    }

    // 2. IF IMAGE -> Upload to Supabase Storage (standard for images in this app)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop();
    const filename = `${pathPrefix}/${timestamp}-${randomStr}.${ext}`;

    const { data, error } = await supabase.storage
        .from('media')
        .upload(filename, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error("Upload error:", error);
        throw new Error(error.message);
    }

    const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filename);

    return publicUrl;
}

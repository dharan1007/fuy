// upload-helper.ts - Upload via Cloudflare R2 (Primary Storage)
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { getApiUrl } from './api';

// Compress image to reduce upload size
async function compressImage(uri: string): Promise<string> {
    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1080 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        return result.uri;
    } catch (e) {
        console.warn('[upload-helper] Image compression failed, using original:', e);
        return uri;
    }
}

/**
 * Upload via Vercel presigned URL to Cloudflare R2.
 */
async function uploadViaPresigned(
    uri: string,
    filename: string,
    contentType: string,
    type: string
): Promise<{ url: string; path: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const userId = session?.user?.id;

    if (!token) {
        throw new Error('Not authenticated. Please log in to upload files.');
    }

    const apiUrl = getApiUrl();
    console.log(`[upload-helper] Requesting presigned URL from ${apiUrl}/api/upload/presigned`);

    let presignedResponse: Response | null = null;
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        presignedResponse = await fetch(`${apiUrl}/api/upload/presigned`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': 'application/json, text/plain, */*',
                ...(userId ? { 'x-user-id': userId } : {})
            },
            body: JSON.stringify({ filename, contentType, type }),
        });

        if (presignedResponse.status === 429 && attempt < maxRetries) {
            const retryAfter = presignedResponse.headers.get('Retry-After');
            const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt + 1) * 1500;
            console.warn(`[upload-helper] Rate limited (429). Waiting ${waitMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
        }
        break;
    }

    if (!presignedResponse || !presignedResponse.ok) {
        const body = presignedResponse ? await presignedResponse.text() : 'No response';
        throw new Error(`Failed to get upload URL: ${presignedResponse?.status || 'unknown'} - ${body}`);
    }

    const { signedUrl, publicUrl, key } = await presignedResponse.json();

    const uploadResult = await FileSystem.uploadAsync(signedUrl, uri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': contentType },
        uploadType: 1 as any,
    });

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(`R2 upload failed with status ${uploadResult.status}`);
    }

    return { url: publicUrl, path: key };
}

/**
 * Main export: Upload a file to Cloudflare R2 Storage.
 */
export async function uploadMedia(
    fileUri: string,
    type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' = 'IMAGE'
): Promise<{ url: string; path: string }> {
    let processedUri = fileUri;
    const isEncrypted = fileUri.endsWith('.enc');

    // Compress images before upload (Skip if it's already an encrypted binary blob)
    if (type === 'IMAGE' && !isEncrypted) {
        processedUri = await compressImage(fileUri);
    }

    let ext = fileUri.split('.').pop()?.toLowerCase() || 'bin';
    if (isEncrypted) {
        ext = 'enc';
    } else if (type === 'IMAGE') {
        ext = 'jpg';
    }

    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    const contentTypeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
        mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
        mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
        pdf: 'application/pdf', txt: 'text/plain', zip: 'application/zip',
        enc: 'image/jpeg', 
    };
    const contentType = contentTypeMap[ext] || 'image/jpeg';

    console.log('[upload-helper] Attempting R2 presigned upload...');
    const result = await uploadViaPresigned(processedUri, filename, contentType, type);
    console.log('[upload-helper] R2 upload success:', result.url);
    return result;
}

// Export alias for backwards compatibility
export const uploadFileToR2 = uploadMedia;

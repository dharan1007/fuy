// upload-helper.ts - Cloudflare R2 Upload via Presigned URLs
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy'; // Use legacy API for streaming uploads
import { supabase } from './supabase';
import { getApiUrl } from './api';

// Compress image to reduce upload time
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
 * Upload a file to Cloudflare R2 via presigned URL
 * Uses the /api/upload/presigned endpoint to get a secure upload URL
 */
export async function uploadMedia(
    fileUri: string,
    type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' = 'IMAGE'
): Promise<{ url: string; path: string }> {
    let processedUri = fileUri;

    // Compress images before upload
    if (type === 'IMAGE') {
        processedUri = await compressImage(fileUri);
    }

    const ext = type === 'IMAGE' ? 'jpg' : (fileUri.split('.').pop()?.toLowerCase() || 'bin');
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    const contentTypeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
        mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
        mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
        pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        txt: 'text/plain', zip: 'application/zip',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    try {
        // 1. Get auth token for authenticated upload
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            throw new Error('Not authenticated. Please log in to upload files.');
        }

        // 2. Get presigned URL from API (with retry for rate limits)
        const apiUrl = getApiUrl();
        if (__DEV__) console.log(`[upload-helper] Requesting R2 presigned URL from ${apiUrl}/api/upload/presigned`);

        let presignedResponse: Response | null = null;
        const maxRetries = 3;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            presignedResponse = await fetch(`${apiUrl}/api/upload/presigned`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    filename,
                    contentType,
                    type,
                }),
            });

            if (presignedResponse.status === 429 && attempt < maxRetries) {
                // Rate limited -- wait and retry with exponential backoff
                const retryAfter = presignedResponse.headers.get('Retry-After');
                const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
                console.warn(`[upload-helper] Rate limited (429). Retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
                continue;
            }
            break;
        }

        if (!presignedResponse || !presignedResponse.ok) {
            const errorBody = presignedResponse ? await presignedResponse.text() : 'No response';
            console.error('[upload-helper] Presigned URL request failed:', presignedResponse?.status, errorBody);
            throw new Error(`Failed to get upload URL: ${presignedResponse?.status || 'unknown'}`);
        }

        const { signedUrl, publicUrl, key } = await presignedResponse.json();
        if (__DEV__) console.log('[upload-helper] Got R2 presigned URL, uploading to:', key);

        // 3. Upload directly to R2 using the presigned URL
        const uploadResult = await FileSystem.uploadAsync(signedUrl, processedUri, {
            httpMethod: 'PUT',
            headers: {
                'Content-Type': contentType,
            },
            uploadType: 1 as any, // FileSystemUploadType.BINARY_CONTENT = 1
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
            console.error('[upload-helper] R2 upload failed:', uploadResult.status, uploadResult.body);
            throw new Error(`R2 upload failed with status ${uploadResult.status}`);
        }

        if (__DEV__) console.log('[upload-helper] R2 upload success:', publicUrl);
        return { url: publicUrl, path: key };

    } catch (error: any) {
        console.error('[upload-helper] Upload error:', error);
        throw error;
    }
}

// Export alias for compatibility
export const uploadFileToR2 = uploadMedia;

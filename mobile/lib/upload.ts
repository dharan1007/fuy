// Mobile R2 Upload Helper
// Uses web API presigned URLs for Cloudflare R2 uploads

import { getApiUrl } from './api';

type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO';

function getMediaType(contentType: string): MediaType {
    if (contentType.startsWith('video/')) return 'VIDEO';
    if (contentType.startsWith('audio/')) return 'AUDIO';
    return 'IMAGE';
}

export interface UploadResult {
    publicUrl: string;
    key: string;
    provider: 'r2';
}

/**
 * Upload a file to Cloudflare R2 via presigned URL
 * Fast: Direct upload to R2, no server proxy
 */
export async function uploadToR2(
    file: { uri: string; name: string; type: string },
    authToken?: string
): Promise<UploadResult> {
    // 1. Get presigned URL from web API
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const API_BASE = getApiUrl();
    const presignedRes = await fetch(`${API_BASE}/api/upload/presigned`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            type: getMediaType(file.type),
        }),
    });

    if (!presignedRes.ok) {
        const err = await presignedRes.text();
        throw new Error(`Failed to get presigned URL: ${err}`);
    }

    const { signedUrl, publicUrl, key, provider } = await presignedRes.json();

    // 2. Fetch file as blob (fast for local files)
    const fileRes = await fetch(file.uri);
    const blob = await fileRes.blob();

    // 3. Upload directly to R2 (fast, no server proxy)
    const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': file.type,
        },
        body: blob,
    });

    if (!uploadRes.ok) {
        throw new Error(`Failed to upload to R2: ${uploadRes.status}`);
    }

    return { publicUrl, key, provider };
}

/**
 * Upload multiple files in parallel for speed
 */
export async function uploadMultipleToR2(
    files: Array<{ uri: string; name: string; type: string }>,
    authToken?: string
): Promise<UploadResult[]> {
    return Promise.all(files.map(file => uploadToR2(file, authToken)));
}

import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

export interface UploadResult {
    publicUrl: string;
    key: string;
    provider: 'r2';
}

/**
 * Upload a file to Cloudflare R2 via Supabase Edge Function
 */
export async function uploadToR2(
    file: { uri: string; name: string; type: string },
    authToken?: string // Unused, kept for compatibility
): Promise<UploadResult> {
    try {
        const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
        // Ensure unique filename
        const filename = file.name || `${Date.now()}_${Math.random().toString(36).substring(7)}.${type === 'image' ? 'jpg' : 'mp4'}`;

        // 1. Get Signed URL from Edge Function
        const { data, error } = await supabase.functions.invoke('upload-presigned', {
            body: {
                filename,
                contentType: file.type,
                type: type.toUpperCase() // 'IMAGE', 'VIDEO', 'AUDIO'
            }
        });

        if (error || !data) {
            throw new Error(`Failed to get signed URL: ${error?.message || 'No data returned'}`);
        }

        const { signedUrl, publicUrl, key } = data;

        // 2. Upload to R2 using the signed URL
        const uploadRes = await FileSystem.uploadAsync(signedUrl, file.uri, {
            httpMethod: 'PUT',
            headers: {
                'Content-Type': file.type,
            },
            uploadType: 1 as any, // 1 = BINARY_CONTENT
        });

        if (uploadRes.status !== 200) {
            throw new Error(`Upload failed with status ${uploadRes.status}`);
        }

        return {
            publicUrl,
            key,
            provider: 'r2'
        };

    } catch (error: any) {
        console.error('[upload] Upload error details:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });
        throw error;
    }
}

/**
 * Upload multiple files in parallel
 */
export async function uploadMultipleToR2(
    files: Array<{ uri: string; name: string; type: string }>,
    authToken?: string
): Promise<UploadResult[]> {
    return Promise.all(files.map(file => uploadToR2(file, authToken)));
}

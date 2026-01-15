import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/api';

const API_URL = getApiUrl();

export interface UploadResult {
    url: string;
    type: 'IMAGE' | 'VIDEO' | 'AUDIO';
    duration?: number; // Duration in seconds for audio/video
}

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export class MediaUploadService {
    /**
     * Unified upload method for Image, Video, and Audio using R2 Presigned URLs
     */
    /**
     * Unified upload method for Image, Video, and Audio using R2 Presigned URLs
     */
    static async uploadMedia(
        uri: string,
        type: 'IMAGE' | 'VIDEO' | 'AUDIO',
        onProgress?: (progress: UploadProgress) => void
    ): Promise<UploadResult> {
        const startTime = Date.now();
        console.log(`[MediaUpload] Starting upload for ${type} at ${new Date(startTime).toISOString()}`);

        try {
            // 1. Get file info
            console.log(`[MediaUpload] 1. Getting file info for ${uri}`);
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) throw new Error("File does not exist");

            const fileName = uri.split('/').pop() || `file_${Date.now()}`;
            const ext = fileName.split('.').pop()?.toLowerCase();

            // Determine content type
            let contentType = 'application/octet-stream';
            if (type === 'IMAGE') contentType = `image/${ext || 'jpeg'}`;
            if (type === 'VIDEO') contentType = `video/${ext || 'mp4'}`;
            if (type === 'AUDIO') contentType = `audio/${ext || 'mpeg'}`;

            // Get Supabase session for authentication
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            // 2. Get Presigned URL with timeout
            console.log(`[MediaUpload] 2. Getting presigned URL from: ${API_URL}/api/upload/presigned`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for API (increased for dev latency)

            const presignedRes = await fetch(`${API_URL}/api/upload/presigned`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    filename: fileName,
                    contentType,
                    type
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!presignedRes.ok) {
                const errText = await presignedRes.text();
                console.error(`[MediaUpload] API Error: ${presignedRes.status} - ${errText}`);
                try {
                    const errJson = JSON.parse(errText);
                    throw new Error(errJson.error || 'Failed to get upload URL');
                } catch (e) {
                    throw new Error(`Failed to get upload URL: ${errText}`);
                }
            }

            const { signedUrl, publicUrl } = await presignedRes.json();
            // 3. Upload directly to R2 using FileSystem.uploadAsync (Native, prevents OOM)
            console.log(`[MediaUpload] 3. Uploading to R2 via FileSystem...`);

            const uploadResponse = await FileSystem.uploadAsync(signedUrl, uri, {
                httpMethod: 'PUT',
                headers: {
                    'Content-Type': contentType,
                },
                // uploadType: BINARY_CONTENT default for PUT
            });

            if (uploadResponse.status !== 200) {
                throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.body}`);
            }

            console.log(`[MediaUpload] 4. Upload complete. Duration: ${(Date.now() - startTime) / 1000}s`);

            // 4. Return the public URL
            return {
                url: publicUrl, // The presigned endpoint should return the eventual public URL
                type: type,
                duration: 0 // TODO: Get duration from file info if possible
            };
        } catch (error: any) {
            console.error('[MediaUpload] Error:', error);
            throw error;
        }
    }

    static async uploadImage(uri: string, filename?: string): Promise<UploadResult> {
        return this.uploadMedia(uri, 'IMAGE');
    }

    static async uploadVideo(uri: string, filename?: string, onProgress?: (progress: UploadProgress) => void): Promise<UploadResult> {
        return this.uploadMedia(uri, 'VIDEO', onProgress);
    }

    static async uploadAudio(uri: string, filename?: string): Promise<UploadResult> {
        return this.uploadMedia(uri, 'AUDIO');
    }
}

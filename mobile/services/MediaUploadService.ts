import * as FileSystem from 'expo-file-system/legacy';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';

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
    static async uploadMedia(
        uri: string,
        type: 'IMAGE' | 'VIDEO' | 'AUDIO',
        onProgress?: (progress: UploadProgress) => void
    ): Promise<UploadResult> {
        try {
            // 1. Get file info
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) throw new Error("File does not exist");

            const fileName = uri.split('/').pop() || `file_${Date.now()}`;
            const ext = fileName.split('.').pop()?.toLowerCase();

            // Determine content type
            let contentType = 'application/octet-stream';
            if (type === 'IMAGE') contentType = `image/${ext || 'jpeg'}`;
            if (type === 'VIDEO') contentType = `video/${ext || 'mp4'}`;
            if (type === 'AUDIO') contentType = `audio/${ext || 'mpeg'}`;

            // 2. Get Presigned URL
            const presignedRes = await fetch(`${API_URL}/api/upload/presigned`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: fileName,
                    contentType,
                    type
                })
            });

            if (!presignedRes.ok) {
                const err = await presignedRes.json();
                throw new Error(err.error || 'Failed to get upload URL');
            }

            const { signedUrl, publicUrl } = await presignedRes.json();

            // 3. Upload directly to R2
            const uploadRes = await FileSystem.uploadAsync(signedUrl, uri, {
                httpMethod: 'PUT',
                uploadType: 1, // BINARY_CONTENT = 1
                headers: {
                    'Content-Type': contentType
                }
            });

            if (uploadRes.status !== 200) {
                throw new Error(`Upload failed with status ${uploadRes.status}`);
            }

            onProgress?.({ loaded: 100, total: 100, percentage: 100 });

            return {
                url: publicUrl,
                type,
            };

        } catch (error) {
            console.error('Media upload error:', error);
            throw error;
        }
    }

    // Compat wrappers
    static async uploadImage(uri: string, fileName?: string, onProgress?: any) {
        return this.uploadMedia(uri, 'IMAGE', onProgress);
    }

    static async uploadVideo(uri: string, fileName?: string, onProgress?: any) {
        return this.uploadMedia(uri, 'VIDEO', onProgress);
    }

    static async uploadAudio(uri: string, fileName?: string, onProgress?: any) {
        return this.uploadMedia(uri, 'AUDIO', onProgress);
    }
}


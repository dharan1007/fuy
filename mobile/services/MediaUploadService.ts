import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

export interface UploadResult {
    url: string;
    type: 'image' | 'video' | 'audio';
    duration?: number;
}

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export class MediaUploadService {
    /**
     * Upload image to Supabase Storage
     */
    static async uploadImage(
        uri: string,
        fileName?: string,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<UploadResult> {
        try {
            // Read file as base64
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            const finalFileName = fileName || `image_${Date.now()}.jpg`;
            const filePath = `posts/${finalFileName}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('media')
                .upload(filePath, decode(base64), {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            onProgress?.({ loaded: 100, total: 100, percentage: 100 });

            return {
                url: urlData.publicUrl,
                type: 'image',
            };
        } catch (error) {
            console.error('Image upload error:', error);
            throw error;
        }
    }

    /**
     * Upload video to Cloudflare R2 via API
     */
    static async uploadVideo(
        uri: string,
        fileName?: string,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<UploadResult> {
        try {
            const formData = new FormData();
            formData.append('file', {
                uri,
                name: fileName || `video_${Date.now()}.mp4`,
                type: 'video/mp4',
            } as any);
            formData.append('type', 'video');

            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Video upload failed');
            }

            const data = await response.json();
            onProgress?.({ loaded: 100, total: 100, percentage: 100 });

            return {
                url: data.url,
                type: 'video',
                duration: data.duration,
            };
        } catch (error) {
            console.error('Video upload error:', error);
            throw error;
        }
    }

    /**
     * Upload audio to Cloudflare R2 via API
     */
    static async uploadAudio(
        uri: string,
        fileName?: string,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<UploadResult> {
        try {
            const formData = new FormData();
            formData.append('file', {
                uri,
                name: fileName || `audio_${Date.now()}.mp3`,
                type: 'audio/mpeg',
            } as any);
            formData.append('type', 'audio');

            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Audio upload failed');
            }

            const data = await response.json();
            onProgress?.({ loaded: 100, total: 100, percentage: 100 });

            return {
                url: data.url,
                type: 'audio',
                duration: data.duration,
            };
        } catch (error) {
            console.error('Audio upload error:', error);
            throw error;
        }
    }

    /**
     * Get video duration from URI (in seconds)
     */
    static async getVideoDuration(uri: string): Promise<number> {
        // This would need expo-av to get actual duration
        // For now, return 0 and let the API calculate it
        return 0;
    }

    /**
     * Validate video duration
     */
    static validateLillDuration(durationSeconds: number): boolean {
        return durationSeconds <= 60; // Max 1 minute
    }

    static validateFillDuration(durationSeconds: number): boolean {
        return durationSeconds <= 18000; // Max 5 hours
    }

    /**
     * Validate image count for multi-image posts
     */
    static validateImageCount(count: number, type: 'xray' | 'bts' | 'chapter'): boolean {
        return count <= 10;
    }
}

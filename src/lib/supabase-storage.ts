// src/lib/supabase-storage.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type FileUploadResult = {
    success: boolean;
    url?: string;
    error?: string;
    path?: string;
};

export type AllowedFileType = 'image' | 'video' | 'audio';

const FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024, // 10MB
    video: 500 * 1024 * 1024, // 500MB
    audio: 50 * 1024 * 1024, // 50MB
};

const ALLOWED_MIME_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
};

/**
 * Validate file type and size
 */
export function validateFile(
    file: File,
    type: AllowedFileType
): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > FILE_SIZE_LIMITS[type]) {
        const limitMB = FILE_SIZE_LIMITS[type] / (1024 * 1024);
        return {
            valid: false,
            error: `File size exceeds ${limitMB}MB limit for ${type} files`,
        };
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES[type].includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES[type].join(', ')}`,
        };
    }

    return { valid: true };
}

/**
 * Upload file to Supabase storage
 */
export async function uploadFile(
    file: File,
    type: AllowedFileType,
    userId: string
): Promise<FileUploadResult> {
    try {
        // Validate file
        const validation = validateFile(file, type);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = file.name.split('.').pop();
        const filename = `${userId}/${type}s/${timestamp}-${randomStr}.${ext}`;

        // Upload to Supabase
        const { data, error } = await supabase.storage
            .from('media') // Bucket name
            .upload(filename, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return { success: false, error: error.message };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(filename);

        return {
            success: true,
            url: urlData.publicUrl,
            path: filename,
        };
    } catch (error: any) {
        console.error('Upload error:', error);
        return { success: false, error: error.message || 'Upload failed' };
    }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
    files: File[],
    type: AllowedFileType,
    userId: string
): Promise<FileUploadResult[]> {
    const uploadPromises = files.map((file) => uploadFile(file, type, userId));
    return Promise.all(uploadPromises);
}

/**
 * Delete file from Supabase storage
 */
export async function deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.storage.from('media').remove([path]);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Delete failed' };
    }
}

/**
 * Get video duration from file
 */
export async function getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            resolve(Math.floor(video.duration));
        };

        video.onerror = () => {
            reject(new Error('Failed to load video metadata'));
        };

        video.src = URL.createObjectURL(file);
    });
}

/**
 * Get audio duration from file
 */
export async function getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';

        audio.onloadedmetadata = () => {
            window.URL.revokeObjectURL(audio.src);
            resolve(Math.floor(audio.duration));
        };

        audio.onerror = () => {
            reject(new Error('Failed to load audio metadata'));
        };

        audio.src = URL.createObjectURL(file);
    });
}

import { uploadFileToR2 } from '../lib/upload-helper';
import { encryptFile } from '../lib/encryption';

export interface UploadResult {
    url: string;
    type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
    duration?: number; // Duration in seconds for audio/video
    encryptionKey?: string;
    iv?: string;
}

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export class MediaUploadService {
    /**
     * Unified upload method for Image, Video, and Audio using R2 Edge Function
     */
    static async uploadMedia(
        uri: string,
        type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT',
        onProgress?: (progress: UploadProgress) => void,
        shouldEncrypt: boolean = false,
        password?: string
    ): Promise<UploadResult> {
        console.log(`[MediaUpload] Starting upload for ${type} (Encrypted: ${shouldEncrypt}, Password: ${!!password})`);

        try {
            let uploadUri = uri;
            let encryptionKey: string | undefined;
            let encryptionIv: string | undefined;

            if (shouldEncrypt) {
                const encrypted = await encryptFile(uri, password);
                if (encrypted) {
                    uploadUri = encrypted.encryptedUri;
                    encryptionKey = encrypted.key;
                    encryptionIv = encrypted.iv;
                    console.log(`[MediaUpload] File encrypted: ${uploadUri}`);
                } else {
                    console.warn('[MediaUpload] Encryption failed, falling back to unencrypted upload');
                    throw new Error("Failed to encrypt file");
                }
            }

            // Use the updated upload-helper which calls the Edge Function
            const { url: publicUrl } = await uploadFileToR2(uploadUri, type);

            console.log(`[MediaUpload] Upload complete: ${publicUrl}`);

            return {
                url: publicUrl,
                type: type,
                duration: 0,
                encryptionKey,
                iv: encryptionIv
            };

        } catch (error: any) {
            console.error('[MediaUpload] Error:', error);
            throw error;
        }
    }

    static async uploadImage(uri: string, filename?: string, encrypt: boolean = false, password?: string): Promise<UploadResult> {
        return this.uploadMedia(uri, 'IMAGE', undefined, encrypt, password);
    }

    static async uploadVideo(uri: string, filename?: string, onProgress?: (progress: UploadProgress) => void, encrypt: boolean = false, password?: string): Promise<UploadResult> {
        return this.uploadMedia(uri, 'VIDEO', onProgress, encrypt, password);
    }

    static async uploadAudio(uri: string, shouldEncrypt: boolean = false, password?: string): Promise<UploadResult> {
        return this.uploadMedia(uri, 'AUDIO', undefined, shouldEncrypt, password);
    }

    static async uploadDocument(uri: string, shouldEncrypt: boolean = true, password?: string): Promise<UploadResult> {
        return this.uploadMedia(uri, 'DOCUMENT', undefined, shouldEncrypt, password);
    }
}

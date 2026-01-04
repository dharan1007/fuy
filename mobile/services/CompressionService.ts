import { Image, Video } from 'react-native-compressor';

export class CompressionService {
    /**
     * Compress video to target specs (720p, moderate bitrate)
     * Returns the path to the compressed file.
     */
    static async compressVideo(uri: string): Promise<string> {
        try {
            const result = await Video.compress(
                uri,
                {
                    compressionMethod: 'auto',
                    bitrate: 2000000, // 2Mbps cap
                },
                (progress) => {
                    // progress is 0-1
                }
            );
            return result;
        } catch (error) {
            console.error('Video compression failed:', error);
            // Fallback to original if compression fails? 
            // Better to throw so we don't upload huge files silently?
            // User requested strict controls.
            throw error;
        }
    }

    /**
     * Compress image to max 1920px
     */
    static async compressImage(uri: string): Promise<string> {
        try {
            const result = await Image.compress(uri, {
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.8,
            });
            return result;
        } catch (error) {
            console.error('Image compression failed:', error);
            throw error;
        }
    }
}

// CompressionService with fallback when react-native-compressor is not available

let Video: any = null;
let ImageCompressor: any = null;

// Try to import react-native-compressor, but don't fail if it's not linked
// try {
//     const compressor = require('react-native-compressor');
//     Video = compressor.Video;
//     ImageCompressor = compressor.Image;
// } catch (e) {
//     console.warn('react-native-compressor not available, compression will be skipped');
// }

export class CompressionService {
    /**
     * Compress video to target specs (720p, moderate bitrate)
     * Returns the path to the compressed file, or original if compression unavailable.
     */
    static async compressVideo(uri: string): Promise<string> {
        if (!Video) {
            console.warn('Video compression not available, using original');
            return uri;
        }

        try {
            const result = await Video.compress(
                uri,
                {
                    compressionMethod: 'auto',
                    bitrate: 2000000, // 2Mbps cap
                },
                (progress: number) => {
                    // progress is 0-1
                }
            );
            return result;
        } catch (error) {
            console.error('Video compression failed:', error);
            // Fallback to original if compression fails
            return uri;
        }
    }

    /**
     * Compress image to max 1920px
     * Returns the path to the compressed file, or original if compression unavailable.
     */
    static async compressImage(uri: string): Promise<string> {
        if (!ImageCompressor) {
            console.warn('Image compression not available, using original');
            return uri;
        }

        try {
            const result = await ImageCompressor.compress(uri, {
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.8,
            });
            return result;
        } catch (error) {
            console.error('Image compression failed:', error);
            // Fallback to original if compression fails
            return uri;
        }
    }
}

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';

// Compress image to reduce upload time
async function compressImage(uri: string): Promise<string> {
    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1080 } }], // Max width 1080px
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        return result.uri;
    } catch (e) {
        console.warn('[upload-helper] Image compression failed, using original:', e);
        return uri; // Fallback to original
    }
}

/**
 * Upload a file to Cloudflare R2 storage
 * Images go through proxy, videos/audio use presigned URLs
 */
export async function uploadFileToR2(
    fileUri: string,
    type: 'IMAGE' | 'VIDEO' | 'AUDIO' = 'IMAGE',
    accessToken?: string
): Promise<string> {
    let processedUri = fileUri;

    // Compress images before upload
    if (type === 'IMAGE') {
        console.log('[upload-helper] Compressing image...');
        processedUri = await compressImage(fileUri);
        console.log('[upload-helper] Compression complete');
    }

    // Read file info
    const fileInfo = await FileSystem.getInfoAsync(processedUri);
    if (!fileInfo.exists) {
        throw new Error('File does not exist');
    }

    // Get file extension and generate filename
    const ext = type === 'IMAGE' ? 'jpg' : (fileUri.split('.').pop()?.toLowerCase() || 'mp4');
    const filename = `${Date.now()}.${ext}`;

    // Determine content type
    const contentTypeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        webm: 'video/webm',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        m4a: 'audio/mp4',
    };
    const contentType = contentTypeMap[ext] || (type === 'IMAGE' ? 'image/jpeg' : type === 'VIDEO' ? 'video/mp4' : 'audio/mpeg');

    if (type === 'IMAGE') {
        // Use FileSystem.uploadAsync for more robust native uploads
        console.log('[upload-helper] Uploading to server via FileSystem...');

        try {
            const uploadRes = await FileSystem.uploadAsync(`${API_URL}/api/upload/proxy`, processedUri, {
                fieldName: 'file',
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                parameters: { type: 'IMAGE' },
                headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
            });

            if (uploadRes.status !== 200) {
                console.error('[upload-helper] Upload failed status:', uploadRes.status, uploadRes.body);
                throw new Error(`Upload failed with status ${uploadRes.status}`);
            }

            const data = JSON.parse(uploadRes.body);
            console.log('[upload-helper] Upload complete');
            return data.url;
        } catch (error) {
            console.error('[upload-helper] Upload error:', error);
            throw error;
        }
    } else {
        // Use presigned URL for video/audio
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.fuymedia.org/',
            'Origin': 'https://www.fuymedia.org',
            'Accept-Language': 'en-US,en;q=0.9',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'X-Requested-With': 'XMLHttpRequest'
        };
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const presignedRes = await fetch(`${API_URL}/api/upload/presigned`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                filename,
                contentType,
                type,
            }),
        });

        if (!presignedRes.ok) {
            const errText = await presignedRes.text();
            console.error(`[upload-helper] API Error: ${presignedRes.status}`, errText.slice(0, 500)); // Log first 500 chars

            // Try to parse as JSON, but fallback to text if it's HTML
            try {
                const error = JSON.parse(errText);
                throw new Error(error.error || `Upload failed: ${presignedRes.status}`);
            } catch (jsonError) {
                // If JSON parse fails, it's likely HTML (Firewall/Vercel error)
                if (errText.trim().startsWith('<')) {
                    throw new Error(`Upload failed: Server returned HTML (Likely Firewall/429). Status: ${presignedRes.status}`);
                }
                throw new Error(`Upload failed: ${presignedRes.status} - ${errText.substring(0, 100)}`);
            }
        }

        // Even if status is 200, check if body is not HTML before parsing
        const textBody = await presignedRes.text();
        if (textBody.trim().startsWith('<')) {
            console.error(`[upload-helper] Received HTML instead of JSON:`, textBody.slice(0, 500));
            throw new Error(`Upload failed: Server returned HTML (Likely Firewall). Status: ${presignedRes.status}`);
        }

        const { signedUrl, publicUrl } = JSON.parse(textBody);

        // Read file and upload to R2
        const fileData = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to blob-like for upload
        const uploadRes = await FileSystem.uploadAsync(signedUrl, fileUri, {
            httpMethod: 'PUT',
            headers: {
                'Content-Type': contentType,
            },
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        });

        if (uploadRes.status !== 200) {
            throw new Error('Failed to upload file to storage');
        }

        return publicUrl;
    }
}

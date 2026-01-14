import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';

/**
 * Upload a file to Cloudflare R2 storage
 * Images go through proxy, videos/audio use presigned URLs
 */
export async function uploadFileToR2(
    fileUri: string,
    type: 'IMAGE' | 'VIDEO' | 'AUDIO' = 'IMAGE',
    accessToken?: string
): Promise<string> {
    // Read file info
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
        throw new Error('File does not exist');
    }

    // Get file extension and generate filename
    const ext = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
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
        // Use proxy upload for images (simpler, handles CORS)
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const formData = new FormData();
        formData.append('file', {
            uri: fileUri,
            name: filename,
            type: contentType,
        } as any);
        formData.append('type', type);

        const headers: Record<string, string> = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const res = await fetch(`${API_URL}/api/upload/proxy`, {
            method: 'POST',
            body: formData,
            headers,
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Upload failed');
        }

        const data = await res.json();
        return data.url;
    } else {
        // Use presigned URL for video/audio
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
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
            const error = await presignedRes.json();
            throw new Error(error.error || 'Failed to get upload URL');
        }

        const { signedUrl, publicUrl } = await presignedRes.json();

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

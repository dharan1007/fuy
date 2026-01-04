import imageCompression from 'browser-image-compression';

export async function uploadFileClientSide(file: File, type: 'IMAGE' | 'VIDEO' | 'AUDIO' = 'IMAGE'): Promise<string> {
    let fileToUpload = file;

    // 1. Client-side Image Compression
    if (type === 'IMAGE' && file.type.startsWith('image/')) {
        try {
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true
            };
            fileToUpload = await imageCompression(file, options);
        } catch (e) {
            console.warn("Image compression failed, uploading original.", e);
        }
    }

    // 2. Upload Logic
    // If IMAGE, use Proxy to bypass CORS. If VIDEO/AUDIO, use Presigned (CORS required).
    if (type === 'IMAGE') {
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('type', type);

        const res = await fetch('/api/upload/proxy', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Upload failed');
        }

        const data = await res.json();
        return data.url;
    } else {
        // VIDEO / AUDIO -> Use Presigned URL
        const res = await fetch('/api/upload/presigned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: fileToUpload.name,
                contentType: fileToUpload.type,
                type
            })
        });

        if (!res.ok) {
            const errorBody = await res.json();
            throw new Error(errorBody.error || 'Failed to get upload URL');
        }

        const { signedUrl, publicUrl } = await res.json();

        // 3. Upload to R2
        const uploadRes = await fetch(signedUrl, {
            method: 'PUT',
            body: fileToUpload,
            headers: {
                'Content-Type': fileToUpload.type
            }
        });

        if (!uploadRes.ok) {
            throw new Error('Failed to upload file to storage');
        }

        return publicUrl;
    }
}

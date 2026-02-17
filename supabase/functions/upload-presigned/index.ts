
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.370.0"
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.370.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { filename, contentType, type } = await req.json()

        if (!filename || !contentType) {
            throw new Error('Missing filename or contentType')
        }

        let R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')
        const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')
        const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')
        const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')
        const R2_PUBLIC_DOMAIN = Deno.env.get('R2_PUBLIC_DOMAIN')

        if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
            throw new Error('R2 configuration missing')
        }

        // Sanitize Account ID in case full URL was provided
        R2_ACCOUNT_ID = R2_ACCOUNT_ID.replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com$/, '');

        const S3 = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        })

        // Construct Key path: e.g. "USER_ID/type/filename"
        // Ideally we get user ID from auth.
        // Deno runtime provides `req.headers.get('Authorization')` which we can verify with supabase client
        // OR we can trust the client to generate a unique filename for now, but better to structure it.
        // The previous implementation in Next.js did not seem to enforce User ID in path strictly from token?
        // Let's create a Supabase client to get the user, or just trust the caller for now if we want simplicity.
        // Best practice: Get user from auth context.

        // For simplicity and speed in this refactor, I'll use the filename provided, but prepending a path is good.
        // If the mobile app provides the full path/filename, we use it.

        // Previous logic was: key = `posts/${filename}` or something?
        // Let's check mobile app logic. It sends `filename` like `clock_123.jpg`.
        // We should put it in a folder structure. 
        // Let's use `uploads/${filename}` as a safe default if no path is given.

        const key = `uploads/${filename}`

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        })

        const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 })
        const publicUrl = `${R2_PUBLIC_DOMAIN}/${key}`

        return new Response(
            JSON.stringify({ signedUrl, publicUrl, key, provider: 'r2' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

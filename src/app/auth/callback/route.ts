import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = requestUrl.searchParams.get("next") || "/";

    if (code) {
        // Create a Supabase client for the server-side exchange
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    flowType: 'pkce',
                    autoRefreshToken: false,
                    persistSession: false,
                    detectSessionInUrl: false
                }
            }
        );

        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Successful authentication
            // In a more complex app using NextAuth alongside, we might sign them in there too
            // For now, redirect to the requested page
            return NextResponse.redirect(`${requestUrl.origin}${next}`);
        } else {
            console.error("Supabase Auth Code Exchange Error:", error);
        }
    }

    // Return the user to an error page with some instructions
    return NextResponse.redirect(`${requestUrl.origin}/join?error=Could not authenticate user`);
}

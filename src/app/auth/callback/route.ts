import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/";

    // Ensure we redirect to localhost if on 0.0.0.0 to avoid cookie issues
    const redirectOrigin = origin.replace('0.0.0.0', 'localhost');

    let error: any = null;

    if (code) {
        const cookieStore = cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
                cookieOptions: {
                    name: 'sb-auth-token',
                    sameSite: 'lax',
                    path: '/',
                }
            }
        );

        const response = await supabase.auth.exchangeCodeForSession(code);
        const data = response.data;
        error = response.error;

        if (error) {
            console.error("Auth Callback Error: Exchange failed. Code:", code);
            console.error("Supabase Error Details:", error);
        } else {
            console.log("Auth Callback Success. User:", data?.session?.user?.email);
        }

        if (!error && data?.session?.user) {

            // Default redirect
            let targetUrl = next;

            try {
                // Check if user has a profile in our DB
                const userEmail = data.session.user.email;
                if (userEmail) {
                    // Check for user AND profile
                    const dbUser = await prisma.user.findUnique({
                        where: { email: userEmail },
                        include: { profile: true }
                    });

                    // If user logic:
                    // 1. If user doesn't exist in Prisma, they are technically new -> setup-profile
                    // 2. If user exists but no profile -> setup-profile
                    // 3. If user exists AND profile exists -> home (/)

                    if (!dbUser || !dbUser.profile) {
                        targetUrl = "/profile/setup";
                    } else {
                        targetUrl = "/";
                    }
                }
            } catch (err) {
                console.error("Error querying user profile in callback:", err);
                // Fallback to home/next if DB query fails, don't block auth
            }

            return NextResponse.redirect(`${redirectOrigin}${targetUrl}`);
        } else {
            console.error("Supabase Auth Code Exchange Error:", error);
        }
    }

    const errorMessage = error?.message || "Could not authenticate user";
    const errorCode = error?.code || "unknown_error";
    return NextResponse.redirect(`${redirectOrigin}/join?error=${encodeURIComponent(errorMessage)}&code=${encodeURIComponent(errorCode)}`);
}

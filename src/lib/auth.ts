import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Dummy authOptions to satisfy imports
export const authOptions = {};

export async function getServerSession(...args: any[]) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.log("Debug: No session/user found in getServerSession");
    console.log(`Debug: Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`Debug: Auth Error: ${error?.message} (Code: ${error?.status})`);

    // Log all cookie names (and full value for the token if found)
    const allCookies = cookieStore.getAll().map(c => {
      if (c.name.includes('auth-token')) return `${c.name}=[TOKEN_PRESENT]`;
      return `${c.name}=${c.value.substring(0, 10)}...`;
    });
    console.log("Debug: Cookies present:", allCookies.join(', '));
    return null;
  }

  // Map to NextAuth session shape
  return {
    user: {
      name: user.user_metadata?.name || user.email,
      email: user.email,
      image: user.user_metadata?.avatar_url,
      id: user.id
    },
    // getUser doesn't return session.expires_at directly, but we can mock it or use a default
    expires: new Date(Date.now() + 3600 * 1000).toISOString()
  };
}

// Helper for 'auth()' style calls if used
export const auth = getServerSession;

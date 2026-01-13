import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

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
          }
        },
      },
      cookieOptions: {
        name: 'sb-auth-token',
        maxAge: 60 * 60 * 24 * 7,
        domain: '',
        path: '/',
        sameSite: 'lax',
      },
    }
  );

  // Check for Bearer Token (Mobile/API Access)
  const headerStore = headers();
  const authHeader = headerStore.get('authorization');

  let user: any = null;
  let error: any = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error: tokenError } = await supabaseAnon.auth.getUser(token);
    user = data.user;
    error = tokenError;
  } else {
    // Fallback to Cookies (Web)
    const { data, error: cookieError } = await supabase.auth.getUser();
    user = data.user;
    error = cookieError;
  }

  if (error || !user) {
    // Debug logging removed for production security
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

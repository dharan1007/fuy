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
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Note: Server Actions/Route Handlers can set cookies
          // but getServerSideProps/Server Components (read-only) cannot
        },
        remove(name: string, options: CookieOptions) {
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return null;

  // Map to NextAuth session shape
  return {
    user: {
      name: session.user.user_metadata?.name || session.user.email,
      email: session.user.email,
      image: session.user.user_metadata?.avatar_url,
      id: session.user.id
    },
    expires: new Date(session.expires_at! * 1000).toISOString()
  };
}

// Helper for 'auth()' style calls if used
export const auth = getServerSession;

// src/lib/supabase-client.ts
import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createBrowserClient(url, anonKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
  cookieOptions: {
    name: 'sb-auth-token',
    maxAge: 60 * 60 * 24 * 7,
    domain: '',
    path: '/',
    sameSite: 'lax',
  }
});

export type RealtimeChannel = ReturnType<typeof supabase.channel>;

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
  },
  cookieOptions: {
    name: 'sb-auth-token',
    sameSite: 'lax',
    path: '/',
  }
});

export type RealtimeChannel = ReturnType<typeof supabase.channel>;

"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

export function useSession() {
    const [session, setSession] = useState<any>(null);
    const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setStatus(session ? "authenticated" : "unauthenticated");
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setStatus(session ? "authenticated" : "unauthenticated");
        });

        return () => subscription.unsubscribe();
    }, []);

    // Shim the 'user' object to match NextAuth structure if needed
    const data = session ? {
        user: {
            name: session.user.user_metadata?.name || session.user.email,
            email: session.user.email,
            image: session.user.user_metadata?.avatar_url,
            id: session.user.id
        },
        expires: session.expires_at
    } : null;

    return { data, status };
}

export const signIn = async (provider?: string, options?: any) => {
    // Redirect to join page for now, or handle credentials if needed
    if (provider === 'credentials' && options?.loginToken) {
        // This is a shim for the passkey flow. 
        // Real implementation would verify token with Supabase or custom backend.
        // For now, allow it to pass or log error.
        console.warn("Passkey sign-in shim called. Not fully implemented with Supabase yet.");
        return { ok: true, error: null };
    }

    if (typeof window !== 'undefined') window.location.href = '/join';
    return { ok: true };
};

export const signOut = async (options?: { callbackUrl?: string; redirect?: boolean }) => {
    await supabase.auth.signOut();
    if (options?.redirect === false) return;
    if (typeof window !== 'undefined') {
        window.location.href = options?.callbackUrl || '/';
    }
};

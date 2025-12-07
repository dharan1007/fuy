import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    loading: true,
    isAdmin: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let mounted = true;

        const loadSession = async () => {
            try {
                // Race between getSession and a timeout
                // If getSession hangs (e.g. storage issue), we don't want to block the app forever.
                const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => {
                    setTimeout(() => resolve({ data: { session: null } }), 3000);
                });

                const sessionPromise = supabase.auth.getSession();

                const { data: { session } } = await Promise.race([
                    sessionPromise,
                    timeoutPromise
                ]) as any;

                if (mounted) {
                    if (session) {
                        setSession(session);
                    }
                }
            } catch (e) {
                console.error('Auth load error:', e);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session);
                // Ensure loading is false on auth change
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ session, loading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

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
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    // Check for refresh token error
                    if (error.message && (
                        error.message.includes('Invalid Refresh Token') ||
                        error.message.includes('Refresh Token Not Found')
                    )) {
                        console.log('Auth: Refresh token invalid, signing out locally.');
                        setSession(null);
                        // Optional: Clear storage if needed, but setSession(null) should trigger app redirect
                    } else {
                        console.error('Error fetching session:', error);
                    }
                } else if (mounted) {
                    setSession(data.session);
                }
            } catch (e: any) {
                console.error('Auth load error:', e);
                if (e?.message?.includes('Invalid Refresh Token') || e?.message?.includes('Refresh Token Not Found')) {
                    setSession(null);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session);
                // Ensure loading is false on auth change or sign out
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

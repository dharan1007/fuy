import { getApiUrl } from '../lib/api';
import { supabase } from '../lib/supabase';

export const VerificationService = {
    /**
     * Sends a verification email via the server API.
     * The server handles the Resend API call securely with its own key.
     */
    async sendVerificationEmail(email: string, code: string, name: string) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const apiUrl = getApiUrl();

            const response = await fetch(`${apiUrl}/api/auth/send-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({ email, code, name }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Verification API Error:', errorText);
                throw new Error(`Email Send Failed: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('VerificationService Error:', error);
            throw error;
        }
    }
};

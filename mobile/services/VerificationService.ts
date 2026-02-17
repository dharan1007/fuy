import { Alert } from 'react-native';

export const VerificationService = {
    /**
     * Sends a verification email directly via Resend API.
     * WARNING: This requires EXPO_PUBLIC_RESEND_API_KEY to be set in .env
     * This logic runs on the client, so the key is technically exposed in the app bundle.
     */
    async sendVerificationEmail(email: string, code: string, name: string) {
        // Use EXPO_PUBLIC_ prefix for client-side env variables in Expo
        const resendKey = process.env.EXPO_PUBLIC_RESEND_API_KEY;

        if (!resendKey) {
            console.error("Missing EXPO_PUBLIC_RESEND_API_KEY. Please add it to your .env file.");
            throw new Error("Configuration Error: Missing Email API Key");
        }

        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Fuy <verify@fuymedia.org>', // Ensure this domain is verified in Resend Dashboard
                    to: email,
                    subject: 'Verify your Fuy account',
                    html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Welcome to Fuy, ${name}!</h1>
                    <p>Your verification code is:</p>
                    <h2 style="letter-spacing: 5px; background: #f0f0f0; padding: 10px; display: inline-block;">${code}</h2>
                    <p>Enter this code in the app to complete your signup.</p>
                </div>
                `
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Resend API Error:', errorText);
                throw new Error(`Email Send Failed: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('VerificationService Error:', error);
            throw error;
        }
    }
};

import { Redirect } from 'expo-router';

// This screen redirects new users to the edit-profile page with the newUser flag
// This ensures a consistent onboarding experience matching the web version

export default function ProfileSetupScreen() {
    return <Redirect href="/edit-profile?newUser=true" />;
}

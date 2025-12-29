"use client";

import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { SpaceBackground } from "@/components/SpaceBackground";
import { useSession } from "@/hooks/use-session";
import Switch from "@/components/ui/switch";

// Notification Categories
const NOTIFICATION_CATEGORIES = [
    { id: 'likes', label: 'Likes & Reactions', description: 'When someone reacts to your posts' },
    { id: 'comments', label: 'Comments', description: 'When someone comments on your posts' },
    { id: 'mentions', label: 'Mentions & Tags', description: 'When you are mentioned or tagged' },
    { id: 'follows', label: 'Friend Requests', description: 'New followers and friend requests' },
    { id: 'system', label: 'System Announcements', description: 'Important updates from the platform' },
];

export default function NotificationSettingsPage() {
    const { data: session } = useSession();
    const [settings, setSettings] = useState<any>({
        likes: true,
        comments: true,
        mentions: true,
        follows: true,
        system: true,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/profile');
            const data = await res.json();
            if (data.notificationSettings) {
                // Merge with defaults
                setSettings({ ...settings, ...data.notificationSettings });
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSetting = async (key: string) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);

        try {
            const formData = new FormData();
            formData.append('notificationSettings', JSON.stringify(newSettings));
            await fetch('/api/profile', { method: 'PUT', body: formData });
        } catch (error) {
            console.error("Failed to update settings", error);
            // Revert on failure
            setSettings({ ...settings, [key]: settings[key] });
        }
    };

    return (
        <div className="min-h-screen bg-black text-white relative">
            <SpaceBackground />
            <AppHeader title="Notification Settings" showBackButton />

            <div className="max-w-2xl mx-auto px-6 py-8 relative z-10">
                <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                        Push Notifications
                    </h2>

                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg"></div>)}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {NOTIFICATION_CATEGORIES.map((category) => (
                                <div key={category.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">{category.label}</p>
                                        <p className="text-sm text-gray-400">{category.description}</p>
                                    </div>
                                    <Switch
                                        checked={settings[category.id]}
                                        onToggle={() => toggleSetting(category.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

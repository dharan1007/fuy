"use client";

import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { SpaceBackground } from "@/components/SpaceBackground";
import { useSession } from "@/hooks/use-session";
import { ThumbsUp, ThumbsDown, Zap, History, Tag, Filter, Calendar } from "lucide-react";
import CustomDropdown from "@/components/ui/CustomDropdown";

export default function ActivityPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'LIKES' | 'DISLIKES' | 'CAPS' | 'HISTORY' | 'TAGS'>('LIKES');
    const [activity, setActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [sort, setSort] = useState('DESC');
    const [taggingPrivacy, setTaggingPrivacy] = useState('EVERYONE');

    useEffect(() => {
        fetchActivity();
    }, [activeTab, filter, sort]);

    useEffect(() => {
        // Fetch privacy setting when Tags tab is active
        if (activeTab === 'TAGS') {
            fetch('/api/profile').then(res => res.json()).then(data => {
                if (data.taggingPrivacy) setTaggingPrivacy(data.taggingPrivacy);
            });
        }
    }, [activeTab]);

    const fetchActivity = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/activity?type=${activeTab}&filter=${filter}&sort=${sort}`);
            const data = await res.json();
            if (data.data) {
                setActivity(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch activity", error);
        } finally {

            setLoading(false);
        }
    };

    const updateTaggingPrivacy = async (value: string) => {
        setTaggingPrivacy(value);
        try {
            const formData = new FormData();
            formData.append('taggingPrivacy', value);
            await fetch('/api/profile', { method: 'PUT', body: formData });
        } catch (error) {
            console.error("Failed to update privacy", error);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white relative">
            <SpaceBackground />
            <AppHeader title="Your Activity" showBackButton />

            <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
                {/* Tabs */}
                <div className="flex overflow-x-auto gap-2 mb-8 border-b border-white/10 pb-2 scrollbar-hide">
                    {[
                        { id: 'LIKES', icon: ThumbsUp, label: 'W' },
                        { id: 'DISLIKES', icon: ThumbsDown, label: 'L' },
                        { id: 'CAPS', icon: Zap, label: 'Caps' },
                        { id: 'HISTORY', icon: History, label: 'History' },
                        { id: 'TAGS', icon: Tag, label: 'Tags' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg transition-all ${activeTab === tab.id
                                ? 'text-white border-b-2 border-white bg-white/5'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'fill-current' : ''}`} />
                            <span className="font-bold whitespace-nowrap">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6 z-20 relative">
                    <CustomDropdown
                        value={filter}
                        onSelect={setFilter}
                        icon={Filter}
                        options={[
                            { label: 'All Posts', value: 'ALL' },
                            { label: 'Standard', value: 'STANDARD' },
                            { label: 'Chapters', value: 'CHAPTER' },
                            { label: 'Polls', value: 'PULLUPDOWN' },
                            { label: 'X-Rays', value: 'XRAY' },
                            { label: 'Lills (Shorts)', value: 'LILL' },
                            { label: 'Fills (Videos)', value: 'FILL' },
                            { label: 'Auds (Audio)', value: 'AUD' },
                            { label: 'Channels', value: 'CHAN' },
                            { label: 'Stories', value: 'STORY' },
                            { label: 'Simple', value: 'SIMPLE' },
                        ]}
                    />

                    <CustomDropdown
                        value={sort}
                        onSelect={setSort}
                        icon={Calendar}
                        options={[
                            { label: 'Newest First', value: 'DESC' },
                            { label: 'Oldest First', value: 'ASC' },
                        ]}
                    />
                </div>

                {/* Content Area */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center backdrop-blur-sm">
                            <p className="text-gray-400 mb-4">Loading activity...</p>
                            <div className="animate-pulse flex space-x-4 justify-center">
                                <div className="h-2 w-2 bg-gray-600 rounded-full"></div>
                                <div className="h-2 w-2 bg-gray-600 rounded-full"></div>
                                <div className="h-2 w-2 bg-gray-600 rounded-full"></div>
                            </div>
                        </div>
                    ) : activity.length === 0 ? (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center backdrop-blur-sm">
                            <p className="text-gray-400">No activity found.</p>
                        </div>
                    ) : (
                        activity.map((item: any) => (
                            <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm flex items-start gap-4">
                                {/* Post Thumbnail/Media Preview if available */}
                                <div className="w-16 h-16 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden">
                                    {item.post.media && item.post.media.length > 0 ? (
                                        item.post.media[0].type === 'IMAGE' ?
                                            <img src={item.post.media[0].url} alt="Post" className="w-full h-full object-cover" /> :
                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Video</div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                            {item.post.postType === 'STANDARD' ? 'Text' : item.post.postType}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white mb-1">
                                        {activeTab === 'TAGS' ? `You were tagged in ${item.post.user?.name}'s post` :
                                            activeTab === 'HISTORY' ? `Viewed ${item.post.user?.name}'s post` :
                                                `Reacted to ${item.post.user?.name}'s post`}
                                    </p>
                                    <p className="text-sm text-gray-400 line-clamp-2">{item.post.content}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {new Date(item.createdAt || item.viewedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Privacy Settings (Only on Tags tab) */}
                {activeTab === 'TAGS' && (
                    <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
                        <h3 className="text-lg font-bold mb-4">Tagging Permissions</h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold">Who can tag you?</p>
                                <p className="text-sm text-gray-400">Control who can mention or tag you in posts.</p>
                            </div>
                            <div className="w-[200px]">
                                <CustomDropdown
                                    value={taggingPrivacy}
                                    onSelect={(val: string) => updateTaggingPrivacy(val)}
                                    options={[
                                        { label: 'Everyone', value: 'EVERYONE' },
                                        { label: 'Followers Only', value: 'FOLLOWERS' },
                                        { label: 'Nobody', value: 'NOBODY' },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

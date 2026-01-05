'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { Plus, X, HelpCircle, Tag, MessageSquare, BookOpen, Clock, Activity, Edit2, Trash2 } from 'lucide-react';
import styles from './BondingDashboard.module.css';

// Types
interface Profile {
    id: string; // This is participantId
    conversationId: string; // Added conversationId
    name: string;
    avatar?: string;
    lastMessageAt?: string;
}

interface Message {
    id: string;
    content: string;
    createdAt: string;
    sender: {
        name: string;
        profile?: { displayName?: string; avatarUrl?: string };
    };
}

interface MessageTag {
    id: string;
    messageId: string;
    tagType: string;
    taggedContent?: string;
    note?: string;
    createdAt: string;
    message: Message;
}

interface FactWarning {
    id: string;
    keyword: string;
    warningText: string;
    isActive: boolean;
    createdAt: string;
}

interface BondingActivity {
    id: string;
    type: string;
    status: string;
    startedAt: string;
    endedAt?: string;
    partner?: {
        id: string;
        profile?: { displayName?: string; avatarUrl?: string };
    };
}

// Updated Locker Types for Emotions + Reminders/Triggers
type LockerType = 'angry' | 'sad' | 'surprised' | 'reminders' | 'activities';



// --- Modals ---

const WalkthroughModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-[#0a0a0a] border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                <X size={24} />
            </button>

            <div className="p-8">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <BookOpen className="text-blue-400" /> Bonding Dashboard Guide
                </h2>
                <p className="text-gray-400 mb-8 text-lg">Your shared space for memories, emotions, and smart tools.</p>

                <div className="space-y-8">
                    <section>
                        <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                            <Activity className="text-green-400" /> Emotional Lockers
                        </h3>
                        <p className="text-gray-300 leading-relaxed">
                            Messages tagged with <b>Angry, Sad,</b> or <b>Surprised</b> are automatically sorted into their respective lockers.
                            Use these to reflect on your shared emotional journey.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                            <Clock className="text-purple-400" /> Reminders & Triggers
                        </h3>
                        <p className="text-gray-300 leading-relaxed">
                            The <b>Reminders</b> tab is your programmable memory.
                            <br /><br />
                            <span className="text-blue-300 font-semibold">• Triggers:</span> Create "Trigger Functions" here.
                            Define a <b>Keyword</b> (e.g., "wifi") and a <b>Response</b> (e.g., "Password: 1234").
                            <br />
                            <span className="text-blue-300 font-semibold">• Smart Recall:</span> When you type that keyword in chat, the response will instantly pop up.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                            <MessageSquare className="text-yellow-400" /> Shared Activities
                        </h3>
                        <p className="text-gray-300 leading-relaxed">
                            The <b>Activities</b> tab logs sessions like Canvas drawing or Journaling that you've participated in together.
                        </p>
                    </section>
                </div>

                <div className="mt-8 pt-8 border-t border-white/10 flex justify-end">
                    <button onClick={onClose} className="bg-black border border-white text-white px-6 py-2.5 rounded-full font-bold hover:bg-white/10 transition-colors">
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const TriggerModal = ({ onClose, onSuccess, conversationId }: { onClose: () => void, onSuccess: () => void, conversationId: string }) => {
    const [keyword, setKeyword] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyword.trim() || !content.trim()) return;

        setIsSubmitting(true);
        try {
            // 1. Send the message (this acts as the 'seed' for the memory)
            const msgRes = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: conversationId,
                    content: content
                })
            });

            if (!msgRes.ok) throw new Error('Failed to create seed message');
            const msgData = await msgRes.json();
            const messageId = msgData.message?.id || msgData.data?.id;

            // 2. Tag the message
            const tagRes = await fetch('/api/chat/messages/tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId: messageId,
                    tag: keyword.trim()
                })
            });

            if (!tagRes.ok) throw new Error('Failed to tag trigger');

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating trigger:', error);
            alert('Failed to save trigger. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="bg-[#111] border border-white/20 rounded-xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Tag className="text-blue-400" size={20} /> New Trigger Function
                    </h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">When I type Trigger...</label>
                        <input
                            autoFocus
                            placeholder='e.g., "wifi", "gym code", "fight reason"'
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            className="w-full bg-black border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Smart Recall Shows...</label>
                        <textarea
                            rows={3}
                            placeholder='e.g., "The network name is..."'
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="w-full bg-black border border-white/30 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors resize-none"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors bg-black">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !keyword || !content}
                            className="flex-1 px-4 py-2 rounded-lg bg-black border border-white text-white font-semibold hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : 'Create Trigger'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function BondingDashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    // State
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [activeLocker, setActiveLocker] = useState<LockerType>('activities');
    const [tags, setTags] = useState<MessageTag[]>([]);
    const [activities, setActivities] = useState<BondingActivity[]>([]);
    const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [showWalkthrough, setShowWalkthrough] = useState(false);
    const [showTriggerModal, setShowTriggerModal] = useState(false);

    // Initial Load - Fetch Profiles (Conversations)
    useEffect(() => {
        const loadProfiles = async () => {
            try {
                const res = await fetch('/api/chat/conversations');
                if (res.ok) {
                    const data = await res.json();
                    // Transform conversations to profiles
                    // Ensure unique profiles by ID
                    const uniqueMap = new Map();
                    data.conversations.forEach((conv: any) => {
                        if (!uniqueMap.has(conv.participantId)) {
                            uniqueMap.set(conv.participantId, {
                                id: conv.participantId,
                                conversationId: conv.id, // Store conversationId
                                name: conv.participantName,
                                avatar: conv.avatar,
                                lastMessageAt: conv.lastMessageTime,
                            });
                        }
                    });
                    const profileList: Profile[] = Array.from(uniqueMap.values());

                    setProfiles(profileList);

                    // Check URL for selected profile
                    const urlProfileId = searchParams.get('profileId');
                    if (urlProfileId) {
                        const preSelected = profileList.find(p => p.id === urlProfileId);
                        if (preSelected) {
                            setSelectedProfile(preSelected);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching profiles:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadProfiles();
    }, [searchParams]);

    // Fetch Bonding Data when Selected Profile Changes
    const fetchBondingData = useCallback(async () => {
        if (!selectedProfile) return;

        setIsLoadingData(true);
        try {
            // Fetch Tags and Facts
            const res = await fetch(`/api/bonding?profileId=${selectedProfile.id}`);
            if (res.ok) {
                const data = await res.json();
                setTags(data.tags);
                setTagCounts(data.tagCounts);
            }

            // Fetch Activities
            const actRes = await fetch('/api/bonding/activity');
            if (actRes.ok) {
                const actData = await actRes.json();
                // Filter activities to only show those with the selected profile (partner)
                const relevantActivities = actData.activities.filter((act: BondingActivity) =>
                    act.partner?.id === selectedProfile.id
                );
                setActivities(relevantActivities);
            }

        } catch (error) {
            console.error('Error fetching bonding data:', error);
        } finally {
            setIsLoadingData(false);
        }
    }, [selectedProfile]);

    useEffect(() => {
        fetchBondingData();
    }, [fetchBondingData]);

    const filteredProfiles = profiles.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Mapping for UI
    const TABS: { id: LockerType; label: string; icon: React.ReactNode; tooltip: string }[] = [
        {
            id: 'angry',
            label: 'Angry',
            icon: <div className="text-xl">😡</div>,
            tooltip: 'Moments of frustration or anger.'
        },
        {
            id: 'sad',
            label: 'Sad',
            icon: <div className="text-xl">😢</div>,
            tooltip: 'Sad or difficult moments shared.'
        },

        {
            id: 'surprised',
            label: 'Surprised',
            icon: <div className="text-xl">😯</div>,
            tooltip: 'Shocking or surprising messages.'
        },
        {
            id: 'reminders',
            label: 'Reminders',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2zM18 16v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>,
            tooltip: 'Triggers, Reminders & Custom Tags'
        },
        {
            id: 'activities',
            label: 'Activities',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
            tooltip: 'Log of shared collaborative sessions.'
        }
    ];

    return (
        <div className={styles.container}>
            {/* View Modals */}
            {showWalkthrough && <WalkthroughModal onClose={() => setShowWalkthrough(false)} />}
            {
                showTriggerModal && selectedProfile && (
                    <TriggerModal
                        conversationId={selectedProfile.conversationId}
                        onClose={() => setShowTriggerModal(false)}
                        onSuccess={() => {
                            fetchBondingData(); // Refresh data to show new trigger
                        }}
                    />
                )
            }

            {/* Sidebar */}
            <div className={styles.sidebar}>
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        {/* Back Button Removed */}
                        <h2>Bonding</h2>
                        <button
                            onClick={() => setShowWalkthrough(true)}
                            className="ml-auto text-white/50 hover:text-white transition-colors p-2"
                            title="Open Walkthrough Guide"
                        >
                            <HelpCircle size={20} />
                        </button>
                    </div>
                    {/* ... Search ... */}
                    <div className={styles.searchBox}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.searchIcon} style={{ display: 'block' }}>
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search profiles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.profileList}>
                    {isLoading ? (
                        <div className={styles.loading}>Loading...</div>
                    ) : (
                        filteredProfiles.map(profile => (
                            <div
                                key={profile.id}
                                className={`${styles.profileItem} ${selectedProfile?.id === profile.id ? styles.active : ''}`}
                                onClick={() => setSelectedProfile(profile)}
                            >
                                <div className={styles.avatar}>
                                    {profile.avatar ? (
                                        <img src={profile.avatar} alt={profile.name} />
                                    ) : (
                                        <div className={styles.avatarPlaceholder}>
                                            {profile.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.profileInfo}>
                                    <div className={styles.name}>{profile.name}</div>
                                    <div className={styles.lastActive}>
                                        {profile.lastMessageAt ? new Date(profile.lastMessageAt).toLocaleDateString() : 'New'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.mainContent}>
                {!selectedProfile ? (
                    <div className={styles.emptySelection}>
                        <div className={styles.emptyIcon}>🤝</div>
                        <h3>Select a profile to view bonding details</h3>
                    </div>
                ) : (
                    <>
                        {/* Profile Header */}
                        <div className={styles.contentHeader}>
                            <div className={styles.headerProfile}>
                                <div className={styles.largeAvatar}>
                                    {selectedProfile.avatar ? (
                                        <img src={selectedProfile.avatar} alt={selectedProfile.name} />
                                    ) : (
                                        <div className={styles.avatarPlaceholder}>{selectedProfile.name.charAt(0)}</div>
                                    )}
                                </div>
                                <div>
                                    <h1>{selectedProfile.name}</h1>
                                    <div className={styles.statsRow}>
                                        <div className={styles.stat}>
                                            <span className={styles.statValue}>{tags.length}</span>
                                            <span className={styles.statLabel}>Tagged Items</span>
                                        </div>
                                        <div className={styles.stat}>
                                            <span className={styles.statValue}>{activities.length}</span>
                                            <span className={styles.statLabel}>Activities</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Locker Tabs */}
                        <div className={styles.lockerTabs}>
                            <div className={styles.tabList}>
                                {TABS.map(tab => {
                                    let count = 0;
                                    if (tab.id === 'activities') {
                                        count = activities.length;
                                    } else if (tab.id === 'reminders') {
                                        // Count all that are NOT in emotional set
                                        count = tags.filter(t => !['Angry', 'Sad', 'Surprised'].includes(t.tagType)).length;
                                    } else {
                                        count = tags.filter(t => t.tagType === tab.label).length;
                                    }

                                    return (
                                        <button
                                            key={tab.id}
                                            className={`${styles.menuItem} ${activeLocker === tab.id ? styles.active : ''}`}
                                            onClick={() => setActiveLocker(tab.id as any)}
                                        >
                                            {tab.icon}
                                            <span>{tab.label}</span>
                                            {count > 0 && (
                                                <span className={styles.badge}>{count}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Locker Content */}
                            <div className={styles.lockerBody}>
                                {isLoadingData ? (
                                    <div className={styles.loading}>Loading data...</div>
                                ) : (
                                    <div className={styles.lockerContent}>
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-1">{TABS.find(t => t.id === activeLocker)?.label} Items</h3>
                                                <p className="text-sm text-gray-400">{TABS.find(t => t.id === activeLocker)?.tooltip}</p>
                                            </div>
                                            {activeLocker === 'reminders' && (
                                                <button
                                                    onClick={() => setShowTriggerModal(true)}
                                                    className="flex items-center gap-2 bg-black border border-white text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/10 transition-colors shadow-lg"
                                                >
                                                    <Plus size={18} /> Create Trigger
                                                </button>
                                            )}
                                        </div>

                                        {activeLocker === 'activities' ? (
                                            activities.length === 0 ? (
                                                <div className={styles.emptyState}>No activities found.</div>
                                            ) : (
                                                <div className={styles.activityList}>
                                                    {activities.map((act) => (
                                                        <div key={act.id} className={styles.factItem}>
                                                            <div className={styles.factHeader}>
                                                                <span style={{ fontSize: '24px', marginRight: '12px' }}>
                                                                    {act.type === 'CANVAS' ? '🎨' : act.type === 'JOURNAL' ? '📔' : '✨'}
                                                                </span>
                                                                <div>
                                                                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{act.type} Session</div>
                                                                    <div className={styles.date} style={{ fontSize: '12px', color: '#6b7280' }}>
                                                                        {new Date(act.startedAt).toLocaleString()}
                                                                    </div>
                                                                </div>
                                                                <div style={{ marginLeft: 'auto' }}>
                                                                    <span className={`${styles.activeBadge}`} style={{
                                                                        backgroundColor: act.status === 'STARTED' ? '#dcfce7' : '#f3f4f6',
                                                                        color: act.status === 'STARTED' ? '#166534' : '#374151'
                                                                    }}>
                                                                        {act.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        ) : (
                                            /* Generic Tag List */
                                            (() => {
                                                // Filter Logic
                                                const relevantTags = tags.filter(t => {
                                                    if (activeLocker === 'reminders') {
                                                        // Include anything NOT in emotional set (so custom tags/triggers go here)
                                                        return !['Angry', 'Sad', 'Surprised'].includes(t.tagType);
                                                    }
                                                    return t.tagType === TABS.find(tab => tab.id === activeLocker)?.label;
                                                });

                                                if (relevantTags.length === 0) {
                                                    return <div className={styles.emptyState}>No items in {TABS.find(t => t.id === activeLocker)?.label}</div>;
                                                }

                                                return (
                                                    <div className={styles.tagList}>
                                                        {relevantTags.map(tag => (
                                                            <div key={tag.id} className={`${styles.tagCard} ${styles[activeLocker] || 'border-l-4 border-blue-500 bg-white/5'} group relative`}>
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className={`${styles.tagBadge} ${activeLocker === 'reminders' ? 'bg-blue-900/50 text-blue-200 border border-blue-500/30' : ''}`}>
                                                                        {tag.tagType.toUpperCase()}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="text-[10px] text-gray-500 font-mono">
                                                                            {new Date(tag.createdAt).toLocaleDateString()}
                                                                        </div>
                                                                        {/* Actions */}
                                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={async (e) => {
                                                                                    e.stopPropagation();
                                                                                    const newTag = window.prompt("Edit tag:", tag.tagType);
                                                                                    if (newTag && newTag !== tag.tagType) {
                                                                                        // Optimistic update
                                                                                        const oldTag = tag.tagType;
                                                                                        setTags(prev => prev.map(t => t.id === tag.id ? { ...t, tagType: newTag } : t));

                                                                                        try {
                                                                                            const res = await fetch('/api/chat/messages/tag', {
                                                                                                method: 'PATCH',
                                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                                body: JSON.stringify({ messageId: tag.messageId, oldTag: oldTag, newTag: newTag })
                                                                                            });
                                                                                            if (!res.ok) throw new Error('Failed to update');
                                                                                            fetchBondingData(); // Refresh to be safe
                                                                                        } catch (err) {
                                                                                            console.error(err);
                                                                                            alert("Failed to update tag");
                                                                                            fetchBondingData(); // Revert
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                                                                title="Edit Tag Category"
                                                                            >
                                                                                <Edit2 size={12} />
                                                                            </button>
                                                                            <button
                                                                                onClick={async (e) => {
                                                                                    e.stopPropagation();
                                                                                    if (window.confirm("Remove this tag?")) {
                                                                                        // Optimistic
                                                                                        setTags(prev => prev.filter(t => t.id !== tag.id));

                                                                                        try {
                                                                                            const res = await fetch('/api/chat/messages/tag', {
                                                                                                method: 'DELETE',
                                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                                body: JSON.stringify({ messageId: tag.messageId, tag: tag.tagType })
                                                                                            });
                                                                                            if (!res.ok) throw new Error('Failed to delete');
                                                                                            fetchBondingData(); // Refresh counts
                                                                                        } catch (err) {
                                                                                            console.error(err);
                                                                                            alert("Failed to delete tag");
                                                                                            fetchBondingData();
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400"
                                                                                title="Remove Tag"
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-white text-sm font-medium leading-relaxed">"{tag.message.content}"</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div >
    );
}

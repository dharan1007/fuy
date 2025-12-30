'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
// Icons replaced with inline SVGs
import styles from './BondingDashboard.module.css';

// Types
interface Profile {
    id: string;
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

// Updated Locker Types for new Tags
type LockerType = 'work' | 'fun' | 'urgent' | 'idea' | 'activities';

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-500 text-gray-400 cursor-help hover:text-white hover:border-white transition-colors">
        <span className="text-[10px] font-bold">i</span>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black border border-white/20 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white/20"></div>
        </div>
    </div>
);

export default function BondingDashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    // State
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [activeLocker, setActiveLocker] = useState<LockerType>('urgent');
    const [tags, setTags] = useState<MessageTag[]>([]);
    const [activities, setActivities] = useState<BondingActivity[]>([]);
    const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Initial Load - Fetch Profiles (Conversations)
    useEffect(() => {
        const loadProfiles = async () => {
            try {
                const res = await fetch('/api/chat/conversations');
                if (res.ok) {
                    const data = await res.json();
                    // Transform conversations to profiles
                    const profileList: Profile[] = data.conversations.map((conv: any) => ({
                        id: conv.participantId,
                        name: conv.participantName,
                        avatar: conv.avatar,
                        lastMessageAt: conv.lastMessageTime,
                    }));
                    setProfiles(profileList);

                    // Check URL for selected profile
                    const urlProfileId = searchParams.get('profileId');
                    if (urlProfileId) {
                        const preSelected = profileList.find(p => p.id === urlProfileId);
                        if (preSelected) {
                            setSelectedProfile(preSelected);
                        }
                    } else if (profileList.length > 0 && !selectedProfile) {
                        // Select first by default if desktop? Or wait for user selection
                        // Currently defaulting to null to show "Select a profile" state
                        // setSelectedProfile(profileList[0]); 
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
            id: 'urgent',
            label: 'Urgent',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
            tooltip: 'Messages marked as Urgent for quick access.'
        },
        {
            id: 'work',
            label: 'Work',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
            tooltip: 'Work-related discussions and tasks.'
        },
        {
            id: 'fun',
            label: 'Fun',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></svg>,
            tooltip: 'Fun, memes, and casual chats.'
        },
        {
            id: 'idea',
            label: 'Ideas',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2v2" /><path d="M4.2 4.2l1.4 1.4" /><path d="M1.207 14.852a3.5 3.5 0 0 0 5.632 2.604M15 22a7 7 0 1 0-10.742-9.452" /></svg>,
            tooltip: 'Brainstorms and shared ideas.'
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
            {/* Sidebar */}
            <div className={styles.sidebar}>
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <button className={styles.backButton} onClick={() => router.push('/messages')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <h2>Bonding</h2>
                        <InfoTooltip text="View tagged messages and shared history with your connections." />
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
                                            <span className={styles.statValue}>{tags.filter(t => ['Urgent', 'Fun', 'Work', 'Idea'].includes(t.tagType)).length}</span>
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
                                {TABS.map(tab => (
                                    <button
                                        key={tab.id}
                                        className={`${styles.menuItem} ${activeLocker === tab.id ? styles.active : ''}`}
                                        onClick={() => setActiveLocker(tab.id as any)}
                                        title={tab.tooltip} // Native Tooltip fallback
                                    >
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                        {((tab.id === 'activities' ? activities.length : tagCounts[tab.label]) > 0) && (
                                            <span className={styles.badge}>
                                                {tab.id === 'activities' ? activities.length : tagCounts[tab.label]}
                                            </span>
                                        )}
                                        <div className="ml-auto opacity-50 hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                            <InfoTooltip text={tab.tooltip} />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Locker Content */}
                            <div className={styles.lockerBody}>
                                {isLoadingData ? (
                                    <div className={styles.loading}>Loading data...</div>
                                ) : (
                                    <div className={styles.lockerContent}>
                                        <div className={styles.tagHeader}>
                                            <h3>{TABS.find(t => t.id === activeLocker)?.label} Items</h3>
                                            <p>{TABS.find(t => t.id === activeLocker)?.tooltip}</p>
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
                                            /* Generic Tag List for Url/Work/Fun/Idea */
                                            (!tags.find(t => t.tagType === TABS.find(tab => tab.id === activeLocker)?.label)) ? (
                                                <div className={styles.emptyState}>No items in {TABS.find(t => t.id === activeLocker)?.label}</div>
                                            ) : (
                                                <div className={styles.tagList}>
                                                    {tags.filter(t => t.tagType === TABS.find(tab => tab.id === activeLocker)?.label).map(tag => (
                                                        <div key={tag.id} className={`${styles.tagCard} ${styles[activeLocker]}`}>
                                                            <div className={styles.tagBadge}>{tag.tagType}</div>
                                                            <div className={styles.tagMessage}>"{tag.message.content}"</div>
                                                            <div className={styles.tagDate}>{new Date(tag.createdAt).toLocaleDateString()}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

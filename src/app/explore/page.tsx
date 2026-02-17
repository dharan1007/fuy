'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import dynamic from 'next/dynamic';
import { SearchOverlay } from '@/components/Explore/SearchOverlay';
import { PostDetailModal } from '@/components/Explore/PostDetailModal';

// Lazy load heavy components
const GalaxyScene = dynamic(() => import('@/components/Explore/GalaxyScene'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black" />
});
const SlashesTab = dynamic(() => import('@/components/Explore/SlashesTab'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});
const FeedPostItem = dynamic(() => import('@/components/FeedPostItem'), { ssr: false });

interface Post {
  id: string;
  userId?: string;
  content?: string;
  postType?: string;
  user?: any;
  media?: any[];
  chanData?: any;
}

const TABS = ['Posts', 'Slashes', 'Chans', 'Auds', 'Chaptes', 'sixts', 'Puds'];

// Memoized Tab Button
const TabButton = React.memo(function TabButton({
  tab,
  isActive,
  onClick
}: {
  tab: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-200 text-sm font-bold uppercase tracking-wider whitespace-nowrap ${isActive
          ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-105'
          : 'bg-black/50 border-white/20 text-white/60 hover:bg-white/10 hover:text-white'
        }`}
    >
      {tab}
    </button>
  );
});

export default function ExplorePage() {
  const router = useRouter();
  const [activeGlobe, setActiveGlobe] = useState('Posts');
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showLines, setShowLines] = useState(true);
  const [isAutoRotate, setIsAutoRotate] = useState(true);

  // Consolidated state for all data
  const [data, setData] = useState<{
    posts: Post[];
    chans: Post[];
    lils: Post[];
    fills: Post[];
    auds: Post[];
    chaptes: Post[];
    xrays: Post[];
    puds: Post[];
    texts: Post[];
  }>({
    posts: [],
    chans: [],
    lils: [],
    fills: [],
    auds: [],
    chaptes: [],
    xrays: [],
    puds: [],
    texts: []
  });

  // Fetch data once on mount
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/explore/summary');
        if (res.ok && mounted) {
          const result = await res.json();
          setData({
            posts: result.main || [],
            chans: result.chans || [],
            lils: result.lills || [],
            fills: result.fills || [],
            auds: result.auds || [],
            chaptes: result.chapters || [],
            xrays: result.xrays || [],
            puds: result.puds || [],
            texts: result.texts || []
          });
        }
      } catch (err) {
        console.error('Error fetching explore content:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, []);

  // Memoized handlers
  const handlePostClick = useCallback((post: Post | any) => {
    if (activeGlobe === 'Posts') {
      router.push(`/explore/similar/${post.id}`);
    } else if (activeGlobe === 'Chans' || post.postType === 'CHAN' || post.chanData) {
      const chanId = post.chanData?.id || post.id;
      router.push(`/chan/${chanId}`);
    } else {
      setSelectedPost(post);
    }
  }, [activeGlobe, router]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveGlobe(tab);
    setSelectedPost(null);
  }, []);

  const handleToggle = useCallback(() => {
    setShowLines(prev => !prev);
    setIsAutoRotate(prev => !prev);
  }, []);

  const handleBack = useCallback(() => router.back(), [router]);
  const handleCloseModal = useCallback(() => setSelectedPost(null), []);

  // Memoized grid posts for text tabs
  const gridPosts = useMemo(() => {
    if (activeGlobe === 'Chaptes') return data.chaptes;
    if (activeGlobe === 'sixts') return data.texts;
    return [];
  }, [activeGlobe, data.chaptes, data.texts]);

  // Should show 3D scene
  const show3D = !['Slashes', 'Chaptes', 'sixts'].includes(activeGlobe);
  const showControls = !['Chans', 'Puds', 'Slashes', 'Chaptes', 'sixts'].includes(activeGlobe);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden">
      {/* Back Button */}
      <div className="absolute top-8 left-8 z-20">
        <button
          onClick={handleBack}
          className="p-3 rounded-full backdrop-blur-md border border-white/20 bg-white/10 text-white/60 hover:bg-white/20 transition-all duration-200 hover:text-white"
          title="Go Back"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>

      {/* Search Overlay */}
      {activeGlobe !== 'Slashes' && <SearchOverlay activeGlobe={activeGlobe} />}

      {/* Tab Selector */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 overflow-x-auto max-w-full px-4 pb-2 no-scrollbar">
        {TABS.map((tab) => (
          <TabButton
            key={tab}
            tab={tab}
            isActive={activeGlobe === tab}
            onClick={() => handleTabChange(tab)}
          />
        ))}
      </div>

      {/* Content */}
      <Suspense fallback={<LoadingSpinner />}>
        {activeGlobe === 'Slashes' ? (
          <SlashesTab />
        ) : ['Chaptes', 'sixts'].includes(activeGlobe) ? (
          <div className="pt-40 px-4 pb-8 overflow-y-auto h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {gridPosts.map((post: any) => (
                <FeedPostItem key={post.id} post={post} />
              ))}
            </div>
          </div>
        ) : (
          <GalaxyScene
            activeGlobe={activeGlobe}
            posts={data.posts}
            chans={data.chans}
            lils={data.lils}
            fills={data.fills}
            auds={data.auds}
            chaptes={data.chaptes}
            xrays={data.xrays}
            puds={data.puds}
            texts={data.texts}
            onPostClick={handlePostClick}
            showLines={showLines}
            autoRotate={isAutoRotate}
          />
        )}
      </Suspense>

      {/* Controls */}
      {showControls && (
        <div className="absolute bottom-8 right-8 z-10">
          <button
            onClick={handleToggle}
            className={`p-3 rounded-full backdrop-blur-md border transition-all duration-200 ${!isAutoRotate
                ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                : showLines
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                  : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'
              }`}
            title={!isAutoRotate ? "Play Rotation" : "Pause & Hide Lines"}
          >
            {!isAutoRotate ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Post Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

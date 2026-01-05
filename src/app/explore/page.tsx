'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import dynamic from 'next/dynamic';
import { SearchOverlay } from '@/components/Explore/SearchOverlay';

const GalaxyScene = dynamic(() => import('@/components/Explore/GalaxyScene'), { ssr: false });
import { PostDetailModal } from '@/components/Explore/PostDetailModal';
import SlashesTab from '@/components/Explore/SlashesTab';
import { DUMMY_PUDS, DUMMY_CHANS } from './dummyData';

interface Post {
  id: string;
  userId: string;
  content: string;
  feature: string;
  visibility: string;
  connectionScore: number;
  createdAt: string;
  user?: {
    name: string;
    profile?: {
      displayName: string;
      avatarUrl: string;
    };
  };
  media?: {
    id: string;
    url: string;
    type: string;
  }[];
  likes?: { id: string }[];
  comments?: { id: string; content?: string }[];
}

export default function ExplorePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeGlobe, setActiveGlobe] = useState('Posts');

  // New Categories Data
  const [chans, setChans] = useState<Post[]>([]);
  const [lils, setLils] = useState<Post[]>([]);
  const [fills, setFills] = useState<Post[]>([]);
  const [auds, setAuds] = useState<Post[]>([]);
  const [chaptes, setChaptes] = useState<Post[]>([]);
  const [xrays, setXrays] = useState<Post[]>([]);
  const [puds, setPuds] = useState<Post[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showLines, setShowLines] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);

        const res = await fetch('/api/explore/summary');
        if (res.ok) {
          const data = await res.json();

          // Filter out Chans and Chapters from main mixed posts
          const filteredMain = (data.main || []).filter((post: any) => post.postType !== 'CHAN' && post.feature !== 'CHAN' && post.postType !== 'CHAPTER');

          setPosts(filteredMain);
          setChans(data.chans && data.chans.length > 0 ? [...data.chans, ...DUMMY_CHANS] : DUMMY_CHANS as unknown as Post[]);
          setLils(data.lills || []);
          setFills(data.fills || []);
          setAuds(data.auds || []);
          setChaptes(data.chapters || []);
          setXrays(data.xrays || []);
          setPuds(data.puds && data.puds.length > 0 ? [...data.puds, ...DUMMY_PUDS] : DUMMY_PUDS as unknown as Post[]);
        }
      } catch (err) {
        console.error('Error fetching explore content:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <LoadingSpinner />
      </div>
    );
  }

  const handlePostClick = (post: Post | any) => {
    if (activeGlobe === 'Posts') {
      router.push(`/explore/similar/${post.id}`);
    } else if (activeGlobe === 'Chans' || post.postType === 'CHAN' || post.feature === 'CHAN') {
      const chanId = post.chanData?.id || post.id;
      router.push(`/chan/${chanId}`);
    } else {
      setSelectedPost(post);
    }
  };

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden">
      {/* Back Button */}
      <div className="absolute top-8 left-8 z-20">
        <button
          onClick={() => router.back()}
          className="p-3 rounded-full backdrop-blur-md border border-white/20 bg-white/10 text-white/60 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:text-white"
          title="Go Back"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>

      {/* Search Overlay */}
      {activeGlobe !== 'Slashes' && <SearchOverlay activeGlobe={activeGlobe} />}

      {/* Globe Selector Tabs */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 overflow-x-auto max-w-full px-4 pb-2 no-scrollbar">
        {['Posts', 'Slashes', 'Chans', 'Auds', 'Chaptes', 'X Rays', 'Puds'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveGlobe(tab); setSelectedPost(null); }}
            className={`px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-300 text-sm font-bold uppercase tracking-wider whitespace-nowrap ${activeGlobe === tab
              ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-105'
              : 'bg-black/50 border-white/20 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Galaxy Scene or Slashes Tab */}
      {activeGlobe === 'Slashes' ? (
        <SlashesTab />
      ) : (
        <GalaxyScene
          activeGlobe={activeGlobe}
          posts={posts}
          chans={chans}
          lils={lils}
          fills={fills}
          auds={auds}
          chaptes={chaptes}
          xrays={xrays}
          puds={puds}
          onPostClick={handlePostClick}
          showLines={showLines}
        />
      )}

      {/* Controls - Hide for Chans, Fills, Puds, Slashes */}
      {!['Chans', 'Puds', 'Slashes'].includes(activeGlobe) && (
        <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-4">
          <button
            onClick={() => setShowLines(!showLines)}
            className={`p-3 rounded-full backdrop-blur-md border transition-all duration-300 ${showLines
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
              : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'
              }`}
            title="Toggle Globe Lines"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </button>
        </div>
      )}

      {/* Post Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}


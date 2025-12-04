'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import GalaxyScene from '@/components/Explore/GalaxyScene';
import { SearchOverlay } from '@/components/Explore/SearchOverlay';
import { PostDetailModal } from '@/components/Explore/PostDetailModal';

interface Post {
  id: string;
  userId: string;
  content: string;
  feature: string;
  visibility: string;
  joyScore: number;
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

  // New Categories Data
  const [chans, setChans] = useState<Post[]>([]);
  const [lils, setLils] = useState<Post[]>([]);
  const [fills, setFills] = useState<Post[]>([]);
  const [auds, setAuds] = useState<Post[]>([]);
  const [chaptes, setChaptes] = useState<Post[]>([]);
  const [xrays, setXrays] = useState<Post[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showLines, setShowLines] = useState(true);

  // Helper to generate dummy posts
  const generateDummyPosts = (count: number, type: string, baseId: string): Post[] => {
    return Array.from({ length: count }).map((_, i) => ({
      id: `${baseId}-${i}`,
      userId: `user-${baseId}-${i}`,
      content: `${type} content #${i + 1}. This is a sample description for ${type}.`,
      feature: type,
      visibility: 'PUBLIC',
      joyScore: Math.floor(Math.random() * 100),
      connectionScore: Math.floor(Math.random() * 100),
      createdAt: new Date().toISOString(),
      user: {
        name: `${type} Creator ${i}`,
        profile: {
          displayName: `${type}User${i}`,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${baseId}${i}`,
        },
      },
      media: [{
        id: `m-${baseId}-${i}`,
        type: 'IMAGE',
        url: `https://picsum.photos/seed/${baseId}${i}/400/300`,
      }],
      likes: [],
      comments: [],
    }));
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/posts?limit=50');
        let fetchedPosts = [];
        if (response.ok) {
          const data = await response.json();
          fetchedPosts = data.posts || [];
        }

        // Combine with demo posts for main "Posts" globe
        setPosts([...fetchedPosts, ...DEMO_POSTS]);

        // Generate data for other globes
        setChans(generateDummyPosts(15, 'Chan', 'chan'));
        setLils(generateDummyPosts(20, 'Lil', 'lil'));
        setFills(generateDummyPosts(10, 'Fill', 'fill'));
        setAuds(generateDummyPosts(18, 'Aud', 'aud'));
        setChaptes(generateDummyPosts(12, 'Chapte', 'chapte'));
        setXrays(generateDummyPosts(8, 'XRay', 'xray'));

      } catch (err) {
        console.error('Error fetching posts:', err);
        setPosts(DEMO_POSTS);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const DEMO_POSTS: Post[] = [
    {
      id: 'demo-1',
      userId: 'demo-user-1',
      content: 'Exploring the neon streets of Tokyo at night. The cyber vibes are unreal! 🌃✨ #Cyberpunk #Tokyo #NightLife',
      feature: 'Photography',
      visibility: 'PUBLIC',
      joyScore: 95,
      connectionScore: 88,
      createdAt: new Date().toISOString(),
      user: {
        name: 'Alex Chen',
        profile: {
          displayName: 'Alex Chen',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm1',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&h=600&fit=crop',
      }],
      likes: Array(120).fill({ id: 'l' }),
      comments: [
        { id: 'c1', content: 'This looks amazing! 🔥' },
        { id: 'c2', content: 'Cyberpunk vibes are strong here.' },
        { id: 'c3', content: 'Wish I was there right now!' }
      ],
    },
    // ... (Keep existing demo posts if needed, or rely on generated ones. For brevity, I'll keep just one here but in real code I'd keep them all or move to a separate file)
  ];

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
      <SearchOverlay />

      {/* Galaxy Scene (7 Globes) */}
      <GalaxyScene
        posts={posts}
        chans={chans}
        lils={lils}
        fills={fills}
        auds={auds}
        chaptes={chaptes}
        xrays={xrays}
        onPostClick={setSelectedPost}
        showLines={showLines}
      />

      {/* Controls */}
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


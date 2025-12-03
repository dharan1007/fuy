'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import ExploreGlobe from '@/components/Explore/ExploreGlobe';
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
  comments?: { id: string }[];
}

export default function ExplorePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showLines, setShowLines] = useState(true);

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

        // Combine with demo posts
        setPosts([...fetchedPosts, ...DEMO_POSTS]);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setPosts(DEMO_POSTS); // Fallback to demo posts
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
    {
      id: 'demo-2',
      userId: 'demo-user-2',
      content: 'Just finished my first marathon! 🏃‍♂️💨 The energy was incredible. Thanks for all the support!',
      feature: 'Fitness',
      visibility: 'PUBLIC',
      joyScore: 98,
      connectionScore: 92,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      user: {
        name: 'Sarah Jones',
        profile: {
          displayName: 'Sarah J.',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm2',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&h=600&fit=crop',
      }],
      likes: Array(340).fill({ id: 'l' }),
      comments: [
        { id: 'c4', content: 'Congrats on the marathon! 🏃‍♂️' },
        { id: 'c5', content: 'That is a huge achievement.' }
      ],
    },
    {
      id: 'demo-3',
      userId: 'demo-user-3',
      content: 'Sunset over the mountains. Nature is the best artist. 🏔️🌅',
      feature: 'Nature',
      visibility: 'PUBLIC',
      joyScore: 99,
      connectionScore: 85,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      user: {
        name: 'Mike Ross',
        profile: {
          displayName: 'Mike R.',
          avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm3',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop',
      }],
      likes: Array(560).fill({ id: 'l' }),
      comments: Array(23).fill({ id: 'c' }),
    },
    {
      id: 'demo-4',
      userId: 'demo-user-4',
      content: 'Working on a new AI project. The future is now! 🤖💻 #AI #Coding #Tech',
      feature: 'Tech',
      visibility: 'PUBLIC',
      joyScore: 90,
      connectionScore: 95,
      createdAt: new Date(Date.now() - 200000000).toISOString(),
      user: {
        name: 'David Kim',
        profile: {
          displayName: 'DevDave',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm4',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop',
      }],
      likes: Array(89).fill({ id: 'l' }),
      comments: Array(12).fill({ id: 'c' }),
    },
    {
      id: 'demo-5',
      userId: 'demo-user-5',
      content: 'Delicious homemade pasta! 🍝🇮🇹 Cooking is my therapy.',
      feature: 'Food',
      visibility: 'PUBLIC',
      joyScore: 96,
      connectionScore: 80,
      createdAt: new Date(Date.now() - 300000000).toISOString(),
      user: {
        name: 'Emily White',
        profile: {
          displayName: 'ChefEm',
          avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm5',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&h=600&fit=crop',
      }],
      likes: Array(210).fill({ id: 'l' }),
      comments: Array(34).fill({ id: 'c' }),
    },
    {
      id: 'demo-6',
      userId: 'demo-user-6',
      content: 'Lost in the rhythm. Music is life. 🎵🎧',
      feature: 'Music',
      visibility: 'PUBLIC',
      joyScore: 94,
      connectionScore: 88,
      createdAt: new Date(Date.now() - 400000000).toISOString(),
      user: {
        name: 'Chris Martin',
        profile: {
          displayName: 'ChrisM',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm6',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop',
      }],
      likes: Array(150).fill({ id: 'l' }),
      comments: Array(20).fill({ id: 'c' }),
    },
    {
      id: 'demo-7',
      userId: 'demo-user-7',
      content: 'Minimalist architecture is so soothing. 🏢✨',
      feature: 'Design',
      visibility: 'PUBLIC',
      joyScore: 92,
      connectionScore: 75,
      createdAt: new Date(Date.now() - 500000000).toISOString(),
      user: {
        name: 'Anna Lee',
        profile: {
          displayName: 'AnnaL',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm7',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop',
      }],
      likes: Array(300).fill({ id: 'l' }),
      comments: Array(15).fill({ id: 'c' }),
    },
    {
      id: 'demo-8',
      userId: 'demo-user-8',
      content: 'Exploring the deep blue sea. 🌊🐠 Diving is a whole new world.',
      feature: 'Travel',
      visibility: 'PUBLIC',
      joyScore: 97,
      connectionScore: 82,
      createdAt: new Date(Date.now() - 600000000).toISOString(),
      user: {
        name: 'Tom Wilson',
        profile: {
          displayName: 'DiverTom',
          avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm8',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
      }],
      likes: Array(420).fill({ id: 'l' }),
      comments: Array(55).fill({ id: 'c' }),
    },
    {
      id: 'demo-9',
      userId: 'demo-user-9',
      content: 'Coffee and code. The perfect morning routine. ☕💻',
      feature: 'Lifestyle',
      visibility: 'PUBLIC',
      joyScore: 89,
      connectionScore: 90,
      createdAt: new Date(Date.now() - 700000000).toISOString(),
      user: {
        name: 'Jessica Brown',
        profile: {
          displayName: 'JessB',
          avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm9',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=800&h=600&fit=crop',
      }],
      likes: Array(180).fill({ id: 'l' }),
      comments: Array(25).fill({ id: 'c' }),
    },
    {
      id: 'demo-10',
      userId: 'demo-user-10',
      content: 'Abstract art in motion. 🎨🌀 Creativity has no limits.',
      feature: 'Art',
      visibility: 'PUBLIC',
      joyScore: 93,
      connectionScore: 78,
      createdAt: new Date(Date.now() - 800000000).toISOString(),
      user: {
        name: 'Ryan Garcia',
        profile: {
          displayName: 'RyanArt',
          avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm10',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=800&h=600&fit=crop',
      }],
      likes: Array(250).fill({ id: 'l' }),
      comments: Array(40).fill({ id: 'c' }),
    },
    {
      id: 'demo-11',
      userId: 'demo-user-11',
      content: 'Chasing auroras in the north. 🌌❄️ Magical.',
      feature: 'Travel',
      visibility: 'PUBLIC',
      joyScore: 100,
      connectionScore: 85,
      createdAt: new Date(Date.now() - 900000000).toISOString(),
      user: {
        name: 'Sophie Turner',
        profile: {
          displayName: 'SophieT',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm11',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&h=600&fit=crop',
      }],
      likes: Array(600).fill({ id: 'l' }),
      comments: Array(70).fill({ id: 'c' }),
    },
    {
      id: 'demo-12',
      userId: 'demo-user-12',
      content: 'Vintage car restoration complete! 🚗🔧 A labor of love.',
      feature: 'Hobbies',
      visibility: 'PUBLIC',
      joyScore: 96,
      connectionScore: 88,
      createdAt: new Date(Date.now() - 1000000000).toISOString(),
      user: {
        name: 'Daniel Lee',
        profile: {
          displayName: 'DanTheMan',
          avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm12',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1532974297617-c0f05fe48bff?w=800&h=600&fit=crop',
      }],
      likes: Array(320).fill({ id: 'l' }),
      comments: Array(45).fill({ id: 'c' }),
    },
    {
      id: 'demo-13',
      userId: 'demo-user-13',
      content: 'Reading by the fireplace. 📖🔥 Cozy vibes only.',
      feature: 'Relaxation',
      visibility: 'PUBLIC',
      joyScore: 98,
      connectionScore: 80,
      createdAt: new Date(Date.now() - 1100000000).toISOString(),
      user: {
        name: 'Olivia Green',
        profile: {
          displayName: 'LivReads',
          avatarUrl: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm13',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&h=600&fit=crop',
      }],
      likes: Array(280).fill({ id: 'l' }),
      comments: Array(30).fill({ id: 'c' }),
    },
    {
      id: 'demo-14',
      userId: 'demo-user-14',
      content: 'Skateboarding at sunset. 🛹🌅 Freedom.',
      feature: 'Sports',
      visibility: 'PUBLIC',
      joyScore: 94,
      connectionScore: 85,
      createdAt: new Date(Date.now() - 1200000000).toISOString(),
      user: {
        name: 'Lucas Black',
        profile: {
          displayName: 'LukeSkater',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm14',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1520045864981-8fee18241664?w=800&h=600&fit=crop',
      }],
      likes: Array(190).fill({ id: 'l' }),
      comments: Array(22).fill({ id: 'c' }),
    },
    {
      id: 'demo-15',
      userId: 'demo-user-15',
      content: 'Fresh healthy salad for lunch! 🥗🥑 Eat good, feel good.',
      feature: 'Health',
      visibility: 'PUBLIC',
      joyScore: 91,
      connectionScore: 82,
      createdAt: new Date(Date.now() - 1300000000).toISOString(),
      user: {
        name: 'Emma Watson',
        profile: {
          displayName: 'HealthyEm',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        },
      },
      media: [{
        id: 'm15',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
      }],
      likes: Array(160).fill({ id: 'l' }),
      comments: Array(18).fill({ id: 'c' }),
    },
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

      {/* 3D Globe */}
      <ExploreGlobe posts={posts} onPostClick={setSelectedPost} showLines={showLines} />

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


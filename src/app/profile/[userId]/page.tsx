import { prisma } from "@/lib/prisma";
import ProfileActions from "@/components/ProfileActions";
import AppHeader from "@/components/AppHeader";
import ProfilePostsGrid from "@/components/profile/ProfilePostsGrid";
import { SpaceBackground } from "@/components/SpaceBackground";
import { Tv, ChevronRight, Play } from "lucide-react";
import Link from 'next/link';

export const revalidate = 60; // ISR: Revalidate every 60 seconds

// Type for the posts included in userData
type Media = { type: "IMAGE" | "VIDEO" | "AUDIO"; url: string };
type Post = {
  id: string;
  content: string;
  visibility: string;
  feature: string;
  createdAt: Date;
  media: Media[]
};

export default async function UserProfilePage({ params }: { params: { userId: string } }) {
  // Public Cache: No session check here.
  // const session = await getServerSession(authOptions); 
  const currentUserId = null;
  const isMe = false;

  // 1. Fetch User Data with Posts & Counts
  // Note: We always fetch as if guest. Private checks happen via 'isPrivate' flag.
  const userData = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      email: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
          coverVideoUrl: true,
          bio: true,
          location: true,
          tags: true,
          isPrivate: true,
        },
      },
      posts: {
        where: {
          status: "PUBLISHED", // Always filtered for public
          postType: { not: "CHAN" }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          postMedia: { include: { media: true } },
          user: {
            select: {
              id: true,
              name: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          }
        },
      },
      _count: {
        select: {
          friendshipsB: true, // Followers (inbound)
          friendshipsA: true, // Following (outbound)
          posts: {
            where: { postType: { not: "CHAN" } }
          },
        }
      }
    },
  });

  const taggedChannel: any = await prisma.chan.findFirst({
    where: {
      post: { userId: params.userId },
      showOnProfile: true
    } as any,
    include: {
      shows: {
        where: { isArchived: false },
        include: {
          episodes: { take: 1, orderBy: { createdAt: 'desc' } }
        },
        take: 1
      }
    }
  });

  if (!userData) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-900 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">User Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">This user profile doesn't exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  // Friendship status is handled client-side now
  const friendshipStatus: "PENDING" | "ACCEPTED" | "NONE" = "NONE";

  const isPrivate = userData.profile?.isPrivate ?? false;
  // View logic: Only show if public. Private accounts need client-side auth/unlock or just stay locked on public profile.
  const canViewContent = !isPrivate;

  // Use DB counts
  const stats = {
    followers: userData._count.friendshipsB,
    following: userData._count.friendshipsA,
    posts: userData._count.posts
  };

  // Transform posts to flatten media
  const posts = userData.posts.map((p: any) => {
    const media = p.postMedia?.map((pm: any) => pm.media) || [];
    return {
      ...p,
      media,
      createdAt: p.createdAt.toISOString(),
      // Synthesize Data for Cards
      lillData: p.postType === 'LILL' ? {
        id: p.id,
        videoUrl: media[0]?.url || '',
        thumbnailUrl: media[0]?.thumbnailUrl || null,
        duration: 0
      } : undefined,

      fillData: p.postType === 'FILL' ? {
        id: p.id,
        videoUrl: media[0]?.url || '',
        thumbnailUrl: media[0]?.thumbnailUrl || null,
        duration: 0
      } : undefined,

      audData: p.postType === 'AUD' ? {
        id: p.id,
        title: "Audio",
        artist: "Artist",
        coverImageUrl: media[0]?.url,
        duration: 0
      } : undefined,

      chanData: p.postType === 'CHAN' ? {
        id: p.id,
        channelName: p.feature,
        description: p.contentSnippet,
        coverImageUrl: media[0]?.url
      } : undefined
    };
  });

  return (
    <div className="min-h-screen bg-black relative text-white">
      <SpaceBackground />
      {/* Header (No Settings) */}
      <AppHeader title="Profile" showSettingsAndLogout={false} />

      {/* Cover video / banner */}
      <div className="relative">
        {userData.profile?.coverVideoUrl ? (
          <video
            src={userData.profile.coverVideoUrl}
            className="w-full h-56 md:h-72 lg:h-80 object-cover"
            controls
            playsInline
            muted
            loop
          />
        ) : (
          <div className="w-full h-56 md:h-72 lg:h-80 bg-gradient-to-r from-indigo-200 via-sky-200 to-emerald-200 dark:from-indigo-900 dark:via-blue-900 dark:to-emerald-900 opacity-20" />
        )}

        {/* Avatar */}
        <div className="absolute -bottom-10 left-4 sm:left-6 flex flex-col sm:flex-row items-start sm:items-end gap-2 sm:gap-4">
          <div className="relative">
            <img
              src={
                userData.profile?.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  userData.name || userData.profile?.displayName || "U"
                )}`
              }
              alt="profile"
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full ring-4 ring-white dark:ring-neutral-800 object-cover bg-white dark:bg-neutral-700"
            />
          </div>
        </div>
      </div>

      {/* Content card */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-14 z-10 relative">
        {/* Actions & Name Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {userData.profile?.displayName || userData.name || "Unknown User"}
              {taggedChannel && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-wider border border-red-500/20">
                  Channel
                </span>
              )}
            </h1>
            {userData.profile?.location && (
              <p className="text-sm text-gray-500 dark:text-gray-400">📍 {userData.profile.location}</p>
            )}
          </div>
          {!isMe && (
            <div className="flex gap-2">
              <ProfileActions
                targetUserId={userData.id}
                initialStatus={friendshipStatus}
                isPrivate={isPrivate}
              />
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
          <Stat label="Followers" value={stats.followers} />
          <Stat label="Following" value={stats.following} />
          <Stat label="Posts" value={stats.posts} />
        </div>

        {/* Bio Section (Read Only) */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 bg-white/5 backdrop-blur rounded-xl p-4 sm:p-6 shadow-sm border border-white/10 mb-8 text-white">
          {userData.profile?.bio && (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">About</label>
              <p className="text-gray-200 whitespace-pre-wrap">{userData.profile.bio}</p>
            </div>
          )}
          {userData.profile?.tags && (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Interests</label>
              <div className="flex flex-wrap gap-2">
                {userData.profile.tags.split(",").map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-medium text-gray-300">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!userData.profile?.bio && !userData.profile?.tags && (
            <p className="text-gray-500 italic">No bio or tags yet.</p>
          )}
        </div>

        {/* Pinned Channel */}
        {taggedChannel && (
          <div className="mb-8 group">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/30 mb-3 ml-1">Pinned Channel</h2>
            <Link
              href={`/chan/${taggedChannel.id}`}
              className="block bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-2xl relative"
            >
              {taggedChannel.coverImageUrl && (
                <div className="absolute inset-0 z-0 opacity-20">
                  <img src={taggedChannel.coverImageUrl} className="w-full h-full object-cover grayscale brightness-50" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
                </div>
              )}

              <div className="relative z-10 p-5 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
                    <Tv className="w-7 h-7 text-white/70" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-white truncate">{taggedChannel.channelName}</h3>
                    <p className="text-white/40 text-xs line-clamp-1">{taggedChannel.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {taggedChannel.shows?.[0] && (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 max-w-[150px]">
                      <Play className="w-3 h-3 text-white/50" />
                      <span className="text-[10px] font-bold text-white/70 truncate">{taggedChannel.shows[0].title}</span>
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Private Account Message */}
        {!canViewContent && (
          <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-2xl bg-white/5">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-white mb-2">This Account is Private</h2>
            <p className="text-gray-400">Follow this user to see their posts and details.</p>
          </div>
        )}

        {/* Posts Grid */}
        {canViewContent && (
          <ProfilePostsGrid
            posts={posts as any}
            isMe={isMe}
          />
        )}

      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full bg-white/10 px-4 py-2 shadow text-sm border border-white/10">
      <span className="font-semibold text-white">{value}</span> <span className="text-gray-300">{label}</span>
    </div>
  );
}

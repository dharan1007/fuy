// src/app/profile/[userId]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileActions from "@/components/ProfileActions";
import AppHeader from "@/components/AppHeader";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const next = encodeURIComponent(`/profile/${params.userId}`);
    redirect(`/join?next=${next}`);
  }

  const currentUserId = session.user.id;
  const isMe = currentUserId === params.userId;

  // 1. Fetch User Data with Posts & Counts
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
        orderBy: { createdAt: 'desc' },
        include: { media: true },
      },
      _count: {
        select: {
          friendshipsB: true, // Followers (inbound)
          friendshipsA: true, // Following (outbound)
          posts: true,
        }
      }
    },
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

  // Check friendship status
  let friendshipStatus: "PENDING" | "ACCEPTED" | "NONE" = "NONE";

  if (!isMe) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: params.userId },
          { userId: params.userId, friendId: currentUserId },
        ],
      },
    });
    if (friendship) {
      friendshipStatus = friendship.status as "PENDING" | "ACCEPTED";
    }
  }

  const isPrivate = userData.profile?.isPrivate ?? false;
  // View logic: Me OR Not Private OR Friends
  const canViewContent = isMe || !isPrivate || friendshipStatus === "ACCEPTED";

  // Use DB counts
  const stats = {
    followers: userData._count.friendshipsB,
    following: userData._count.friendshipsA,
    posts: userData._count.posts
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-white to-white dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 pb-20">
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
          <div className="w-full h-56 md:h-72 lg:h-80 bg-gradient-to-r from-indigo-200 via-sky-200 to-emerald-200 dark:from-indigo-900 dark:via-blue-900 dark:to-emerald-900" />
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
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-14">
        {/* Actions & Name Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userData.profile?.displayName || userData.name || "Unknown User"}
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
        <div className="grid grid-cols-1 gap-4 sm:gap-6 bg-white/80 dark:bg-neutral-800/80 backdrop-blur rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-neutral-700 mb-8">
          {userData.profile?.bio && (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">About</label>
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{userData.profile.bio}</p>
            </div>
          )}
          {userData.profile?.tags && (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Interests</label>
              <div className="flex flex-wrap gap-2">
                {userData.profile.tags.split(",").map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-neutral-700 text-xs font-medium text-gray-700 dark:text-gray-300">
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

        {/* Private Account Message */}
        {!canViewContent && (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-2xl bg-white/50 dark:bg-neutral-900/50">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">This Account is Private</h2>
            <p className="text-gray-600 dark:text-gray-400">Follow this user to see their posts and details.</p>
          </div>
        )}

        {/* Posts Grid */}
        {canViewContent && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Recent Posts</h2>
            {userData.posts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {userData.posts.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm dark:shadow-lg p-5 hover:shadow-md dark:hover:shadow-xl transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                        {p.feature}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{p.visibility}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 mb-3 line-clamp-4">
                      {p.content}
                    </p>
                    {p.media?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {p.media.map((m: any, i: number) =>
                          m.type === "IMAGE" ? (
                            <img
                              key={i}
                              src={m.url}
                              alt="Post media"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                          ) : m.type === "VIDEO" ? (
                            <video
                              key={i}
                              src={m.url}
                              className="w-full h-48 object-cover rounded-lg"
                              controls
                              playsInline
                            />
                          ) : null
                        )}
                      </div>
                    )}
                    <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/50 dark:bg-neutral-800/50 rounded-xl border border-gray-200 dark:border-neutral-700">
                <p className="text-gray-500 dark:text-gray-400">No posts shared yet.</p>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full bg-white/80 dark:bg-neutral-700/80 px-4 py-2 shadow text-sm border border-gray-200 dark:border-neutral-600">
      <span className="font-semibold text-gray-900 dark:text-white">{value}</span> <span className="text-gray-600 dark:text-gray-300">{label}</span>
    </div>
  );
}

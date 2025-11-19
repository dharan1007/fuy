// src/app/profile/[userId]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function UserProfilePage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const next = encodeURIComponent(`/profile/${params.userId}`);
    redirect(`/join?next=${next}`);
  }

  const userData = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      name: true,
      email: true,
      profile: {
        select: {
          displayName: true,
          avatarUrl: true,
          bio: true,
          location: true,
          tags: true,
        },
      },
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

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-2xl p-8 mb-8">
          {userData.profile?.avatarUrl && (
            <img
              src={userData.profile.avatarUrl}
              alt={userData.name || "User"}
              className="w-24 h-24 rounded-full mb-4 object-cover border-4 border-white dark:border-neutral-800"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {userData.profile?.displayName || userData.name || "Unknown User"}
          </h1>
          {userData.profile?.bio && (
            <p className="text-gray-700 dark:text-gray-300 mb-4">{userData.profile.bio}</p>
          )}
          {userData.profile?.location && (
            <p className="text-gray-600 dark:text-gray-400">📍 {userData.profile.location}</p>
          )}
        </div>

        {/* Profile Details */}
        {userData.profile?.tags && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {userData.profile.tags.split(",").map((tag) => (
                <span
                  key={tag.trim()}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-full text-sm font-medium"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contact</h2>
          <p className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">Email:</span> {userData.email}
          </p>
        </div>
      </div>
    </div>
  );
}

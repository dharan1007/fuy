import Link from 'next/link';
import PostActionMenu from '@/components/PostActionMenu';

type LillCardProps = {
    lill: {
        id: string;
        videoUrl: string;
        thumbnailUrl?: string | null;
        duration: number;
    };
    user?: any;
    post?: any;
    currentUserId?: string;
    onPostHidden?: () => void;
    onRefresh?: () => void;
};

export default function LillCard({ lill, user, post, currentUserId, onPostHidden, onRefresh }: LillCardProps) {
    return (
        <div className="bg-black rounded-lg overflow-hidden relative h-full w-full aspect-[9/16] group">
            {/* Full Height Video */}
            <video
                src={lill.videoUrl}
                poster={lill.thumbnailUrl || undefined}
                controls
                className="w-full h-full object-cover"
            />

            {/* Overlay Details (Reels Style) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    {user && (
                        <Link href={`/profile/${user.id}`} className="shrink-0">
                            <img
                                src={user.profile?.avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=User"}
                                alt={user.profile?.displayName}
                                className="w-8 h-8 rounded-full border border-white/20"
                            />
                        </Link>
                    )}
                    <span className="text-white font-bold text-sm shadow-black drop-shadow-md">
                        {user?.profile?.displayName || 'User'}
                    </span>
                </div>
            </div>
            <div className="absolute top-2 right-2 z-20">
                <PostActionMenu
                    post={post || { id: lill.id, user, userId: user?.id }}
                    currentUserId={currentUserId}
                    onPostHidden={onPostHidden}
                    onRefresh={onRefresh}
                />
            </div>
        </div>
    );
}

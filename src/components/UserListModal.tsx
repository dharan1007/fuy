'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  name: string | null;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

interface UserListItem {
  id: string;
  friendshipId: string;
  user: User;
  createdAt: string;
}

interface UserListModalProps {
  isOpen: boolean;
  title: string;
  users: UserListItem[];
  onClose: () => void;
  onRemoveFriend: (friendshipId: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export default function UserListModal({
  isOpen,
  title,
  users,
  onClose,
  onRemoveFriend,
  isLoading = false,
  error = null,
}: UserListModalProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRemove = async (friendshipId: string) => {
    setRemovingId(friendshipId);
    try {
      await onRemoveFriend(friendshipId);
    } finally {
      setRemovingId(null);
    }
  };

  const getDisplayName = (user: User) => {
    return user.profile?.displayName || user.name || 'Unknown User';
  };

  const getAvatarUrl = (user: User) => {
    return (
      user.profile?.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${getDisplayName(user)}`
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-light w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {error ? (
              <div className="flex items-center justify-center h-32 px-4">
                <div className="text-red-500 text-center">{error}</div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : users.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500 text-center">No users to display</div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {users.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <Link
                      href={`/profile/${item.user.id}`}
                      className="flex-1 flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={getAvatarUrl(item.user)}
                        alt={getDisplayName(item.user)}
                        className="w-10 h-10 rounded-full border-2 border-blue-400 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {getDisplayName(item.user)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.user.name && `@${item.user.name}`}
                        </div>
                      </div>
                    </Link>

                    <button
                      onClick={() => handleRemove(item.friendshipId)}
                      disabled={removingId === item.friendshipId}
                      className="ml-2 px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors flex-shrink-0"
                    >
                      {removingId === item.friendshipId ? 'Removing...' : 'Remove'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={onClose}
              className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

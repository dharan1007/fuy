"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string | null;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  post?: {
    id: string;
    content: string;
    user: {
      id: string;
      name: string | null;
    };
  };
};

export default function NotificationsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const url = filter === "unread" ? "/api/notifications?unreadOnly=true" : "/api/notifications";
      const res = await fetch(url);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Load notifications error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      loadNotifications();
    } catch (error) {
      console.error("Mark as read error:", error);
    }
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      loadNotifications();
    } catch (error) {
      console.error("Mark all as read error:", error);
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });
      loadNotifications();
    } catch (error) {
      console.error("Delete notification error:", error);
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "FRIEND_REQUEST":
        return (
          <div className="bg-blue-100 p-2 rounded-full">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case "FRIEND_ACCEPT":
        return (
          <div className="bg-green-100 p-2 rounded-full">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "POST_LIKE":
        return (
          <div className="bg-red-100 p-2 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        );
      case "POST_COMMENT":
        return (
          <div className="bg-purple-100 p-2 rounded-full">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-gray-100 p-2 rounded-full">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  }

  function getDisplayName(user: any) {
    return user?.profile?.displayName || user?.name || "Someone";
  }

  function getAvatarUrl(user: any) {
    if (user?.profile?.avatarUrl) return user.profile.avatarUrl;
    const name = getDisplayName(user);
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Notifications" showBackButton />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "unread"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Unread
            </button>
          </div>

          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Mark all as read
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {loading && (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="mt-4 text-gray-500">No notifications</p>
            </div>
          )}

          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-lg transition-colors cursor-pointer ${
                notif.read
                  ? "bg-white hover:bg-gray-50"
                  : "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-600"
              }`}
              onClick={() => !notif.read && markAsRead(notif.id)}
            >
              <div className="flex items-start gap-4">
                {getNotificationIcon(notif.type)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">
                          {getDisplayName(notif.sender)}
                        </span>{" "}
                        {notif.message}
                      </p>
                      {notif.post && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          "{notif.post.content}"
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

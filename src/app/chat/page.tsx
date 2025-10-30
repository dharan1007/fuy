"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface UserProfile {
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface User {
  id: string;
  name?: string | null;
  email: string;
  profile?: UserProfile | null;
}

interface Conversation {
  id: string;
  participantA: string;
  participantB: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  userA: User;
  userB: User;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: User;
}

interface SearchUser {
  id: string;
  name: string | null;
  email: string;
  profile?: UserProfile | null;
}

export default function ChatPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Get current user ID from session
  useEffect(() => {
    const getSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user?.id) {
          setCurrentUserId(session.user.id);
        }
      } catch (error) {
        console.error("Failed to get session:", error);
      }
    };
    getSession();
  }, []);

  // Load conversations
  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
    }
  }, [currentUserId]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json();
      const convs = data.conversations || [];
      // Sort by last message timestamp (newest first)
      const sorted = convs.sort((a: Conversation, b: Conversation) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });
      setConversations(sorted);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setLoading(false);
    }
  };

  // Fetch messages - wrapped in useCallback for proper dependency management
  const fetchMessages = useCallback(async () => {
    if (!selectedConv) return;
    try {
      console.log("[fetchMessages] Fetching messages for conv:", selectedConv.id);
      const res = await fetch(`/api/chat/messages?conversationId=${selectedConv.id}`);
      const data = await res.json();
      console.log("[fetchMessages] Got messages:", data.messages?.length || 0);
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, [selectedConv]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConv) {
      console.log("[useEffect] selectedConv changed:", selectedConv.id);
      fetchMessages();
      setSessionStartTime(new Date());
      setShowSearch(false);
      const interval = setInterval(() => {
        fetchMessages();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedConv, fetchMessages]);

  const searchUsers = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const url = `/api/users/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error("Failed to search users:", error);
    }
  };

  const startConversation = async (friendId: string) => {
    try {
      console.log("[startConversation] Creating conversation with friendId:", friendId);
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      const data = await res.json();
      console.log("[startConversation] Response status:", res.status, "data:", data);

      if (!res.ok) {
        console.error("Failed to create conversation. Status:", res.status, "Error:", data.error);
        return;
      }

      if (data.conversation) {
        setSelectedConv(data.conversation);
        await fetchConversations();
        setShowSearch(false);
        setSearchQuery("");
        setSearchResults([]);
      } else {
        console.error("Failed to create conversation:", data);
      }
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;

    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          content: newMessage,
        }),
      });
      setNewMessage("");
      await fetchMessages();
      await fetchConversations();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Get the other user in conversation
  const getOtherUser = (conv: Conversation): User | null => {
    if (!currentUserId) return null;
    return conv.participantA === currentUserId ? conv.userB : conv.userA;
  };

  const otherUser = selectedConv ? getOtherUser(selectedConv) : null;

  const formatTime = (time: Date | null) => {
    if (!time) return "0s";
    const elapsed = Math.floor((Date.now() - time.getTime()) / 1000);
    if (elapsed < 60) return `${elapsed}s`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m`;
    return `${Math.floor(elapsed / 3600)}h`;
  };

  if (loading || !currentUserId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-600">Loading chats...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[280px_1fr_320px] h-[calc(100vh-64px)] bg-white">
      {/* LEFT SIDEBAR - FRIENDS & CHATS */}
      <div className="border-r border-gray-200 flex flex-col bg-white">
        {/* Back Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition w-full justify-start"
            title="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => searchUsers(e.target.value)}
            onFocus={() => setShowSearch(true)}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
          />
        </div>

        {/* Friends/Chats List */}
        <div className="flex-1 overflow-y-auto">
          {showSearch && searchResults.length > 0 ? (
            // Search Results
            <div className="p-2 space-y-1">
              <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Search Results</p>
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startConversation(user.id)}
                  className="w-full p-3 text-left hover:bg-blue-50 rounded-lg flex items-center gap-3 transition"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {user.profile?.displayName || user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Recent Chats (sorted by last message)
            <div className="p-2 space-y-1">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <p className="text-sm">No chats yet. Search to start chatting!</p>
                </div>
              ) : (
                <>
                  <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Recent Chats</p>
                  {conversations.map((conv) => {
                    const other = getOtherUser(conv);
                    const isSelected = selectedConv?.id === conv.id;
                    if (!other) return null;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConv(conv)}
                        className={`w-full p-3 text-left rounded-lg transition flex items-center gap-3 ${
                          isSelected ? "bg-blue-100 border-l-4 border-l-blue-500" : "hover:bg-gray-100"
                        }`}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {other.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">
                            {other.profile?.displayName || other.name}
                          </p>
                          <p className="text-xs text-gray-600 truncate line-clamp-1">
                            {conv.lastMessage || "No messages yet"}
                          </p>
                        </div>
                        {conv.lastMessageAt && (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {new Date(conv.lastMessageAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CENTER - CHAT AREA */}
      {selectedConv && otherUser ? (
        <div className="flex flex-col bg-white">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 border-b border-blue-700 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">
                {otherUser.profile?.displayName || otherUser.name}
              </h2>
              <p className="text-sm text-blue-100">
                Talking for: {formatTime(sessionStartTime)}
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <p>No messages yet. Say hello!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs px-4 py-2.5 rounded-2xl ${
                        isOwn
                          ? "bg-blue-500 text-white rounded-br-none"
                          : "bg-gray-200 text-gray-900 rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm break-words">{msg.content}</p>
                      <p className={`text-xs mt-1.5 ${isOwn ? "text-blue-100" : "text-gray-600"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Write your message..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 font-semibold text-sm transition"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex items-center justify-center bg-gray-50">
          <p className="text-gray-400">Select a conversation or search to start chatting</p>
        </div>
      )}

      {/* RIGHT SIDEBAR - USER PROFILE */}
      {selectedConv && otherUser && (
        <div className="border-l border-gray-200 flex flex-col bg-white">
          {/* Profile Section */}
          <div className="p-4 border-b border-gray-200 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
              {otherUser.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <h3 className="font-bold text-gray-900 text-sm">
              {otherUser.profile?.displayName || otherUser.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1 truncate">{otherUser.email}</p>
          </div>

          {/* Stats */}
          <div className="p-4 border-b border-gray-200 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Messages</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{messages.length}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Status</p>
              <p className="text-sm text-green-600 font-medium mt-1">● Online</p>
            </div>
          </div>

          {/* Essenz Tags & Watchlist */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-b from-purple-50 to-white">
            <p className="text-xs font-semibold text-purple-700 uppercase mb-3">Essenz & Tags</p>
            <div className="space-y-2">
              <div className="text-xs bg-white rounded-lg p-2 border border-purple-200">
                <p className="font-semibold text-purple-900 mb-1">🎯 {otherUser.name}'s Goals</p>
                <p className="text-purple-600 text-[10px]">View shared goals and collaborate</p>
              </div>
              <div className="text-xs bg-white rounded-lg p-2 border border-red-200">
                <p className="font-semibold text-red-900 mb-1">🎬 Watchlist</p>
                <p className="text-red-600 text-[10px]">Watch together on their list</p>
              </div>
              <div className="text-xs bg-white rounded-lg p-2 border border-blue-200">
                <p className="font-semibold text-blue-900 mb-1">📔 Shared Resources</p>
                <p className="text-blue-600 text-[10px]">Tools, books, and courses</p>
              </div>
            </div>
          </div>

          {/* Collaboration Features */}
          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            <p className="text-xs font-semibold text-gray-600 uppercase">Collaborate</p>
            <button
              onClick={() => {
                if (otherUser?.id) {
                  router.push(`/journal/canvas?with=${otherUser.id}`);
                }
              }}
              className="w-full p-3 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
            >
              📔 Journal Together
            </button>
            <button
              onClick={() => {
                if (otherUser?.id) {
                  router.push(`/awe-routes?with=${otherUser.id}`);
                }
              }}
              className="w-full p-3 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
            >
              ☕ AWE Routes
            </button>
            <button
              onClick={() => {
                if (otherUser?.id) {
                  router.push(`/breathing?with=${otherUser.id}`);
                }
              }}
              className="w-full p-3 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
            >
              💨 Breathing Exercise
            </button>
            <button
              onClick={() => {
                if (otherUser?.id) {
                  router.push(`/bonds?with=${otherUser.id}`);
                }
              }}
              className="w-full p-3 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
            >
              💓 Bonding
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// web/src/hooks/useMessaging.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase-client';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  read: boolean;
}

interface Conversation {
  id: string;
  participantName: string;
  participantId: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  avatar?: string;
  userA?: { id: string; name: string; profile?: { displayName: string; avatarUrl: string } };
  userB?: { id: string; name: string; profile?: { displayName: string; avatarUrl: string } };
  isMuted?: boolean;
}

interface Friend {
  id: string;
  name: string;
  email?: string;
  profile?: {
    displayName: string;
    avatarUrl: string;
    bio?: string;
  };
  status?: string;
}

export function useMessaging() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [followers, setFollowers] = useState<Friend[]>([]);
  const [following, setFollowing] = useState<Friend[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: Set<string> }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscribedChannels = useRef<Set<string>>(new Set());

  // Subscribe to conversation channels using Supabase Realtime
  useEffect(() => {
    if (!session?.user || conversations.length === 0) return;

    const channels: any[] = [];

    conversations.forEach((conv) => {
      const channelId = `conversation:${conv.id}`;

      if (!subscribedChannels.current.has(channelId)) {
        subscribedChannels.current.add(channelId);

        const channel = supabase
          .channel(channelId)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'Message',
              filter: `conversationId=eq.${conv.id}`,
            },
            (payload: any) => {
              const newMessage = payload.new;

              // We need to fetch sender details or optimistically add them if we know the sender
              // For now, we'll try to construct it from payload or fetch if needed.
              // Since payload.new only has raw DB columns, we might miss senderName.
              // A robust solution fetches the full message or we rely on the fact that 
              // if I sent it, I know me, if they sent it, I know them (participant).

              const isMe = newMessage.senderId === (session.user as any).id;
              const senderName = isMe ? 'You' : conv.participantName; // Simplified

              const formattedMessage: Message = {
                id: newMessage.id,
                conversationId: newMessage.conversationId,
                senderId: newMessage.senderId,
                senderName: senderName,
                content: newMessage.content,
                timestamp: new Date(newMessage.createdAt).getTime(),
                read: newMessage.readAt !== null,
              };

              setMessages((prev) => ({
                ...prev,
                [newMessage.conversationId]: [...(prev[newMessage.conversationId] || []), formattedMessage],
              }));

              // Update conversation last message
              setConversations((prev) =>
                prev.map(c =>
                  c.id === newMessage.conversationId
                    ? { ...c, lastMessage: newMessage.content, lastMessageTime: new Date(newMessage.createdAt).getTime() }
                    : c
                )
              );
            }
          )
          .subscribe();

        channels.push(channel);
      }
    });

    return () => {
      // Cleanup is tricky with React Strict Mode and multiple mounting.
      // For now, we rely on Supabase client handling multiple subscriptions or explicit cleanup if needed.
      // channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [conversations, session?.user]);

  // Fetch initial data
  useEffect(() => {
    if (session?.user?.email) {
      fetchConversations();
      fetchFollowersAndFollowing();
    }
  }, [session?.user?.email]);

  const fetchConversations = useCallback(async () => {
    if (!session?.user?.email) return;

    try {
      setLoading(true);
      const response = await fetch('/api/chat/conversations?page=1&limit=100');
      if (response.ok) {
        const data = await response.json();
        const currentUserId = (session?.user as any)?.id;

        if (!currentUserId) return;

        const formattedConversations = data.conversations.map((conv: any) => {
          if (!conv.userA || !conv.userB) return null;
          const otherUser = conv.userA.id === currentUserId ? conv.userB : conv.userA;
          if (!otherUser) return null;

          return {
            id: conv.id,
            participantName: otherUser.profile?.displayName || otherUser.name || 'Unknown User',
            participantId: otherUser.id,
            lastMessage: conv.messages?.[0]?.content || '',
            lastMessageTime: conv.messages?.[0]?.createdAt ? new Date(conv.messages[0].createdAt).getTime() : Date.now(),
            unreadCount: 0,
            avatar: otherUser.profile?.avatarUrl,
            userA: conv.userA,
            userB: conv.userB,
            isMuted: conv.isMuted
          };
        }).filter(Boolean);
        setConversations(formattedConversations);
      }
    } catch (err) {
      setError('Failed to fetch conversations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  const fetchFollowersAndFollowing = useCallback(async () => {
    try {
      const [followersRes, followingRes] = await Promise.all([
        fetch('/api/users/followers-following?type=followers&page=1&limit=50'),
        fetch('/api/users/followers-following?type=following&page=1&limit=50'),
      ]);

      if (followersRes.ok) {
        const data = await followersRes.json();
        setFollowers(data.users);
      }

      if (followingRes.ok) {
        const data = await followingRes.json();
        setFollowing(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch followers/following:', err);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          senderName: msg.sender.profile?.displayName || msg.sender.name,
          content: msg.content,
          timestamp: new Date(msg.createdAt).getTime(),
          read: msg.readAt !== null,
        }));

        setMessages((prev) => ({
          ...prev,
          [conversationId]: formattedMessages,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!session?.user) return;
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content }),
      });
      // Realtime subscription will handle the UI update
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [session?.user]);

  const startTyping = useCallback(async (conversationId: string) => {
    // Typing indicators with Supabase Realtime Presence could be implemented here
    // For now, we'll skip or implement later as it requires Presence setup
  }, []);

  const stopTyping = useCallback(async (conversationId: string) => {
    // Typing indicators cleanup
  }, []);

  const createOrGetConversation = useCallback(async (friendId: string) => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: friendId }),
      });

      if (response.ok) {
        const data = await response.json();
        const currentUserId = (session?.user as any)?.id;
        const otherUser = data.conversation.userA.id === currentUserId ? data.conversation.userB : data.conversation.userA;

        const newConversation: Conversation = {
          id: data.conversation.id,
          participantName: otherUser.profile?.displayName || otherUser.name,
          participantId: otherUser.id,
          lastMessage: '',
          lastMessageTime: Date.now(),
          unreadCount: 0,
          avatar: otherUser.profile?.avatarUrl,
          userA: data.conversation.userA,
          userB: data.conversation.userB,
        };

        setConversations((prev) => {
          const existing = prev.find((c) => c.id === data.conversation.id);
          return existing ? prev : [newConversation, ...prev];
        });

        return data.conversation.id;
      }
    } catch (err) {
      console.error('Failed to create/get conversation:', err);
    }
  }, [session?.user]);

  const getAllChatUsers = useCallback((): Friend[] => {
    const combined = [...followers, ...following];
    return Array.from(new Map(combined.map((user) => [user.id, user])).values());
  }, [followers, following]);

  return {
    conversations,
    messages,
    followers,
    following,
    onlineUsers,
    typingUsers,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startTyping,
    stopTyping,
    createOrGetConversation,
    getAllChatUsers,
  };
}

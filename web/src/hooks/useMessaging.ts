// web/src/hooks/useMessaging.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import PusherClient from 'pusher-js';
import { useSession } from 'next-auth/react';

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
  const [pusher, setPusher] = useState<PusherClient | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [followers, setFollowers] = useState<Friend[]>([]);
  const [following, setFollowing] = useState<Friend[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: Set<string> }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscribedChannels = useRef<Set<string>>(new Set());

  // Initialize Pusher connection
  useEffect(() => {
    if (!session?.user) return;

    // Initialize Pusher client
    const pusherClient = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY || 'your_pusher_key',
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
      }
    );

    setPusher(pusherClient);

    return () => {
      pusherClient.disconnect();
    };
  }, [session?.user]);

  // Subscribe to conversation channels
  useEffect(() => {
    if (!pusher || conversations.length === 0) return;

    conversations.forEach((conv) => {
      const channelName = `conversation-${conv.id}`;

      if (!subscribedChannels.current.has(channelName)) {
        const channel = pusher.subscribe(channelName);
        subscribedChannels.current.add(channelName);

        channel.bind('message:new', (message: Message) => {
          setMessages((prev) => ({
            ...prev,
            [message.conversationId]: [...(prev[message.conversationId] || []), message],
          }));
        });

        channel.bind('typing:start', (data: { userId: string; conversationId: string }) => {
          setTypingUsers((prev) => ({
            ...prev,
            [data.conversationId]: new Set([...(prev[data.conversationId] || []), data.userId]),
          }));
        });

        channel.bind('typing:end', (data: { userId: string; conversationId: string }) => {
          setTypingUsers((prev) => ({
            ...prev,
            [data.conversationId]: Array.from(prev[data.conversationId] || []).filter(
              (id) => id !== data.userId
            ) as any,
          }));
        });
      }
    });

    return () => {
      // Cleanup subscriptions logic if needed, but usually keeping them open is fine for SPA
    };
  }, [pusher, conversations]);

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
            isMuted: conv.isMuted // Pass this through from API
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
      // No need to manually update state or emit socket event; Pusher will handle it
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [session?.user]);

  const startTyping = useCallback(async (conversationId: string) => {
    try {
      await fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, status: 'start' }),
      });
    } catch (err) {
      console.error('Failed to send typing indicator:', err);
    }
  }, []);

  const stopTyping = useCallback(async (conversationId: string) => {
    try {
      await fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, status: 'end' }),
      });
    } catch (err) {
      console.error('Failed to send typing indicator:', err);
    }
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
    pusher,
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

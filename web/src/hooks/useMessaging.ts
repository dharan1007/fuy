// web/src/hooks/useMessaging.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [followers, setFollowers] = useState<Friend[]>([]);
  const [following, setFollowing] = useState<Friend[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: Set<string> }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!session?.user || !(session.user as any).id) return;

    const userId = (session.user as any).id;
    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || window.location.origin,
      {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      }
    );

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('user:register', userId);
    });

    newSocket.on('user:online', (data: { userId: string; socketId: string }) => {
      setOnlineUsers((prev) => new Set([...prev, data.userId]));
    });

    newSocket.on('user:offline', (data: { userId: string }) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(data.userId);
        return updated;
      });
    });

    newSocket.on('message:new', (message: Message) => {
      setMessages((prev) => ({
        ...prev,
        [message.conversationId]: [...(prev[message.conversationId] || []), message],
      }));
    });

    newSocket.on('typing:start', (data: { userId: string; conversationId: string }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [data.conversationId]: new Set([...(prev[data.conversationId] || []), data.userId]),
      }));
    });

    newSocket.on('typing:end', (data: { userId: string; conversationId: string }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [data.conversationId]: Array.from(prev[data.conversationId] || []).filter(
          (id) => id !== data.userId
        ) as any,
      }));
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Fetch initial data
    fetchConversations();
    fetchFollowersAndFollowing();

    return () => {
      newSocket.disconnect();
    };
  }, [session?.user]);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chat/conversations');
      if (response.ok) {
        const data = await response.json();
        const currentUserId = (session?.user as any)?.id;
        const formattedConversations = data.conversations.map((conv: any) => {
          const otherUser = conv.userA.id === currentUserId ? conv.userB : conv.userA;
          return {
            id: conv.id,
            participantName: otherUser.profile?.displayName || otherUser.name,
            participantId: otherUser.id,
            lastMessage: conv.messages[0]?.content || '',
            lastMessageTime: conv.messages[0]?.createdAt ? new Date(conv.messages[0].createdAt).getTime() : Date.now(),
            unreadCount: 0,
            avatar: otherUser.profile?.avatarUrl,
            userA: conv.userA,
            userB: conv.userB,
          };
        });
        setConversations(formattedConversations);
      }
    } catch (err) {
      setError('Failed to fetch conversations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  const fetchFollowersAndFollowing = useCallback(async () => {
    try {
      const [followersRes, followingRes] = await Promise.all([
        fetch('/api/users/followers-following?type=followers'),
        fetch('/api/users/followers-following?type=following'),
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

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      try {
        const response = await fetch(
          `/api/chat/messages?conversationId=${conversationId}`
        );
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
    },
    []
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!socketRef.current || !session?.user) return;

      const userId = (session.user as any).id;

      try {
        // Send via API
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, content }),
        });

        if (response.ok) {
          const data = await response.json();
          const message: Message = {
            id: data.message.id,
            conversationId,
            senderId: userId,
            senderName: 'You',
            content: data.message.content,
            timestamp: new Date(data.message.createdAt).getTime(),
            read: true,
          };

          // Emit via socket
          socketRef.current.emit('message:send', {
            conversationId,
            message,
          });
        }
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [session?.user]
  );

  const startTyping = useCallback((conversationId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('typing:start', { conversationId });
    }
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('typing:end', { conversationId });
    }
  }, []);

  const createOrGetConversation = useCallback(
    async (friendId: string) => {
      try {
        const response = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ friendId }),
        });

        if (response.ok) {
          const data = await response.json();
          const currentUserId = (session?.user as any)?.id;
          const otherUser = data.conversation.userA.id === currentUserId
            ? data.conversation.userB
            : data.conversation.userA;

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
    },
    [session?.user]
  );

  const getAllChatUsers = useCallback((): Friend[] => {
    const combined = [...followers, ...following];
    const uniqueUsers = Array.from(
      new Map(combined.map((user) => [user.id, user])).values()
    );
    return uniqueUsers;
  }, [followers, following]);

  return {
    socket,
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

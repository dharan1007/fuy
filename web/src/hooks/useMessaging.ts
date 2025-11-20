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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimestampRef = useRef<{ [key: string]: number }>({});

  // Initialize Socket.io connection (all environments)
  useEffect(() => {
    if (!session?.user || !(session.user as any).id) return;

    const userId = (session.user as any).id;

    // Initialize Socket.io in all environments for real-time messaging
    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || window.location.origin,
      {
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
        reconnectionAttempts: 10,
        transports: ['websocket', 'polling'],
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
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [session?.user]);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch first page with 20 conversations per page for faster loading
      const response = await fetch('/api/chat/conversations?page=1&limit=20');
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
      // Fetch with pagination - limit to 50 per page for better performance
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

          // Merge new messages with existing ones to avoid losing socket updates
          setMessages((prev) => {
            const existing = prev[conversationId] || [];
            const merged = [...formattedMessages];

            // Add any messages from socket that aren't in the fetched list
            for (const msg of existing) {
              if (!merged.find((m) => m.id === msg.id)) {
                merged.push(msg);
              }
            }

            // Sort by timestamp
            merged.sort((a, b) => a.timestamp - b.timestamp);

            return {
              ...prev,
              [conversationId]: merged,
            };
          });

          // Update last message timestamp for polling
          if (formattedMessages.length > 0) {
            lastMessageTimestampRef.current[conversationId] = Math.max(
              ...formattedMessages.map((m: Message) => m.timestamp)
            );
          }
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    },
    []
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!session?.user) return;

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

          // Emit via socket (only in development)
          if (socketRef.current) {
            socketRef.current.emit('message:send', {
              conversationId,
              message,
            });
          }
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

  // Polling function for fallback (when Socket.io has issues)
  const startPolling = useCallback((conversationId: string) => {
    // Stop existing polling if any
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Set initial timestamp for incremental updates
    if (!lastMessageTimestampRef.current[conversationId]) {
      lastMessageTimestampRef.current[conversationId] = Date.now() - 60000; // Last 1 minute
    }

    // Poll for new messages every 500ms (fast enough to feel real-time)
    // Falls back to polling if Socket.io is unavailable
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const lastTimestamp = lastMessageTimestampRef.current[conversationId];
        const response = await fetch(
          `/api/chat/messages?conversationId=${conversationId}&since=${lastTimestamp}`
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

          if (formattedMessages.length > 0) {
            // Only update with new messages
            setMessages((prev) => {
              const existing = prev[conversationId] || [];
              const newMessages = formattedMessages.filter(
                (msg: Message) => !existing.find((m) => m.id === msg.id)
              );
              if (newMessages.length > 0) {
                lastMessageTimestampRef.current[conversationId] = Math.max(
                  ...formattedMessages.map((m: Message) => m.timestamp)
                );
                return {
                  ...prev,
                  [conversationId]: [...existing, ...newMessages],
                };
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 500); // Poll every 500ms for near real-time updates
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

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
    startPolling,
    stopPolling,
  };
}

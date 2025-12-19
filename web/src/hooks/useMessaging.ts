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
  status?: 'sending' | 'sent' | 'failed';
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
  const [cursors, setCursors] = useState<{ [key: string]: string | null }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCollaboration, setActiveCollaboration] = useState<{
    sessionId: string;
    featureType: string;
    conversationId: string;
  } | null>(null);
  const subscribedChannels = useRef<Set<string>>(new Set());

  const addOptimisticMessage = useCallback((message: Message) => {
    setMessages((prev) => ({
      ...prev,
      [message.conversationId]: [...(prev[message.conversationId] || []), message],
    }));

    // Update conversation last message immediately
    setConversations((prev) =>
      prev.map(c =>
        c.id === message.conversationId
          ? { ...c, lastMessage: message.content, lastMessageTime: message.timestamp }
          : c
      )
    );
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!session?.user) return;

    // 1. Add Optimistic Message
    const tempId = Date.now().toString();
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: (session.user as any).id,
      senderName: 'You',
      content,
      timestamp: Date.now(),
      read: true,
      status: 'sending',
    };
    addOptimisticMessage(optimisticMessage);

    try {
      // 2. Send to API
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content }),
      });

      if (!response.ok) throw new Error('Failed to send');

      // Success is handled by subscription, but we can mark as sent if we want immediate feedback before broadcast
      // For now, let's rely on broadcast to replace it (which removes 'sending' status effectively as new msg won't have it)

    } catch (err) {
      console.error('Failed to send message:', err);
      // Mark message as failed
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m =>
          m.id === tempId ? { ...m, status: 'failed' } : m
        ),
      }));
    }
  }, [session?.user, addOptimisticMessage]);

  const startTyping = useCallback(async (conversationId: string) => {
    if (!session?.user) return;
    const channel = supabase.channel(`conversation:${conversationId}`);
    await channel.send({
      type: 'broadcast',
      event: 'typing:start',
      payload: { userId: (session.user as any).id, name: (session.user as any).name || 'User' },
    });
  }, [session?.user]);

  const stopTyping = useCallback(async (conversationId: string) => {
    if (!session?.user) return;
    const channel = supabase.channel(`conversation:${conversationId}`);
    await channel.send({
      type: 'broadcast',
      event: 'typing:stop',
      payload: { userId: (session.user as any).id, name: (session.user as any).name || 'User' },
    });
  }, [session?.user]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    // 1. Optimistic Update
    const previousConversations = conversations;
    setConversations((prev) => prev.filter(c => c.id !== conversationId));

    try {
      // 2. API Call
      const response = await fetch(`/api/chat/conversations?id=${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete conversation');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      // 3. Rollback on error
      setConversations(previousConversations);
      // TODO: Show error toast
    }
  }, [conversations]);

  // Subscribe to conversation channels using Supabase Realtime (Broadcast + Presence)
  useEffect(() => {
    if (!session?.user || conversations.length === 0) return;

    const channels: any[] = [];
    const userId = (session.user as any).id;

    // 1. Global Presence Channel for Online Status
    const globalChannel = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const newState = globalChannel.presenceState();
        const onlineIds = new Set<string>();

        Object.keys(newState).forEach(key => {
          // Presence key is usually userId if we set it that way, or we inspect the payload
          // Assuming we track by userId
          newState[key].forEach((presence: any) => {
            if (presence.userId) onlineIds.add(presence.userId);
          });
        });

        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await globalChannel.track({ userId: userId, onlineAt: new Date().toISOString() });
        }
      });

    channels.push(globalChannel);

    // 2. Conversation Channels for Messages (Broadcast)
    conversations.forEach((conv) => {
      const channelId = `conversation:${conv.id}`;

      if (!subscribedChannels.current.has(channelId)) {
        subscribedChannels.current.add(channelId);

        const channel = supabase
          .channel(channelId)
          .on(
            'broadcast',
            { event: 'message:new' },
            (payload: any) => {
              const newMessage = payload.payload; // Broadcast payload is wrapped

              setMessages((prev) => {
                const currentMessages = prev[newMessage.conversationId] || [];

                // Check for duplicate by ID
                if (currentMessages.some(m => m.id === newMessage.id)) {
                  return prev;
                }

                // Check for duplicate by content + timestamp (approximate for optimistic)
                // If we find a message with same content sent by me within last 2 seconds, assume it's the one we just sent
                const isMe = newMessage.senderId === userId;
                if (isMe) {
                  const recentOptimistic = currentMessages.find(m =>
                    m.senderId === userId &&
                    m.content === newMessage.content &&
                    Math.abs(m.timestamp - newMessage.timestamp) < 2000
                  );

                  if (recentOptimistic) {
                    // Replace optimistic with real one (updates ID)
                    return {
                      ...prev,
                      [newMessage.conversationId]: currentMessages.map(m =>
                        m.id === recentOptimistic.id ? { ...newMessage, read: true } : m
                      )
                    };
                  }
                }

                const formattedMessage: Message = {
                  id: newMessage.id,
                  conversationId: newMessage.conversationId,
                  senderId: newMessage.senderId,
                  senderName: newMessage.senderName,
                  content: newMessage.content,
                  timestamp: newMessage.timestamp,
                  read: newMessage.read,
                };

                return {
                  ...prev,
                  [newMessage.conversationId]: [...currentMessages, formattedMessage],
                };
              });

              // Update conversation last message
              setConversations((prev) =>
                prev.map(c =>
                  c.id === newMessage.conversationId
                    ? { ...c, lastMessage: newMessage.content, lastMessageTime: newMessage.timestamp }
                    : c
                )
              );
            }
          )
          .on(
            'broadcast',
            { event: 'collaboration:started' },
            (payload: any) => {
              const { sessionId, featureType, conversationId } = payload.payload;
              setActiveCollaboration({ sessionId, featureType, conversationId });
            }
          )
          .on(
            'broadcast',
            { event: 'typing:start' },
            (payload: any) => {
              const { userId, name } = payload.payload;
              if (userId === (session?.user as any)?.id) return; // Ignore self

              setTypingUsers((prev) => {
                const current = prev[conv.id] || new Set();
                const next = new Set(current);
                next.add(name);
                return { ...prev, [conv.id]: next };
              });

              // Auto-clear after 3 seconds
              setTimeout(() => {
                setTypingUsers((prev) => {
                  const current = prev[conv.id] || new Set();
                  const next = new Set(current);
                  next.delete(name);
                  return { ...prev, [conv.id]: next };
                });
              }, 3000);
            }
          )
          .on(
            'broadcast',
            { event: 'typing:stop' },
            (payload: any) => {
              const { userId, name } = payload.payload;
              if (userId === (session?.user as any)?.id) return;

              setTypingUsers((prev) => {
                const current = prev[conv.id] || new Set();
                const next = new Set(current);
                next.delete(name);
                return { ...prev, [conv.id]: next };
              });
            }
          )
          .subscribe();

        channels.push(channel);
      }
    });

    return () => {
      // Cleanup
      channels.forEach(channel => supabase.removeChannel(channel));
      subscribedChannels.current.clear();
    };
  }, [conversations, session?.user, addOptimisticMessage]);

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

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await fetch('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      // Update local state to reflect read status
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m => ({ ...m, read: true }))
      }));
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string, cursor?: string) => {
    try {
      const url = cursor
        ? `/api/chat/messages?conversationId=${conversationId}&cursor=${cursor}`
        : `/api/chat/messages?conversationId=${conversationId}`;

      const response = await fetch(url);
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

        setMessages((prev) => {
          const currentMessages = prev[conversationId] || [];

          if (cursor) {
            // Prepend older messages (filtering duplicates)
            const existingIds = new Set(currentMessages.map(m => m.id));
            const uniqueNew = formattedMessages.filter((m: any) => !existingIds.has(m.id));
            return {
              ...prev,
              [conversationId]: [...uniqueNew, ...currentMessages]
            };
          } else {
            // Initial load - replace
            return {
              ...prev,
              [conversationId]: formattedMessages
            };
          }
        });

        setCursors((prev) => ({
          ...prev,
          [conversationId]: data.nextCursor || null
        }));

        // Mark as read when fetching latest messages (no cursor)
        if (!cursor) {
          markAsRead(conversationId);
        }

        return data.nextCursor;
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
    return undefined;
  }, [markAsRead]);



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
    cursors,
    followers,
    following,
    onlineUsers,
    typingUsers,
    activeCollaboration,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startTyping,
    stopTyping,
    deleteConversation,
    createOrGetConversation,
    getAllChatUsers,
    addOptimisticMessage,
    markAsRead, // Export this
  };
}


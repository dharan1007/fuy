// web/src/hooks/useMessaging.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from '@/hooks/use-session';
import { supabase } from '@/lib/supabase-client';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  read: boolean;
  status?: 'sending' | 'sent' | 'failed';
  tags?: string[]; // New: Tags for message styling
}

export interface Conversation {
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

export interface Friend {
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
  const userId = (session?.user as any)?.id;
  const userName = (session?.user as any)?.name || 'User';

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

  // Use refs to track subscribed channels to prevent re-subscription loops
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const conversationChannelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());

  // --- 1. Fetch Conversations & Initial Data ---
  const fetchConversations = useCallback(async () => {
    if (!session?.user?.email) return;

    try {
      setLoading(true);
      const response = await fetch('/api/chat/conversations?page=1&limit=100');
      if (response.ok) {
        const data = await response.json();

        if (!userId) return;

        const formattedConversations = data.conversations.map((conv: any) => {
          if (!conv.userA || !conv.userB) return null;
          const otherUser = conv.userA.id === userId ? conv.userB : conv.userA;
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
  }, [session?.user?.email, userId]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchConversations();
      // Also fetch friends
      (async () => {
        try {
          const [followersRes, followingRes] = await Promise.all([
            fetch('/api/users/followers-following?type=followers&page=1&limit=50'),
            fetch('/api/users/followers-following?type=following&page=1&limit=50'),
          ]);
          if (followersRes.ok) setFollowers((await followersRes.json()).users);
          if (followingRes.ok) setFollowing((await followingRes.json()).users);
        } catch (e) { console.error("Failed to load friends", e) }
      })();
    }
  }, [session?.user?.email, fetchConversations]);

  // --- 2. Global Presence (Online Status) ---
  useEffect(() => {
    if (!userId) return;

    // cleanup previous if exists (shouldn't happen often due to dependency stable)
    if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);

    const channel = supabase.channel('online-users');
    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const onlineIds = new Set<string>();
        Object.keys(newState).forEach(key => {
          newState[key].forEach((presence: any) => {
            if (presence.userId) onlineIds.add(presence.userId);
          });
        });
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, onlineAt: new Date().toISOString() });
        }
      });

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [userId]);

  // --- 3. Conversation Subscriptions (Stable) ---
  useEffect(() => {
    if (!userId || conversations.length === 0) return;

    conversations.forEach(conv => {
      const channelId = `conversation:${conv.id}`;

      // Skip if already subscribed
      if (conversationChannelsRef.current.has(channelId)) return;

      const channel = supabase.channel(channelId);
      conversationChannelsRef.current.set(channelId, channel);

      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'Message', // Case sensitive usually, trying 'Message' as seen in schema or 'messages' if mapped. Standard Prisma maps to lowercase usually unless defined. Checking schema... it said `model Message`. In Postgres it might be "Message" quoted or lowercase. Default prisma is usually pascal case model -> pascal case or lowercase table depending on map. 
            // Let's assume standard behavior: if no @@map, generic is "Message".
            // However, we can listen to ALL events and filter in callback if unsure, but filtering here is better.
            // Important: Supabase exposes tables. If Prisma schema has `model Message`, table is usually `Message` (capitalized) if there's no map.
            // Filter: `conversationId=eq.${conv.id}`
            filter: `conversationId=eq.${conv.id}`
          },
          (payload) => {
            const newMsg = payload.new as any;
            // Handle new message
            handleNewRealtimeMessage(newMsg, conv, userId);
          }
        )
        .on('broadcast', { event: 'typing:start' }, (payload) => handleTypingEvent(payload, conv.id, 'start', userId))
        .on('broadcast', { event: 'typing:stop' }, (payload) => handleTypingEvent(payload, conv.id, 'stop', userId))
        .subscribe();
    });

    // Cleanup channels for conversations that we left? 
    // Simplified: Just keep them open for session duration or full unmount.

    return () => {
      // We do NOT unsubscribe here to prevent loop. channels will be cleaned up on unmount of the hook (component unmount)
    };
  }, [conversations, userId]);

  // Cleanup all on unmount
  useEffect(() => {
    return () => {
      conversationChannelsRef.current.forEach(ch => supabase.removeChannel(ch));
      conversationChannelsRef.current.clear();
    };
  }, []);


  // --- Helper: Handle New Realtime Message ---
  const handleNewRealtimeMessage = (newMsg: any, conv: Conversation, currentUserId: string) => {
    const isMe = newMsg.senderId === currentUserId;
    const tempId = new Date(newMsg.createdAt).getTime().toString(); // Rough approximation or just ignore optimistics

    setMessages(prev => {
      const currentMsgs = prev[conv.id] || [];

      // Deduplication check
      if (currentMsgs.some(m => m.id === newMsg.id)) return prev;

      // Replace optimistic if found (matching content & recent time)
      if (isMe) {
        const optimistic = currentMsgs.find(m =>
          m.senderId === currentUserId &&
          m.content === newMsg.content &&
          m.status === 'sending'
        );
        if (optimistic) {
          return {
            ...prev,
            [conv.id]: currentMsgs.map(m => m.id === optimistic.id ? {
              ...m,
              id: newMsg.id,
              status: 'sent',
              timestamp: new Date(newMsg.createdAt).getTime(),
              read: false
            } : m)
          };
        }
      }

      // Build message object
      let senderName = 'User';
      if (newMsg.senderId === conv.userA?.id) senderName = conv.userA?.profile?.displayName || conv.userA?.name || 'User';
      if (newMsg.senderId === conv.userB?.id) senderName = conv.userB?.profile?.displayName || conv.userB?.name || 'User';

      const msg: Message = {
        id: newMsg.id,
        conversationId: newMsg.conversationId,
        senderId: newMsg.senderId,
        senderName,
        content: newMsg.content,
        timestamp: new Date(newMsg.createdAt).getTime(),
        read: false, // Default false until seen
        status: 'sent'
      };

      return { ...prev, [conv.id]: [...currentMsgs, msg] };
    });

    // Update Conversation List (Last Message)
    setConversations(prev => prev.map(c =>
      c.id === conv.id
        ? { ...c, lastMessage: newMsg.content, lastMessageTime: new Date(newMsg.createdAt).getTime() }
        : c
    ));
  };


  const handleTypingEvent = (payload: any, conversationId: string, type: 'start' | 'stop', currentUserId: string) => {
    const { userId: typerId, name } = payload.payload;
    if (typerId === currentUserId) return;

    setTypingUsers(prev => {
      const current = prev[conversationId] || new Set();
      const next = new Set(current);
      if (type === 'start') next.add(name);
      else next.delete(name);
      return { ...prev, [conversationId]: next };
    });

    // Safety auto-clear for start
    if (type === 'start') {
      setTimeout(() => {
        setTypingUsers(prev => {
          const current = prev[conversationId] || new Set();
          if (!current.has(name)) return prev;
          const next = new Set(current);
          next.delete(name);
          return { ...prev, [conversationId]: next };
        });
      }, 4000);
    }
  };


  // --- Actions ---

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!userId) return;

    // Optimistic Update
    const tempId = 'opt-' + Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: userId,
      senderName: 'You',
      content,
      timestamp: Date.now(),
      read: true,
      status: 'sending',
    };

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMessage]
    }));

    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, lastMessage: content, lastMessageTime: Date.now() } : c));

    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content }),
      });
      // Verification via Realtime subscription
    } catch (err) {
      console.error('Failed to send:', err);
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m => m.id === tempId ? { ...m, status: 'failed' } : m)
      }));
    }
  }, [userId]);

  const startTyping = useCallback(async (conversationId: string) => {
    if (!userId) return;
    const channel = conversationChannelsRef.current.get(`conversation:${conversationId}`);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing:start',
        payload: { userId, name: userName }
      });
    }
  }, [userId, userName]);

  const stopTyping = useCallback(async (conversationId: string) => {
    if (!userId) return;
    const channel = conversationChannelsRef.current.get(`conversation:${conversationId}`);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing:stop',
        payload: { userId, name: userName }
      });
    }
  }, [userId, userName]);

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
          senderName: msg.sender.profile?.displayName || msg.sender.name || 'User',
          content: msg.content,
          timestamp: new Date(msg.createdAt).getTime(),
          read: msg.readAt !== null,
          status: 'sent',
          tags: [] // Todo match tags from DB if available
        }));

        setMessages(prev => {
          const current = prev[conversationId] || [];
          if (cursor) {
            // merging history
            return { ...prev, [conversationId]: [...formattedMessages, ...current] };
          } else {
            return { ...prev, [conversationId]: formattedMessages };
          }
        });

        setCursors(prev => ({ ...prev, [conversationId]: data.nextCursor || null }));
      }
    } catch (e) {
      console.error("Fetch messages failed", e);
    }
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    // API call to mark read
    // Optimistically update local messages to read
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m => ({ ...m, read: true }))
    }));
    // Fire and forget
    fetch('/api/chat/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId })
    });
  }, []);

  const createOrGetConversation = useCallback(async (friendId: string) => {
    // Existing logic simplified or kept
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: friendId })
      });
      if (res.ok) {
        const data = await res.json();
        if (!conversations.find(c => c.id === data.conversation.id)) {
          // Trigger re-fetch or manual add
          // Manual add implies we need format. 
          fetchConversations(); // Simplest
        }
        return data.conversation.id;
      }
    } catch (e) { console.error(e) }
    return null;
  }, [conversations, fetchConversations]);

  const deleteConversation = useCallback(async (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    fetch(`/api/chat/conversations`, { method: 'DELETE', body: JSON.stringify({ id }) }); // Assuming delete supports body or param. hook said ?id=
  }, []);

  const getAllChatUsers = useCallback(() => {
    const map = new Map();
    [...followers, ...following].forEach(u => map.set(u.id, u));
    return Array.from(map.values());
  }, [followers, following]);

  // Remove addOptimisticMessage as it's internal now mostly, unless page needs it.
  // Exposing it to keep interface:
  const addOptimisticMessage = useCallback((m: Message) => {
    setMessages(prev => ({ ...prev, [m.conversationId]: [...(prev[m.conversationId] || []), m] }));
  }, []);

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
    deleteConversation,
    activeCollaboration,
    cursors,
    addOptimisticMessage,
    markAsRead
  };
}

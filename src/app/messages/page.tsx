"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Message {
  id: number;
  content: string;
  sender: "user" | "other" | "ai";
  timestamp: string;
  senderName: string;
  senderAvatar?: string;
}

interface Conversation {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const [selectedTab, setSelectedTab] = useState<"messages" | "ai">("messages");
  const [selectedConversation, setSelectedConversation] = useState<number>(1);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Hey! How are you doing?",
      sender: "other",
      timestamp: "10:30 AM",
      senderName: "Amanda",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=amanda",
    },
    {
      id: 2,
      content: "I'm doing great! Just finished the project.",
      sender: "user",
      timestamp: "10:31 AM",
      senderName: "You",
    },
    {
      id: 3,
      content: "That's awesome! Want to grab coffee later?",
      sender: "other",
      timestamp: "10:32 AM",
      senderName: "Amanda",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=amanda",
    },
    {
      id: 4,
      content: "Sounds perfect! See you at 3 PM?",
      sender: "user",
      timestamp: "10:33 AM",
      senderName: "You",
    },
  ]);

  const [aiMessages, setAiMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Hello! I'm your AI assistant. How can I help you today?",
      sender: "ai",
      timestamp: "Now",
      senderName: "AI Assistant",
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [aiInputValue, setAiInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiMessagesEndRef = useRef<HTMLDivElement>(null);

  const conversations: Conversation[] = [
    {
      id: 1,
      name: "Amanda",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=amanda",
      lastMessage: "Sounds perfect! See you at 3 PM?",
      timestamp: "10:33 AM",
      unread: 0,
    },
    {
      id: 2,
      name: "Design Team",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=design",
      lastMessage: "The new mockups look great!",
      timestamp: "Yesterday",
      unread: 2,
    },
    {
      id: 3,
      name: "John",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
      lastMessage: "Check out the new feature",
      timestamp: "2 days ago",
      unread: 0,
    },
    {
      id: 4,
      name: "Sarah",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      lastMessage: "Thanks for the help!",
      timestamp: "3 days ago",
      unread: 1,
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollAiToBottom = () => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollAiToBottom();
  }, [aiMessages]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        content: inputValue,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        senderName: "You",
      };
      setMessages([...messages, newMessage]);
      setInputValue("");

      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: messages.length + 2,
          content: "Thanks for your message! I'll get back to you soon.",
          sender: "other",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          senderName: "Amanda",
          senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=amanda",
        };
        setMessages((prev) => [...prev, aiResponse]);
      }, 500);
    }
  };

  const handleSendAiMessage = () => {
    if (aiInputValue.trim()) {
      const userMessage: Message = {
        id: aiMessages.length + 1,
        content: aiInputValue,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        senderName: "You",
      };
      setAiMessages([...aiMessages, userMessage]);
      setAiInputValue("");

      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: aiMessages.length + 2,
          content: "That's a great question! Let me help you with that. I can provide insights on various topics, answer questions, help with brainstorming, and assist with problem-solving.",
          sender: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          senderName: "AI Assistant",
        };
        setAiMessages((prev) => [...prev, aiResponse]);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col relative overflow-hidden">
      {/* Wave Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: "0.12" }} />
              <stop offset="100%" style={{ stopColor: "#8b5cf6", stopOpacity: "0.06" }} />
            </linearGradient>
            <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#60a5fa", stopOpacity: "0.08" }} />
              <stop offset="100%" style={{ stopColor: "#a78bfa", stopOpacity: "0.04" }} />
            </linearGradient>
          </defs>
          <path d="M0,100 Q300,50 600,100 T1200,100 L1200,0 L0,0 Z" fill="url(#waveGradient1)" />
          <path d="M0,150 Q300,120 600,150 T1200,150 L1200,50 Q600,100 0,50 Z" fill="url(#waveGradient1)" opacity="0.6" />
          <path d="M0,200 Q300,170 600,200 T1200,200 L1200,100 Q600,150 0,100 Z" fill="url(#waveGradient1)" opacity="0.4" />
          <path d="M0,300 Q300,250 600,300 T1200,300 L1200,200 Q600,250 0,200 Z" fill="url(#waveGradient2)" opacity="0.5" />
        </svg>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4 pointer-events-none">
        <div className="flex items-center justify-between gap-4">
          <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl px-6 py-3 shadow-sm pointer-events-auto hover:bg-white/50 transition-all">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">◌</span>
              <span className="text-sm font-semibold text-gray-700">Messages</span>
            </Link>
          </div>

          <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl px-4 py-2 shadow-sm pointer-events-auto hover:bg-white/50 transition-all flex items-center gap-4">
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-8 h-8 rounded-full border-2 border-blue-400"
                />
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 gap-6 px-6 py-6 relative z-10">
        {/* Conversations Sidebar */}
        <div className="col-span-3 rounded-2xl p-6 bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm flex flex-col h-full">
          <h2 className="font-bold text-lg mb-4 text-gray-800">Conversations</h2>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-4 bg-white/40 rounded-lg p-1">
            <button
              onClick={() => setSelectedTab("messages")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                selectedTab === "messages"
                  ? "bg-blue-500 text-white"
                  : "text-gray-700 hover:bg-white/30"
              }`}
            >
              Direct
            </button>
            <button
              onClick={() => setSelectedTab("ai")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                selectedTab === "ai"
                  ? "bg-blue-500 text-white"
                  : "text-gray-700 hover:bg-white/30"
              }`}
            >
              AI Chat
            </button>
          </div>

          {/* Conversations List */}
          {selectedTab === "messages" && (
            <div className="space-y-2 overflow-y-auto flex-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full p-3 rounded-xl transition-all text-left ${
                    selectedConversation === conv.id
                      ? "bg-blue-100 border border-blue-300"
                      : "hover:bg-white/30 border border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={conv.avatar}
                      alt={conv.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{conv.name}</p>
                      <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* AI Chat Info */}
          {selectedTab === "ai" && (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <div className="text-4xl mb-3">★</div>
                <p className="text-sm text-gray-600">AI Assistant</p>
                <p className="text-xs text-gray-500 mt-2">Get instant help with any question</p>
              </div>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="col-span-9 rounded-2xl p-6 bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm flex flex-col h-full">
          {selectedTab === "messages" ? (
            <>
              {/* Message Header */}
              <div className="border-b border-white/20 pb-4 mb-4">
                {conversations[selectedConversation - 1] && (
                  <div className="flex items-center gap-3">
                    <img
                      src={conversations[selectedConversation - 1].avatar}
                      alt={conversations[selectedConversation - 1].name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h3 className="font-bold text-gray-800">
                        {conversations[selectedConversation - 1].name}
                      </h3>
                      <p className="text-xs text-green-600">Online</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl ${
                        msg.sender === "user"
                          ? "bg-blue-500 text-white rounded-br-none"
                          : "bg-gray-100 text-gray-900 rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.sender === "user" ? "text-blue-100" : "text-gray-500"}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-white/50 border border-white/40 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                >
                  ↗
                </button>
              </div>
            </>
          ) : (
            <>
              {/* AI Chat Header */}
              <div className="border-b border-white/20 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl">
                    ★
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">FUY AI Assistant</h3>
                    <p className="text-xs text-green-600">Always available</p>
                  </div>
                </div>
              </div>

              {/* AI Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {aiMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md px-4 py-2 rounded-2xl ${
                        msg.sender === "user"
                          ? "bg-blue-500 text-white rounded-br-none"
                          : "bg-purple-100 text-gray-900 rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.sender === "user" ? "text-blue-100" : "text-gray-500"}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={aiMessagesEndRef} />
              </div>

              {/* AI Input */}
              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={aiInputValue}
                  onChange={(e) => setAiInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendAiMessage()}
                  placeholder="Ask AI Assistant anything..."
                  className="flex-1 px-4 py-3 bg-white/50 border border-white/40 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 placeholder-gray-500"
                />
                <button
                  onClick={handleSendAiMessage}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                >
                  ↗
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

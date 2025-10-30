"use client";

import { useEffect, useState } from "react";

interface ConversationStat {
  contactId: string;
  contactName: string;
  messageCount: number;
}

interface Analytics {
  totalMessagesCount: number;
  totalChatTimeMinutes: number;
  mostFrequentContactId: string | null;
  conversationStats: ConversationStat[];
}

export default function ChatAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/chat/analytics");
      const data = await res.json();
      setAnalytics(data.analytics);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>No analytics data available</p>
      </div>
    );
  }

  const topContact = analytics.conversationStats.length > 0
    ? analytics.conversationStats[0]
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Chat Analytics</h1>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Messages */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-gray-600 text-sm font-semibold">
              Total Messages
            </div>
            <div className="text-4xl font-bold text-blue-600 mt-2">
              {analytics.totalMessagesCount}
            </div>
            <p className="text-gray-500 text-sm mt-2">Messages sent</p>
          </div>

          {/* Total Chat Time */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-gray-600 text-sm font-semibold">
              Total Chat Time
            </div>
            <div className="text-4xl font-bold text-purple-600 mt-2">
              {Math.floor(analytics.totalChatTimeMinutes / 60)}h{" "}
              {analytics.totalChatTimeMinutes % 60}m
            </div>
            <p className="text-gray-500 text-sm mt-2">Time spent chatting</p>
          </div>

          {/* Top Contact */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-gray-600 text-sm font-semibold">
              Most Frequent Contact
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-indigo-600">
                {topContact?.contactName || "N/A"}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {topContact?.messageCount || 0} messages
              </p>
            </div>
          </div>
        </div>

        {/* Conversation Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Conversations Breakdown
          </h2>
          <div className="space-y-4">
            {analytics.conversationStats.length === 0 ? (
              <p className="text-gray-500">No conversations yet</p>
            ) : (
              analytics.conversationStats.map((stat, idx) => {
                const percentage =
                  analytics.totalMessagesCount > 0
                    ? (stat.messageCount / analytics.totalMessagesCount) * 100
                    : 0;

                return (
                  <div key={stat.contactId || idx}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-700">
                        {stat.contactName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {stat.messageCount} messages ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Insights</h2>
          <div className="space-y-3 text-gray-700">
            <p>
              📊 You've sent{" "}
              <span className="font-bold text-blue-600">
                {analytics.totalMessagesCount}
              </span>{" "}
              messages across all conversations.
            </p>
            <p>
              ⏱️ You've spent{" "}
              <span className="font-bold text-purple-600">
                {Math.floor(analytics.totalChatTimeMinutes / 60)}h{" "}
                {analytics.totalChatTimeMinutes % 60}m
              </span>{" "}
              chatting with friends.
            </p>
            {topContact && (
              <p>
                💬 Your most frequent contact is{" "}
                <span className="font-bold text-indigo-600">
                  {topContact.contactName}
                </span>{" "}
                with {topContact.messageCount} messages exchanged.
              </p>
            )}
            <p>
              🚀 Keep engaging with your friends and building meaningful
              connections!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

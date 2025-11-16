'use client';

import React, { useState, useCallback } from 'react';
import { Suggestion, SuggestionsResponse } from '@/lib/ai-suggestions';

interface AISuggestionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalSubmit: (goal: string) => void;
  isLoading: boolean;
  suggestions: SuggestionsResponse | null;
  error?: string;
}

export default function AISuggestionsPanel({
  isOpen,
  onClose,
  onGoalSubmit,
  isLoading,
  suggestions,
  error,
}: AISuggestionsPanelProps) {
  const [goalInput, setGoalInput] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [itemsPerCategory, setItemsPerCategory] = useState({ videos: 5, podcasts: 5, songs: 5, websites: 5, books: 5 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (goalInput.trim()) {
      onGoalSubmit(goalInput);
    }
  };

  const handleLoadMore = (category: keyof typeof itemsPerCategory) => {
    setItemsPerCategory(prev => ({
      ...prev,
      [category]: prev[category] + 5,
    }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">✨ AI Suggestions</h2>
            <p className="text-blue-100 mt-1">Get personalized recommendations for your goals</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Goal Input Section */}
        <div className="p-6 bg-gray-50 border-b">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                What's your goal or intention?
              </label>
              <textarea
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g., 'I want to improve my productivity and focus while dealing with anxiety' or 'Learn web development from scratch'"
                className="w-full h-24 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-2">
                Be specific about what you want to achieve. The more detail, the better suggestions we can generate.
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading || !goalInput.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '🔄 Analyzing & Finding Resources...' : '🚀 Get Suggestions'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* Suggestions Display */}
        {suggestions && (
          <div className="p-6 space-y-6">
            {/* Core Intention */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 Your Goal</h3>
              <p className="text-blue-800 mb-2">{suggestions.goal}</p>
              <p className="text-sm text-blue-700 font-medium">
                Core Intention: {suggestions.coreIntention}
              </p>
            </div>

            {/* Suggestions Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SuggestionCount icon="🎥" label="Videos" count={suggestions.suggestions.videos.length} />
              <SuggestionCount icon="🎙️" label="Podcasts" count={suggestions.suggestions.podcasts.length} />
              <SuggestionCount icon="🎵" label="Songs" count={suggestions.suggestions.songs.length} />
              <SuggestionCount icon="🌐" label="Websites" count={suggestions.suggestions.websites.length} />
              <SuggestionCount icon="📚" label="Books" count={suggestions.suggestions.books.length} />
            </div>

            {/* Suggestion Categories */}
            <div className="space-y-4">
              <SuggestionCategory
                title="🎥 Videos"
                icon="🎥"
                items={suggestions.suggestions.videos.slice(0, itemsPerCategory.videos)}
                category="videos"
                isExpanded={expandedCategory === 'videos'}
                onToggle={() => toggleCategory('videos')}
                onLoadMore={() => handleLoadMore('videos')}
                hasMore={itemsPerCategory.videos < suggestions.suggestions.videos.length}
              />

              <SuggestionCategory
                title="🎙️ Podcasts"
                icon="🎙️"
                items={suggestions.suggestions.podcasts.slice(0, itemsPerCategory.podcasts)}
                category="podcasts"
                isExpanded={expandedCategory === 'podcasts'}
                onToggle={() => toggleCategory('podcasts')}
                onLoadMore={() => handleLoadMore('podcasts')}
                hasMore={itemsPerCategory.podcasts < suggestions.suggestions.podcasts.length}
              />

              <SuggestionCategory
                title="🎵 Songs & Music"
                icon="🎵"
                items={suggestions.suggestions.songs.slice(0, itemsPerCategory.songs)}
                category="songs"
                isExpanded={expandedCategory === 'songs'}
                onToggle={() => toggleCategory('songs')}
                onLoadMore={() => handleLoadMore('songs')}
                hasMore={itemsPerCategory.songs < suggestions.suggestions.songs.length}
              />

              <SuggestionCategory
                title="🌐 Websites & Resources"
                icon="🌐"
                items={suggestions.suggestions.websites.slice(0, itemsPerCategory.websites)}
                category="websites"
                isExpanded={expandedCategory === 'websites'}
                onToggle={() => toggleCategory('websites')}
                onLoadMore={() => handleLoadMore('websites')}
                hasMore={itemsPerCategory.websites < suggestions.suggestions.websites.length}
              />

              <SuggestionCategory
                title="📚 Books"
                icon="📚"
                items={suggestions.suggestions.books.slice(0, itemsPerCategory.books)}
                category="books"
                isExpanded={expandedCategory === 'books'}
                onToggle={() => toggleCategory('books')}
                onLoadMore={() => handleLoadMore('books')}
                hasMore={itemsPerCategory.books < suggestions.suggestions.books.length}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!suggestions && !isLoading && (
          <div className="p-12 text-center text-gray-500">
            <div className="text-4xl mb-4">💭</div>
            <p>Enter your goal above to get personalized suggestions</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Suggestion Count Card
 */
function SuggestionCount({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-gray-800">{count}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}

/**
 * Suggestion Category Section
 */
function SuggestionCategory({
  title,
  icon,
  items,
  category,
  isExpanded,
  onToggle,
  onLoadMore,
  hasMore,
}: {
  title: string;
  icon: string;
  items: Suggestion[];
  category: string;
  isExpanded: boolean;
  onToggle: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full bg-gray-50 hover:bg-gray-100 p-4 flex items-center justify-between transition-colors"
      >
        <span className="font-semibold text-gray-800">{title}</span>
        <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3 bg-white">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No suggestions found in this category</p>
          ) : (
            <>
              {items.map((item) => (
                <SuggestionItem key={item.id} item={item} />
              ))}

              {hasMore && (
                <button
                  onClick={onLoadMore}
                  className="w-full mt-4 py-2 text-blue-600 hover:text-blue-700 font-semibold border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  📌 Load More
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual Suggestion Item
 */
function SuggestionItem({ item }: { item: Suggestion }) {
  const getRelevanceBadge = (score: number) => {
    if (score >= 0.9) return <span className="text-green-600 font-semibold">⭐ Perfect Match</span>;
    if (score >= 0.8) return <span className="text-green-600 font-semibold">⭐ Highly Relevant</span>;
    if (score >= 0.7) return <span className="text-blue-600 font-semibold">💡 Relevant</span>;
    return <span className="text-gray-600">👍 Useful</span>;
  };

  return (
    <div className="bg-gray-50 hover:bg-gray-100 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
            {item.title}
          </h4>

          {item.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {item.type === 'video' ? '▶️ Video' : item.type === 'podcast' ? '🎙️ Podcast' : item.type === 'song' ? '🎵 Song' : item.type === 'website' ? '🌐 Website' : '📚 Book'}
            </span>

            {item.duration && (
              <span className="text-xs text-gray-500">
                ⏱️ {item.duration}
              </span>
            )}

            {getRelevanceBadge(item.relevanceScore)}
          </div>

          {item.reason && (
            <p className="text-xs text-gray-500 mt-2 italic">
              💡 {item.reason}
            </p>
          )}
        </div>

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors whitespace-nowrap"
          >
            View
          </a>
        )}
      </div>
    </div>
  );
}

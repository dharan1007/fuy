'use client';

import React, { useState } from 'react';
import { Suggestion, SuggestionsResponse } from '@/lib/ai-suggestions';

interface DbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateAI: (prompt: string) => Promise<void>;
  onFindResources: (goal: string) => Promise<void>;
  isLoading: boolean;
  suggestions: SuggestionsResponse | null;
  error?: string;
}

export default function DbotModal({
  isOpen,
  onClose,
  onGenerateAI,
  onFindResources,
  isLoading,
  suggestions,
  error,
}: DbotModalProps) {
  const [mode, setMode] = useState<'generate' | 'resources'>('generate');
  const [input, setInput] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [itemsPerCategory, setItemsPerCategory] = useState({ videos: 5, podcasts: 5, songs: 5, websites: 5, books: 5 });
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      if (mode === 'generate') {
        await onGenerateAI(input);
        setInput('');
        onClose();
      } else {
        await onFindResources(input);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const handleLoadMore = (category: keyof typeof itemsPerCategory) => {
    setItemsPerCategory(prev => ({
      ...prev,
      [category]: prev[category] + 5,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-black text-white px-8 py-6 flex items-center justify-between border-b border-black">
          <div>
            <h2 className="text-3xl font-light tracking-tight">dbot</h2>
            <p className="text-xs text-gray-400 mt-1">AI Assistant & Resource Finder</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/10 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex gap-4">
          <button
            onClick={() => setMode('generate')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              mode === 'generate'
                ? 'border-black text-black'
                : 'border-transparent text-gray-600 hover:text-black'
            }`}
          >
            Generate Content
          </button>
          <button
            onClick={() => setMode('resources')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              mode === 'resources'
                ? 'border-black text-black'
                : 'border-transparent text-gray-600 hover:text-black'
            }`}
          >
            Find Resources
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Generate Mode */}
          {mode === 'generate' && (
            <div className="px-8 py-8">
              <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-black mb-3">
                    What would you like to create?
                  </label>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`e.g., "Create a morning routine, add groceries: apples x4, oat milk, chicken 1kg; remind me to call mom at 7pm; walk the dog at 7am & 8pm; math homework due Friday; and list 3 MITs."`}
                    className="w-full h-24 p-4 border border-gray-300 bg-white text-black placeholder-gray-500 focus:outline-none focus:border-black transition-colors resize-none"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Be specific about what you want to add to your canvas. Include tasks, notes, checklists, and any details.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 border border-black text-black hover:bg-black hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                  Tip: After creation, edit a <em>Questions</em> block and press <b>⌘/Ctrl+Enter</b> to regenerate from it.
                </div>
              </form>
            </div>
          )}

          {/* Resources Mode */}
          {mode === 'resources' && (
            <div className="px-8 py-8">
              {!suggestions ? (
                <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-sm font-medium text-black mb-3">
                      What would you like resources for?
                    </label>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Describe your goal, interest, or what you want to learn..."
                      className="w-full h-20 p-4 border border-gray-300 bg-white text-black placeholder-gray-500 focus:outline-none focus:border-black transition-colors resize-none"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? 'Analyzing...' : 'Find Resources'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-8 max-w-4xl">
                  {/* Core Intention */}
                  <div className="border-b border-gray-200 pb-8">
                    <p className="text-xs font-semibold uppercase text-gray-600 mb-2">Your Goal</p>
                    <p className="text-lg text-black mb-3">{suggestions.goal}</p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Core Focus:</span> {suggestions.coreIntention}
                    </p>
                  </div>

                  {/* Categories */}
                  <div className="space-y-8">
                    {(['Videos', 'Podcasts', 'Music', 'Websites', 'Books'] as const).map((categoryTitle) => {
                      const categoryKey = categoryTitle.toLowerCase() as keyof typeof suggestions.suggestions;
                      const items = suggestions.suggestions[categoryKey as keyof typeof suggestions.suggestions];
                      const categoryId = categoryKey;

                      return (
                        <ResourceCategory
                          key={categoryId}
                          title={categoryTitle}
                          label={categoryTitle.slice(0, -1)}
                          items={items.slice(0, itemsPerCategory[categoryKey as keyof typeof itemsPerCategory])}
                          category={categoryId}
                          isExpanded={expandedCategory === categoryId}
                          onToggle={() => toggleCategory(categoryId)}
                          onLoadMore={() => handleLoadMore(categoryKey as keyof typeof itemsPerCategory)}
                          hasMore={itemsPerCategory[categoryKey as keyof typeof itemsPerCategory] < items.length}
                          selectedPreview={selectedPreview}
                          onSelectPreview={setSelectedPreview}
                        />
                      );
                    })}
                  </div>

                  {/* New Search Button */}
                  <div className="border-t border-gray-200 pt-8">
                    <button
                      onClick={() => {
                        setInput('');
                        setExpandedCategory(null);
                      }}
                      className="px-6 py-3 border border-black text-black hover:bg-black hover:text-white transition-colors"
                    >
                      Search Again
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="px-8 py-4 bg-white border-b border-gray-200">
                  <p className="text-sm text-black bg-gray-100 p-3 rounded">{error}</p>
                </div>
              )}

              {isLoading && (
                <div className="px-8 py-16 text-center">
                  <div className="inline-block">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                  </div>
                  <p className="text-gray-600 text-sm mt-4">Finding resources...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Resource Category Component
function ResourceCategory({
  title,
  label,
  items,
  category,
  isExpanded,
  onToggle,
  onLoadMore,
  hasMore,
  selectedPreview,
  onSelectPreview,
}: {
  title: string;
  label: string;
  items: Suggestion[];
  category: string;
  isExpanded: boolean;
  onToggle: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  selectedPreview: string | null;
  onSelectPreview: (id: string | null) => void;
}) {
  return (
    <div className="border-b border-gray-200 pb-8 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <h3 className="text-xl font-light text-black group-hover:text-gray-700 transition-colors">{title}</h3>
        <div className="text-gray-400 group-hover:text-black transition-colors">
          {isExpanded ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-gray-400 text-center py-6">No resources found</p>
          ) : (
            <>
              {items.map((item) => (
                <ResourceItem
                  key={item.id}
                  item={item}
                  label={label}
                  isPreviewSelected={selectedPreview === item.id}
                  onSelectPreview={() => onSelectPreview(selectedPreview === item.id ? null : item.id)}
                />
              ))}

              {hasMore && (
                <button
                  onClick={onLoadMore}
                  className="w-full mt-4 py-3 text-black font-medium border border-black hover:bg-black hover:text-white transition-colors"
                >
                  Load More
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Resource Item Component
function ResourceItem({
  item,
  label,
  isPreviewSelected,
  onSelectPreview,
}: {
  item: Suggestion;
  label: string;
  isPreviewSelected: boolean;
  onSelectPreview: () => void;
}) {
  const getRelevanceLevel = (score: number) => {
    if (score >= 0.9) return 'Perfect match';
    if (score >= 0.8) return 'Highly relevant';
    if (score >= 0.7) return 'Relevant';
    return 'Useful';
  };

  return (
    <div className="border border-gray-200 hover:border-black transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-black text-sm leading-tight">{item.title}</h4>
          </div>
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide flex-shrink-0">{label}</span>
        </div>

        {item.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{item.description}</p>
        )}

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {item.duration && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1">{item.duration}</span>
          )}
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1">
            {getRelevanceLevel(item.relevanceScore)}
          </span>
        </div>

        {item.reason && (
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">{item.reason}</p>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onSelectPreview}
            className="text-xs font-medium text-black border border-black px-3 py-2 hover:bg-black hover:text-white transition-colors"
          >
            {isPreviewSelected ? 'Hide Preview' : 'Preview'}
          </button>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-black border border-black px-3 py-2 hover:bg-black hover:text-white transition-colors"
            >
              Visit
            </a>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {isPreviewSelected && (
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <PreviewContent item={item} />
        </div>
      )}
    </div>
  );
}

// Preview Content Component
function PreviewContent({ item }: { item: Suggestion }) {
  switch (item.type) {
    case 'video':
      return (
        <div className="space-y-2">
          <div className="aspect-video bg-black text-white flex items-center justify-center text-sm">
            Video Preview: {item.title}
          </div>
          <p className="text-xs text-gray-600">{item.description}</p>
        </div>
      );
    case 'podcast':
      return (
        <div className="space-y-3">
          <div className="bg-black text-white p-4 rounded">
            <p className="text-xs font-medium mb-2">Audio Preview</p>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{item.title}</p>
                <p className="text-xs text-gray-300">{item.duration || '45 min'}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600">{item.description}</p>
        </div>
      );
    case 'song':
      return (
        <div className="space-y-3">
          <div className="bg-black text-white p-4 rounded">
            <p className="text-xs font-medium mb-2">Track Preview</p>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{item.title}</p>
                <p className="text-xs text-gray-300">{item.duration || '3:45'}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600">{item.description}</p>
        </div>
      );
    case 'website':
      return (
        <div className="space-y-2">
          <div className="bg-gray-100 border border-gray-300 p-3 rounded aspect-video flex items-center justify-center">
            <p className="text-xs text-gray-600 text-center">Website Preview</p>
          </div>
          <p className="text-xs text-gray-600">{item.description}</p>
          {item.url && <p className="text-xs text-gray-500 break-all">{item.url}</p>}
        </div>
      );
    case 'book':
      return (
        <div className="space-y-2">
          <div className="bg-black text-white p-6 rounded flex items-center justify-center aspect-video">
            <p className="text-center text-xs font-medium">{item.title}</p>
          </div>
          <p className="text-xs text-gray-600">{item.description}</p>
        </div>
      );
    default:
      return <p className="text-xs text-gray-600">{item.description}</p>;
  }
}

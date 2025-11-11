'use client';

import React, { useState, useEffect } from 'react';
import styles from './SearchModal.module.css';

interface Post {
  id: string;
  author: string;
  avatar: string;
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
}

interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  followers: number;
  isFollowing: boolean;
}

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  usesCount: number;
  thumbnail: string;
}

interface Place {
  id: string;
  name: string;
  address: string;
  category: string;
  rating: number;
  reviews: number;
  image: string;
}

interface SearchResults {
  posts: Post[];
  users: User[];
  templates: Template[];
  places: Place[];
  query: string;
  totalResults: number;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    const performSearch = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.closeButton} onClick={onClose}>
            ←
          </button>
          <div className={styles.searchInputContainer}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={styles.searchIcon}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search posts, users, templates, places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              autoFocus
            />
            {searchQuery && (
              <button
                className={styles.clearButton}
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className={styles.content}>
          {!searchQuery.trim() ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <p>Start typing to search the platform</p>
            </div>
          ) : loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Searching...</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <p>Error: {error}</p>
            </div>
          ) : results && results.totalResults === 0 ? (
            <div className={styles.noResults}>
              <p>No results found for "{searchQuery}"</p>
            </div>
          ) : results ? (
            <>
              {/* Users Section */}
              {results.users.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Users</h3>
                  <div className={styles.usersList}>
                    {results.users.map((user) => (
                      <div key={user.id} className={styles.userCard}>
                        <img src={user.avatar} alt={user.name} className={styles.avatar} />
                        <div className={styles.userInfo}>
                          <h4 className={styles.userName}>{user.name}</h4>
                          <p className={styles.userHandle}>{user.handle}</p>
                          <p className={styles.userBio}>{user.bio}</p>
                          <p className={styles.followers}>{user.followers.toLocaleString()} followers</p>
                        </div>
                        <button
                          className={`${styles.followButton} ${
                            user.isFollowing ? styles.following : ''
                          }`}
                        >
                          {user.isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Section */}
              {results.posts.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Posts</h3>
                  <div className={styles.postsList}>
                    {results.posts.map((post) => (
                      <div key={post.id} className={styles.postCard}>
                        <div className={styles.postHeader}>
                          <img src={post.avatar} alt={post.author} className={styles.avatar} />
                          <div className={styles.postMeta}>
                            <h5 className={styles.postAuthor}>{post.author}</h5>
                            <p className={styles.postTime}>{post.timestamp}</p>
                          </div>
                        </div>
                        <p className={styles.postContent}>{post.content}</p>
                        {post.image && (
                          <img src={post.image} alt="post" className={styles.postImage} />
                        )}
                        <div className={styles.postStats}>
                          <span>❤️ {post.likes} likes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Templates Section */}
              {results.templates.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Templates</h3>
                  <div className={styles.templatesList}>
                    {results.templates.map((template) => (
                      <div key={template.id} className={styles.templateCard}>
                        <div className={styles.templateIcon}>{template.thumbnail}</div>
                        <h5 className={styles.templateTitle}>{template.title}</h5>
                        <p className={styles.templateDescription}>{template.description}</p>
                        <div className={styles.templateMeta}>
                          <span className={styles.category}>{template.category}</span>
                          <span className={styles.uses}>{template.usesCount} uses</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Places Section */}
              {results.places.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Places</h3>
                  <div className={styles.placesList}>
                    {results.places.map((place) => (
                      <div key={place.id} className={styles.placeCard}>
                        <div className={styles.placeIcon}>{place.image}</div>
                        <div className={styles.placeInfo}>
                          <h5 className={styles.placeName}>{place.name}</h5>
                          <p className={styles.placeAddress}>{place.address}</p>
                          <div className={styles.placeMeta}>
                            <span className={styles.rating}>⭐ {place.rating}</span>
                            <span className={styles.reviews}>({place.reviews} reviews)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

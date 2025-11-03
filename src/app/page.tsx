'use client';

import React, { useState, useEffect, useRef } from 'react';
import HeaderNav from '@/components/HeaderNav';
import styles from '@/styles/home.module.css';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeDockItem, setActiveDockItem] = useState('home');
  const [musePosition, setMusePosition] = useState({ x: 0, y: 0 });
  const museRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <HeaderNav />

      <main className={styles.mainLayout}>
        {/* Background breathing aura */}
        <div className={styles.backgroundAura} />

        {/* Left Column - Posts */}
        <section className={styles.feedColumn}>
          <h2>Your Feed</h2>
          {[1, 2, 3, 4, 5].map((post) => (
            <PostTile key={post} postId={post} scrollY={scrollY} />
          ))}
        </section>

        {/* Center Column - Main Posts */}
        <section className={styles.feedColumnMain}>
          <h2>Moments</h2>
          {[1, 2, 3, 4].map((post) => (
            <PostTile key={post} postId={post + 10} scrollY={scrollY} featured />
          ))}
        </section>

        {/* Right Column - Pulse & Trends */}
        <aside className={styles.pulseColumn}>
          <div className={styles.pulseHeader}>Live Activity</div>

          {/* World Map Dots */}
          <div className={styles.liveMap}>
            <div className={styles.mapBackground} />
            {[1, 2, 3, 4, 5, 6].map((dot) => (
              <div
                key={dot}
                className={styles.activeDot}
                style={{
                  left: `${Math.random() * 90 + 5}%`,
                  top: `${Math.random() * 90 + 5}%`,
                  animationDelay: `${dot * 0.3}s`,
                }}
              />
            ))}
          </div>

          {/* Trending Strings */}
          <div className={styles.trendingSection}>
            <div className={styles.trendingTitle}>Trending Now</div>
            {['Joy Stories', 'Adventure', 'Wellness', 'Creative'].map((trend, idx) => (
              <div key={idx} className={styles.trendItem}>
                <span className={styles.trendIcon}>✨</span>
                <div className={styles.trendContent}>
                  <div className={styles.trendName}>{trend}</div>
                  <div className={styles.trendStat}>2.5K moments</div>
                </div>
              </div>
            ))}
          </div>

          {/* Mood Bubbles */}
          <div className={styles.moodBubbles}>
            {['Happy', 'Inspired', 'Peaceful', 'Excited'].map((mood, idx) => (
              <div key={idx} className={styles.moodBubble} style={{ animationDelay: `${idx * 0.5}s` }}>
                <div className={styles.bubbleWaveform} />
                <div className={styles.bubbleText}>{mood}</div>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {/* Universe Dock - Bottom Navigation */}
      <UniverseDock activeDockItem={activeDockItem} setActiveDockItem={setActiveDockItem} />

      {/* Fuy Muse - AI Companion */}
      <FuyMuse ref={museRef} mousePos={mousePos} />
    </>
  );
}

function PostTile({ postId, scrollY, featured }: { postId: number; scrollY: number; featured?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [reactions, setReactions] = useState(0);

  const handleReaction = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReactions(reactions + 1);
    // Create particle effect
    createReactionParticles(e.currentTarget);
  };

  const tilt = featured ? scrollY * 0.05 : scrollY * 0.02;

  return (
    <div
      className={`${styles.postTile} ${featured ? styles.featured : ''} ${hovered ? styles.hovered : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: `perspective(1000px) rotateX(${-tilt * 0.5}deg) translateY(${-tilt}px)`,
      }}
    >
      <div className={styles.postHeader}>
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${postId}`} alt="user" className={styles.userAvatar} />
        <div>
          <div className={styles.userName}>User {postId}</div>
          <div className={styles.postTime}>2 hours ago</div>
        </div>
      </div>

      <div className={styles.postContent}>
        <p>
          {featured
            ? `A moment of pure joy and reflection shared across the Fuy universe. This is memory post ${postId}.`
            : `Quick thought: Embracing the beauty of small moments. Post ${postId}`}
        </p>
      </div>

      <div className={styles.postActions}>
        <button className={styles.actionButton} onClick={handleReaction}>
          <span className={styles.reactionSmoke}>💜</span>
          {reactions > 0 && <span className={styles.reactionCount}>{reactions}</span>}
        </button>
        <button className={styles.actionButton}>
          <span>💬</span>
        </button>
        <button className={styles.actionButton}>
          <span>🔄</span>
        </button>
      </div>
    </div>
  );
}

function UniverseDock({ activeDockItem, setActiveDockItem }: { activeDockItem: string; setActiveDockItem: (item: string) => void }) {
  const dockItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'explore', icon: '🔍', label: 'Explore' },
    { id: 'create', icon: '➕', label: 'Create' },
    { id: 'community', icon: '👥', label: 'Community' },
    { id: 'library', icon: '📚', label: 'Library' },
  ];

  return (
    <div className={styles.universeDock}>
      {dockItems.map((item, idx) => (
        <button
          key={item.id}
          className={`${styles.dockItem} ${activeDockItem === item.id ? styles.active : ''}`}
          onClick={() => setActiveDockItem(item.id)}
          title={item.label}
          style={
            {
              '--dock-index': idx,
            } as React.CSSProperties
          }
        >
          <span className={styles.dockIcon}>{item.icon}</span>
          {activeDockItem === item.id && <span className={styles.dockLabel}>{item.label}</span>}
        </button>
      ))}
      <div className={styles.rippleEffect} />
    </div>
  );
}

const FuyMuse = React.forwardRef<HTMLDivElement, { mousePos: { x: number; y: number } }>(({ mousePos }, ref) => {
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;

      setPosition({
        x: dragStart.current.posX + deltaX,
        y: dragStart.current.posY + deltaY,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const distance = Math.hypot(mousePos.x - position.x, mousePos.y - position.y);
  const isNearby = distance < 200;

  return (
    <div
      ref={ref}
      className={`${styles.fuyMuse} ${expanded ? styles.expanded : ''} ${isNearby ? styles.nearby : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => setExpanded(!expanded)}
    >
      <div className={styles.museGlow} />
      <div className={styles.museOrb}>🧠</div>

      {expanded && (
        <div className={styles.musePopup}>
          <div className={styles.popupTitle}>Fuy Muse</div>
          <div className={styles.popupOptions}>
            <button className={styles.museOption}>📝 Summarize</button>
            <button className={styles.museOption}>🌐 Translate</button>
            <button className={styles.museOption}>📦 Archive</button>
            <button className={styles.museOption}>✨ Remix</button>
          </div>
        </div>
      )}
    </div>
  );
});

FuyMuse.displayName = 'FuyMuse';

function createReactionParticles(target: Element) {
  const rect = target.getBoundingClientRect();
  const particleCount = 5;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.textContent = '💜';
    particle.style.position = 'fixed';
    particle.style.left = rect.left + 'px';
    particle.style.top = rect.top + 'px';
    particle.style.fontSize = '20px';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '999';
    particle.style.animation = `particleFloat 1s ease-out forwards`;
    particle.style.animationDelay = `${i * 0.1}s`;

    document.body.appendChild(particle);

    setTimeout(() => particle.remove(), 1000);
  }
}

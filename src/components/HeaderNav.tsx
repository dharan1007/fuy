'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '@/styles/header.module.css';

const NAV_LINKS = [
  // Components
  { href: '/journal', label: 'Canvas', icon: '🎨' },
  { href: '/awe-routes', label: 'Hopln', icon: '🚀' },
  { href: '/bonds', label: 'Knot', icon: '🔗' },
  { href: '/algorithmic-archaeology', label: 'Axiz', icon: '🧬' },
  { href: '/alter-egos', label: 'Parall', icon: '🪞' },
  // Main navigation
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/friends', label: 'Friends', icon: '👥' },
  { href: '/feed', label: 'Feed', icon: '📰' },
  { href: '/rankings', label: 'Rankings', icon: '🏆' },
  { href: '/shop', label: 'Shop', icon: '🛍️' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export default function HeaderNav() {
  const router = useRouter();
  const [mode, setMode] = useState<'light' | 'dark' | 'sepia'>('dark');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('fuy-mode') as 'light' | 'dark' | 'sepia' | null;
    if (saved) setMode(saved);
    NAV_LINKS.forEach(({ href }) => router.prefetch?.(href));
  }, [router]);

  const handleModeChange = (newMode: 'light' | 'dark' | 'sepia') => {
    setMode(newMode);
    localStorage.setItem('fuy-mode', newMode);
    document.documentElement.setAttribute('data-mode', newMode);
  };

  return (
    <header className={styles.headerRibbon} data-mode={mode}>
      <div className={styles.ribbonContent}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>Fuy</span>
          <span className={styles.logoPulse} />
        </Link>

        {/* Center Navigation Links */}
        <nav className={styles.navLinks}>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              <span className={styles.navIcon}>{link.icon}</span>
              <span className={styles.navLabel}>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Right Side Controls */}
        <div className={styles.controls}>
          {/* Search Orb */}
          <div className={styles.searchContainer}>
            <button
              className={styles.searchOrb}
              onClick={() => setShowSearch(!showSearch)}
              aria-label="Search"
            >
              <span className={styles.searchIcon}>🔍</span>
            </button>
            {showSearch && (
              <div className={styles.searchExpanded}>
                <input
                  type="text"
                  placeholder="Search people, posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  autoFocus
                />
                <div className={styles.searchChips}>
                  <button className={styles.chip}>People</button>
                  <button className={styles.chip}>Posts</button>
                  <button className={styles.chip}>Moments</button>
                </div>
              </div>
            )}
          </div>

          {/* Mode Switch - Orbital Planets */}
          <div className={styles.modeSwitch}>
            {(['light', 'dark', 'sepia'] as const).map((m, idx) => (
              <button
                key={m}
                className={`${styles.modePlanet} ${mode === m ? styles.active : ''}`}
                onClick={() => handleModeChange(m)}
                title={`${m} mode`}
                style={
                  {
                    '--orbit-index': idx,
                  } as React.CSSProperties
                }
              >
                <span className={styles.planetIcon}>
                  {m === 'light' ? '☀️' : m === 'dark' ? '🌙' : '🎨'}
                </span>
              </button>
            ))}
          </div>

          {/* Profile Halo */}
          <button className={styles.profileHalo} aria-label="Profile menu">
            <div className={styles.haloRing} />
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=fuy"
              alt="Profile"
              className={styles.profileImage}
            />
          </button>
        </div>
      </div>
    </header>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './SwipeableStack.module.css';

interface SwipeableStackProps {
  items: any[];
  children: (item: any, index: number) => React.ReactNode;
  onCardClick?: (item: any, index: number) => void;
  containerHeight?: string;
}

export default function SwipeableStack({
  items,
  children,
  onCardClick,
  containerHeight = '300px',
}: SwipeableStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const offset = e.clientX - startXRef.current;
    setDragOffset(offset);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDragging(false);
    const offset = e.clientX - startXRef.current;

    if (Math.abs(offset) > 50) {
      if (offset > 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (offset < 0 && currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
    setDragOffset(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const offset = e.touches[0].clientX - startXRef.current;
    setDragOffset(offset);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);
    const offset = e.changedTouches[0].clientX - startXRef.current;

    if (Math.abs(offset) > 50) {
      if (offset > 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (offset < 0 && currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
    setDragOffset(0);
  };

  return (
    <div className={styles.container} style={{ height: containerHeight }}>
      <div
        ref={containerRef}
        className={styles.stackContainer}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${isDragging ? dragOffset : 0}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className={`${styles.card} ${
              index === currentIndex ? styles.active : ''
            } ${index < currentIndex ? styles.hidden : ''}`}
            onClick={() => {
              if (!isDragging && onCardClick) {
                onCardClick(item, index);
              }
            }}
          >
            {children(item, index)}
          </div>
        ))}
      </div>

      {/* Navigation Indicators */}
      <div className={styles.indicators}>
        {items.map((_, index) => (
          <button
            key={index}
            className={`${styles.dot} ${
              index === currentIndex ? styles.activeDot : ''
            }`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to card ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation Buttons */}
      {currentIndex > 0 && (
        <button
          className={`${styles.navButton} ${styles.prevButton}`}
          onClick={() => setCurrentIndex(currentIndex - 1)}
          title="Previous"
        >
          ‹
        </button>
      )}
      {currentIndex < items.length - 1 && (
        <button
          className={`${styles.navButton} ${styles.nextButton}`}
          onClick={() => setCurrentIndex(currentIndex + 1)}
          title="Next"
        >
          ›
        </button>
      )}
    </div>
  );
}

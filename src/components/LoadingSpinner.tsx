'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
const ScrollStarfield = dynamic(() => import('./ScrollStarfield'), { ssr: false });

interface LoadingSpinnerProps {
  message?: string;
  variant?: 'default' | 'minimal' | 'auth';
  estimatedTime?: number; // in seconds
}

export default function LoadingSpinner({
  message = 'Loading...',
  variant = 'default',
  estimatedTime = 3
}: LoadingSpinnerProps) {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      // Smooth progress increment, slower at the end
      setProgress(prev => {
        const increment = estimatedTime ? (100 / (estimatedTime * 10)) : 5;
        return Math.min(prev + increment, 90); // Cap at 90% until fully loaded
      });
    }, 100);

    return () => clearInterval(interval);
  }, [estimatedTime]);

  if (variant === 'minimal') {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (variant === 'auth') {
    return (
      <ScrollStarfield variant="default">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center space-y-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                {/* Outer rotating circle */}
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
                {/* Inner pulsing circle */}
                <div className="absolute inset-3 rounded-full bg-blue-500/20 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.3)]"></div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-white tracking-wide">{message}</h2>
              <p className="text-sm text-gray-400">Securing your session...</p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-200 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                <span>{Math.round(progress)}%</span>
                <span>{elapsedTime}s</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-4">
              Est. {estimatedTime}s • Don't refresh
            </p>
          </div>
        </div>
      </ScrollStarfield>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black/50 backdrop-blur-md text-white">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative w-16 h-16">
            {/* Outer rotating circle */}
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"></div>
            {/* Inner pulsing circle */}
            <div className="absolute inset-2 rounded-full bg-blue-50 opacity-50 animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">{message}</h2>
          <p className="text-sm text-gray-600">Please wait while we prepare your content...</p>
        </div>
      </div>
    </div>
  );
}

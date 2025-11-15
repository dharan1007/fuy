'use client';

import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  variant?: 'default' | 'minimal';
}

export default function LoadingSpinner({ message = 'Loading...', variant = 'default' }: LoadingSpinnerProps) {
  if (variant === 'minimal') {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
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

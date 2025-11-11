'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import GhostedRequestsSection from '@/components/GhostedRequestsSection';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const handleBackClick = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={handleBackClick}
            className="text-2xl text-gray-700 hover:text-blue-600 transition-colors"
            title="Go back"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-600">Manage your account and preferences</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Account Information Section */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span>👤</span> Account Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {session?.user?.email || 'Not available'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {session?.user?.name || 'Not set'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Created</label>
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {session?.user?.email ? 'Account active' : 'Unknown'}
              </div>
            </div>
          </div>
        </section>

        {/* Ghosted Requests Section */}
        <GhostedRequestsSection />

        {/* Privacy & Security Section */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span>🔒</span> Privacy & Security
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">Profile Visibility</p>
              <p className="text-sm text-blue-800">Your profile is set to public. You can appear in search results.</p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">Data Privacy</p>
              <p className="text-sm text-blue-800">Your personal data is protected and only shared with your permission.</p>
            </div>
          </div>
        </section>

        {/* Session Management Section */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span>🔐</span> Session Management
          </h2>

          <button
            onClick={() => signOut({ redirect: true, callbackUrl: '/' })}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Sign Out
          </button>
          <p className="text-xs text-gray-600 mt-2">You will be logged out from all devices</p>
        </section>

        {/* Danger Zone Section */}
        <section className="bg-red-50 rounded-xl border border-red-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-red-900 mb-6 flex items-center gap-2">
            <span>⚠️</span> Danger Zone
          </h2>

          <div className="bg-white rounded-lg p-4 mb-4 border border-red-100">
            <p className="text-sm text-gray-700 mb-4">
              <strong>Delete Account</strong> - This action is <span className="font-bold text-red-600">permanent and cannot be undone</span>.
            </p>
            <ul className="text-sm text-gray-600 space-y-2 mb-4 pl-4">
              <li>✓ All your posts, chats, and messages will be deleted</li>
              <li>✓ Your friendships and connections will be removed</li>
              <li>✓ All personal data will be permanently removed from our database</li>
              <li>✓ You will not be able to recover your account</li>
            </ul>
          </div>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>🗑️</span> Delete My Account
          </button>
          <p className="text-xs text-red-700 mt-2">You will need to verify your password to proceed</p>
        </section>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        userEmail={session?.user?.email || ''}
      />
    </div>
  );
}

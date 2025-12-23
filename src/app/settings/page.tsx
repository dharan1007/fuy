'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import GhostedRequestsSection from '@/components/GhostedRequestsSection';
import { SpaceBackground } from '@/components/SpaceBackground';
import AppHeader from '@/components/AppHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ChevronDown, ChevronRight, Activity, Bell, Lock, Shield, UserX, Ghost, LogOut, Trash2 } from 'lucide-react';

interface UserSettings {
  autoAcceptFollows: boolean;
  defaultPostVisibility: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<UserSettings>({
    autoAcceptFollows: false,
    defaultPostVisibility: 'PUBLIC'
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [accountCreated, setAccountCreated] = useState<string>('');

  // Password State
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Relations State
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [ghostedUsers, setGhostedUsers] = useState<any[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showGhosted, setShowGhosted] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
      fetchRelations();
    }
  }, [status]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data) {
        setSettings({
          autoAcceptFollows: data.autoAcceptFollows || false,
          defaultPostVisibility: data.defaultPostVisibility || 'PUBLIC'
        });
        if (data.createdAt) {
          setAccountCreated(new Date(data.createdAt).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchRelations = async () => {
    try {
      const [blockedRes, ghostedRes] = await Promise.all([
        fetch('/api/friends/relations?type=BLOCKED'),
        fetch('/api/friends/relations?type=GHOSTED')
      ]);
      const blockedData = await blockedRes.json();
      const ghostedData = await ghostedRes.json();

      if (blockedData.relations) setBlockedUsers(blockedData.relations);
      if (ghostedData.relations) setGhostedUsers(ghostedData.relations);
    } catch (e) {
      console.error('Failed to load relations', e);
    }
  };

  const updatePrivacySetting = async (key: keyof UserSettings, value: any) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      const formData = new FormData();
      formData.append(key, value.toString());
      await fetch('/api/profile', { method: 'PUT', body: formData });
    } catch (e) {
      console.error('Failed to update setting', e);
      fetchSettings(); // Revert on error
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingPassword(true);
    setPasswordMsg({ type: '', text: '' });

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new
        })
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
        setPasswordForm({ current: '', new: '' });
      } else {
        setPasswordMsg({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch (e) {
      setPasswordMsg({ type: 'error', text: 'An error occurred' });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUnblockUnghost = async (targetId: string, action: 'UNBLOCK' | 'UNGHOST') => {
    try {
      const res = await fetch('/api/friends/relations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetId, action })
      });

      if (res.ok) {
        if (action === 'UNBLOCK') {
          setBlockedUsers(prev => prev.filter(r => r.friend.id !== targetId));
        } else {
          setGhostedUsers(prev => prev.filter(r => r.friend.id !== targetId));
        }
      }
    } catch (e) {
      console.error(`Failed to ${action}`, e);
    }
  };

  if (status === 'loading' || loadingSettings) return <LoadingSpinner variant="auth" />;
  if (status === 'unauthenticated') { router.push('/login'); return null; }

  return (
    <div className="min-h-screen bg-black text-white relative font-sans">
      <SpaceBackground />
      <AppHeader title="Settings" showBackButton showSettingsAndLogout={false} />

      <div className="max-w-2xl mx-auto px-6 py-8 relative z-10">

        {/* Activity & History */}
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider border-b border-white/10 pb-2">
            Your Activity
          </h2>
          <button
            onClick={() => router.push('/activity')}
            className="w-full flex items-center justify-between bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="text-left flex items-center gap-3">
              <Activity className="w-5 h-5 text-white" />
              <div>
                <p className="font-bold text-white">View Activity History</p>
                <p className="text-sm text-gray-400">Likes, Dislikes, Watch History, and Tags</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </section>

        {/* Account Information */}
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider border-b border-white/10 pb-2">
            Account Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Email Address</label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-bold">
                {session?.user?.email}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Account Name</label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-bold">
                {session?.user?.name || 'Not set'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Member Since</label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-bold">
                {accountCreated || 'Unknown'}
              </div>
            </div>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider border-b border-white/10 pb-2">
            Notifications
          </h2>
          <button
            onClick={() => router.push('/settings/notifications')}
            className="w-full flex items-center justify-between bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="text-left flex items-center gap-3">
              <Bell className="w-5 h-5 text-white" />
              <div>
                <p className="font-bold text-white">Push Notifications</p>
                <p className="text-sm text-gray-400">Manage your notification preferences</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </section>

        {/* Change Password */}
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider border-b border-white/10 pb-2">
            Change Password
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Current Password"
                value={passwordForm.current}
                onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="New Password (min 8 chars)"
                value={passwordForm.new}
                onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors"
                required
              />
            </div>
            {passwordMsg.text && (
              <p className={`text-sm font-bold ${passwordMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {passwordMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full px-6 py-3 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors uppercase tracking-widest disabled:opacity-50"
            >
              {updatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>


        {/* Privacy & Security */}
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider border-b border-white/10 pb-2">
            Privacy Controls
          </h2>

          <div className="space-y-6">
            {/* Auto Accept Follows */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Auto-Accept Follow Requests</p>
                <p className="text-xs text-gray-400">Automatically accept new followers</p>
              </div>
              <button
                onClick={() => updatePrivacySetting('autoAcceptFollows', !settings.autoAcceptFollows)}
                className={`w-12 h-6 rounded-full p-1 transition-colors border ${settings.autoAcceptFollows ? 'bg-white border-white' : 'bg-transparent border-white/20'}`}
              >
                <div className={`w-4 h-4 rounded-full transition-transform ${settings.autoAcceptFollows ? 'translate-x-6 bg-black' : 'translate-x-0 bg-white'}`} />
              </button>
            </div>

            {/* Default Post Visibility */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Default Post Visibility</p>
                <p className="text-xs text-gray-400">Who can see your new posts by default</p>
              </div>
              <select
                value={settings.defaultPostVisibility}
                onChange={(e) => updatePrivacySetting('defaultPostVisibility', e.target.value)}
                className="bg-black border border-white/20 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-white"
              >
                <option value="PUBLIC">Public</option>
                <option value="FOLLOWERS">Followers Only</option>
              </select>
            </div>
          </div>
        </section>

        {/* Ghosted Requests (Existing feature) */}
        <GhostedRequestsSection />

        {/* Blocked Users Manager */}
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowBlocked(!showBlocked)}>
            <div className="flex items-center gap-3">
              <UserX className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">Blocked Users ({blockedUsers.length})</h2>
            </div>
            {showBlocked ? <ChevronDown className="w-5 h-5 text-white" /> : <ChevronRight className="w-5 h-5 text-white" />}
          </div>

          {showBlocked && (
            <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
              {blockedUsers.length === 0 ? (
                <p className="text-gray-500 text-sm">No blocked users.</p>
              ) : (
                blockedUsers.map((relation) => (
                  <div key={relation.friend.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                    <span className="font-bold text-sm">{relation.friend.name}</span>
                    <button
                      onClick={() => handleUnblockUnghost(relation.friend.id, 'UNBLOCK')}
                      className="text-xs border border-white/30 px-3 py-1 rounded hover:bg-white hover:text-black transition-colors"
                    >
                      UNBLOCK
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Ghosted Users Manager (New feature) */}
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowGhosted(!showGhosted)}>
            <div className="flex items-center gap-3">
              <Ghost className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">Ghosted Users ({ghostedUsers.length})</h2>
            </div>
            {showGhosted ? <ChevronDown className="w-5 h-5 text-white" /> : <ChevronRight className="w-5 h-5 text-white" />}
          </div>

          {showGhosted && (
            <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
              <p className="text-xs text-gray-400 mb-2">Ghosted users are restricted. They can't see your interactions.</p>
              {ghostedUsers.length === 0 ? (
                <p className="text-gray-500 text-sm">No ghosted users.</p>
              ) : (
                ghostedUsers.map((relation) => (
                  <div key={relation.friend.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                    <span className="font-bold text-sm">{relation.friend.name}</span>
                    <button
                      onClick={() => handleUnblockUnghost(relation.friend.id, 'UNGHOST')}
                      className="text-xs border border-white/30 px-3 py-1 rounded hover:bg-white hover:text-black transition-colors"
                    >
                      UNGHOST
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Session Management */}
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider border-b border-white/10 pb-2">
            Session Management
          </h2>
          <button
            onClick={() => signOut({ redirect: true, callbackUrl: '/' })}
            className="w-full px-6 py-3 bg-black border border-white text-white rounded-lg font-bold hover:bg-white hover:text-black transition-all uppercase tracking-widest"
          >
            Sign Out
          </button>
          <p className="text-xs text-gray-400 mt-2 font-medium">You will be logged out from all devices</p>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-900/10 rounded-xl border border-red-500/20 shadow-lg p-6">
          <h2 className="text-xl font-bold text-red-500 mb-6 uppercase tracking-wider border-b border-red-500/10 pb-2">
            Danger Zone
          </h2>
          <div className="bg-black/40 rounded-lg p-4 mb-4 border border-red-500/10">
            <p className="text-sm text-gray-300 mb-4 font-medium">
              <strong className="text-white">Delete Account</strong> - This action is <span className="font-bold text-red-500">permanent</span>.
            </p>
          </div>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full px-6 py-3 bg-black border border-red-500 text-red-500 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest"
          >
            Delete My Account
          </button>
        </section>
      </div>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        userEmail={session?.user?.email || ''}
      />
    </div>
  );
}

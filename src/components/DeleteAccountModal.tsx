'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import styles from './DeleteAccountModal.module.css';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  userEmail,
}: DeleteAccountModalProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  const handleDeleteAccount = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    if (confirmEmail !== userEmail) {
      setError(`Please type your email address (${userEmail}) to confirm`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to delete account');
        return;
      }

      // Account deleted successfully - sign out and redirect
      await signOut({ redirect: false });
      router.push('/');
      onClose();
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Delete account error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmEmail('');
    setError(null);
    setShowPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Delete Account</h2>
          <p className={styles.subtitle}>This action cannot be undone</p>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.warningBox}>
            <span className={styles.warningIcon}>⚠️</span>
            <div>
              <p className={styles.warningTitle}>Permanent Deletion</p>
              <p className={styles.warningText}>
                All your data will be permanently deleted from our servers, including:
              </p>
              <ul className={styles.warningList}>
                <li>Posts and content</li>
                <li>Messages and conversations</li>
                <li>Friends and connections</li>
                <li>Account settings and preferences</li>
                <li>All other personal data</li>
              </ul>
            </div>
          </div>

          {/* Confirmation Fields */}
          <div className={styles.confirmationSection}>
            <div className={styles.field}>
              <label className={styles.label}>Enter your password</label>
              <div className={styles.passwordInput}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={styles.input}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.showPasswordBtn}
                  disabled={loading}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Type your email to confirm: <span className={styles.required}>{userEmail}</span>
              </label>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={userEmail}
                className={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorBox}>
              <span>❌</span>
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            onClick={handleClose}
            disabled={loading}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={loading || !password || confirmEmail !== userEmail}
            className={styles.deleteButton}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Deleting...
              </>
            ) : (
              <>
                <span>🗑️</span>
                Delete Account Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

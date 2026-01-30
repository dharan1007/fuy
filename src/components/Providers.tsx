'use client';

import { EncryptionProvider, useEncryption } from "@/context/EncryptionContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PinModal from "@/components/PinModal";

// Client component to handle global lock UI
function GlobalLock() {
  const { isLocked, hasKeys, isLoading } = useEncryption();
  // Don't show if loading auth/keys
  if (isLoading) return null;

  // Show modal if Locked OR Setup needed (no keys)
  // Assuming we only block if logged in (user ID check is inside context).
  // If not logged in, context returns isLocked=true but hasKeys=false usually? 
  // Wait, if not logged in, we shouldn't block.
  // Context handles logic: if session is null, it resets variables.
  // But wait, if I am on a public page (login), I shouldn't see lock.
  // The context needs to know if we are authenticated. 
  // We can trust the context logic: `checkKeys` only runs if `userId` is set.
  // If `userId` is null, `checkKeys` doesn't run. `isLocked` is true by default.
  // We need to verify if we are logged in before showing lock.
  // The EncryptionContext sets `userId` from supabase session.
  // If `userId` is null, we should NOT show the lock.

  // Let's check context state directly.
  // If `isLocked` is true, we might block.
  // But we need to know if we are even eligible for locking.
  // Maybe we only show this IF we have a valid session?
  // I will check `userId` from context if I exposed it, or I can check `hasKeys`.
  // If `hasKeys` is true, it means we found a profile for the user.
  // If `hasKeys` is false, it might mean new user OR not logged in.

  // Refined approach:
  // The context should expose `isAuthenticated` or `userId`.
  // Let's modify EncryptionContext to export `userId` or similar if needed.
  // Or, since I defined `PinModal` to handle `mode='setup'`, it implies authorized user.

  // The previous implementation in Mobile `_layout.tsx`:
  // `const showPinModal = !!session && !loading && !encryptLoading;`
  // It checks session explicitly.

  // Here in Web Providers, we don't have easy access to `session` unless we use another hook.
  // I'll rely on `EncryptionProvider` effectively exposing state.
  // I'll update `EncryptionContext` to export `userId` as well to make this easy.

  return null;
}

// Updating Providers to just include EncryptionProvider for now.
// I will update EncryptionContext first to expose `userId` to be safe, 
// OR I will simply use `supabase.auth.getUser()` inside the Lock component.
// Actually, `GlobalLock` can be a separate component I assume.

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <EncryptionProvider>
        <ErrorBoundary>
          {children}
          <GlobalLockWrapper />
        </ErrorBoundary>
      </EncryptionProvider>
    </ThemeProvider>
  );
}

function GlobalLockWrapper() {
  const { isLocked, hasKeys, isLoading, userId } = useEncryption();

  // Only show if user is authenticated (userId present) and not loading
  if (!userId || isLoading) return null;

  return (
    <PinModal
      visible={isLocked || !hasKeys}
      mode={!hasKeys ? 'setup' : 'unlock'}
    />
  );
}

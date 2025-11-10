"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cartStore";

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  showSettingsAndLogout?: boolean;
}

export default function AppHeader({ title, showBackButton = false, showSettingsAndLogout = false }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);
  const cartItems = useCartStore((state) => state.items);

  useEffect(() => {
    if (session) {
      loadUnreadCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  useEffect(() => {
    // Update cart item count whenever items change
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    setCartItemCount(totalItems);
  }, [cartItems]);

  async function loadUnreadCount() {
    try {
      const res = await fetch("/api/notifications?unreadOnly=true");
      const data = await res.json();
      setUnreadCount(data.notifications?.length || 0);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  }

  async function handleLogout() {
    await signOut({ callbackUrl: "/login" });
  }

  function handleBack() {
    router.back();
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-neutral-700">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Left side - Brand + Back button and Title */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Fuy Brand */}
            <div className="flex flex-col items-start gap-0">
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                fuy
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium leading-none">
                Find your joy
              </span>
            </div>
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-900 dark:text-white"
                title="Go back"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {title && <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white truncate">{title}</h1>}
          </div>

          {/* Right side - Navigation and Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Home button */}
            {pathname !== "/" && (
              <Link
                href="/"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-900 dark:text-white"
                title="Home"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
            )}

            {/* Profile button */}
            {session && pathname !== "/profile" && (
              <Link
                href="/profile"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-900 dark:text-white"
                title="Profile"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
            )}

            {/* Chat button */}
            {session && pathname !== "/chat" && (
              <Link
                href="/chat"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-900 dark:text-white"
                title="Messages"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </Link>
            )}

            {/* Shop button */}
            {pathname !== "/shop" && (
              <Link
                href="/shop"
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-900 dark:text-white"
                title="Shop"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </Link>
            )}

            {/* Cart button */}
            {pathname !== "/cart" && (
              <Link
                href="/cart"
                className="relative p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-900 dark:text-white"
                title="Shopping Cart"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-blue-600 text-white text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-medium">
                    {cartItemCount > 9 ? "9+" : cartItemCount}
                  </span>
                )}
              </Link>
            )}

            {/* Notifications button */}
            {session && (
              <Link
                href="/notifications"
                className="relative p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-900 dark:text-white"
                title="Notifications"
                onClick={() => setUnreadCount(0)}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-red-500 text-white text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Settings button - only show on profile page */}
            {showSettingsAndLogout && (
              <Link
                href="/settings"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-900 dark:text-white"
                title="Settings"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline text-xs sm:text-sm">Settings</span>
              </Link>
            )}

            {/* Logout button - only show on profile page */}
            {showSettingsAndLogout && session && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Logout"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden md:inline text-xs sm:text-sm">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

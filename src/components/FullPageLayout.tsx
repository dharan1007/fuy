// src/components/FullPageLayout.tsx
"use client";

import AppHeader from "@/components/AppHeader";

export default function FullPageLayout({
  children,
  hideShopAndCart = false,
  hideNavigation = false,
}: {
  children: React.ReactNode;
  hideShopAndCart?: boolean;
  hideNavigation?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <AppHeader showBackButton hideShopAndCart={hideShopAndCart} hideNavigation={hideNavigation} />
      {children}
    </div>
  );
}

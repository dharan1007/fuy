// src/components/FullPageLayout.tsx
"use client";

import AppHeader from "@/components/AppHeader";

export default function FullPageLayout({
  children,
  hideShopAndCart = false,
}: {
  children: React.ReactNode;
  hideShopAndCart?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <AppHeader showBackButton hideShopAndCart={hideShopAndCart} />
      {children}
    </div>
  );
}

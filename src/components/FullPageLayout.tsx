// src/components/FullPageLayout.tsx
"use client";

import AppHeader from "@/components/AppHeader";

export default function FullPageLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <AppHeader showBackButton />
      {children}
    </div>
  );
}

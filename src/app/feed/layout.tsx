// src/app/feed/layout.tsx
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

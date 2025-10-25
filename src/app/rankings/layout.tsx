// src/app/rankings/layout.tsx
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

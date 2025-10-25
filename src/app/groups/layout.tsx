// src/app/groups/layout.tsx
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

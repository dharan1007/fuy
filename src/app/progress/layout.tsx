// src/app/progress/layout.tsx
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

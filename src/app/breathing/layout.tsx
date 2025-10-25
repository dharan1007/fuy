// src/app/breathing/layout.tsx
import FullPageLayout from "@/components/FullPageLayout";

export default function BreathingLayout({ children }: { children: React.ReactNode }) {
  return <FullPageLayout>{children}</FullPageLayout>;
}

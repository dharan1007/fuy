// src/app/thoughts/layout.tsx
import FullPageLayout from "@/components/FullPageLayout";

export default function ThoughtsLayout({ children }: { children: React.ReactNode }) {
  return <FullPageLayout>{children}</FullPageLayout>;
}

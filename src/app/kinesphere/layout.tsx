// src/app/kinesphere/layout.tsx
import FullPageLayout from "@/components/FullPageLayout";

export default function KinesphereLayout({ children }: { children: React.ReactNode }) {
  return <FullPageLayout>{children}</FullPageLayout>;
}

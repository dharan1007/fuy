// src/app/onboarding/layout.tsx
import FullPageLayout from "@/components/FullPageLayout";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <FullPageLayout>{children}</FullPageLayout>;
}

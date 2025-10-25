// src/app/pomodoro/layout.tsx
import FullPageLayout from "@/components/FullPageLayout";

export default function PomodoroLayout({ children }: { children: React.ReactNode }) {
  return <FullPageLayout>{children}</FullPageLayout>;
}

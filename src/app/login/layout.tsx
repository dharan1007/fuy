// src/app/login/layout.tsx
import FullPageLayout from "@/components/FullPageLayout";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <FullPageLayout hideShopAndCart={true} hideNavigation={true}>{children}</FullPageLayout>;
}

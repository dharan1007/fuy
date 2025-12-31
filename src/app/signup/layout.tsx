import FullPageLayout from "@/components/FullPageLayout";

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <FullPageLayout hideShopAndCart={true} hideNavigation={true}>{children}</FullPageLayout>;
}

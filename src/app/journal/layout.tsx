import FullPageLayout from "@/components/FullPageLayout";

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FullPageLayout>{children}</FullPageLayout>;
}

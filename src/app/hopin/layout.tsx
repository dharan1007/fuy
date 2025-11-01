export const metadata = { title: "Awe Routes — fuy" };

export default function AweRoutesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      {children}
    </>
  );
}

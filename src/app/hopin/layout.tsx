export const metadata = { title: "Hopin — fuy" };

export default function HopinLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      {children}
    </>
  );
}

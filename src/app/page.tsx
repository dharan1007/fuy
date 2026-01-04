import HomeClient from '@/components/HomeClient';

export const revalidate = 60; // ISR for the shell

export default function Home() {
  // Admin check moved to client or omitted for static shell
  return <HomeClient isAdmin={false} />;
}

import HomeClient from '@/components/HomeClient';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default function Home() {
  const isAdmin = cookies().has('fuy_admin_session');
  return <HomeClient isAdmin={isAdmin} />;
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileView from "./ProfileView";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const next = encodeURIComponent("/profile");
    redirect(`/join?next=${next}`);
  }
  return <ProfileView />;
}

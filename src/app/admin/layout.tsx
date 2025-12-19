
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. Check App Authentication (NextAuth)
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/join?callbackUrl=/admin/moderation");
    }

    // 2. Check Admin Cookie (Double Protection)
    const adminCookie = cookies().get("fuy_admin_session");
    // Don't protect the login page itself to avoid infinite loops
    // But wait, layout wraps everything. We need to handle this carefully.
    // Actually, we should probably check if we are ON the login page, but layouts run for all children.
    // Strategy: If cookie is missing, we render the login page logic? No, better to redirect.
    // BUT: If the child IS logic page, we shouldn't redirect AWAY from it.

    // Actually, standard pattern:
    // If this layout is for /admin, then even /admin/login is protected?
    // No, we should put this layout in /admin/moderation/layout.tsx or group routes.
    // But user asked for /admin dashboard.

    // Better approach:
    // Move this protection logic into `src/app/admin/moderation/layout.tsx` specifically, 
    // OR just check headers/pathname (hard in layout).

    // The simplest way that works for Next.js App Router:
    // We can let the layout run, but if the user goes to /admin/login, we allow it.
    // IF the user goes to /admin/moderation (or anything else), we enforce it.
    // However, we don't know the route here easily.

    // SOLUTION: Since this file `c:\Users\dhara\fuy\src\app\admin\layout.tsx` wraps `/admin/login` too,
    // we CANNOT do the redirect here indiscriminately.
    // I will create specific protection for the dashboard route instead, OR use Route Groups.
    // For simplicity given the structure: I will put the protection check directly in the page or a sub-layout.

    // Let's protect specifically the dashboard.
    // I'll leave this layout as a simple shell for now or just valid pass-through.

    return <>{children}</>;
}

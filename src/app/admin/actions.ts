"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "fuy_admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 1 week

export async function loginAdmin(formData: FormData) {
    const password = formData.get("password") as string;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        return { error: "Admin password not configured on server" };
    }

    if (password === adminPassword) {
        // Set secure cookie
        cookies().set(COOKIE_NAME, "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: MAX_AGE,
            path: "/",
            sameSite: "lax",
        });
        redirect("/admin/moderation");
    } else {
        return { error: "Invalid password" };
    }
}

export async function logoutAdmin() {
    cookies().delete(COOKIE_NAME);
    redirect("/");
}

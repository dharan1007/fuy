import { logger } from "@/lib/logger";
// src/app/api/auth/change-email/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { newEmail } = body;

    if (!newEmail) {
      return NextResponse.json(
        { error: "New email is required" },
        { status: 400 }
      );
    }

    // Check if email is already taken
    const existing = await prisma.user.findUnique({
      where: { email: newEmail.toLowerCase() },
    });

    if (existing && existing.id !== userId) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 400 }
      );
    }

    // Update email
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail.toLowerCase(),
        emailVerified: null, // Require re-verification
      },
    });

    return NextResponse.json({
      message: "Email updated successfully. Please verify your new email.",
    });
  } catch (error: any) {
    logger.error("Change email error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to change email" },
      { status: 500 }
    );
  }
}

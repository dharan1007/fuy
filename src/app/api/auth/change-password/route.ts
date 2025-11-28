import { logger } from "@/lib/logger";
// src/app/api/auth/change-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkPasswordStrength } from "@/lib/security";
import { securityLogger, SecurityEventType } from "@/lib/security-logger";

// Input validation schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: Request) {
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  try {
    const userId = await requireUserId();
    const body = await req.json();

    // Validate input
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    // Check new password strength
    const passwordCheck = checkPasswordStrength(newPassword);
    if (passwordCheck.score < 3) {
      return NextResponse.json(
        {
          error: "New password is too weak",
          feedback: passwordCheck.feedback,
        },
        { status: 400 }
      );
    }

    // Ensure new password is different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user has no password (signed up with magic link/passkey), they can set one
    if (user.password) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        securityLogger.log({
          type: SecurityEventType.AUTH_FAILURE,
          severity: "medium",
          path: "/api/auth/change-password",
          userId,
          ip: clientIp,
          details: { reason: "Invalid current password" },
        });

        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
    }

    // Hash new password with bcrypt (12 rounds)
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Log password change
    securityLogger.log({
      type: SecurityEventType.PASSWORD_CHANGED,
      severity: "medium",
      path: "/api/auth/change-password",
      userId,
      ip: clientIp,
      details: { action: "password_changed" },
    });

    // TODO: Invalidate all existing sessions except current one
    // This would require session management in database

    return NextResponse.json({
      message: "Password updated successfully. Please login again on other devices.",
    });
  } catch (error: any) {
    logger.error("Change password error:", error);

    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}

import { logger } from "@/lib/logger";
// src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkPasswordStrength, sanitizeInput } from "@/lib/security";
import { securityLogger, SecurityEventType } from "@/lib/security-logger";

// Input validation schema
const signupSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  try {
    const body = await req.json();

    // Validate input
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      securityLogger.log({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: "low",
        path: "/api/auth/signup",
        ip: clientIp,
        details: { errors: validation.error.flatten() },
      });

      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;

    // Check password strength
    const passwordCheck = checkPasswordStrength(password);
    if (passwordCheck.score < 3) {
      return NextResponse.json(
        {
          error: "Password is too weak",
          feedback: passwordCheck.feedback,
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      securityLogger.log({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: "low",
        path: "/api/auth/signup",
        ip: clientIp,
        details: { reason: "Duplicate email attempt", email },
      });

      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password with bcrypt (12 rounds for better security)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Sanitize name if provided
    const sanitizedName = name ? sanitizeInput(name) : null;

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: sanitizedName,
        emailVerified: new Date(), // Auto-verify for password signups
      },
    });

    // Create profile
    await prisma.profile.create({
      data: {
        userId: user.id,
        displayName: sanitizedName,
      },
    });

    // Log successful signup
    securityLogger.log({
      type: SecurityEventType.AUTH_SUCCESS,
      severity: "low",
      path: "/api/auth/signup",
      userId: user.id,
      ip: clientIp,
      details: { action: "signup" },
    });

    return NextResponse.json(
      { message: "Account created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error("Signup error:", error);

    securityLogger.log({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: "medium",
      path: "/api/auth/signup",
      ip: clientIp,
      details: { error: error.message },
    });

    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

// src/app/api/dev/login/route.ts
// Development-only endpoint to quickly login as a demo user
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify, SignJWT } from "jose";

const secret = process.env.NEXTAUTH_SECRET!;
const enc = new TextEncoder();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Check if we're in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Not available in production" },
        { status: 403 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // For development, accept any password for demo users
    const isDemoUser = email.toLowerCase().includes("@example.com");
    if (!isDemoUser) {
      return NextResponse.json(
        { error: "Only demo users can login via this endpoint" },
        { status: 403 }
      );
    }

    // Create login token
    const loginToken = await new SignJWT({ uid: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("fuy")
      .setAudience("fuy")
      .setExpirationTime("7d")
      .sign(enc.encode(secret));

    return NextResponse.json({ loginToken, userId: user.id, email: user.email });
  } catch (error: any) {
    console.error("Dev login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}

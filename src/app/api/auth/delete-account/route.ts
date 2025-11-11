import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

// Handle CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Get the current session user
    const user = await getSessionUser();

    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Unauthorized - User not logged in" },
        { status: 401 }
      );
    }

    // Get the password from request body
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required to delete account" },
        { status: 400 }
      );
    }

    // Fetch the user from database to verify password
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // If user has a password, verify it
    if (dbUser.password) {
      const isPasswordCorrect = await bcrypt.compare(password, dbUser.password);

      if (!isPasswordCorrect) {
        return NextResponse.json(
          { error: "Incorrect password" },
          { status: 401 }
        );
      }
    } else if (password) {
      // If user doesn't have a password (OAuth user), reject deletion with password
      return NextResponse.json(
        { error: "This account uses OAuth authentication and cannot be deleted with a password" },
        { status: 400 }
      );
    }

    // Delete the user - Prisma will cascade delete all related data
    await prisma.user.delete({
      where: { id: dbUser.id },
    });

    return NextResponse.json(
      {
        message: "Account successfully deleted",
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

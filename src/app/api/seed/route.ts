import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // Demo users to seed
    const demoUsers = [
      {
        email: "demo@example.com",
        password: "Demo@1234",
        name: "Demo User",
      },
      {
        email: "test@example.com",
        password: "Test@1234",
        name: "Test User",
      },
    ];

    const created = [];
    const skipped = [];

    for (const userData of demoUsers) {
      try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email.toLowerCase() },
        });

        if (existingUser) {
          skipped.push(userData.email);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user
        const user = await prisma.user.create({
          data: {
            email: userData.email.toLowerCase(),
            password: hashedPassword,
            name: userData.name,
            emailVerified: new Date(),
          },
        });

        // Create profile
        await prisma.profile.create({
          data: {
            userId: user.id,
            displayName: userData.name,
          },
        });

        created.push(userData.email);
      } catch (error) {
        console.error(`Error creating user ${userData.email}:`, error);
      }
    }

    return NextResponse.json(
      {
        message: "Seeding complete!",
        created,
        skipped,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Seeding error:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: error.message },
      { status: 500 }
    );
  }
}

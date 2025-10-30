import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with demo users...");

  // Demo user credentials
  const demoUsers = [
    {
      email: "jasmine@example.com",
      password: "Jasmine@1234",
      name: "Jasmine Lowery",
      displayName: "Jasmine",
    },
    {
      email: "alex@example.com",
      password: "Alex@1234",
      name: "Alex Hunt",
      displayName: "Alex",
    },
    {
      email: "jordan@example.com",
      password: "Jordan@1234",
      name: "Jordan Church",
      displayName: "Jordan",
    },
    {
      email: "jacob@example.com",
      password: "Jacob@1234",
      name: "Jacob Mcleod",
      displayName: "Jacob",
    },
    {
      email: "carmen@example.com",
      password: "Carmen@1234",
      name: "Carmen Campos",
      displayName: "Carmen",
    },
    {
      email: "toriano@example.com",
      password: "Toriano@1234",
      name: "Toriano Cordia",
      displayName: "Toriano",
    },
    {
      email: "jesse@example.com",
      password: "Jesse@1234",
      name: "Jesse Rolira",
      displayName: "Jesse",
    },
    {
      email: "vanessa@example.com",
      password: "Vanessa@1234",
      name: "Vanessa Cox",
      displayName: "Vanessa",
    },
    {
      email: "anthony@example.com",
      password: "Anthony@1234",
      name: "Anthony Cordones",
      displayName: "Anthony",
    },
    {
      email: "ms@example.com",
      password: "Ms@1234",
      name: "Ms Potillo",
      displayName: "Ms",
    },
  ];

  for (const userData of demoUsers) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() },
      });

      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
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
          displayName: userData.displayName || userData.name,
        },
      });

      console.log(`✓ Created user: ${userData.email}`);
    } catch (error) {
      console.error(`✗ Error creating user ${userData.email}:`, error);
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

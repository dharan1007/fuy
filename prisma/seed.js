const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with demo users and test data...");

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

  // Create users
  const createdUsers = [];
  for (const userData of demoUsers) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() },
      });

      if (existingUser) {
        createdUsers.push(existingUser);
        console.log(`✓ User already exists: ${userData.email}`);
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
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name}`,
          bio: `${userData.displayName || userData.name} loves exploring and documenting adventures!`,
        },
      });

      createdUsers.push(user);
      console.log(`✓ Created user: ${userData.email}`);
    } catch (error) {
      console.error(`✗ Error creating user ${userData.email}:`, error);
    }
  }

  // Create friendships between users
  if (createdUsers.length >= 2) {
    console.log("\n👥 Creating friendships...");
    const baseUser = createdUsers[0];
    const user2 = createdUsers[1];

    for (let i = 2; i < createdUsers.length; i++) {
      try {
        // Create friendship with first user
        await prisma.friendship.upsert({
          where: {
            userId_friendId: {
              userId: baseUser.id,
              friendId: createdUsers[i].id,
            },
          },
          update: { status: "ACCEPTED" },
          create: {
            userId: baseUser.id,
            friendId: createdUsers[i].id,
            status: "ACCEPTED",
          },
        });

        // Create friendship with second user
        if (i > 2) {
          await prisma.friendship.upsert({
            where: {
              userId_friendId: {
                userId: user2.id,
                friendId: createdUsers[i].id,
              },
            },
            update: { status: "ACCEPTED" },
            create: {
              userId: user2.id,
              friendId: createdUsers[i].id,
              status: "ACCEPTED",
            },
          });
        }

        console.log(
          `✓ Created friendship between ${baseUser.name} and ${createdUsers[i].name}`
        );
      } catch (error) {
        console.error("Error creating friendship:", error);
      }
    }
  }

  // Create sample posts
  if (createdUsers.length > 0) {
    console.log("\n📝 Creating sample posts...");
    try {
      await prisma.post.create({
        data: {
          userId: createdUsers[0].id,
          content:
            "Just completed an amazing 15km route through the city! The new route-planning features are incredible. 🗺️",
          feature: "AWE",
          visibility: "PUBLIC",
          joyScore: 8,
          creativityScore: 7,
        },
      });

      await prisma.post.create({
        data: {
          userId: createdUsers[1].id,
          content:
            "Discovered an amazing café while exploring. The photos feature makes it so easy to document my favorite places! 📸",
          feature: "JOY",
          visibility: "PUBLIC",
          joyScore: 9,
          connectionScore: 6,
        },
      });

      console.log(`✓ Created 2 sample posts`);
    } catch (error) {
      console.error("Error creating posts:", error);
    }
  }

  console.log("\n✅ Seeding complete! All test data ready for development.");
  console.log("\n📋 Demo Users (all with '@example.com'):");
  console.log("   jasmine / Jasmine@1234");
  console.log("   alex / Alex@1234");
  console.log("   jordan / Jordan@1234");
  console.log("   jacob / Jacob@1234");
  console.log("   carmen / Carmen@1234");
  console.log("   toriano / Toriano@1234");
  console.log("   jesse / Jesse@1234");
  console.log("   vanessa / Vanessa@1234");
  console.log("   anthony / Anthony@1234");
  console.log("   ms / Ms@1234");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

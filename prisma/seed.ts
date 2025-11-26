
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Create a dummy user to own the brands
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      password: 'password123', // In a real app, this should be hashed
    },
  });

  // Brand 1: NORDIC (Minimalist, High-end)
  const nordic = await prisma.brand.create({
    data: {
      name: 'NORDIC',
      slug: 'nordic',
      description: 'Minimalist fashion for the modern soul. Sustainable, ethical, and timeless.',
      logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=400&h=400&fit=crop', // Placeholder logo
      bannerUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&h=600&fit=crop',
      websiteUrl: 'https://nordic-demo.com',
      ownerId: user.id,
      products: {
        create: [
          {
            name: 'Essential White Tee',
            description: '100% Organic Cotton. The perfect fit.',
            price: 45.00,
            externalUrl: 'https://example.com/buy/white-tee',
            images: JSON.stringify(['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800']),
            slug: 'essential-white-tee-' + Date.now(),
          },
          {
            name: 'Charcoal Wool Coat',
            description: 'Hand-stitched wool coat for winter elegance.',
            price: 350.00,
            externalUrl: 'https://example.com/buy/wool-coat',
            images: JSON.stringify(['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800']),
            slug: 'charcoal-wool-coat-' + Date.now(),
          },
          {
            name: 'Minimalist Leather Sneaker',
            description: 'Handcrafted leather sneakers in pure white.',
            price: 180.00,
            externalUrl: 'https://example.com/buy/leather-sneaker',
            images: JSON.stringify(['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800']),
            slug: 'minimalist-leather-sneaker-' + Date.now(),
          },
        ],
      },
    },
  });

  // Brand 2: STREET (Urban, Bold)
  const street = await prisma.brand.create({
    data: {
      name: 'STREET',
      slug: 'street',
      description: 'Urban streetwear for the bold. Express yourself without limits.',
      logoUrl: 'https://images.unsplash.com/photo-1516876437184-593fda40c7ce?w=400&h=400&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1520483602335-3b2886923368?w=1200&h=600&fit=crop',
      websiteUrl: 'https://street-demo.com',
      ownerId: user.id,
      products: {
        create: [
          {
            name: 'Oversized Hoodie',
            description: 'Heavyweight cotton hoodie with drop shoulders.',
            price: 85.00,
            externalUrl: 'https://example.com/buy/hoodie',
            images: JSON.stringify(['https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800']),
            slug: 'oversized-hoodie-' + Date.now(),
          },
          {
            name: 'Cargo Joggers',
            description: 'Functional cargo pants with multiple pockets.',
            price: 95.00,
            externalUrl: 'https://example.com/buy/cargo-joggers',
            images: JSON.stringify(['https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800']),
            slug: 'cargo-joggers-' + Date.now(),
          },
        ],
      },
    },
  });

  // Brand 3: VOGUE (Chic, Trendy)
  const vogue = await prisma.brand.create({
    data: {
      name: 'VOGUE',
      slug: 'vogue',
      description: 'Trendsetting fashion for the avant-garde.',
      logoUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=400&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=600&fit=crop',
      websiteUrl: 'https://vogue-demo.com',
      ownerId: user.id,
      products: {
        create: [
          {
            name: 'Silk Evening Dress',
            description: 'Elegant silk dress for special occasions.',
            price: 420.00,
            externalUrl: 'https://example.com/buy/silk-dress',
            images: JSON.stringify(['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800']),
            slug: 'silk-evening-dress-' + Date.now(),
          },
        ],
      },
    },
  });

  // Add Competitors (Self-relation)
  // Nordic considers Street a competitor
  await prisma.brand.update({
    where: { id: nordic.id },
    data: {
      competitors: {
        connect: [{ id: street.id }],
      },
    },
  });

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

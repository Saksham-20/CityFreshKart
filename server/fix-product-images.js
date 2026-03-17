const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixProductImages() {
  console.log('🔧 Fixing product images...');

  try {
    const result = await prisma.product.updateMany({
      where: {
        image: { contains: 'via.placeholder.com' }
      },
      data: {
        image: '/uploads/products/default.svg'
      }
    });

    console.log(`✅ Updated ${result.count} products with local image paths`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixProductImages();

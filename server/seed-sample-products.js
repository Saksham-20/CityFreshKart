const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedProducts() {
  console.log('🌱 Seeding products...');

  try {
    // First, create categories if they don't exist
    const categories = [
      { name: 'Vegetables', slug: 'vegetables', description: 'Fresh vegetables' },
      { name: 'Fruits', slug: 'fruits', description: 'Fresh fruits' },
      { name: 'Herbs', slug: 'herbs', description: 'Fresh herbs and spices' },
    ];

    const categoryIds = {};
    for (const cat of categories) {
      const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
      if (!existing) {
        const created = await prisma.category.create({
          data: { name: cat.name, slug: cat.slug, description: cat.description }
        });
        categoryIds[cat.slug] = created.id;
        console.log(`✅ Created category: ${cat.name}`);
      } else {
        categoryIds[cat.slug] = existing.id;
      }
    }

    // Sample products
    const products = [
      { name: 'Tomato', slug: 'tomato', description: 'Fresh red tomatoes', pricePerKg: 50, discount: 10, category_slug: 'vegetables' },
      { name: 'Onion', slug: 'onion', description: 'Fresh yellow onions', pricePerKg: 40, discount: 5, category_slug: 'vegetables' },
      { name: 'Potato', slug: 'potato', description: 'Fresh potatoes', pricePerKg: 35, discount: 8, category_slug: 'vegetables' },
      { name: 'Carrot', slug: 'carrot', description: 'Orange organic carrots', pricePerKg: 45, discount: 10, category_slug: 'vegetables' },
      { name: 'Apple', slug: 'apple', description: 'Fresh red apples', pricePerKg: 80, discount: 15, category_slug: 'fruits' },
      { name: 'Banana', slug: 'banana', description: 'Sweet bananas', pricePerKg: 50, discount: 10, category_slug: 'fruits' },
      { name: 'Orange', slug: 'orange', description: 'Fresh oranges', pricePerKg: 60, discount: 12, category_slug: 'fruits' },
      { name: 'Mint', slug: 'mint', description: 'Fresh mint leaves', pricePerKg: 100, discount: 0, category_slug: 'herbs' },
    ];

    for (const product of products) {
      const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
      if (!existing) {
        await prisma.product.create({
          data: {
            name: product.name,
            slug: product.slug,
            description: product.description,
            pricePerKg: product.pricePerKg,
            discount: product.discount,
            categoryId: categoryIds[product.category_slug],
            isActive: true,
            isFeatured: true,
            stockQuantity: 100,
            image: `/uploads/products/default.svg` // Local image path
          }
        });
        console.log(`✅ Created product: ${product.name}`);
      }
    }

    console.log('✅ Product seeding complete!');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedProducts();

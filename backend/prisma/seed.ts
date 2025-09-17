import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple seed function - can be enhanced later
async function main() {
  console.log('Seeding database...');
  
  // Create default categories if they don't exist
  const categories = await prisma.category.findMany();
  if (categories.length === 0) {
    await prisma.category.createMany({
      data: [
        { name: 'General Knowledge' },
        { name: 'Science' },
        { name: 'Technology' },
        { name: 'History' },
        { name: 'Sports' }
      ]
    });
    console.log('Created default categories');
  }
  
  console.log('Seeding completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DB PROFILES ---');
  const profiles = await prisma.profile.findMany();
  console.log(JSON.stringify(profiles, null, 2));

  console.log('--- DB CUSTOMERS ---');
  const customers = await prisma.customer.findMany();
  console.log(JSON.stringify(customers, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

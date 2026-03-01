import { prisma } from './src/db';

async function main() {
  console.log('Seeding initial accounts...');

  const accounts = [
    // Debit / Savings / Cash
    {
      name: 'Nu Débito',
      type: 'DEBIT',
      currency: 'MXN',
      balance: 0,
    },
    {
      name: 'Nu Cajita',
      type: 'SAVINGS',
      currency: 'MXN',
      balance: 0,
    },
    {
      name: 'BBVA Débito',
      type: 'DEBIT',
      currency: 'MXN',
      balance: 0,
    },
    {
      name: 'Efectivo',
      type: 'CASH',
      currency: 'MXN',
      balance: 0,
    },
    // Credit Cards
    {
      name: 'BBVA Crédito',
      type: 'CREDIT',
      currency: 'MXN',
      balance: 0,
      creditLimit: 7700,
    },
    {
      name: 'Nu Crédito',
      type: 'CREDIT',
      currency: 'MXN',
      balance: 0,
      creditLimit: 30000,
    },
    {
      name: 'HSBC Viva',
      type: 'CREDIT',
      currency: 'MXN',
      balance: 0,
      creditLimit: 15000,
    },
    {
      name: 'HSBC Zero',
      type: 'CREDIT',
      currency: 'MXN',
      balance: 0,
      creditLimit: 4500,
    },
  ];

  for (const acc of accounts) {
    const existing = await prisma.financialAccount.findFirst({
      where: { name: acc.name },
    });

    if (!existing) {
      console.log(`Creating account: ${acc.name}`);
      await prisma.financialAccount.create({
        data: acc,
      });
    } else {
      console.log(`Account already exists: ${acc.name}`);
    }
  }

  // Create 'mastra' schema if it doesn't exist
  console.log("Ensuring 'mastra' schema exists...");
  await prisma.$executeRawUnsafe("CREATE SCHEMA IF NOT EXISTS mastra;");

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

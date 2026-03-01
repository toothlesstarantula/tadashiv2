import { prisma } from './src/db';

async function main() {
  const accounts = await prisma.financialAccount.findMany();
  console.log('Accounts:', accounts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

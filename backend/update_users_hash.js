const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('mudar123', 10);
  
  await prisma.usuario.updateMany({
    data: {
      senha: hash
    }
  });

  console.log('All users updated to password "mudar123". Hash:', hash);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');

const rawUrl = process.env.DATABASE_URL || 'file:./dev.db';
const dbUrl = rawUrl.includes('?')
  ? rawUrl
  : `${rawUrl}?socket_timeout=60&connection_limit=1`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

async function initPragma() {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 60000;');
  } catch (err) {
    console.error('[Prisma] Aviso ao configurar PRAGMAs do SQLite:', err.message);
  }
}

initPragma();

module.exports = prisma;

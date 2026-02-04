import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Agregar columna preferences si no existe
    await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "preferences" TEXT`;
    console.log('✅ Columna preferences agregada');
  } catch (error: any) {
    if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
      console.log('ℹ️  Columna preferences ya existe');
    } else {
      console.error('❌ Error:', error.message || error);
      throw error;
    }
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });









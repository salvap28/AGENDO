import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'salvaperrotta05@gmail.com';
  
  try {
    // Verificar si la columna existe, si no, agregarla
    try {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "isDev" BOOLEAN DEFAULT 0`;
      console.log('✅ Columna isDev agregada');
    } catch (error: any) {
      if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
        console.log('ℹ️  Columna isDev ya existe');
      } else {
        throw error;
      }
    }

    // Actualizar usuario
    const user = await prisma.user.update({
      where: { email },
      data: { isDev: true },
    });

    console.log(`✅ Usuario ${email} marcado como dev`);
    console.log(`ID: ${user.id}`);
    console.log(`Nombre: ${user.name || 'Sin nombre'}`);
    console.log(`isDev: ${user.isDev}`);
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.error(`❌ Usuario con email ${email} no encontrado`);
    } else {
      console.error('❌ Error:', error.message || error);
    }
    process.exit(1);
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

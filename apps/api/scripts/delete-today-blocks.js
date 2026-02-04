import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTodayBlocks() {
  try {
    // Obtener la fecha de hoy en formato YYYY-MM-DD
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    console.log(`Eliminando todos los bloques de la fecha: ${todayStr}`);
    
    // Obtener el email del usuario desde la variable de entorno
    const userEmail = process.env.ADMIN_EMAIL || process.env.DEVELOPER_EMAIL;
    
    if (!userEmail) {
      console.error('Error: No se encontró ADMIN_EMAIL o DEVELOPER_EMAIL en las variables de entorno');
      console.log('Por favor, agrega tu email a .env como ADMIN_EMAIL=tu-email@ejemplo.com');
      process.exit(1);
    }
    
    // Buscar el usuario por email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true },
    });
    
    if (!user) {
      console.error(`Error: No se encontró un usuario con el email ${userEmail}`);
      process.exit(1);
    }
    
    console.log(`Usuario encontrado: ${user.email} (${user.id})`);
    
    // Contar bloques antes de eliminar
    const countBefore = await prisma.block.count({
      where: {
        userId: user.id,
        date: todayStr,
      },
    });
    
    console.log(`Bloques encontrados para hoy: ${countBefore}`);
    
    if (countBefore === 0) {
      console.log('No hay bloques para eliminar.');
      await prisma.$disconnect();
      return;
    }
    
    // Eliminar todos los bloques de hoy
    const result = await prisma.block.deleteMany({
      where: {
        userId: user.id,
        date: todayStr,
      },
    });
    
    console.log(`✓ Eliminados ${result.count} bloque(s) de hoy`);
    
  } catch (error) {
    console.error('Error eliminando bloques:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTodayBlocks();












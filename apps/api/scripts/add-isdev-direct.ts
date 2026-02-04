import { PrismaClient } from '@prisma/client';
import * as sqlite3 from 'sqlite3';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const dbPath = path.join(__dirname, '../prisma/dev.db');
  
  if (!fs.existsSync(dbPath)) {
    console.error('❌ Base de datos no encontrada en:', dbPath);
    process.exit(1);
  }

  const db = new sqlite3.Database(dbPath);
  const run = promisify(db.run.bind(db));
  const get = promisify(db.get.bind(db));

  try {
    // Verificar si la columna isDev existe
    const tableInfo: any = await get(`PRAGMA table_info(User)`);
    const columns = await new Promise<any[]>((resolve, reject) => {
      db.all(`PRAGMA table_info(User)`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as any[]);
      });
    });

    const hasIsDev = columns.some((col: any) => col.name === 'isDev');

    if (!hasIsDev) {
      console.log('📝 Agregando columna isDev...');
      await run(`ALTER TABLE "User" ADD COLUMN "isDev" BOOLEAN DEFAULT 0`);
      console.log('✅ Columna isDev agregada');
    } else {
      console.log('ℹ️  Columna isDev ya existe');
    }

    // Verificar si la tabla PushSubscription existe
    const tableExists = await new Promise<boolean>((resolve, reject) => {
      db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='PushSubscription'`,
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });

    if (!tableExists) {
      console.log('📝 Creando tabla PushSubscription...');
      await run(`
        CREATE TABLE "PushSubscription" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "endpoint" TEXT NOT NULL UNIQUE,
          "p256dh" TEXT NOT NULL,
          "auth" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      await run(`CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId")`);
      console.log('✅ Tabla PushSubscription creada');
    } else {
      console.log('ℹ️  Tabla PushSubscription ya existe');
    }

    // Marcar usuario como dev
    console.log('📝 Marcando usuario como dev...');
    const email = 'salvaperrotta05@gmail.com';
    await run(`UPDATE "User" SET "isDev" = 1 WHERE "email" = ?`, [email]);
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, isDev: true },
    });

    if (user) {
      console.log('✅ Usuario marcado como dev:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Nombre: ${user.name || 'Sin nombre'}`);
      console.log(`   isDev: ${user.isDev}`);
    } else {
      console.log('⚠️  Usuario no encontrado:', email);
    }

    db.close();
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();









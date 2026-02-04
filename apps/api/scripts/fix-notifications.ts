import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNotifications() {
  try {
    console.log('Fixing invalid notifications in Block table...');
    const blocks = await prisma.$queryRaw<Array<{ id: string; notifications: any }>>`
      SELECT id, notifications FROM "Block"
    `;
    
    let fixed = 0;
    for (const block of blocks) {
      let shouldFix = false;
      let newValue: any = null;
      
      if (block.notifications === null || block.notifications === undefined) {
        shouldFix = true;
        newValue = null;
      } else if (typeof block.notifications === 'string') {
        if (block.notifications.trim() === '' || block.notifications.trim() === '[]') {
          shouldFix = true;
          newValue = null;
        } else {
          try {
            JSON.parse(block.notifications);
          } catch (e) {
            shouldFix = true;
            newValue = null;
          }
        }
      }
      
      if (shouldFix) {
        await prisma.$executeRaw`
          UPDATE "Block" SET notifications = ${newValue === null ? Prisma.sql`NULL` : Prisma.sql`${JSON.stringify(newValue)}`} WHERE id = ${block.id}
        `;
        fixed++;
      }
    }
    
    console.log(`Fixed ${fixed} blocks`);
    
    console.log('Fixing invalid notifications in Task table...');
    const tasks = await prisma.$queryRaw<Array<{ id: string; notifications: any }>>`
      SELECT id, notifications FROM "Task"
    `;
    
    fixed = 0;
    for (const task of tasks) {
      let shouldFix = false;
      let newValue: any = null;
      
      if (task.notifications === null || task.notifications === undefined) {
        shouldFix = true;
        newValue = null;
      } else if (typeof task.notifications === 'string') {
        if (task.notifications.trim() === '' || task.notifications.trim() === '[]') {
          shouldFix = true;
          newValue = null;
        } else {
          try {
            JSON.parse(task.notifications);
          } catch (e) {
            shouldFix = true;
            newValue = null;
          }
        }
      }
      
      if (shouldFix) {
        await prisma.$executeRaw`
          UPDATE "Task" SET notifications = ${newValue === null ? Prisma.sql`NULL` : Prisma.sql`${JSON.stringify(newValue)}`} WHERE id = ${task.id}
        `;
        fixed++;
      }
    }
    
    console.log(`Fixed ${fixed} tasks`);
    console.log('Done!');
  } catch (error) {
    console.error('Error fixing notifications:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixNotifications();


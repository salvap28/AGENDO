const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../prisma/dev.db');

if (!fs.existsSync(dbPath)) {
  console.error('Database not found at:', dbPath);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

function fixTable(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT id, notifications FROM "${tableName}"`, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      let fixed = 0;
      let processed = 0;
      
      if (rows.length === 0) {
        console.log(`No rows to fix in ${tableName}`);
        resolve(0);
        return;
      }
      
      rows.forEach((row) => {
        let shouldFix = false;
        let newValue = null;
        
        if (row.notifications === null || row.notifications === undefined) {
          // NULL is fine, skip
          processed++;
          if (processed === rows.length) {
            console.log(`Fixed ${fixed} rows in ${tableName}`);
            resolve(fixed);
          }
          return;
        }
        
        if (typeof row.notifications === 'string') {
          const trimmed = row.notifications.trim();
          if (trimmed === '' || trimmed === '[]') {
            shouldFix = true;
            newValue = null;
          } else {
            try {
              JSON.parse(trimmed);
              // Valid JSON, skip
            } catch (e) {
              shouldFix = true;
              newValue = null;
            }
          }
        }
        
        if (shouldFix) {
          db.run(
            `UPDATE "${tableName}" SET notifications = ? WHERE id = ?`,
            [newValue, row.id],
            (err) => {
              if (err) {
                console.error(`Error updating ${tableName} row ${row.id}:`, err);
              } else {
                fixed++;
              }
              processed++;
              if (processed === rows.length) {
                console.log(`Fixed ${fixed} rows in ${tableName}`);
                resolve(fixed);
              }
            }
          );
        } else {
          processed++;
          if (processed === rows.length) {
            console.log(`Fixed ${fixed} rows in ${tableName}`);
            resolve(fixed);
          }
        }
      });
    });
  });
}

async function main() {
  try {
    console.log('Fixing invalid notifications in Block table...');
    const blocksFixed = await fixTable('Block');
    
    console.log('Fixing invalid notifications in Task table...');
    const tasksFixed = await fixTable('Task');
    
    console.log(`\nDone! Fixed ${blocksFixed} blocks and ${tasksFixed} tasks`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
      process.exit(0);
    });
  }
}

main();












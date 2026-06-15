import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, '../../drizzle/0007_lyrical_the_phantom.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error(`Migration file not found at ${sqlPath}`);
      process.exit(1);
    }
    
    const content = fs.readFileSync(sqlPath, 'utf8');
    const statements = content.split('--> statement-breakpoint');
    
    console.log(`Found ${statements.length} migration statements to execute...`);
    
    const ignoreCodes = ['42701', '42P07', '42710', '42723'];
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      
      console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
      console.log(stmt.substring(0, 120) + (stmt.length > 120 ? '...' : ''));
      
      try {
        await db.execute(sql.raw(stmt));
        console.log('✓ Success');
      } catch (err: any) {
        if (err && err.code && ignoreCodes.includes(err.code)) {
          console.log(`⚠ Skipped: ${err.message || 'object already exists'} (code: ${err.code})`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('\nCRM Migration successfully applied to the database!');
    process.exit(0);
  } catch (err) {
    console.error('\nError applying CRM migration:', err);
    process.exit(1);
  }
}

runMigration();

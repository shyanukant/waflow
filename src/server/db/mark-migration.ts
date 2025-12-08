import { db, connection } from './index.js';
import { sql } from 'drizzle-orm';

async function markMigrationApplied() {
    console.log('Marking migration as already applied...\n');

    try {
        // Insert the migration record so drizzle knows it already ran
        await db.execute(sql`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at) 
            VALUES ('0000_rich_wendell_rand', ${Date.now()})
            ON CONFLICT DO NOTHING
        `);
        console.log('✅ Migration marked as applied\n');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

markMigrationApplied();

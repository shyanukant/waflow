import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, connection } from './index.js';
import { setupDatabase } from './setup-database.js';

async function runMigrations() {
    console.log('Running migrations...\n');

    try {
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('✅ Migrations completed\n');

        // Setup triggers + RLS automatically
        await setupDatabase();

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

runMigrations();

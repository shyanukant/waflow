import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

// Connection for migrations and queries
export const connection = postgres(process.env.DATABASE_URL);
export const client = connection; // Alias for backwards compatibility
export const db = drizzle(connection, { schema });

// Re-export schema for convenience
export * from './schema.js';

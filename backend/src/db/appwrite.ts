import { Client, Databases, Users, Query, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY', 'APPWRITE_DATABASE_ID'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`${envVar} is not set in environment variables`);
    }
}

// Initialize Appwrite client with API key (server-side)
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

// Initialize services
export const databases = new Databases(client);
export const users = new Users(client);

// Database ID
export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;

// Collection IDs
export const COLLECTIONS = {
    USERS: 'users',
    WHATSAPP_SESSIONS: 'whatsapp_sessions',
    KNOWLEDGE_ITEMS: 'knowledge_items',
    AGENTS: 'agents',
    CONVERSATIONS: 'conversations',
    LEADS: 'leads',
} as const;

// Re-export utilities
export { Query, ID };
export { client };

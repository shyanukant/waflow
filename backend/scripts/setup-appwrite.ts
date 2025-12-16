/**
 * Appwrite Database Setup Script
 * 
 * Run this script ONCE to create all required collections in your Appwrite database.
 * 
 * Usage:
 *   npx tsx scripts/setup-appwrite.ts
 * 
 * Make sure your .env file has:
 *   - APPWRITE_ENDPOINT
 *   - APPWRITE_PROJECT_ID
 *   - APPWRITE_API_KEY
 *   - APPWRITE_DATABASE_ID
 */

import { Client, Databases, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';

// Collection definitions
const collections = [
    {
        id: 'users',
        name: 'Users',
        attributes: [
            { type: 'string', key: 'email', size: 255, required: true },
            { type: 'string', key: 'fullName', size: 255, required: false },
            { type: 'datetime', key: 'trialStartedAt', required: false },
            { type: 'string', key: 'connectionMode', size: 50, required: false, default: 'trial' },
            { type: 'string', key: 'whatsappProvider', size: 100, required: false },
            { type: 'string', key: 'whatsappApiKey', size: 500, required: false },
            { type: 'string', key: 'whatsappPhoneNumberId', size: 100, required: false },
            { type: 'string', key: 'googleCalendarToken', size: 5000, required: false },
        ],
        indexes: [
            { key: 'email_idx', type: 'unique', attributes: ['email'] }
        ]
    },
    {
        id: 'whatsapp_sessions',
        name: 'WhatsApp Sessions',
        attributes: [
            { type: 'string', key: 'sessionId', size: 255, required: true },
            { type: 'string', key: 'userId', size: 255, required: true },
            { type: 'string', key: 'status', size: 50, required: false, default: 'initializing' },
            { type: 'string', key: 'metadata', size: 10000, required: false },
        ],
        indexes: [
            { key: 'sessionId_idx', type: 'unique', attributes: ['sessionId'] },
            { key: 'userId_idx', type: 'key', attributes: ['userId'] }
        ]
    },
    {
        id: 'knowledge_items',
        name: 'Knowledge Items',
        attributes: [
            { type: 'string', key: 'userId', size: 255, required: true },
            { type: 'string', key: 'sourceType', size: 50, required: true },
            { type: 'string', key: 'metadata', size: 10000, required: false },
            { type: 'string', key: 'textPreview', size: 1000, required: false },
            { type: 'integer', key: 'chunkCount', required: false, default: 0 },
        ],
        indexes: [
            { key: 'userId_idx', type: 'key', attributes: ['userId'] }
        ]
    },
    {
        id: 'agents',
        name: 'Agents',
        attributes: [
            { type: 'string', key: 'userId', size: 255, required: true },
            { type: 'string', key: 'name', size: 255, required: true },
            { type: 'string', key: 'systemPrompt', size: 10000, required: false },
            { type: 'string', key: 'knowledgeBaseIds', size: 5000, required: false }, // JSON array as string
            { type: 'string', key: 'whatsappSessionId', size: 255, required: false },
            { type: 'boolean', key: 'isActive', required: false, default: false },
        ],
        indexes: [
            { key: 'userId_idx', type: 'key', attributes: ['userId'] },
            { key: 'isActive_idx', type: 'key', attributes: ['isActive'] }
        ]
    },
    {
        id: 'conversations',
        name: 'Conversations',
        attributes: [
            { type: 'string', key: 'userId', size: 255, required: true },
            { type: 'string', key: 'agentId', size: 255, required: true },
            { type: 'string', key: 'senderNumber', size: 50, required: true },
            { type: 'string', key: 'userMessage', size: 5000, required: true },
            { type: 'string', key: 'agentResponse', size: 5000, required: false },
        ],
        indexes: [
            { key: 'userId_idx', type: 'key', attributes: ['userId'] },
            { key: 'agentId_idx', type: 'key', attributes: ['agentId'] }
        ]
    },
    {
        id: 'leads',
        name: 'Leads',
        attributes: [
            { type: 'string', key: 'userId', size: 255, required: true },
            { type: 'string', key: 'agentId', size: 255, required: false },
            { type: 'string', key: 'phoneNumber', size: 50, required: true },
            { type: 'string', key: 'name', size: 255, required: false },
            { type: 'string', key: 'email', size: 255, required: false },
            { type: 'string', key: 'interest', size: 2000, required: false },
            { type: 'string', key: 'source', size: 50, required: false, default: 'whatsapp' },
            { type: 'string', key: 'status', size: 50, required: false, default: 'new' },
            { type: 'string', key: 'notes', size: 5000, required: false },
        ],
        indexes: [
            { key: 'userId_idx', type: 'key', attributes: ['userId'] },
            { key: 'phoneNumber_idx', type: 'key', attributes: ['phoneNumber'] }
        ]
    }
];

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createCollection(collection: typeof collections[0]) {
    console.log(`\n📁 Processing collection: ${collection.name} (${collection.id})`);

    try {
        // Check if collection exists
        let collectionExists = false;
        try {
            await databases.getCollection(DATABASE_ID, collection.id);
            console.log(`   ℹ️ Collection already exists, will check for missing attributes`);
            collectionExists = true;
        } catch (e: any) {
            if (e.code !== 404) throw e;
            // Collection doesn't exist, create it
        }

        if (!collectionExists) {
            // Create collection
            await databases.createCollection(
                DATABASE_ID,
                collection.id,
                collection.name,
                [
                    // Permissions handled by API key
                ]
            );
            console.log(`   ✅ Collection created`);
        }

        // Create attributes
        for (const attr of collection.attributes) {
            console.log(`   📝 Creating attribute: ${attr.key}`);

            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        collection.id,
                        attr.key,
                        attr.size || 255,
                        attr.required || false,
                        typeof attr.default === 'string' ? attr.default : undefined
                    );
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(
                        DATABASE_ID,
                        collection.id,
                        attr.key,
                        attr.required || false,
                        undefined, // min
                        undefined, // max
                        typeof attr.default === 'number' ? attr.default : undefined
                    );
                } else if (attr.type === 'boolean') {
                    await databases.createBooleanAttribute(
                        DATABASE_ID,
                        collection.id,
                        attr.key,
                        attr.required || false,
                        typeof attr.default === 'boolean' ? attr.default : undefined
                    );
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(
                        DATABASE_ID,
                        collection.id,
                        attr.key,
                        attr.required || false
                    );
                }

                // Wait for attribute to be created (Appwrite processes async)
                await sleep(1000);
            } catch (e: any) {
                if (e.code === 409) {
                    console.log(`      ⚠️ Attribute already exists`);
                } else {
                    console.error(`      ❌ Error creating attribute: ${e.message}`);
                }
            }
        }

        // Wait for all attributes to be ready before creating indexes
        console.log(`   ⏳ Waiting for attributes to be ready...`);
        await sleep(3000);

        // Create indexes
        if (collection.indexes) {
            for (const idx of collection.indexes) {
                console.log(`   🔍 Creating index: ${idx.key}`);
                try {
                    await databases.createIndex(
                        DATABASE_ID,
                        collection.id,
                        idx.key,
                        idx.type as any,
                        idx.attributes
                    );
                    await sleep(500);
                } catch (e: any) {
                    if (e.code === 409) {
                        console.log(`      ⚠️ Index already exists`);
                    } else {
                        console.error(`      ❌ Error creating index: ${e.message}`);
                    }
                }
            }
        }

    } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
    }
}

async function main() {
    console.log('🚀 Appwrite Database Setup');
    console.log('==========================\n');

    // Validate environment
    if (!process.env.APPWRITE_ENDPOINT) {
        console.error('❌ APPWRITE_ENDPOINT not set');
        process.exit(1);
    }
    if (!process.env.APPWRITE_PROJECT_ID) {
        console.error('❌ APPWRITE_PROJECT_ID not set');
        process.exit(1);
    }
    if (!process.env.APPWRITE_API_KEY) {
        console.error('❌ APPWRITE_API_KEY not set');
        process.exit(1);
    }
    if (!process.env.APPWRITE_DATABASE_ID) {
        console.error('❌ APPWRITE_DATABASE_ID not set');
        process.exit(1);
    }

    console.log(`📍 Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
    console.log(`🆔 Project: ${process.env.APPWRITE_PROJECT_ID}`);
    console.log(`💾 Database: ${DATABASE_ID}`);

    // Check if database exists
    try {
        await databases.get(DATABASE_ID);
        console.log(`\n✅ Database found`);
    } catch (e: any) {
        if (e.code === 404) {
            console.log(`\n📦 Creating database...`);
            await databases.create(DATABASE_ID, 'WAFlow Database');
            console.log(`✅ Database created`);
        } else {
            console.error(`❌ Database error: ${e.message}`);
            process.exit(1);
        }
    }

    // Create collections
    for (const collection of collections) {
        await createCollection(collection);
    }

    console.log('\n\n✅ Setup complete!');
    console.log('You can now run the backend with: npm run dev');
}

main().catch(console.error);

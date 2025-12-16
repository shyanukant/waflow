import { Request, Response, NextFunction } from 'express';
import { Client, Account } from 'node-appwrite';
import { databases, DATABASE_ID, COLLECTIONS } from '../db/index.js';
import type { UserDocument } from '../db/collections.js';
import * as dotenv from 'dotenv';

dotenv.config();

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email?: string;
    };
}

/**
 * Create a client with user's JWT for verification
 */
const createUserClient = (jwt: string) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT!)
        .setProject(process.env.APPWRITE_PROJECT_ID!)
        .setJWT(jwt);

    return new Account(client);
};

// Simple delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Authentication middleware for Express routes
 * Verifies Appwrite JWT tokens
 */
export const authenticateUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.substring(7);

        // Create account instance with user's JWT and verify by getting user
        const account = createUserClient(token);
        const user = await account.get();

        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Ensure user exists in our database
        await getOrCreateUser(user.$id, user.email);

        // Attach user to request object
        req.user = {
            id: user.$id,
            email: user.email
        };

        next();
    } catch (error: any) {
        // Handle specific Appwrite errors - log only message, not full stack
        if (error.code === 401 || error.type === 'user_jwt_invalid' || error.type === 'general_unauthorized_scope') {
            console.log('Auth: Invalid/expired token');
            return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
        }

        console.error('Authentication error:', error.message);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

/**
 * Try to get document with retry (handles eventual consistency)
 */
const getDocumentWithRetry = async (userId: string, retries = 3, delayMs = 200): Promise<UserDocument | null> => {
    for (let i = 0; i < retries; i++) {
        try {
            const doc = await databases.getDocument(
                DATABASE_ID,
                COLLECTIONS.USERS,
                userId
            );
            return doc as unknown as UserDocument;
        } catch (error: any) {
            if (error.code === 404 && i < retries - 1) {
                // Document not found, wait and retry (eventual consistency)
                await delay(delayMs);
                continue;
            }
            throw error;
        }
    }
    return null;
};

/**
 * Get or create user in our database
 * Uses defensive approach with retry for eventual consistency
 */
export const getOrCreateUser = async (userId: string, email?: string): Promise<UserDocument> => {
    // Step 1: Try to get existing user
    try {
        const existingUser = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.USERS,
            userId
        );
        return existingUser as unknown as UserDocument;
    } catch (getError: any) {
        if (getError.code !== 404) {
            throw getError;
        }
        // User doesn't exist, continue to create
    }

    // Step 2: Try to create user
    try {
        const newUser = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.USERS,
            userId,
            {
                email: email || '',
                connectionMode: 'trial',
            }
        );
        console.log(`✅ Created user document: ${userId}`);
        return newUser as unknown as UserDocument;
    } catch (createError: any) {
        // Step 3: If create failed (maybe race condition), retry fetch with delay
        if (createError.code === 409) {
            console.log(`⏳ Document exists, retrying fetch for: ${userId}`);

            // Wait a bit for eventual consistency, then retry
            const existingUser = await getDocumentWithRetry(userId, 3, 300);
            if (existingUser) {
                console.log(`✅ Found user on retry: ${userId}`);
                return existingUser;
            }
        }

        console.error(`❌ Could not create or find user ${userId}:`, createError.message);
        throw createError;
    }
};

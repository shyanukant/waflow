import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db, users } from '../db/index.js';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Client for auth operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email?: string;
    };
}

/**
 * Authentication middleware for Express routes
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

        // Verify the JWT token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Ensure user exists in our database
        await getOrCreateUser(user.id);

        // Attach user to request object
        req.user = {
            id: user.id,
            email: user.email
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

/**
 * Get or create user in our database
 */
export const getOrCreateUser = async (userId: string) => {
    try {
        // Check if user exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (existingUser) {
            return existingUser;
        }

        // Create new user
        const [newUser] = await db.insert(users)
            .values({ id: userId })
            .returning();

        return newUser;
    } catch (error) {
        console.error('Error getting/creating user:', error);
        throw error;
    }
};

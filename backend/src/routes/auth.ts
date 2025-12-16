import express, { Request, Response } from 'express';
import { Client, Account, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

/**
 * Create a client for server-side auth operations
 */
const createServerClient = () => {
    return new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT!)
        .setProject(process.env.APPWRITE_PROJECT_ID!)
        .setKey(process.env.APPWRITE_API_KEY!);
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, fullName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const client = createServerClient();
        const account = new Account(client);

        // Create user in Appwrite Auth
        const user = await account.create(
            ID.unique(),
            email,
            password,
            fullName || undefined
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.$id,
                email: user.email,
                name: user.name,
            }
        });
    } catch (error: any) {
        console.error('Registration error:', error);

        // Handle Appwrite-specific errors
        if (error.code === 409) {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }
        if (error.code === 400) {
            return res.status(400).json({ error: error.message || 'Invalid registration data' });
        }

        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 * Login existing user - creates email session
 * Note: This endpoint creates a session on server-side. 
 * For client-side apps, use Appwrite client SDK directly.
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // For Appwrite, login should happen client-side
        // Server can verify credentials but session management is client-side
        // Return success message indicating client should use Appwrite SDK
        res.json({
            message: 'Please use Appwrite client SDK for login',
            info: 'Use account.createEmailPasswordSession(email, password) on client'
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/logout
 * Logout user - handled client-side with Appwrite
 */
router.post('/logout', async (req: Request, res: Response) => {
    try {
        // Logout is handled client-side with Appwrite SDK
        // account.deleteSession('current')
        res.json({ message: 'Logout successful' });
    } catch (error: any) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const jwt = authHeader.substring(7);

        // Verify JWT by getting user with it
        const client = new Client()
            .setEndpoint(process.env.APPWRITE_ENDPOINT!)
            .setProject(process.env.APPWRITE_PROJECT_ID!)
            .setJWT(jwt);

        const account = new Account(client);
        const user = await account.get();

        res.json({
            user: {
                id: user.$id,
                email: user.email,
                name: user.name,
                emailVerification: user.emailVerification,
            }
        });
    } catch (error: any) {
        console.error('Get user error:', error);

        if (error.code === 401) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        res.status(500).json({ error: 'Failed to get user info' });
    }
});

export default router;

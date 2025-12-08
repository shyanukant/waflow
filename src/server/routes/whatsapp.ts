import express, { Request, Response } from 'express';
import { getSessionManager } from '../services/whatsapp/sessionManager.js';
import { db, whatsappSessions } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/whatsapp/connect
 * Initialize a new WhatsApp connection
 */
router.post('/connect', async (req: AuthRequest, res: Response) => {
    try {
        console.log('WhatsApp connect called, user:', req.user);

        if (!req.user || !req.user.id) {
            console.error('No user found in request');
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const userId = req.user.id;
        const sessionId = `${userId}-${Date.now()}`;

        console.log('Creating session for user:', userId);

        const sessionManager = getSessionManager();
        const result = await sessionManager.createSession(userId, sessionId);

        if (!result.success) {
            console.error('Session creation failed:', result.error);
            return res.status(400).json({ error: result.error });
        }

        // Delete any old sessions for this user before creating new one
        await db.delete(whatsappSessions).where(eq(whatsappSessions.userId, userId));

        // Store session info in database (upsert to handle duplicates)
        await db.insert(whatsappSessions)
            .values({
                sessionId,
                userId,
                status: 'initializing',
                createdAt: new Date()
            })
            .onConflictDoUpdate({
                target: whatsappSessions.sessionId,
                set: {
                    status: 'initializing',
                    updatedAt: new Date()
                }
            });

        console.log('Session created successfully:', sessionId);

        res.json({
            message: 'WhatsApp session initiated',
            sessionId
        });
    } catch (error: any) {
        console.error('Error connecting WhatsApp:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to initialize WhatsApp connection', details: error.message });
    }
});

/**
 * GET /api/whatsapp/session
 * Get current WhatsApp session for user (single session)
 */
router.get('/session', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        // Get the most recent session for this user
        const session = await db.query.whatsappSessions.findFirst({
            where: eq(whatsappSessions.userId, userId),
            orderBy: (sessions, { desc }) => [desc(sessions.createdAt)]
        });

        res.json({ session: session || null });
    } catch (error: any) {
        console.error('Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session', session: null });
    }
});

/**
 * GET /api/whatsapp/status/:sessionId
 * Get WhatsApp session status
 */
router.get('/status/:sessionId', async (req: AuthRequest, res: Response) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user!.id;

        // Verify session belongs to user
        const session = await db.query.whatsappSessions.findFirst({
            where: and(
                eq(whatsappSessions.sessionId, sessionId),
                eq(whatsappSessions.userId, userId)
            ),
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(session);
    } catch (error: any) {
        console.error('Error getting session status:', error);
        res.status(500).json({ error: 'Failed to get session status' });
    }
});

/**
 * GET /api/whatsapp/sessions
 * Get all WhatsApp sessions for user
 */
router.get('/sessions', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const sessions = await db.query.whatsappSessions.findMany({
            where: eq(whatsappSessions.userId, userId),
        });

        res.json({ sessions });
    } catch (error: any) {
        console.error('Error getting sessions:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

/**
 * POST /api/whatsapp/disconnect/:sessionId
 * Disconnect WhatsApp session
 */
router.post('/disconnect/:sessionId', async (req: AuthRequest, res: Response) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user!.id;

        // Verify session belongs to user
        const session = await db.query.whatsappSessions.findFirst({
            where: and(
                eq(whatsappSessions.sessionId, sessionId),
                eq(whatsappSessions.userId, userId)
            ),
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const sessionManager = getSessionManager();
        const result = await sessionManager.disconnectSession(sessionId);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({ message: 'WhatsApp session disconnected' });
    } catch (error: any) {
        console.error('Error disconnecting WhatsApp:', error);
        res.status(500).json({ error: 'Failed to disconnect WhatsApp session' });
    }
});

/**
 * POST /api/whatsapp/send
 * Send a message via WhatsApp
 */
router.post('/send', async (req: AuthRequest, res: Response) => {
    try {
        const { sessionId, phoneNumber, message } = req.body;
        const userId = req.user!.id;

        if (!sessionId || !phoneNumber || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify session belongs to user
        const session = await db.query.whatsappSessions.findFirst({
            where: and(
                eq(whatsappSessions.sessionId, sessionId),
                eq(whatsappSessions.userId, userId)
            ),
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const sessionManager = getSessionManager();
        const result = await sessionManager.sendMessage(sessionId, phoneNumber, message);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({ message: 'Message sent successfully' });
    } catch (error: any) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;

import express, { Response } from 'express';
import { getSessionManager } from '../services/whatsapp/sessionManager.js';
import { databases, DATABASE_ID, COLLECTIONS, Query, ID } from '../db/index.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { WhatsappSessionDocument } from '../db/collections.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { canUseWhatsApp, startTrial, getTrialStatus } from '../services/trial/trialService.js';

const router = express.Router();

/**
 * POST /api/whatsapp/connect
 * Initialize a new WhatsApp connection (Baileys - trial mode only)
 */
router.post('/connect', asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('WhatsApp connect called, user:', req.user);

    if (!req.user || !req.user.id) {
        console.error('No user found in request');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;

    // Check if user can use Baileys (trial active or API mode)
    const status = await getTrialStatus(userId);

    // If using API mode, don't allow Baileys connection
    if (status.connectionMode === 'api' && status.hasApiKey) {
        return res.status(400).json({
            error: 'You are using WhatsApp Business API. Baileys connection is not available.',
            mode: 'api'
        });
    }

    // Check trial status
    const canUse = await canUseWhatsApp(userId);
    if (!canUse.allowed) {
        return res.status(403).json({
            error: canUse.reason,
            trialExpired: true
        });
    }

    // Start trial if not already started
    if (!status.trialStartedAt) {
        await startTrial(userId);
        console.log(`🎉 Trial started for user ${userId}`);
    }

    const sessionId = `${userId}-${Date.now()}`;
    console.log('Creating session for user:', userId);

    const sessionManager = getSessionManager();
    const result = await sessionManager.createSession(userId, sessionId);

    if (!result.success) {
        console.error('Session creation failed:', result.error);
        return res.status(400).json({ error: result.error });
    }

    // Delete any old sessions for this user
    const existingSessions = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WHATSAPP_SESSIONS,
        [Query.equal('userId', userId)]
    );

    for (const session of existingSessions.documents) {
        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.WHATSAPP_SESSIONS,
            session.$id
        );
    }

    // Store new session info in database
    await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.WHATSAPP_SESSIONS,
        ID.unique(),
        {
            sessionId,
            userId,
            status: 'initializing',
            metadata: JSON.stringify({})  // Must be a string, not object
        }
    );

    console.log('Session created successfully:', sessionId);

    res.json({
        message: 'WhatsApp session initiated',
        sessionId
    });
}));

/**
 * GET /api/whatsapp/session
 * Get current WhatsApp session for user (single session)
 */
router.get('/session', asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WHATSAPP_SESSIONS,
        [
            Query.equal('userId', userId),
            Query.orderDesc('$createdAt'),
            Query.limit(1)
        ]
    );

    res.json({ session: result.documents[0] || null });
}));

/**
 * GET /api/whatsapp/status/:sessionId
 * Get WhatsApp session status
 */
router.get('/status/:sessionId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WHATSAPP_SESSIONS,
        [
            Query.equal('sessionId', sessionId),
            Query.equal('userId', userId)
        ]
    );

    if (result.documents.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.documents[0]);
}));

/**
 * GET /api/whatsapp/sessions
 * Get all WhatsApp sessions for user
 */
router.get('/sessions', asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WHATSAPP_SESSIONS,
        [Query.equal('userId', userId)]
    );

    res.json({ sessions: result.documents });
}));

/**
 * POST /api/whatsapp/disconnect/:sessionId
 * Disconnect WhatsApp session
 */
router.post('/disconnect/:sessionId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WHATSAPP_SESSIONS,
        [
            Query.equal('sessionId', sessionId),
            Query.equal('userId', userId)
        ]
    );

    if (result.documents.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const sessionManager = getSessionManager();
    const disconnectResult = await sessionManager.disconnectSession(sessionId);

    if (!disconnectResult.success) {
        return res.status(400).json({ error: disconnectResult.error });
    }

    res.json({ message: 'WhatsApp session disconnected' });
}));

/**
 * POST /api/whatsapp/send
 * Send a message via WhatsApp
 */
router.post('/send', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId, phoneNumber, message } = req.body;
    const userId = req.user!.id;

    if (!sessionId || !phoneNumber || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WHATSAPP_SESSIONS,
        [
            Query.equal('sessionId', sessionId),
            Query.equal('userId', userId)
        ]
    );

    if (result.documents.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const sessionManager = getSessionManager();
    const sendResult = await sessionManager.sendMessage(sessionId, phoneNumber, message);

    if (!sendResult.success) {
        return res.status(400).json({ error: sendResult.error });
    }

    res.json({ message: 'Message sent successfully' });
}));

export default router;

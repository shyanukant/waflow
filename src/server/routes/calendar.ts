/**
 * Calendar API Routes
 * 
 * Handles:
 * - Google Calendar OAuth flow
 * - Calendar connection status
 */

import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth.js';
import {
    getAuthUrl,
    exchangeCodeForTokens,
    saveCalendarCredentials,
    isCalendarConnected
} from '../services/calendar/calendarService.js';

const router = Router();

/**
 * GET /api/calendar/status
 * Check if user has connected Google Calendar
 */
router.get('/status', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const connected = await isCalendarConnected(userId);

        res.json({
            connected,
            message: connected
                ? 'Google Calendar is connected'
                : 'Google Calendar not connected'
        });
    } catch (error: any) {
        console.error('Error checking calendar status:', error);
        res.status(500).json({ error: 'Failed to check calendar status' });
    }
});

/**
 * GET /api/calendar/connect
 * Get OAuth URL to connect Google Calendar
 */
router.get('/connect', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Check if Google credentials are configured
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            return res.status(503).json({
                error: 'Google Calendar integration not configured',
                message: 'Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
            });
        }

        const authUrl = getAuthUrl(userId);

        res.json({
            authUrl,
            message: 'Redirect user to this URL to connect Google Calendar'
        });
    } catch (error: any) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});

/**
 * GET /api/calendar/callback
 * OAuth callback from Google
 */
router.get('/callback', async (req: Request, res: Response) => {
    try {
        const { code, state: userId } = req.query;

        if (!code || !userId) {
            return res.status(400).json({ error: 'Missing authorization code or user ID' });
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code as string);

        // Save tokens for user
        await saveCalendarCredentials(userId as string, tokens);

        // Redirect to settings page with success message
        res.redirect('/settings?calendar=connected');
    } catch (error: any) {
        console.error('Error handling OAuth callback:', error);
        res.redirect('/settings?calendar=error');
    }
});

/**
 * DELETE /api/calendar/disconnect
 * Disconnect Google Calendar
 */
router.delete('/disconnect', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Clear calendar tokens
        await saveCalendarCredentials(userId, {
            access_token: '',
            refresh_token: ''
        });

        res.json({
            success: true,
            message: 'Google Calendar disconnected'
        });
    } catch (error: any) {
        console.error('Error disconnecting calendar:', error);
        res.status(500).json({ error: 'Failed to disconnect calendar' });
    }
});

export default router;

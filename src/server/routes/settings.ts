// Settings Routes - Trial status and WhatsApp API key management
import { Router, Response } from 'express';
import { AuthRequest, authenticateUser } from '../middleware/auth.js';
import {
    getTrialStatus,
    saveApiSettings,
    clearApiSettings,
    getProviderDocs,
} from '../services/trial/trialService.js';

const router = Router();

/**
 * GET /api/settings/trial - Get trial status
 */
router.get('/trial', authenticateUser, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const status = await getTrialStatus(userId);
        res.json(status);
    } catch (error: any) {
        console.error('Error getting trial status:', error);
        res.status(500).json({ error: 'Failed to get trial status' });
    }
});

/**
 * GET /api/settings/providers - Get available WhatsApp providers with docs
 */
router.get('/providers', authenticateUser, async (req: AuthRequest, res: Response) => {
    try {
        const providers = getProviderDocs();
        res.json(providers);
    } catch (error: any) {
        console.error('Error getting providers:', error);
        res.status(500).json({ error: 'Failed to get providers' });
    }
});

/**
 * POST /api/settings/api-key - Save WhatsApp API key
 */
router.post('/api-key', authenticateUser, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { provider, apiKey, phoneNumberId } = req.body;

        if (!provider || !apiKey) {
            return res.status(400).json({ error: 'Provider and API key are required' });
        }

        const validProviders = ['meta', 'twilio', '360dialog'];
        if (!validProviders.includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider' });
        }

        // Meta Cloud API requires phone number ID
        if (provider === 'meta' && !phoneNumberId) {
            return res.status(400).json({ error: 'Phone Number ID is required for Meta Cloud API' });
        }

        await saveApiSettings(userId, provider, apiKey, phoneNumberId);

        res.json({ success: true, message: 'API settings saved successfully' });
    } catch (error: any) {
        console.error('Error saving API settings:', error);
        res.status(500).json({ error: 'Failed to save API settings' });
    }
});

/**
 * DELETE /api/settings/api-key - Clear API key and switch to trial
 */
router.delete('/api-key', authenticateUser, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        await clearApiSettings(userId);
        res.json({ success: true, message: 'API settings cleared' });
    } catch (error: any) {
        console.error('Error clearing API settings:', error);
        res.status(500).json({ error: 'Failed to clear API settings' });
    }
});

export default router;

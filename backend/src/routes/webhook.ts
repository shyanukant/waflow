/**
 * Webhook Routes - Receive messages from WhatsApp Business API (Meta)
 */
import express, { Request, Response } from 'express';
import { databases, DATABASE_ID, COLLECTIONS, Query } from '../db/index.js';
import { parseWebhookMessage, verifyWebhook, markAsRead } from '../services/whatsapp/metaCloudApi.js';
import { handleApiMessage } from '../services/whatsapp/messageHandler.js';
import type { UserDocument } from '../db/collections.js';

const router = express.Router();

// Webhook verify token (set in Meta Business Settings)
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'waflow_webhook_verify';

/**
 * GET /api/webhook
 * Meta webhook verification (required for initial setup)
 */
router.get('/', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    const result = verifyWebhook(mode, token, challenge, WEBHOOK_VERIFY_TOKEN);

    if (result) {
        res.status(200).send(result);
    } else {
        res.status(403).send('Forbidden');
    }
});

/**
 * POST /api/webhook
 * Receive incoming messages from Meta
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        // Always respond 200 OK to Meta quickly (within 5 seconds)
        res.status(200).send('OK');

        // Parse the incoming message
        const message = parseWebhookMessage(req.body);

        if (!message || !message.text) {
            // Not a text message or no content, ignore
            return;
        }

        console.log(`📩 Meta Webhook: Message from ${message.from}: "${message.text.substring(0, 50)}..."`);

        // Find user by phone number ID
        const users = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.USERS,
            [Query.equal('whatsappPhoneNumberId', message.phoneNumberId)]
        );

        if (users.documents.length === 0) {
            console.log(`⚠️ No user found for phone number ID: ${message.phoneNumberId}`);
            return;
        }

        const user = users.documents[0] as unknown as UserDocument;

        // Mark message as read
        if (user.whatsappApiKey) {
            await markAsRead(
                message.phoneNumberId,
                user.whatsappApiKey,
                message.messageId
            );
        }

        // Handle the message through our AI pipeline
        await handleApiMessage(
            user.$id,
            message.from,
            message.text,
            {
                phoneNumberId: message.phoneNumberId,
                accessToken: user.whatsappApiKey!
            }
        );

    } catch (error) {
        console.error('Webhook error:', error);
        // Don't throw - we already sent 200 OK
    }
});

export default router;

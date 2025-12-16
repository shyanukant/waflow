/**
 * Meta Cloud API Client
 * Send and receive messages via WhatsApp Business API (Meta Cloud)
 */
import axios from 'axios';

const META_API_URL = 'https://graph.facebook.com/v18.0';

export interface MessageResponse {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Send a text message via Meta Cloud API
 */
export const sendTextMessage = async (
    phoneNumberId: string,
    accessToken: string,
    to: string,
    text: string
): Promise<MessageResponse> => {
    try {
        // Format phone number (remove + and spaces)
        const formattedTo = to.replace(/\D/g, '');

        const response = await axios.post(
            `${META_API_URL}/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: formattedTo,
                type: 'text',
                text: { body: text }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`📤 Meta API: Sent message to ${formattedTo}`);
        return {
            success: true,
            messageId: response.data.messages?.[0]?.id
        };
    } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error('❌ Meta API send error:', errorMessage);
        return {
            success: false,
            error: errorMessage
        };
    }
};

/**
 * Send a template message (for first contact or re-engagement)
 */
export const sendTemplateMessage = async (
    phoneNumberId: string,
    accessToken: string,
    to: string,
    templateName: string,
    languageCode: string = 'en_US',
    components?: any[]
): Promise<MessageResponse> => {
    try {
        const formattedTo = to.replace(/\D/g, '');

        const response = await axios.post(
            `${META_API_URL}/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: formattedTo,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode },
                    ...(components && { components })
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`📤 Meta API: Sent template "${templateName}" to ${formattedTo}`);
        return {
            success: true,
            messageId: response.data.messages?.[0]?.id
        };
    } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error('❌ Meta API template error:', errorMessage);
        return {
            success: false,
            error: errorMessage
        };
    }
};

/**
 * Mark a message as read
 */
export const markAsRead = async (
    phoneNumberId: string,
    accessToken: string,
    messageId: string
): Promise<void> => {
    try {
        await axios.post(
            `${META_API_URL}/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
        // Silently fail - marking as read is not critical
    }
};

/**
 * Parse incoming webhook message from Meta
 */
export interface IncomingMessage {
    from: string;          // Sender's phone number
    messageId: string;     // Message ID
    timestamp: string;     // Unix timestamp
    text?: string;         // Text content (if text message)
    type: string;          // Message type (text, image, etc.)
    phoneNumberId: string; // Your phone number ID
}

export const parseWebhookMessage = (body: any): IncomingMessage | null => {
    try {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (!value?.messages?.[0]) {
            return null; // No message (might be status update)
        }

        const message = value.messages[0];
        const metadata = value.metadata;

        return {
            from: message.from,
            messageId: message.id,
            timestamp: message.timestamp,
            text: message.text?.body || null,
            type: message.type,
            phoneNumberId: metadata?.phone_number_id
        };
    } catch (error) {
        console.error('Failed to parse webhook message:', error);
        return null;
    }
};

/**
 * Verify webhook callback from Meta (GET request)
 */
export const verifyWebhook = (
    mode: string,
    token: string,
    challenge: string,
    verifyToken: string
): string | null => {
    if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ Webhook verified');
        return challenge;
    }
    console.log('❌ Webhook verification failed');
    return null;
};

export default {
    sendTextMessage,
    sendTemplateMessage,
    markAsRead,
    parseWebhookMessage,
    verifyWebhook
};

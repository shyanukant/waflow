import { databases, DATABASE_ID, COLLECTIONS, Query, ID } from '../../db/index.js';
import type { AgentDocument } from '../../db/collections.js';
import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import {
    generateAgentResponse,
    getConversationHistory,
    addToConversation,
    saveConversation,
    clearOldConversations
} from '../ai/agentService.js';
import { saveLead, updateLeadInfo, getExistingLead } from '../lead/leadService.js';
import { sendTextMessage } from './metaCloudApi.js';

// 30-minute conversation memory (per user)
const CONVERSATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const lastMessageTime: Map<string, number> = new Map();

// Track lead state per user
interface LeadState {
    hasLead: boolean;
    hasName: boolean;
    hasEmail: boolean;
    askedForName: boolean;
    askedForEmail: boolean;
}
const leadStates: Map<string, LeadState> = new Map();

// High-intent keywords that trigger email/name request
const LEAD_CAPTURE_TRIGGERS = [
    // Booking & Scheduling
    'book', 'booking', 'appointment', 'schedule', 'meeting', 'call me', 'callback', 'call back',
    // Purchase Intent
    'buy', 'purchase', 'order', 'pricing', 'price', 'cost', 'rate', 'quote', 'quotation',
    // Services & Products
    'service', 'product', 'package', 'plan', 'offer', 'deal',
    // Information & Contact
    'details', 'more info', 'more information', 'brochure', 'catalog', 'catalogue',
    'contact', 'reach out', 'get in touch', 'speak to', 'talk to',
    // Project & Business
    'project', 'proposal', 'consultation', 'consult', 'demo', 'trial', 'free trial',
    'partnership', 'collaborate', 'work together', 'hire', 'hiring',
    // Interest signals
    'interested', 'want to know', 'tell me about', 'how much', 'what is the'
];

// Keywords that indicate user needs info we might not have
const DETAILED_INFO_TRIGGERS = [
    'specific', 'exactly', 'detailed', 'full details', 'complete',
    'technical', 'specifications', 'custom', 'customize', 'customise',
    'timeline', 'deadline', 'delivery', 'availability'
];

/**
 * Check if message has high-intent triggers
 */
const hasLeadCaptureTrigger = (message: string): boolean => {
    const lower = message.toLowerCase();
    return LEAD_CAPTURE_TRIGGERS.some(t => lower.includes(t));
};

const needsDetailedInfo = (message: string): boolean => {
    const lower = message.toLowerCase();
    return DETAILED_INFO_TRIGGERS.some(t => lower.includes(t));
};

/**
 * Extract name from user message
 */
const extractName = (message: string): string | null => {
    const patterns = [
        /my name is\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
        /i'?m\s+([a-zA-Z]+)(?:\s|,|\.)/i,
        /i am\s+([a-zA-Z]+)(?:\s|,|\.)/i,
        /call me\s+([a-zA-Z]+)/i,
        /this is\s+([a-zA-Z]+)(?:\s|,|\.)/i,
    ];
    for (const p of patterns) {
        const m = message.match(p);
        if (m && m[1] && m[1].length > 1) {
            const name = m[1].trim();
            if (!['interested', 'looking', 'want', 'need', 'here', 'good', 'fine'].includes(name.toLowerCase())) {
                return name;
            }
        }
    }
    return null;
};

/**
 * Extract email from user message
 */
const extractEmail = (message: string): string | null => {
    const m = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    return m ? m[0] : null;
};

/**
 * Get active agent for user
 */
const getActiveAgent = async (userId: string): Promise<AgentDocument | null> => {
    try {
        const result = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            [
                Query.equal('userId', userId),
                Query.equal('isActive', true)
            ]
        );
        return (result.documents[0] as unknown as AgentDocument) || null;
    } catch (error) {
        console.error('Error getting active agent:', error);
        return null;
    }
};

/**
 * Handle incoming WhatsApp messages
 */
export const handleIncomingMessage = async (
    sessionId: string,
    userId: string,
    message: WAMessage,
    sock: WASocket
) => {
    try {
        const messageText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        if (!messageText) return;

        const senderJid = message.key.remoteJid;
        if (!senderJid) return;
        if (senderJid === 'status@broadcast' || senderJid.includes('@g.us')) return;

        // Get phone number (handle LID format)
        let senderNumber: string;
        if (senderJid.includes('@lid')) {
            const senderPn = (message.key as any).senderPn;
            if (senderPn?.includes('@s.whatsapp.net')) {
                senderNumber = senderPn.split('@')[0];
            } else {
                return;
            }
        } else {
            senderNumber = senderJid.split('@')[0];
        }

        if (!/^\d{10,15}$/.test(senderNumber)) return;

        console.log(`📩 +${senderNumber}: ${messageText}`);

        // Check conversation timeout (30 min)
        const now = Date.now();
        const lastTime = lastMessageTime.get(senderNumber);
        if (lastTime && (now - lastTime) > CONVERSATION_TIMEOUT_MS) {
            clearOldConversations(senderNumber);
            leadStates.delete(senderNumber);
            console.log(`🔄 Conversation reset (30 min timeout)`);
        }
        lastMessageTime.set(senderNumber, now);

        // Get agent using Appwrite
        const activeAgent = await getActiveAgent(userId);
        if (!activeAgent) return;

        // Initialize lead state
        let state = leadStates.get(senderNumber);
        if (!state) {
            const existingLead = await getExistingLead(userId, senderNumber);
            state = {
                hasLead: !!existingLead,
                hasName: !!existingLead?.name,
                hasEmail: !!existingLead?.email,
                askedForName: false,
                askedForEmail: false
            };
            leadStates.set(senderNumber, state);
        }

        // AUTO-CREATE LEAD on first message
        if (!state.hasLead) {
            await saveLead({
                userId,
                agentId: activeAgent.$id,
                phoneNumber: senderNumber,
                interest: messageText.slice(0, 200)
            });
            state.hasLead = true;
            console.log(`✅ Auto-created lead for +${senderNumber}`);
        }

        // Extract name/email from message
        const extractedName = extractName(messageText);
        const extractedEmail = extractEmail(messageText);

        if (extractedName && !state.hasName) {
            await updateLeadInfo(userId, senderNumber, 'name', extractedName);
            state.hasName = true;
            console.log(`📝 Name saved: ${extractedName}`);
        }

        if (extractedEmail && !state.hasEmail) {
            await updateLeadInfo(userId, senderNumber, 'email', extractedEmail);
            state.hasEmail = true;
            console.log(`📝 Email saved: ${extractedEmail}`);
        }

        leadStates.set(senderNumber, state);

        // Build lead context for AI
        let leadContext = '- We have WhatsApp number';
        if (state.hasName) leadContext += '\n- We have user name';
        if (state.hasEmail) leadContext += '\n- We have user email';
        if (!state.hasName && !state.askedForName) {
            leadContext += '\n- You can ask for name naturally';
        }
        // Check for lead capture triggers
        const wantsLeadCapture = hasLeadCaptureTrigger(messageText);
        const wantsDetails = needsDetailedInfo(messageText);

        if (!state.hasEmail && (wantsLeadCapture || wantsDetails) && !state.askedForEmail) {
            leadContext += '\n- User wants booking/service/details - ASK FOR EMAIL to send info or follow up';
            state.askedForEmail = true;
            leadStates.set(senderNumber, state);
        }

        if (!state.hasName && wantsLeadCapture && !state.askedForName) {
            leadContext += '\n- User shows high interest - ASK FOR NAME naturally';
            state.askedForName = true;
            leadStates.set(senderNumber, state);
        }

        // Get history and add message
        const history = getConversationHistory(senderNumber);
        addToConversation(senderNumber, 'user', messageText);

        // Parse knowledgeBaseIds from JSON string (stored in DB as string)
        let knowledgeIds: string[] = [];
        try {
            if (typeof activeAgent.knowledgeBaseIds === 'string') {
                knowledgeIds = JSON.parse(activeAgent.knowledgeBaseIds);
            } else if (Array.isArray(activeAgent.knowledgeBaseIds)) {
                knowledgeIds = activeAgent.knowledgeBaseIds;
            }
        } catch (e) {
            console.log('Could not parse knowledgeBaseIds:', e);
        }

        // Generate response
        const response = await generateAgentResponse(
            {
                id: activeAgent.$id,
                name: activeAgent.name,
                systemPrompt: activeAgent.systemPrompt,
                knowledgeBaseIds: knowledgeIds,
                userId: userId
            },
            messageText,
            history,
            leadContext
        );

        if (response) {
            addToConversation(senderNumber, 'assistant', response);
            await sock.sendMessage(senderJid, { text: response });
            await saveConversation(userId, activeAgent.$id, senderNumber, messageText, response);
        }
    } catch (error) {
        console.error('Message handler error:', error);
    }
};

/**
 * Handle messages received via Meta Cloud API (webhook)
 * Similar to handleIncomingMessage but sends response via Meta API instead of Baileys
 */
export const handleApiMessage = async (
    userId: string,
    senderPhone: string,
    messageText: string,
    apiConfig: { phoneNumberId: string; accessToken: string }
) => {
    try {
        console.log(`📩 API Message from ${senderPhone}: "${messageText.substring(0, 50)}..."`);

        // Get active agent for user
        const agentsResult = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            [
                Query.equal('userId', userId),
                Query.equal('isActive', true)
            ]
        );

        if (agentsResult.documents.length === 0) {
            console.log('No active agent found for API message');
            return;
        }

        const activeAgent = agentsResult.documents[0] as unknown as AgentDocument;

        // Parse knowledgeBaseIds from JSON string
        let knowledgeIds: string[] = [];
        try {
            if (typeof activeAgent.knowledgeBaseIds === 'string') {
                knowledgeIds = JSON.parse(activeAgent.knowledgeBaseIds);
            } else if (Array.isArray(activeAgent.knowledgeBaseIds)) {
                knowledgeIds = activeAgent.knowledgeBaseIds;
            }
        } catch (e) {
            console.log('Could not parse knowledgeBaseIds:', e);
        }

        // Get conversation history
        const history = getConversationHistory(senderPhone);
        addToConversation(senderPhone, 'user', messageText);

        // Generate AI response
        const response = await generateAgentResponse(
            {
                id: activeAgent.$id,
                name: activeAgent.name,
                systemPrompt: activeAgent.systemPrompt,
                knowledgeBaseIds: knowledgeIds,
                userId: userId
            },
            messageText,
            history,
            '' // No lead context for now in API mode
        );

        if (response) {
            addToConversation(senderPhone, 'assistant', response);

            // Send via Meta Cloud API
            const result = await sendTextMessage(
                apiConfig.phoneNumberId,
                apiConfig.accessToken,
                senderPhone,
                response
            );

            if (result.success) {
                await saveConversation(userId, activeAgent.$id, senderPhone, messageText, response);
            } else {
                console.error('Failed to send API message:', result.error);
            }
        }
    } catch (error) {
        console.error('API message handler error:', error);
    }
};

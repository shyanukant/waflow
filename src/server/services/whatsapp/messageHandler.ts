import { db, agents } from '../../db/index.js';
import { eq } from 'drizzle-orm';
import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import {
    generateAgentResponse,
    getConversationHistory,
    addToConversation,
    saveConversation,
    clearOldConversations
} from '../ai/agentService.js';
import { saveLead, updateLeadInfo, getExistingLead } from '../lead/leadService.js';

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

// High-intent keywords that trigger email request
const EMAIL_TRIGGERS = [
    'book', 'booking', 'quote', 'callback', 'call back', 'call me',
    'project', 'meeting', 'schedule', 'details', 'proposal',
    'team', 'discuss', 'consultation', 'demo'
];

/**
 * Check if message has high-intent triggers
 */
const hasEmailTrigger = (message: string): boolean => {
    const lower = message.toLowerCase();
    return EMAIL_TRIGGERS.some(t => lower.includes(t));
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

        // Get agent
        const userAgents = await db.query.agents.findMany({
            where: eq(agents.userId, userId),
        });
        const activeAgent = userAgents.find((a: any) => a.isActive);
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
                agentId: activeAgent.id,
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
        if (!state.hasEmail && hasEmailTrigger(messageText) && !state.askedForEmail) {
            leadContext += '\n- User wants booking/details - ask for email';
            state.askedForEmail = true;
            leadStates.set(senderNumber, state);
        }

        // Get history and add message
        const history = getConversationHistory(senderNumber);
        addToConversation(senderNumber, 'user', messageText);

        // Generate response
        const response = await generateAgentResponse(
            {
                id: activeAgent.id,
                name: activeAgent.name,
                systemPrompt: activeAgent.systemPrompt,
                knowledgeBaseIds: activeAgent.knowledgeBaseIds,
                userId: userId
            },
            messageText,
            history,
            leadContext
        );

        if (response) {
            addToConversation(senderNumber, 'assistant', response);
            await sock.sendMessage(senderJid, { text: response });
            await saveConversation(userId, activeAgent.id, senderNumber, messageText, response);
        }
    } catch (error) {
        console.error('Message handler error:', error);
    }
};

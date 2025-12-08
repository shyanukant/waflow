import { db, agents } from '../../db/index.js';
import { eq } from 'drizzle-orm';
import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import {
    generateAgentResponse,
    getConversationHistory,
    addToConversation,
    saveConversation
} from '../ai/agentService.js';

/**
 * Handle incoming WhatsApp messages (Baileys)
 */
export const handleIncomingMessage = async (
    sessionId: string,
    userId: string,
    message: WAMessage,
    sock: WASocket
) => {
    try {
        // Extract message text
        const messageText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        if (!messageText) {
            return; // Ignore non-text messages for now
        }

        // Get sender JID
        const senderJid = message.key.remoteJid;
        if (!senderJid) return;

        // Ignore status updates and group messages for now
        if (senderJid === 'status@broadcast' || senderJid.includes('@g.us')) {
            return;
        }

        const senderNumber = senderJid.split('@')[0];
        console.log(`📩 Message from ${senderNumber}: ${messageText}`);

        // Get active agent for this user (one agent per user)
        const userAgents = await db.query.agents.findMany({
            where: eq(agents.userId, userId),
        });

        // Find any active agent for this user
        const activeAgent = userAgents.find((a: any) => a.isActive);

        if (!activeAgent) {
            console.log('No active agent found for user:', userId);
            return;
        }

        // Use the active agent

        // Get conversation history
        const history = getConversationHistory(senderNumber);

        // Add user message to history
        addToConversation(senderNumber, 'user', messageText);

        // Generate AI response with RAG
        const response = await generateAgentResponse(
            {
                id: activeAgent.id,
                name: activeAgent.name,
                systemPrompt: activeAgent.systemPrompt,
                knowledgeBaseIds: activeAgent.knowledgeBaseIds,
                userId: userId
            },
            messageText,
            history
        );

        if (response) {
            // Add assistant response to history
            addToConversation(senderNumber, 'assistant', response);

            // Send response via WhatsApp (Baileys)
            await sock.sendMessage(senderJid, { text: response });
            console.log(`✅ Sent response to ${senderNumber}`);

            // Save conversation to database for analytics
            await saveConversation(
                userId,
                activeAgent.id,
                senderNumber,
                messageText,
                response
            );
        }
    } catch (error) {
        console.error('Error handling incoming message:', error);
    }
};

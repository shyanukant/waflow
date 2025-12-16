// AI Agent Service - OpenRouter + Pinecone RAG Integration
import { searchKnowledge } from '../pinecone/vectorStore.js';
import { databases, DATABASE_ID, COLLECTIONS, ID } from '../../db/index.js';
import { buildSystemPrompt, buildPromptWithTools, PROMPT_CONFIG } from '../../prompts/systemPrompt.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface AgentConfig {
    id: string;
    name: string;
    systemPrompt?: string | null;
    knowledgeBaseIds?: string[];
    userId: string;
    // New advanced options
    industryId?: string;
    personaId?: string;
    enableTools?: boolean;
    businessHours?: string;
    currentPromotion?: string;
}

// Default fallback message when AI fails
const FALLBACK_MESSAGE = `Thank you for contacting us! 🙏

We've recorded your message and will get back to you soon.

If you have anything else to share, please feel free to send it here.`;

/**
 * Helper to build the system prompt using the advanced prompt module
 */
const buildPromptForAgent = (agent: AgentConfig, ragContext: string, leadContext?: string): string => {
    const agentName = agent.name || 'Assistant';
    const hasKnowledge = !!(ragContext && ragContext.trim().length > 50);

    return buildSystemPrompt({
        agentName,
        hasKnowledge,
        ragContext,
        leadContext: leadContext || '- We have user contact (WhatsApp number)',
        userCustomPrompt: agent.systemPrompt || undefined,
        // Advanced options
        industryId: agent.industryId,
        personaId: agent.personaId,
        enableTools: agent.enableTools,
        currentTime: new Date(),
        businessHours: agent.businessHours,
        currentPromotion: agent.currentPromotion,
    });
};

/**
 * Generate AI response using OpenRouter with RAG context from Pinecone
 */
export const generateAgentResponse = async (
    agent: AgentConfig,
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    leadContext?: string
): Promise<string> => {
    try {
        const openrouterKey = process.env.OPENROUTER_API_KEY;
        const modelName = process.env.MODEL_NAME || 'openai/gpt-3.5-turbo';

        if (!openrouterKey) {
            console.error('OPENROUTER_API_KEY not found in environment');
            return FALLBACK_MESSAGE;
        }

        // Step 1: Search Pinecone for relevant context using agent's knowledge base
        let ragContext = '';
        console.log(`🔍 Searching knowledge base for: "${userMessage.slice(0, 50)}..."`);
        console.log(`   Agent knowledge IDs: ${agent.knowledgeBaseIds?.length || 0} items`);

        try {
            const searchResult = await searchKnowledge(
                agent.userId,
                userMessage,
                5, // Get more results
                agent.knowledgeBaseIds
            );

            console.log(`   Search returned: ${searchResult.results?.length || 0} results`);

            if (searchResult.success && searchResult.results.length > 0) {
                // Log all scores for debugging
                searchResult.results.forEach((r: any, i: number) => {
                    console.log(`   [${i}] Score: ${r.score?.toFixed(3)} - ${r.content?.slice(0, 50)}...`);
                });

                // Use lower threshold (0.3) to get more relevant content
                const relevantResults = searchResult.results.filter((r: any) => r.score > 0.3);

                if (relevantResults.length > 0) {
                    ragContext = relevantResults
                        .map((r: any, i: number) => `[Document ${i + 1}]: ${r.content}`)
                        .join('\n\n');
                    console.log(`✅ Using ${relevantResults.length} knowledge documents for context`);
                } else {
                    console.log('⚠️ No results passed score threshold (0.3)');
                }
            } else {
                console.log('⚠️ No search results found');
            }
        } catch (ragError) {
            console.log('❌ RAG search error:', ragError);
        }

        // Step 2: Build intelligent system prompt
        const systemPrompt = buildPromptForAgent(agent, ragContext, leadContext);

        // DEBUG: Log what's being sent to AI
        console.log(`🤖 Agent: "${agent.name}" | Knowledge IDs: ${agent.knowledgeBaseIds?.length || 0}`);
        console.log(`📋 RAG Context length: ${ragContext.length} chars`);
        if (ragContext.length === 0) {
            console.log(`⚠️ NO RAG CONTEXT - AI will use fallback mode`);
        }

        // Step 3: Build messages array
        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-8), // Keep last 8 messages for context
            { role: 'user', content: userMessage }
        ];

        // Step 4: Call OpenRouter API with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openrouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.APP_URL || 'http://localhost:5000',
                    'X-Title': `WAFlow - ${agent.name}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: messages,
                    max_tokens: 500, // WhatsApp friendly
                    temperature: 0.7,
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('OpenRouter API error:', response.status, errorText);
                return FALLBACK_MESSAGE;
            }

            const data = await response.json() as { choices?: { message?: { content?: string } }[] };
            const aiResponse = data.choices?.[0]?.message?.content;

            if (!aiResponse || aiResponse.trim().length === 0) {
                return FALLBACK_MESSAGE;
            }

            console.log(`✅ Generated response using ${modelName}`);
            return aiResponse.trim();

        } catch (fetchError: any) {
            clearTimeout(timeout);
            if (fetchError.name === 'AbortError') {
                console.error('OpenRouter request timed out');
            } else {
                console.error('OpenRouter fetch error:', fetchError);
            }
            return FALLBACK_MESSAGE;
        }

    } catch (error: any) {
        console.error('Error in generateAgentResponse:', error);
        return FALLBACK_MESSAGE;
    }
};

/**
 * Clear old conversation history (after timeout)
 */
export const clearOldConversations = (senderNumber: string) => {
    clearConversation(senderNumber);
};

/**
 * Save conversation to database using Appwrite
 */
export const saveConversation = async (
    userId: string,
    agentId: string,
    senderNumber: string,
    userMessage: string,
    agentResponse: string
) => {
    try {
        await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.CONVERSATIONS,
            ID.unique(),
            {
                userId,
                agentId,
                senderNumber,
                userMessage,
                agentResponse
            }
        );
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
};

/**
 * Simple in-memory conversation store
 * In production, store this in database
 */
const conversationStore = new Map<string, ChatMessage[]>();

export const getConversationHistory = (senderNumber: string): ChatMessage[] => {
    return conversationStore.get(senderNumber) || [];
};

export const addToConversation = (senderNumber: string, role: 'user' | 'assistant', content: string) => {
    const history = conversationStore.get(senderNumber) || [];
    history.push({ role, content });

    // Keep last 20 messages
    if (history.length > 20) {
        history.shift();
    }

    conversationStore.set(senderNumber, history);
};

export const clearConversation = (senderNumber: string) => {
    conversationStore.delete(senderNumber);
};

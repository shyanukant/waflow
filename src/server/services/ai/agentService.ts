// AI Agent Service - OpenRouter + Pinecone RAG Integration
import { searchKnowledge } from '../pinecone/vectorStore.js';
import { db, conversations } from '../../db/index.js';

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
}

// Default fallback message when AI fails
const FALLBACK_MESSAGE = `Thank you for contacting us! 🙏

We've recorded your message and will get back to you soon.

If you have anything else to share, please feel free to send it here.`;

/**
 * Build a STRICT system prompt that forces agent to only use knowledge base
 */
const buildSystemPrompt = (agent: AgentConfig, ragContext: string): string => {
    const agentName = agent.name || 'Assistant';

    // VERY STRICT prompt that prevents hallucination
    let prompt = `# CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY

## RULE 1: YOUR IDENTITY
- Your name is "${agentName}" - ALWAYS use this name
- NEVER say you are "ChatGPT", "OpenAI", "AI assistant", "Kim", or any other name
- When asked who you are, say: "I'm ${agentName}, here to help you with questions about our services."
- NEVER mention that you were made by OpenAI, Anthropic, Google, or any AI company

## RULE 2: KNOWLEDGE RESTRICTIONS  
- You can ONLY answer questions using the KNOWLEDGE BASE provided below
- If the answer is NOT in the knowledge base, say: "I don't have specific information about that. Would you like me to connect you with our team?"
- DO NOT make up facts, prices, company details, or any information
- DO NOT use your general knowledge about other companies or topics

## RULE 3: EXACT COPYING - VERY IMPORTANT
- When mentioning company names, product names, people names, or specific terms from the knowledge base, copy them EXACTLY as written
- NEVER change or modify any names - use the EXACT spelling from the documents
- If the knowledge base says "krtrim", say "krtrim" - not "KRTRIM", "Krtrim", or anything else
- If you're unsure of exact spelling, quote it directly from the knowledge base

## RULE 4: RESPONSE STYLE
- Keep responses short (max 200 words) for WhatsApp
- Be friendly and professional
- Use emojis sparingly (1-2 per message)
`;

    // Add user's custom instructions if provided
    const userPrompt = agent.systemPrompt?.trim();
    if (userPrompt && userPrompt.length > 20) {
        prompt += `\n## ADDITIONAL INSTRUCTIONS FROM OWNER\n${userPrompt}\n`;
    }

    // Add knowledge base context - THIS IS THE ONLY SOURCE OF TRUTH
    if (ragContext && ragContext.trim().length > 0) {
        prompt += `
## KNOWLEDGE BASE (YOUR ONLY SOURCE OF INFORMATION)
The following is the ONLY information you are allowed to use for answering questions:

${ragContext}

REMINDER: You can ONLY answer based on the above information. If a question cannot be answered from this knowledge base, politely say you don't have that specific information.`;
    } else {
        prompt += `
## NO KNOWLEDGE BASE AVAILABLE
There is no specific knowledge base loaded. You should:
- Greet the user as ${agentName}
- Ask how you can help them
- If they ask specific questions, say: "I'd be happy to help! Let me connect you with our team for accurate information."
- DO NOT make up any company information, products, or services`;
    }

    return prompt;
};

/**
 * Generate AI response using OpenRouter with RAG context from Pinecone
 */
export const generateAgentResponse = async (
    agent: AgentConfig,
    userMessage: string,
    conversationHistory: ChatMessage[] = []
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
        const systemPrompt = buildSystemPrompt(agent, ragContext);

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
 * Save conversation to database
 */
export const saveConversation = async (
    userId: string,
    agentId: string,
    senderNumber: string,
    userMessage: string,
    agentResponse: string
) => {
    try {
        await db.insert(conversations).values({
            userId,
            agentId,
            senderNumber,
            userMessage,
            agentResponse
        });
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

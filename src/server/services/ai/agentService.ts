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
const buildSystemPrompt = (agent: AgentConfig, ragContext: string, leadContext?: string): string => {
    const agentName = agent.name || 'Assistant';

    // VERY STRICT prompt that prevents hallucination
    let prompt = `# ABSOLUTE RULES - FOLLOW EXACTLY

## RULE 1: YOUR IDENTITY
- Your name is "${agentName}"
- NEVER say you are ChatGPT, OpenAI, AI, assistant, or any AI name
- Say: "I'm ${agentName}" when asked who you are

## RULE 2: KNOWLEDGE - CRITICAL
- You can ONLY use information from the KNOWLEDGE BASE below
- If information is NOT in the knowledge base, say: "I don't have that specific information. Would you like me to have someone contact you?"
- NEVER use your training knowledge, general knowledge, or make up information
- NEVER describe products, services, prices, or company details unless they are in the knowledge base
- If asked about something not in the knowledge base, admit you don't know

## RULE 3: EXACT WORDS - CRITICAL 
- COPY company names, product names, and terms EXACTLY as written in knowledge base
- DO NOT correct spelling, DO NOT change capitalization, DO NOT modify any names
- If knowledge base says "krtrim" use "krtrim" - NOT "KRTRIM" or "Krtrim" or "KRTrim"
- If knowledge base says "iPhone" use "iPhone" - NOT "Iphone" or "iphone"
- ANY modification of names is FORBIDDEN - treat them as exact quoted text
- When in doubt, mentally quote the term exactly as you read it

## RULE 4: RESPONSE STYLE
- Short responses (under 150 words)
- Friendly and professional
- 1-2 emojis maximum

## RULE 5: LEAD INFORMATION
${leadContext || '- We already have user contact (WhatsApp number)'}

WHEN TO ASK FOR NAME:
- Only ask if you need to address them personally AND we don't have their name
- Say: "By the way, what should I call you?" naturally in conversation

WHEN TO ASK FOR EMAIL:
- ONLY ask when user wants: booking, quote, callback, detailed info, project discussion, team meeting
- Say: "To send you the details/book this, may I have your email?"

DO NOT repeatedly ask for contact info. If you already asked, don't ask again.
`;

    // Add user's custom instructions if provided
    const userPrompt = agent.systemPrompt?.trim();
    if (userPrompt && userPrompt.length > 20) {
        prompt += `\n## OWNER INSTRUCTIONS\n${userPrompt}\n`;
    }

    // Add knowledge base context - STRICT
    if (ragContext && ragContext.trim().length > 0) {
        prompt += `
## KNOWLEDGE BASE (YOUR ONLY INFORMATION SOURCE)
IMPORTANT: Below is the ONLY information you can use. Do NOT add anything from outside.

${ragContext}

If user asks about something NOT in the above knowledge, say you don't have that information.`;
    } else {
        prompt += `
## NO KNOWLEDGE LOADED
- Greet user as ${agentName}
- Say you're here to help
- For specific questions, say: "I don't have that information right now. Would you like me to have someone reach out to you?"
- DO NOT make up any information`;
    }

    return prompt;
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
        const systemPrompt = buildSystemPrompt(agent, ragContext, leadContext);

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

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
    const hasKnowledge = ragContext && ragContext.trim().length > 50;

    // VERY STRICT prompt that prevents hallucination
    let prompt = `# CRITICAL INSTRUCTIONS - YOU MUST FOLLOW EXACTLY

## YOUR IDENTITY
- Your name is "${agentName}"
- NEVER say you are ChatGPT, OpenAI, AI, Claude, assistant, or any AI name
- When asked who you are, say: "I'm ${agentName}"

## KNOWLEDGE RULES - EXTREMELY IMPORTANT
${hasKnowledge ? `
✅ I HAVE LOADED knowledge for you below. USE ONLY THIS INFORMATION.
- Answer questions ONLY using the KNOWLEDGE BASE section below
- COPY names, terms, and details EXACTLY as written (don't change spelling or capitalization)
- If the answer is in the knowledge base, provide it confidently
- If the answer is NOT in the knowledge base, say: "I don't have that specific information. Would you like me to have our team reach out to you? Just share your email!"
` : `
⚠️ NO KNOWLEDGE BASE LOADED - You have no specific information available.
- For ANY specific question about products, services, pricing, company details - say:
  "I'd love to help you with that! Let me connect you with our team. May I have your email so they can reach out with the details?"
- Do NOT make up any information
- Do NOT use general knowledge or training data
`}

## RESPONSE RULES
- Keep responses SHORT (under 100 words)
- Friendly and professional tone
- 1-2 emojis maximum
- Remember conversation context

## WHEN USER ASKS FOR INFO YOU DON'T HAVE
This is CRITICAL - when you don't have the answer:
1. Acknowledge you don't have that specific information
2. Offer to connect them with a human
3. Ask for their email (if not already collected)
4. Example: "I don't have those specific details, but I'd love to help! Want me to have our team reach out? Just share your email 😊"

## RULE 4: RESPONSE STYLE
- Short responses (under 150 words)
- Friendly and professional
- 1-2 emojis maximum
- Remember the conversation context - user has been talking to you

## RULE 5: LEAD CAPTURE - WHEN TO ASK FOR CONTACT
${leadContext || '- We already have user contact (WhatsApp number)'}

COLLECT NAME WHEN:
- User shows buying interest (wants to book, buy, purchase, hire)
- User asks about pricing, projects, or services
- Say naturally: "By the way, what should I call you?" or "May I know your name?"

COLLECT EMAIL WHEN:
- User wants: booking, quote, pricing, detailed info, project discussion
- User asks about something NOT in the knowledge base (custom requests, specific details)
- You need to send them information or have someone follow up
- Say: "I'd love to send you more details! What's your email?" or "To connect you with our team, may I have your email?"

IMPORTANT:
- If user asks for info you DON'T have → offer to connect them with a human and ask for email
- DON'T repeatedly ask for contact info if you already asked in this conversation
- Make it natural, not robotic

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

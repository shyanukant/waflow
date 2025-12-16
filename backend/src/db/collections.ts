/**
 * Appwrite Collection Schemas
 * 
 * These represent the structure of documents in each collection.
 * Use these for type safety when working with Appwrite documents.
 */

// User document schema
export interface UserDocument {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    email: string;
    fullName?: string;
    trialStartedAt?: string;
    connectionMode: 'trial' | 'api';
    whatsappProvider?: string;
    whatsappApiKey?: string;
    whatsappPhoneNumberId?: string;
    googleCalendarToken?: Record<string, unknown>;
}

// WhatsApp session document schema
export interface WhatsappSessionDocument {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    sessionId: string;
    userId: string;
    status: string;
    metadata: Record<string, unknown>;
    sessionData?: Record<string, unknown>;
}

// Knowledge item document schema
export interface KnowledgeItemDocument {
    $id: string;
    $createdAt: string;
    userId: string;
    sourceType: 'upload' | 'url';
    metadata: Record<string, unknown>;
    textPreview?: string;
    chunkCount: number;
}

// Agent document schema
export interface AgentDocument {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    userId: string;
    name: string;
    systemPrompt?: string;
    knowledgeBaseIds: string[];
    whatsappSessionId?: string;
    isActive: boolean;
}

// Conversation document schema
export interface ConversationDocument {
    $id: string;
    $createdAt: string;
    userId: string;
    agentId: string;
    senderNumber: string;
    userMessage: string;
    agentResponse?: string;
}

// Lead document schema
export interface LeadDocument {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    userId: string;
    agentId?: string;
    phoneNumber: string;
    name?: string;
    email?: string;
    interest?: string;
    source: string;
    status: 'new' | 'contacted' | 'converted' | 'closed';
    notes?: string;
}

// Helper type for creating new documents (without system fields)
export type NewUserDocument = Omit<UserDocument, '$id' | '$createdAt' | '$updatedAt'>;
export type NewWhatsappSessionDocument = Omit<WhatsappSessionDocument, '$id' | '$createdAt' | '$updatedAt'>;
export type NewKnowledgeItemDocument = Omit<KnowledgeItemDocument, '$id' | '$createdAt'>;
export type NewAgentDocument = Omit<AgentDocument, '$id' | '$createdAt' | '$updatedAt'>;
export type NewConversationDocument = Omit<ConversationDocument, '$id' | '$createdAt'>;
export type NewLeadDocument = Omit<LeadDocument, '$id' | '$createdAt' | '$updatedAt'>;

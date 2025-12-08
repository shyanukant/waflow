import { pgTable, uuid, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
    id: uuid('id').primaryKey(),
    email: text('email').unique().notNull(),
    fullName: text('full_name'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// WhatsApp sessions table
export const whatsappSessions = pgTable('whatsapp_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').unique().notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    status: text('status').default('initializing').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    sessionData: jsonb('session_data'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Knowledge items table
export const knowledgeItems = pgTable('knowledge_items', {
    id: text('id').primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    sourceType: text('source_type').notNull(), // 'upload' or 'url'
    metadata: jsonb('metadata').default({}).notNull(),
    textPreview: text('text_preview'),
    chunkCount: integer('chunk_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Agents table
export const agents = pgTable('agents', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    systemPrompt: text('system_prompt'),
    knowledgeBaseIds: text('knowledge_base_ids').array().default([]).notNull(),
    whatsappSessionId: text('whatsapp_session_id').references(() => whatsappSessions.sessionId, { onDelete: 'set null' }),
    isActive: boolean('is_active').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Conversations table
export const conversations = pgTable('conversations', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
    senderNumber: text('sender_number').notNull(),
    userMessage: text('user_message').notNull(),
    agentResponse: text('agent_response'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Leads table - captures interested users from WhatsApp
export const leads = pgTable('leads', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
    // Contact info
    phoneNumber: text('phone_number').notNull(),
    name: text('name'),
    email: text('email'),
    // Lead details
    interest: text('interest'), // What they're interested in
    source: text('source').default('whatsapp').notNull(), // How they came
    status: text('status').default('new').notNull(), // new, contacted, converted, closed
    notes: text('notes'), // Additional notes from conversation
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    whatsappSessions: many(whatsappSessions),
    knowledgeItems: many(knowledgeItems),
    agents: many(agents),
    conversations: many(conversations),
    leads: many(leads),
}));

export const whatsappSessionsRelations = relations(whatsappSessions, ({ one, many }) => ({
    user: one(users, {
        fields: [whatsappSessions.userId],
        references: [users.id],
    }),
    agents: many(agents),
}));

export const knowledgeItemsRelations = relations(knowledgeItems, ({ one }) => ({
    user: one(users, {
        fields: [knowledgeItems.userId],
        references: [users.id],
    }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
    user: one(users, {
        fields: [agents.userId],
        references: [users.id],
    }),
    whatsappSession: one(whatsappSessions, {
        fields: [agents.whatsappSessionId],
        references: [whatsappSessions.sessionId],
    }),
    conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
    user: one(users, {
        fields: [conversations.userId],
        references: [users.id],
    }),
    agent: one(agents, {
        fields: [conversations.agentId],
        references: [agents.id],
    }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type WhatsappSession = typeof whatsappSessions.$inferSelect;
export type NewWhatsappSession = typeof whatsappSessions.$inferInsert;
export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type NewKnowledgeItem = typeof knowledgeItems.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

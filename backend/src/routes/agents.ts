import express, { Response } from 'express';
import { databases, DATABASE_ID, COLLECTIONS, Query, ID } from '../db/index.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { AgentDocument } from '../db/collections.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * GET /api/agents/models
 * Get available AI models
 */
router.get('/models', asyncHandler(async (req: AuthRequest, res: Response) => {
    const models = [
        { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
        { id: 'openai/gpt-4', name: 'GPT-4', provider: 'OpenAI' },
        { id: 'anthropic/claude-2', name: 'Claude 2', provider: 'Anthropic' },
        { id: 'google/palm-2', name: 'PaLM 2', provider: 'Google' },
    ];

    res.json({ models });
}));

/**
 * POST /api/agents/create
 * Create a new agent (auto-activated since one agent per user)
 */
router.post('/create', asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { name, systemPrompt, knowledgeBaseIds } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Agent name is required' });
    }

    // Deactivate any existing agents first (one active agent per user)
    const existingAgents = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.AGENTS,
        [Query.equal('userId', userId)]
    );

    for (const agent of existingAgents.documents) {
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            agent.$id,
            { isActive: false }
        );
    }

    // Create new agent
    const agent = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.AGENTS,
        ID.unique(),
        {
            userId,
            name,
            systemPrompt: systemPrompt || 'You are a helpful WhatsApp assistant.',
            knowledgeBaseIds: JSON.stringify(knowledgeBaseIds || []),  // Must be a string
            isActive: true
        }
    );

    res.status(201).json({
        message: 'Agent created and activated successfully',
        agent
    });
}));

/**
 * GET /api/agents/list
 * Get all agents for user
 */
router.get('/list', asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.AGENTS,
        [Query.equal('userId', userId)]
    );

    res.json({ agents: result.documents });
}));

/**
 * GET /api/agents/:agentId
 * Get a specific agent
 */
router.get('/:agentId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { agentId } = req.params;

    try {
        const agent = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            agentId
        );

        // Verify ownership
        if ((agent as unknown as AgentDocument).userId !== userId) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json({ agent });
    } catch (error: any) {
        if (error.code === 404) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        throw error;
    }
}));

/**
 * PUT /api/agents/:agentId
 * Update an agent
 */
router.put('/:agentId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { agentId } = req.params;
    const updates = req.body;

    try {
        // Verify ownership
        const existingAgent = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            agentId
        );

        if ((existingAgent as unknown as AgentDocument).userId !== userId) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Remove fields that shouldn't be updated directly
        delete updates.$id;
        delete updates.$createdAt;
        delete updates.$updatedAt;
        delete updates.userId;

        // If knowledgeBaseIds is being updated, stringify it
        if (updates.knowledgeBaseIds !== undefined && Array.isArray(updates.knowledgeBaseIds)) {
            updates.knowledgeBaseIds = JSON.stringify(updates.knowledgeBaseIds);
        }

        const agent = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            agentId,
            updates
        );

        res.json({
            message: 'Agent updated successfully',
            agent
        });
    } catch (error: any) {
        if (error.code === 404) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        throw error;
    }
}));

/**
 * POST /api/agents/:agentId/publish
 * Publish/activate an agent
 */
router.post('/:agentId/publish', asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { agentId } = req.params;
    const { whatsappSessionId } = req.body;

    if (!whatsappSessionId) {
        return res.status(400).json({ error: 'WhatsApp session ID is required' });
    }

    try {
        const existingAgent = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            agentId
        );

        if ((existingAgent as unknown as AgentDocument).userId !== userId) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const agent = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            agentId,
            {
                isActive: true,
                whatsappSessionId
            }
        );

        res.json({
            message: 'Agent published successfully',
            agent
        });
    } catch (error: any) {
        if (error.code === 404) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        throw error;
    }
}));

/**
 * POST /api/agents/:agentId/deactivate
 * Deactivate an agent
 */
router.post('/:agentId/deactivate', asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { agentId } = req.params;

    try {
        const existingAgent = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            agentId
        );

        if ((existingAgent as unknown as AgentDocument).userId !== userId) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const agent = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            agentId,
            { isActive: false }
        );

        res.json({
            message: 'Agent deactivated successfully',
            agent
        });
    } catch (error: any) {
        if (error.code === 404) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        throw error;
    }
}));

/**
 * DELETE /api/agents/:agentId
 * Delete an agent
 */
router.delete('/:agentId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { agentId } = req.params;

    try {
        const existingAgent = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            agentId
        );

        if ((existingAgent as unknown as AgentDocument).userId !== userId) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.AGENTS,
            agentId
        );

        res.json({ message: 'Agent deleted successfully' });
    } catch (error: any) {
        if (error.code === 404) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        throw error;
    }
}));

export default router;

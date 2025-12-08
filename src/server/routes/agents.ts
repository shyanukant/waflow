import express, { Request, Response } from 'express';
import { db, agents } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/agents/models
 * Get available AI models
 */
router.get('/models', async (req: Request, res: Response) => {
    try {
        // Return a list of popular models
        // In full implementation, fetch from OpenRouter API
        const models = [
            { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
            { id: 'openai/gpt-4', name: 'GPT-4', provider: 'OpenAI' },
            { id: 'anthropic/claude-2', name: 'Claude 2', provider: 'Anthropic' },
            { id: 'google/palm-2', name: 'PaLM 2', provider: 'Google' },
        ];

        res.json({ models });
    } catch (error: any) {
        console.error('Error fetching models:', error);
        res.status(500).json({ error: 'Failed to fetch models' });
    }
});

/**
 * POST /api/agents/create
 * Create a new agent (auto-activated since one agent per user)
 */
router.post('/create', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { name, systemPrompt, knowledgeBaseIds } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Agent name is required' });
        }

        // Deactivate any existing agents first (one active agent per user)
        await db.update(agents)
            .set({ isActive: false })
            .where(eq(agents.userId, userId));

        const [agent] = await db.insert(agents).values({
            userId,
            name,
            systemPrompt: systemPrompt || 'You are a helpful WhatsApp assistant.',
            knowledgeBaseIds: knowledgeBaseIds || [],
            isActive: true  // Auto-activate new agent
        }).returning();

        res.status(201).json({
            message: 'Agent created and activated successfully',
            agent
        });
    } catch (error: any) {
        console.error('Error creating agent:', error);
        res.status(500).json({ error: error.message || 'Failed to create agent' });
    }
});

/**
 * GET /api/agents/list
 * Get all agents for user
 */
router.get('/list', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const userAgents = await db.query.agents.findMany({
            where: eq(agents.userId, userId),
        });

        res.json({ agents: userAgents });
    } catch (error: any) {
        console.error('Error listing agents:', error);
        res.status(500).json({ error: 'Failed to list agents' });
    }
});

/**
 * GET /api/agents/:agentId
 * Get a specific agent
 */
router.get('/:agentId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { agentId } = req.params;

        const agent = await db.query.agents.findFirst({
            where: and(
                eq(agents.id, agentId),
                eq(agents.userId, userId)
            ),
        });

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json({ agent });
    } catch (error: any) {
        console.error('Error getting agent:', error);
        res.status(500).json({ error: 'Failed to get agent' });
    }
});

/**
 * PUT /api/agents/:agentId
 * Update an agent
 */
router.put('/:agentId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { agentId } = req.params;
        const updates = req.body;

        // Verify ownership
        const existingAgent = await db.query.agents.findFirst({
            where: and(
                eq(agents.id, agentId),
                eq(agents.userId, userId)
            ),
        });

        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const [agent] = await db.update(agents)
            .set({
                ...updates,
                updatedAt: new Date()
            })
            .where(eq(agents.id, agentId))
            .returning();

        res.json({
            message: 'Agent updated successfully',
            agent
        });
    } catch (error: any) {
        console.error('Error updating agent:', error);
        res.status(500).json({ error: error.message || 'Failed to update agent' });
    }
});

/**
 * POST /api/agents/:agentId/publish
 * Publish/activate an agent
 */
router.post('/:agentId/publish', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { agentId } = req.params;
        const { whatsappSessionId } = req.body;

        if (!whatsappSessionId) {
            return res.status(400).json({ error: 'WhatsApp session ID is required' });
        }

        // Verify ownership
        const existingAgent = await db.query.agents.findFirst({
            where: and(
                eq(agents.id, agentId),
                eq(agents.userId, userId)
            ),
        });

        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const [agent] = await db.update(agents)
            .set({
                isActive: true,
                whatsappSessionId,
                updatedAt: new Date()
            })
            .where(eq(agents.id, agentId))
            .returning();

        res.json({
            message: 'Agent published successfully',
            agent
        });
    } catch (error: any) {
        console.error('Error publishing agent:', error);
        res.status(500).json({ error: error.message || 'Failed to publish agent' });
    }
});

/**
 * POST /api/agents/:agentId/deactivate
 * Deactivate an agent
 */
router.post('/:agentId/deactivate', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { agentId } = req.params;

        // Verify ownership
        const existingAgent = await db.query.agents.findFirst({
            where: and(
                eq(agents.id, agentId),
                eq(agents.userId, userId)
            ),
        });

        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const [agent] = await db.update(agents)
            .set({
                isActive: false,
                updatedAt: new Date()
            })
            .where(eq(agents.id, agentId))
            .returning();

        res.json({
            message: 'Agent deactivated successfully',
            agent
        });
    } catch (error: any) {
        console.error('Error deactivating agent:', error);
        res.status(500).json({ error: error.message || 'Failed to deactivate agent' });
    }
});

/**
 * DELETE /api/agents/:agentId
 * Delete an agent
 */
router.delete('/:agentId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { agentId } = req.params;

        // Verify ownership
        const existingAgent = await db.query.agents.findFirst({
            where: and(
                eq(agents.id, agentId),
                eq(agents.userId, userId)
            ),
        });

        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        await db.delete(agents)
            .where(eq(agents.id, agentId));

        res.json({ message: 'Agent deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting agent:', error);
        res.status(500).json({ error: error.message || 'Failed to delete agent' });
    }
});

export default router;

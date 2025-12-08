import express, { Response } from 'express';
import { db, leads } from '../db/index.js';
import { eq } from 'drizzle-orm';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/leads/list
 * Get all leads for user
 */
router.get('/list', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const userLeads = await db.query.leads.findMany({
            where: eq(leads.userId, userId),
            orderBy: (leads, { desc }) => [desc(leads.createdAt)]
        });

        res.json({ leads: userLeads });
    } catch (error: any) {
        console.error('Error listing leads:', error);
        res.status(500).json({ error: 'Failed to list leads' });
    }
});

/**
 * GET /api/leads/:id
 * Get single lead
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const lead = await db.query.leads.findFirst({
            where: eq(leads.id, req.params.id)
        });

        if (!lead || lead.userId !== req.user!.id) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json({ lead });
    } catch (error: any) {
        console.error('Error getting lead:', error);
        res.status(500).json({ error: 'Failed to get lead' });
    }
});

/**
 * PUT /api/leads/:id
 * Update lead status/notes
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { status, notes, name, email } = req.body;

        const lead = await db.query.leads.findFirst({
            where: eq(leads.id, req.params.id)
        });

        if (!lead || lead.userId !== req.user!.id) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const updateData: any = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;

        await db.update(leads)
            .set(updateData)
            .where(eq(leads.id, req.params.id));

        res.json({ message: 'Lead updated' });
    } catch (error: any) {
        console.error('Error updating lead:', error);
        res.status(500).json({ error: 'Failed to update lead' });
    }
});

/**
 * DELETE /api/leads/:id
 * Delete lead
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const lead = await db.query.leads.findFirst({
            where: eq(leads.id, req.params.id)
        });

        if (!lead || lead.userId !== req.user!.id) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        await db.delete(leads).where(eq(leads.id, req.params.id));

        res.json({ message: 'Lead deleted' });
    } catch (error: any) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

export default router;

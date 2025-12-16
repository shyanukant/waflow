import express, { Response } from 'express';
import { databases, DATABASE_ID, COLLECTIONS, Query } from '../db/index.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { LeadDocument } from '../db/collections.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * GET /api/leads/list
 * Get all leads for user
 */
router.get('/list', asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.LEADS,
        [
            Query.equal('userId', userId),
            Query.orderDesc('$createdAt')
        ]
    );

    res.json({ leads: result.documents });
}));

/**
 * GET /api/leads/:id
 * Get single lead
 */
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
        const lead = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.LEADS,
            req.params.id
        ) as unknown as LeadDocument;

        if (lead.userId !== req.user!.id) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json({ lead });
    } catch (error: any) {
        if (error.code === 404) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        throw error;
    }
}));

/**
 * PUT /api/leads/:id
 * Update lead status/notes
 */
router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, notes, name, email } = req.body;

    try {
        const lead = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.LEADS,
            req.params.id
        ) as unknown as LeadDocument;

        if (lead.userId !== req.user!.id) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const updateData: Record<string, any> = {};
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;

        await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.LEADS,
            req.params.id,
            updateData
        );

        res.json({ message: 'Lead updated' });
    } catch (error: any) {
        if (error.code === 404) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        throw error;
    }
}));

/**
 * DELETE /api/leads/:id
 * Delete lead
 */
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
        const lead = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.LEADS,
            req.params.id
        ) as unknown as LeadDocument;

        if (lead.userId !== req.user!.id) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.LEADS,
            req.params.id
        );

        res.json({ message: 'Lead deleted' });
    } catch (error: any) {
        if (error.code === 404) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        throw error;
    }
}));

export default router;

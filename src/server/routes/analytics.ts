import express, { Response } from 'express';
import { db, conversations } from '../db/index.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/analytics/summary
 * Get analytics summary for user
 */
router.get('/summary', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        // Calculate date ranges
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(todayStart);
        monthStart.setMonth(monthStart.getMonth() - 1);

        // Get all conversations for user
        const allConversations = await db.query.conversations.findMany({
            where: eq(conversations.userId, userId),
            orderBy: (conversations, { desc }) => [desc(conversations.createdAt)],
        });

        // Calculate counts
        const today = allConversations.filter(c =>
            new Date(c.createdAt) >= todayStart
        ).length;

        const yesterday = allConversations.filter(c => {
            const date = new Date(c.createdAt);
            return date >= yesterdayStart && date < todayStart;
        }).length;

        const thisWeek = allConversations.filter(c =>
            new Date(c.createdAt) >= weekStart
        ).length;

        const thisMonth = allConversations.filter(c =>
            new Date(c.createdAt) >= monthStart
        ).length;

        // Get unique senders (conversations)
        const uniqueSenders = new Set(allConversations.map(c => c.senderNumber));

        res.json({
            analytics: {
                today,
                yesterday,
                thisWeek,
                thisMonth,
                totalConversations: uniqueSenders.size,
                totalMessages: allConversations.length
            },
            recentConversations: allConversations.slice(0, 20)
        });
    } catch (error: any) {
        console.error('Error getting analytics:', error);
        res.status(500).json({
            error: 'Failed to get analytics',
            analytics: {
                today: 0,
                yesterday: 0,
                thisWeek: 0,
                thisMonth: 0,
                totalConversations: 0,
                totalMessages: 0
            },
            recentConversations: []
        });
    }
});

export default router;

import express, { Request, Response } from 'express';
import multer from 'multer';
import { db, knowledgeItems } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import type { AuthRequest } from '../middleware/auth.js';
import {
    processPDF,
    processDOCX,
    processTXT,
    processURL,
    processAndStoreDocument
} from '../services/knowledge/documentProcessor.js';
import { deleteDocuments } from '../services/pinecone/vectorStore.js';

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
        }
    }
});

/**
 * POST /api/knowledge/upload
 * Upload a document to knowledge base
 */
router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Extract text based on file type
        let text: string;
        const fileType = file.originalname.split('.').pop()?.toLowerCase() || '';

        try {
            switch (fileType) {
                case 'pdf':
                    text = await processPDF(file.buffer);
                    break;
                case 'docx':
                    text = await processDOCX(file.buffer);
                    break;
                case 'txt':
                    text = await processTXT(file.buffer);
                    break;
                default:
                    return res.status(400).json({ error: 'Unsupported file type' });
            }
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }

        const documentId = `doc-${Date.now()}`;
        const metadata = {
            filename: file.originalname,
            fileType,
            uploadedAt: new Date().toISOString(),
            sourceType: 'upload'
        };

        // Process and store in Pinecone
        const result = await processAndStoreDocument(userId, documentId, text, metadata);

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        // Store metadata in database
        await db.insert(knowledgeItems).values({
            id: documentId,
            userId,
            sourceType: 'upload',
            metadata,
            textPreview: text.substring(0, 500),
            chunkCount: result.chunkCount
        });

        res.json({
            message: 'Document uploaded and processed successfully',
            documentId,
            chunkCount: result.chunkCount
        });
    } catch (error: any) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: error.message || 'Failed to upload document' });
    }
});

/**
 * POST /api/knowledge/url
 * Add a URL to knowledge base
 */
router.post('/url', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // Extract text from URL
        let text: string;
        try {
            text = await processURL(url);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }

        const documentId = `url-${Date.now()}`;
        const metadata = {
            url,
            addedAt: new Date().toISOString(),
            sourceType: 'url'
        };

        // Process and store in Pinecone
        const result = await processAndStoreDocument(userId, documentId, text, metadata);

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        // Store metadata in database
        await db.insert(knowledgeItems).values({
            id: documentId,
            userId,
            sourceType: 'url',
            metadata,
            textPreview: text.substring(0, 500),
            chunkCount: result.chunkCount
        });

        res.json({
            message: 'URL added and processed successfully',
            documentId,
            chunkCount: result.chunkCount
        });
    } catch (error: any) {
        console.error('Error adding URL:', error);
        res.status(500).json({ error: error.message || 'Failed to add URL' });
    }
});

/**
 * GET /api/knowledge/list
 * Get all knowledge items for user
 */
router.get('/list', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const items = await db.query.knowledgeItems.findMany({
            where: eq(knowledgeItems.userId, userId),
        });

        res.json({ items });
    } catch (error: any) {
        console.error('Error listing knowledge items:', error);
        res.status(500).json({ error: 'Failed to list knowledge items' });
    }
});

/**
 * DELETE /api/knowledge/:documentId
 * Delete a knowledge item
 */
router.delete('/:documentId', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { documentId } = req.params;

        // Verify ownership
        const item = await db.query.knowledgeItems.findFirst({
            where: and(
                eq(knowledgeItems.id, documentId),
                eq(knowledgeItems.userId, userId)
            ),
        });

        if (!item) {
            return res.status(404).json({ error: 'Knowledge item not found' });
        }

        // Get all chunk IDs for this document
        const chunkCount = item.chunkCount || 0;
        const chunkIds = Array.from({ length: chunkCount }, (_, i) =>
            `${documentId}_chunk_${i}`
        );

        // Delete from Pinecone
        if (chunkIds.length > 0) {
            await deleteDocuments(userId, chunkIds);
        }

        // Delete from database
        await db.delete(knowledgeItems)
            .where(eq(knowledgeItems.id, documentId));

        res.json({ message: 'Knowledge item deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting knowledge item:', error);
        res.status(500).json({ error: 'Failed to delete knowledge item' });
    }
});

export default router;

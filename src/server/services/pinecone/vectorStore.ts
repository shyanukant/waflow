// src/lib/pineconeClient.ts

import { Pinecone, Index } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

/**
 * Initialize Pinecone client (singleton)
 */
export const getPineconeClient = (): Pinecone => {
    if (!pineconeClient) {
        const apiKey = process.env.PINECONE_API_KEY;

        if (!apiKey) {
            throw new Error('PINECONE_API_KEY environment variable is not set');
        }

        pineconeClient = new Pinecone({ apiKey });
    }

    return pineconeClient;
};

/**
 * Get Pinecone index for knowledge base
 */
export const getKnowledgeIndex = (): Index => {
    const pc = getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME || 'waflow';

    // v6 SDK: use .index(), not .Index()
    return pc.index(indexName);
};

/**
 * Generate namespace for user isolation
 */
export const getUserNamespace = (userId: string): string => {
    return `user_${userId}`;
};

/**
 * Upsert documents to Pinecone with integrated embeddings (text index)
 * Assumes index field_map uses "chunk_text" as the text field.
 */
export const upsertDocuments = async (
    userId: string,
    documents: Array<{
        id: string;
        content: string;
        metadata: Record<string, any>;
    }>
) => {
    try {
        const index = getKnowledgeIndex();
        const namespaceName = getUserNamespace(userId);
        const ns = index.namespace(namespaceName);

        // Each record: id + text field + extra metadata
        const records = documents.map(doc => ({
            id: doc.id,
            text: doc.content.slice(0, 8000), // embedded by Pinecone (field_map expects 'text')
            userId,
            timestamp: new Date().toISOString(),
            ...flattenMetadata(doc.metadata),
        }));

        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            // Integrated embedding: upsertRecords on the namespace
            await ns.upsertRecords(batch);
        }

        console.log(`✅ Upserted ${records.length} records`);
        return { success: true, count: records.length };
    } catch (error: any) {
        console.error('Error upserting documents to Pinecone:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Search knowledge base with semantic search
 * Uses Pinecone inference.embed for the query vector.
 */
export const searchKnowledge = async (
    userId: string,
    query: string,
    topK: number = 5,
    knowledgeBaseIds?: string[] // Filter by specific knowledge items
) => {
    try {
        const pc = getPineconeClient();
        const index = getKnowledgeIndex();
        const namespaceName = getUserNamespace(userId);
        const ns = index.namespace(namespaceName);

        const modelName = 'llama-text-embed-v2';

        // TS SDK signature: embed(model, inputs[], params?)
        const embedRes = await pc.inference.embed(
            modelName,
            [query],
            {
                inputType: 'query',
                truncate: 'END',
            }
        );

        const firstEmbedding = embedRes.data[0];

        if (firstEmbedding.vectorType !== 'dense') {
            throw new Error(`Expected dense embedding but got ${firstEmbedding.vectorType}`);
        }

        const queryVector = (firstEmbedding as { values: number[] }).values;

        // Build filter if knowledgeBaseIds provided
        let filter: Record<string, any> | undefined;
        if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
            filter = { documentId: { $in: knowledgeBaseIds } };
            console.log(`Filtering by knowledge IDs: ${knowledgeBaseIds.length} items`);
        }

        const results = await ns.query({
            topK,
            includeMetadata: true,
            includeValues: false,
            vector: queryVector,
            filter,
        });

        return {
            success: true,
            results: results.matches.map(match => ({
                id: match.id,
                score: match.score,
                content: match.metadata?.text ?? match.metadata?.content,
                metadata: match.metadata,
            })),
        };
    } catch (error: any) {
        console.error('Error searching Pinecone:', error);
        return { success: false, error: error.message, results: [] };
    }
};

/**
 * Delete documents from Pinecone (by document IDs) for a user namespace
 */
export const deleteDocuments = async (
    userId: string,
    documentIds: string[]
) => {
    try {
        const index = getKnowledgeIndex();
        const namespaceName = getUserNamespace(userId);
        const ns = index.namespace(namespaceName);

        await ns.deleteMany(documentIds);

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting documents from Pinecone:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete all documents for a user (namespace)
 */
export const deleteUserNamespace = async (userId: string) => {
    try {
        const index = getKnowledgeIndex();
        const namespaceName = getUserNamespace(userId);
        const ns = index.namespace(namespaceName);

        await ns.deleteAll();

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting user namespace:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get index statistics
 */
export const getIndexStats = async () => {
    try {
        const index = getKnowledgeIndex();
        const stats = await index.describeIndexStats();

        return {
            success: true,
            stats: {
                totalVectors: stats.totalRecordCount,
                namespaces: stats.namespaces,
            },
        };
    } catch (error: any) {
        console.error('Error getting index stats:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Flatten nested metadata (Pinecone requirement: no nested objects)
 */
const flattenMetadata = (metadata: Record<string, any>): Record<string, any> => {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Flatten nested object
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
                flattened[`${key}_${nestedKey}`] = nestedValue;
            }
        } else if (Array.isArray(value)) {
            // Arrays of primitives are OK, arrays of objects are not
            if (value.every(item => typeof item !== 'object')) {
                flattened[key] = value;
            } else {
                // Convert array of objects to string
                flattened[key] = JSON.stringify(value);
            }
        } else {
            flattened[key] = value;
        }
    }

    return flattened;
};

/**
 * Simple score-based reranking utility (optional)
 */
const rerankResults = async (
    matches: any[],
    _query: string,
    topN: number
) => {
    const sorted = matches.sort((a, b) => (b.score || 0) - (a.score || 0));

    return sorted.slice(0, topN).map(match => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
    }));
};

export default {
    getPineconeClient,
    getKnowledgeIndex,
    getUserNamespace,
    upsertDocuments,
    searchKnowledge,
    deleteDocuments,
    deleteUserNamespace,
    getIndexStats,
};

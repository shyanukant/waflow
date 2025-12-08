import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import mammoth from 'mammoth';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { upsertDocuments } from '../pinecone/vectorStore.js';

/**
 * Process PDF file
 */
export const processPDF = async (buffer: Buffer): Promise<string> => {
    try {
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        const pdf = await loadingTask.promise;

        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
                .map((item: any) => item.str)
                .join(' ');
            text += pageText + '\n';
        }

        return text.trim();
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw new Error('Failed to process PDF file');
    }
};

/**
 * Process DOCX file
 */
export const processDOCX = async (buffer: Buffer): Promise<string> => {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value.trim();
    } catch (error) {
        console.error('Error processing DOCX:', error);
        throw new Error('Failed to process DOCX file');
    }
};

/**
 * Process TXT file
 */
export const processTXT = async (buffer: Buffer): Promise<string> => {
    return buffer.toString('utf-8').trim();
};

/**
 * Process URL - extract text content
 */
export const processURL = async (url: string): Promise<string> => {
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; WAFlow/1.0)'
            }
        });

        const $ = cheerio.load(response.data);

        // Remove script and style elements
        $('script, style, nav, footer, header').remove();

        // Extract text from body
        const text = $('body')
            .text()
            .replace(/\s+/g, ' ')
            .trim();

        return text;
    } catch (error) {
        console.error('Error processing URL:', error);
        throw new Error('Failed to fetch or process URL');
    }
};

/**
 * Chunk text into smaller pieces for better embedding
 */
export const chunkText = (text: string, chunkSize: number = 1000, overlap: number = 200): string[] => {
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        const endIndex = Math.min(startIndex + chunkSize, text.length);
        const chunk = text.slice(startIndex, endIndex);
        chunks.push(chunk.trim());

        startIndex += chunkSize - overlap;
    }

    return chunks.filter(chunk => chunk.length > 0);
};

/**
 * Process and store document in Pinecone
 */
export const processAndStoreDocument = async (
    userId: string,
    documentId: string,
    text: string,
    metadata: Record<string, any>
) => {
    try {
        // Chunk the text
        const chunks = chunkText(text);

        // Prepare documents for Pinecone
        const documents = chunks.map((chunk, index) => ({
            id: `${documentId}_chunk_${index}`,
            content: chunk,
            metadata: {
                userId,
                documentId,
                chunkIndex: index,
                totalChunks: chunks.length,
                ...metadata
            }
        }));

        // Upsert to Pinecone with integrated embeddings
        const result = await upsertDocuments(userId, documents);

        return {
            success: result.success,
            chunkCount: chunks.length,
            error: result.error
        };
    } catch (error: any) {
        console.error('Error processing and storing document:', error);
        return {
            success: false,
            chunkCount: 0,
            error: error.message
        };
    }
};

export default {
    processPDF,
    processDOCX,
    processTXT,
    processURL,
    chunkText,
    processAndStoreDocument
};

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import mammoth from 'mammoth';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { upsertDocuments } from '../pinecone/vectorStore.js';

/**
 * Clean extracted text - remove extra whitespace, HTML entities, etc.
 */
const cleanText = (text: string): string => {
    return text
        // Decode HTML entities
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        // Remove any remaining HTML tags
        .replace(/<[^>]*>/g, ' ')
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove excessive newlines
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

/**
 * Check if URL is a Google Docs link
 */
const isGoogleDocsUrl = (url: string): boolean => {
    return url.includes('docs.google.com/document') ||
        url.includes('drive.google.com');
};

/**
 * Convert Google Docs URL to export URL for public documents
 */
const getGoogleDocsExportUrl = (url: string): string => {
    // Extract document ID from URL
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        const docId = match[1];
        // Use export as plain text
        return `https://docs.google.com/document/d/${docId}/export?format=txt`;
    }
    throw new Error('Could not extract Google Docs ID from URL');
};

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
            text += pageText + '\n\n';
        }

        console.log(`📄 PDF processed: ${pdf.numPages} pages, ${text.length} chars`);
        return cleanText(text);
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw new Error('Failed to process PDF file');
    }
};

/**
 * Process DOCX file (including Google Docs exports)
 */
export const processDOCX = async (buffer: Buffer): Promise<string> => {
    try {
        // First try extractRawText for clean text
        const result = await mammoth.extractRawText({ buffer });
        let text = result.value;

        // If text is too short, try converting to HTML and extracting
        if (text.length < 50) {
            console.log('⚠️ extractRawText returned little content, trying HTML conversion...');
            const htmlResult = await mammoth.convertToHtml({ buffer });
            const $ = cheerio.load(htmlResult.value);
            text = $('body').text();
        }

        console.log(`📄 DOCX processed: ${text.length} chars`);
        return cleanText(text);
    } catch (error) {
        console.error('Error processing DOCX:', error);
        throw new Error('Failed to process DOCX file');
    }
};

/**
 * Process TXT file
 */
export const processTXT = async (buffer: Buffer): Promise<string> => {
    const text = buffer.toString('utf-8');
    console.log(`📄 TXT processed: ${text.length} chars`);
    return cleanText(text);
};

/**
 * Process URL - extract clean text content
 */
export const processURL = async (url: string): Promise<string> => {
    try {
        let fetchUrl = url;
        let isGoogleDoc = false;

        // Handle Google Docs URLs specially
        if (isGoogleDocsUrl(url)) {
            isGoogleDoc = true;
            try {
                fetchUrl = getGoogleDocsExportUrl(url);
                console.log(`📝 Google Docs detected, using export URL`);
            } catch (e) {
                throw new Error('Invalid Google Docs URL. Make sure the document is publicly accessible (Share → Anyone with the link)');
            }
        }

        const response = await axios.get(fetchUrl, {
            timeout: 20000,
            maxRedirects: 10,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        let text = '';

        if (isGoogleDoc) {
            // Google Docs export returns plain text
            text = response.data;
        } else {
            const $ = cheerio.load(response.data);

            // Remove unwanted elements
            $('script, style, nav, footer, header, aside, iframe, noscript, [role="navigation"], [role="banner"], .nav, .footer, .header, .sidebar, .menu, .ad, .advertisement').remove();

            // Try to find main content - priority: article > main > body
            const mainContent = $('article, main, [role="main"], .content, .post, .article').first();
            if (mainContent.length > 0) {
                text = mainContent.text();
            } else {
                text = $('body').text();
            }
        }

        // Clean up the text
        text = text
            .replace(/\s+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        text = cleanText(text);

        console.log(`🌐 URL processed: ${text.length} chars from ${url}`);

        // Validate we got content
        if (text.length < 50) {
            if (isGoogleDoc) {
                throw new Error('Could not access Google Doc. Make sure it is set to "Anyone with the link can view" in sharing settings.');
            }
            throw new Error('Could not extract meaningful content from URL. The page may be empty, require login, or use JavaScript to load content.');
        }

        return text;
    } catch (error: any) {
        console.error('Error processing URL:', error.message);
        throw new Error(error.message || `Failed to fetch or process URL`);
    }
};

/**
 * Smart chunk text - splits at sentence/paragraph boundaries when possible
 */
export const chunkText = (text: string, chunkSize: number = 800, overlap: number = 150): string[] => {
    // Validate input
    if (!text || text.trim().length === 0) {
        console.log('⚠️ Empty text, no chunks created');
        return [];
    }

    const trimmedText = text.trim();

    // If text is small, return as single chunk
    if (trimmedText.length <= chunkSize) {
        console.log(`📦 Text small enough for 1 chunk (${trimmedText.length} chars)`);
        return [trimmedText];
    }

    const chunks: string[] = [];

    // Split into paragraphs first
    const paragraphs = trimmedText.split(/\n\n+/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        // If adding this paragraph exceeds chunk size
        if (currentChunk.length + paragraph.length + 2 > chunkSize) {
            // Save current chunk if it has content
            if (currentChunk.trim().length > 0) {
                chunks.push(currentChunk.trim());
            }

            // If single paragraph is too large, split it by sentences
            if (paragraph.length > chunkSize) {
                const sentences = paragraph.split(/(?<=[.!?])\s+/);
                let sentenceChunk = '';

                for (const sentence of sentences) {
                    if (sentenceChunk.length + sentence.length + 1 > chunkSize) {
                        if (sentenceChunk.trim().length > 0) {
                            chunks.push(sentenceChunk.trim());
                        }
                        // If single sentence is still too large, force split
                        if (sentence.length > chunkSize) {
                            for (let i = 0; i < sentence.length; i += chunkSize - overlap) {
                                const piece = sentence.slice(i, i + chunkSize).trim();
                                if (piece.length > 0) {
                                    chunks.push(piece);
                                }
                            }
                            sentenceChunk = '';
                        } else {
                            sentenceChunk = sentence;
                        }
                    } else {
                        sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
                    }
                }

                currentChunk = sentenceChunk;
            } else {
                currentChunk = paragraph;
            }
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
    }

    // Don't forget the last chunk
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }

    // Filter out tiny chunks
    const validChunks = chunks.filter(chunk => chunk.length >= 20);

    console.log(`📦 Text chunked: ${trimmedText.length} chars → ${validChunks.length} chunks`);
    return validChunks;
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
        console.log(`\n📥 Processing document: ${documentId}`);
        console.log(`   Text length: ${text.length} chars`);

        // IMPORTANT: Validate text is not empty
        if (!text || text.trim().length < 20) {
            console.log('❌ Text too short or empty, cannot process');
            return {
                success: false,
                chunkCount: 0,
                error: 'Document content is empty or too short. Please ensure the document contains text content.'
            };
        }

        // Chunk the text
        const chunks = chunkText(text);
        console.log(`   Created ${chunks.length} chunks`);

        // Validate chunks exist
        if (chunks.length === 0) {
            console.log('❌ No valid chunks created');
            return {
                success: false,
                chunkCount: 0,
                error: 'No content could be extracted from the document.'
            };
        }

        // Prepare documents for Pinecone - filter out any empty chunks
        const documents = chunks
            .filter(chunk => chunk && chunk.trim().length > 0)
            .map((chunk, index) => ({
                id: `${documentId}_chunk_${index}`,
                content: chunk.trim(),
                metadata: {
                    documentId,
                    chunkIndex: index,
                    totalChunks: chunks.length,
                    ...metadata
                }
            }));

        if (documents.length === 0) {
            return {
                success: false,
                chunkCount: 0,
                error: 'All chunks were empty after processing'
            };
        }

        // Log first chunk for debugging
        console.log(`   First chunk preview: "${chunks[0].slice(0, 100)}..."`);

        // Upsert to Pinecone with integrated embeddings
        const result = await upsertDocuments(userId, documents);

        if (result.success) {
            console.log(`✅ Stored ${documents.length} chunks in Pinecone`);
        } else {
            console.log(`❌ Failed to store: ${result.error}`);
        }

        return {
            success: result.success,
            chunkCount: documents.length,
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

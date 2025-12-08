import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,

    fetchLatestBaileysVersion,
    WASocket,
    proto,
    WAMessage,
    AuthenticationState,
    SignalDataTypeMap
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';
import { db, whatsappSessions } from '../../db/index.js';
import { eq } from 'drizzle-orm';
import type { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store active WhatsApp sockets
const whatsappSockets: Map<string, WASocket> = new Map<string, WASocket>();
const sessionStores = new Map<string, any>();

/**
 * Baileys-based WhatsApp Session Manager
 * Much lighter and more efficient than whatsapp-web.js
 */
export class SessionManager {
    private io: Server;
    private logger;

    constructor(io: Server) {
        this.io = io;
        this.logger = pino({ level: 'info' });
    }

    /**
     * Initialize a new WhatsApp session using Baileys
     */
    async createSession(userId: string, sessionId: string) {
        try {
            // Check if session already exists
            if (whatsappSockets.has(sessionId)) {
                return { success: false, error: 'Session already exists' };
            }

            const sessionPath = path.join(
                process.env.WHATSAPP_SESSION_PATH || './sessions',
                sessionId
            );

            // Use multi-file auth state (Baileys built-in persistence)
            const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

            // Fetch latest Baileys version
            const { version } = await fetchLatestBaileysVersion();

            // Create WhatsApp socket
            const sock = makeWASocket({
                version,
                logger: this.logger,
                printQRInTerminal: false,
                auth: state,
                browser: ['WAFlow', 'Chrome', '3.0'],
                generateHighQualityLinkPreview: true,
            });

            // Store socket
            whatsappSockets.set(sessionId, sock);

            // Handle connection updates
            sock.ev.on('connection.update', async (update: Partial<{
                connection: 'close' | 'open' | 'connecting';
                lastDisconnect: { error: any; date: Date };
                qr: string;
            }>) => {
                const { connection, lastDisconnect, qr } = update;

                // QR Code
                if (qr) {
                    console.log(`QR Code received for session ${sessionId}`);

                    // Generate QR code as data URL
                    const qrDataUrl = await qrcode.toDataURL(qr);

                    // Emit to frontend via Socket.IO
                    this.io.emit(`qr-${sessionId}`, { qr: qrDataUrl });

                    // Update database
                    await this.updateSessionStatus(sessionId, userId, 'qr_ready', { qr_code: qrDataUrl });
                }

                // Connection closed
                if (connection === 'close') {
                    const shouldReconnect =
                        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

                    console.log(
                        `Connection closed for session ${sessionId}. Reconnect:`,
                        shouldReconnect,
                        'Reason:',
                        (lastDisconnect?.error as Boom)?.output?.statusCode
                    );

                    if (shouldReconnect) {
                        // Remove old socket first
                        whatsappSockets.delete(sessionId);

                        // Wait longer for credentials to save, then reconnect
                        console.log(`Will reconnect session ${sessionId} in 5 seconds...`);
                        setTimeout(() => {
                            console.log(`Reconnecting session ${sessionId} now...`);
                            this.createSession(userId, sessionId);
                        }, 5000);
                    } else {
                        // Logged out - clean up
                        whatsappSockets.delete(sessionId);
                        this.io.emit(`disconnected-${sessionId}`, {
                            reason: 'Logged out'
                        });
                        await this.updateSessionStatus(sessionId, userId, 'disconnected', {
                            reason: 'Logged out'
                        });
                    }
                }

                // Connection opened
                if (connection === 'open') {
                    console.log(`WhatsApp connected for session ${sessionId}`);

                    // Get user info
                    const phoneNumber = sock.user?.id.split(':')[0] || 'unknown';
                    const name = sock.user?.name || 'User';

                    // Emit ready event
                    this.io.emit(`ready-${sessionId}`, {
                        phoneNumber,
                        name
                    });

                    // Update database
                    await this.updateSessionStatus(sessionId, userId, 'connected', {
                        phone_number: phoneNumber,
                        name: name
                    });
                }
            });

            // Save credentials on update
            sock.ev.on('creds.update', saveCreds);

            // Handle incoming messages
            sock.ev.on('messages.upsert', async ({ messages, type }: {
                messages: WAMessage[];
                type: 'append' | 'notify';
            }) => {
                if (type === 'notify') {
                    for (const message of messages) {
                        if (!message.key.fromMe && message.message) {
                            // Handle incoming message
                            const { handleIncomingMessage } = await import('./messageHandler.js');
                            await handleIncomingMessage(sessionId, userId, message, sock);
                        }
                    }
                }
            });

            // Initial database record
            await this.updateSessionStatus(sessionId, userId, 'initializing');

            return { success: true, sessionId };
        } catch (error: any) {
            console.error('Error creating Baileys session:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get an existing WhatsApp socket
     */
    getSocket(sessionId: string): WASocket | undefined {
        return whatsappSockets.get(sessionId);
    }

    /**
     * Disconnect a WhatsApp session
     */
    async disconnectSession(sessionId: string) {
        try {
            const sock = whatsappSockets.get(sessionId);

            if (!sock) {
                return { success: false, error: 'Session not found' };
            }

            // Logout (this will trigger connection.update with loggedOut)
            await sock.logout();

            // Remove from active sessions
            whatsappSockets.delete(sessionId);

            return { success: true };
        } catch (error: any) {
            console.error('Error disconnecting session:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get session status from database
     */
    async getSessionStatus(sessionId: string) {
        try {
            const session = await db.query.whatsappSessions.findFirst({
                where: eq(whatsappSessions.sessionId, sessionId),
            });

            return session || null;
        } catch (error) {
            console.error('Error getting session status:', error);
            return null;
        }
    }

    /**
     * Update session status in database
     */
    async updateSessionStatus(
        sessionId: string,
        userId: string,
        status: string,
        metadata: any = {}
    ) {
        try {
            await db.insert(whatsappSessions)
                .values({
                    sessionId,
                    userId,
                    status,
                    metadata,
                    updatedAt: new Date()
                })
                .onConflictDoUpdate({
                    target: whatsappSessions.sessionId,
                    set: {
                        status,
                        metadata,
                        updatedAt: new Date()
                    }
                });
        } catch (error) {
            console.error('Error updating session status:', error);
        }
    }

    /**
     * Send a message via WhatsApp (Baileys)
     */
    async sendMessage(sessionId: string, phoneNumber: string, message: string) {
        try {
            const sock = whatsappSockets.get(sessionId);

            if (!sock) {
                throw new Error('WhatsApp session not found');
            }

            // Format phone number for Baileys (must include country code)
            // Format: "1234567890@s.whatsapp.net"
            const jid = phoneNumber.includes('@s.whatsapp.net')
                ? phoneNumber
                : `${phoneNumber}@s.whatsapp.net`;

            await sock.sendMessage(jid, { text: message });

            return { success: true };
        } catch (error: any) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all active sessions
     */
    getActiveSessions(): string[] {
        return Array.from(whatsappSockets.keys());
    }

    /**
     * Restore all sessions from database on server startup
     */
    async restoreSessions() {
        try {
            console.log('🔄 Restoring WhatsApp sessions...');

            // Get all sessions that were connected or ready
            const sessions = await db.query.whatsappSessions.findMany({
                where: eq(whatsappSessions.status, 'connected'),
            });

            if (sessions.length === 0) {
                console.log('No sessions to restore');
                return;
            }

            for (const session of sessions) {
                console.log(`Restoring session: ${session.sessionId}`);
                await this.createSession(session.userId, session.sessionId);
            }

            console.log(`✅ Restored ${sessions.length} session(s)`);
        } catch (error) {
            console.error('Error restoring sessions:', error);
        }
    }
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null;

export const initializeSessionManager = (io: Server) => {
    if (!sessionManagerInstance) {
        sessionManagerInstance = new SessionManager(io);
    }
    return sessionManagerInstance;
};

export const getSessionManager = () => {
    if (!sessionManagerInstance) {
        throw new Error('SessionManager not initialized');
    }
    return sessionManagerInstance;
};

export { whatsappSockets };

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import whatsappRoutes from './routes/whatsapp.js';
import knowledgeRoutes from './routes/knowledge.js';
import agentRoutes from './routes/agents.js';
import analyticsRoutes from './routes/analytics.js';
import leadsRoutes from './routes/leads.js';
import settingsRoutes from './routes/settings.js';
import calendarRoutes from './routes/calendar.js';
import webhookRoutes from './routes/webhook.js';

// Import middleware
import { authenticateUser } from './middleware/auth.js';

// Import session manager
import { initializeSessionManager } from './services/whatsapp/sessionManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        credentials: true
    }
});

const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// Initialize WhatsApp session manager
const sessionManager = initializeSessionManager(io);

// Restore existing sessions on startup
sessionManager.restoreSessions().catch(err => console.error('Failed to restore sessions:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes); // Public - Meta sends requests here
app.use('/api/whatsapp', authenticateUser, whatsappRoutes);
app.use('/api/knowledge', authenticateUser, knowledgeRoutes);
app.use('/api/agents', authenticateUser, agentRoutes);
app.use('/api/analytics', authenticateUser, analyticsRoutes);
app.use('/api/leads', authenticateUser, leadsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/calendar', calendarRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(isDev && { stack: err.stack })
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Backend API running on http://localhost:${PORT}`);
    console.log(`📱 WhatsApp automation service ready`);
    console.log(`🌐 Mode: ${isDev ? 'development' : 'production'}`);
    console.log(`🔐 Using Appwrite for authentication`);
});

export { io };

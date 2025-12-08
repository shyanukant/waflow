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
        origin: '*',
        credentials: true
    }
});

const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

// Middleware
app.use(cors({
    origin: '*',
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
app.use('/api/whatsapp', authenticateUser, whatsappRoutes);
app.use('/api/knowledge', authenticateUser, knowledgeRoutes);
app.use('/api/agents', authenticateUser, agentRoutes);
app.use('/api/analytics', authenticateUser, analyticsRoutes);
app.use('/api/leads', authenticateUser, leadsRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Vite or static files
if (isDev) {
    // Development: Use Vite middleware (async setup)
    (async () => {
        try {
            const { createServer: createViteServer } = await import('vite');
            const vite = await createViteServer({
                server: { middlewareMode: true },
                appType: 'spa',
                root: path.join(__dirname, '../../src/client'),
            });

            app.use(vite.middlewares);
            console.log('⚡ Vite dev server integrated');
        } catch (error) {
            console.error('Failed to initialize Vite:', error);
        }
    })();
} else {
    // Production: Serve static files
    const publicPath = path.join(__dirname, '../../public');
    app.use(express.static(publicPath));

    app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });
}

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
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 WhatsApp automation service ready`);
    console.log(`🌐 Mode: ${isDev ? 'development' : 'production'}`);
    if (isDev) {
        console.log(`⚡ Vite dev server integrated`);
    }
});

export { io };

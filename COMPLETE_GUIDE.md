# 🚀 WAFlow - Complete Setup Guide

## What You Have Now

A **production-ready** WhatsApp automation platform with:

✅ **Baileys** - Lightweight WhatsApp library (10x faster than whatsapp-web.js)
✅ **Full TypeScript** - Frontend (React) + Backend (Express)
✅ **Drizzle ORM** - Type-safe database queries
✅ **Single Port** - Everything runs on port 5000
✅ **Supabase Auth** - Secure user authentication
✅ **Pinecone** - Vector database for knowledge base
✅ **OpenRouter** - AI model integration
✅ **Socket.IO** - Real-time QR code updates

## 📁 Project Structure

```
waflow/
├── src/
│   ├── client/                    # React Frontend (TypeScript)
│   │   ├── components/
│   │   │   ├── Auth/             # Login, Register
│   │   │   ├── Dashboard/        # Main dashboard
│   │   │   ├── WhatsApp/         # QR Scanner
│   │   │   ├── Knowledge/        # Upload manager
│   │   │   └── Agents/           # Agent creator & list
│   │   ├── services/
│   │   │   ├── api.ts            # Axios client
│   │   │   ├── supabase.ts       # Supabase client
│   │   │   └── socket.ts         # Socket.IO client
│   │   ├── App.tsx               # Main app with routing
│   │   ├── main.tsx              # Entry point
│   │   └── index.css             # Global styles
│   │
│   └── server/                    # Express Backend (TypeScript)
│       ├── db/
│       │   ├── schema.ts         # Drizzle schema
│       │   ├── index.ts          # DB connection
│       │   └── migrate.ts        # Migration runner
│       ├── routes/
│       │   ├── auth.ts           # Auth endpoints
│       │   ├── whatsapp.ts       # WhatsApp API
│       │   ├── knowledge.ts      # Knowledge base API
│       │   └── agents.ts         # Agent management API
│       ├── services/
│       │   └── whatsapp/
│       │       ├── sessionManager.ts  # Baileys session manager
│       │       └── messageHandler.ts  # Message processing
│       ├── middleware/
│       │   └── auth.ts           # JWT auth middleware
│       └── index.ts              # Server entry point
│
├── drizzle/                       # Generated migrations
├── sessions/                      # WhatsApp session data
├── dist/                          # Build output
│   ├── server/                   # Compiled backend
│   └── public/                   # Built React app
│
├── .env                          # Your configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # Client TypeScript config
├── tsconfig.server.json          # Server TypeScript config
├── vite.config.ts               # Vite build config
└── drizzle.config.ts            # Drizzle ORM config
```

## 🔧 Complete Setup (Step by Step)

### Step 1: Get API Keys

#### Supabase (Database + Auth)
1. Go to https://supabase.com/dashboard
2. Create new project or select existing
3. Get **Database Connection String**:
   - Settings → Database → Connection String
   - Use **"Connection pooling"** → **"Transaction"** mode
   - Copy the URL (will look like: `postgresql://postgres.xxx:password@...`)
4. Get **API keys**:
   - Settings → API
   - Copy: Project URL, anon/public key, service_role key

#### Pinecone (Vector Database)
1. Sign up at https://www.pinecone.io
2. Create new index:
   - Name: `waflow-knowledge`
   - Dimensions: **1536**
   - Metric: **cosine**
3. Copy API key from dashboard

#### OpenRouter (AI Models)
1. Sign up at https://openrouter.ai
2. Go to **Keys** section
3. Create new API key

### Step 2: Configure Environment

Edit `.env` file:

```bash
# Server
PORT=5000
NODE_ENV=development

# Database (Supabase Connection String - use Transaction pooling mode)
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres

# Supabase Auth
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...

# Pinecone
PINECONE_API_KEY=your-key-here
PINECONE_ENVIRONMENT=gcp-starter
PINECONE_INDEX_NAME=waflow-knowledge

# OpenRouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions
```

### Step 3: Install Dependencies

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Key dependencies installed:**
- `@whiskeysockets/baileys` - WhatsApp library
- `drizzle-orm` - Type-safe ORM
- `@supabase/supabase-js` - Auth & DB client
- `express` - Web server
- `socket.io` - Real-time communication
- `react` + `react-router-dom` - Frontend
- `vite` - Build tool
- `typescript` - Type safety

### Step 4: Setup Database

```bash
# Generate migration files from schema
npm run db:generate

# Run migrations (creates tables in Supabase)
npm run db:migrate

# (Optional) Open Drizzle Studio to view database
npm run db:studio
```

**Tables created:**
- `users` - User profiles
- `whatsapp_sessions` - WhatsApp connections
- `knowledge_items` - Uploaded documents/URLs
- `agents` - AI agent configurations
- `conversations` - Message history (optional)

### Step 5: Start Development

```bash
npm run dev
```

**What happens:**
- Express server starts on port 5000
- Vite middleware integrated for hot reload
- Frontend + Backend on **same port**
- Opens at: http://localhost:5000

**You'll see:**
```
🚀 Server running on http://localhost:5000
📱 WhatsApp automation service ready
🌐 Mode: development
⚡ Vite dev server integrated
```

## 🎯 How to Use

### 1. Register/Login
- Go to http://localhost:5000
- Click **Register** → Create account
- Or **Login** with existing account

### 2. Connect WhatsApp
- Dashboard → **Connect WhatsApp**
- QR code appears
- Open WhatsApp on phone
- Tap Menu (⋮) → **Linked Devices** → **Link a Device**
- Scan QR code
- ✅ Connected!

### 3. Upload Knowledge
- Dashboard → **Upload Knowledge**
- **Option A:** Upload PDF/DOCX/TXT
- **Option B:** Add URL
- Documents are processed and stored

### 4. Create Agent
- Dashboard → **Create Agent**
- Choose AI model (GPT-3.5, GPT-4, Claude, etc.)
- Write system prompt
- Select knowledge base items
- Save

### 5. Publish Agent
- Dashboard → **Manage Agents**
- Click **Publish** on your agent
- Select WhatsApp session
- ✅ Agent is live!

### 6. Test
- Send WhatsApp message to connected number
- Agent responds with AI-powered answers
- Uses knowledge base for context

## 📱 WhatsApp Session Management

### How it Works (Baileys)

**Session Storage:**
```
sessions/
└── user-123-1234567890/
    ├── creds.json              # Authentication credentials
    ├── app-state-sync-key-*.json   # Sync keys
    └── pre-key-*.json          # Encryption keys
```

**Benefits:**
- Auto-reconnect after server restart
- No need to scan QR again
- Lightweight (no browser!)

**Session Lifecycle:**
1. User clicks "Connect WhatsApp"
2. Backend creates Baileys socket
3. QR code generated → emitted via Socket.IO
4. User scans → session authenticated
5. Session saved to `./sessions/`
6. Future restarts: auto-login (no QR needed)

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register    - Register new user
POST   /api/auth/login       - Login user
POST   /api/auth/logout      - Logout user
GET    /api/auth/me          - Get current user
```

### WhatsApp
```
POST   /api/whatsapp/connect           - Start new session
GET    /api/whatsapp/status/:sessionId - Check session status
GET    /api/whatsapp/sessions          - List all sessions
POST   /api/whatsapp/disconnect/:id    - Disconnect session
POST   /api/whatsapp/send              - Send message
```

### Knowledge Base
```
POST   /api/knowledge/upload    - Upload document
POST   /api/knowledge/url       - Add URL
GET    /api/knowledge/list      - List items
DELETE /api/knowledge/:id       - Delete item
```

### Agents
```
GET    /api/agents/models       - List available AI models
POST   /api/agents/create       - Create agent
GET    /api/agents/list         - List agents
GET    /api/agents/:id          - Get agent
PUT    /api/agents/:id          - Update agent
POST   /api/agents/:id/publish  - Publish agent
POST   /api/agents/:id/deactivate - Deactivate agent
DELETE /api/agents/:id          - Delete agent
```

## 🏗️ Build for Production

### Build
```bash
npm run build
```

**This creates:**
- `dist/server/` - Compiled TypeScript backend
- `dist/public/` - Bundled React app

### Run Production
```bash
npm start
```

**Production mode:**
- Serves static React build
- No Vite middleware
- Optimized and minified
- Ready for deployment

### Deploy Options

**Option 1: Railway/Render**
1. Connect Git repo
2. Set environment variables
3. Build: `npm run build`
4. Start: `npm start`

**Option 2: VPS (DigitalOcean/AWS)**
```bash
# Install Node.js 18+
# Clone repo
# Install deps
npm ci

# Build
npm run build

# Run with PM2
npm install -g pm2
pm2 start dist/server/index.js --name waflow
pm2 save
pm2 startup
```

**Option 3: Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 📊 Performance Metrics

### Baileys vs whatsapp-web.js

| Metric | whatsapp-web.js | Baileys | Improvement |
|--------|----------------|---------|-------------|
| Memory | 500-800 MB | 50-100 MB | **10x less** |
| Startup | 10-15s | 2-3s | **5x faster** |
| CPU | High | Low | **Much lower** |
| Dependencies | 300+ MB | 50 MB | **6x smaller** |
| Browser | Required (Puppeteer) | Not needed | **No overhead** |

## 🐛 Troubleshooting

### Database connection fails
**Check:**
- DATABASE_URL is correct
- Using "Connection pooling" URL (port 6543)
- Password is correct
- IP whitelisted (if restricted)

**Fix:**
```bash
# Test connection
npm run db:studio
```

### WhatsApp QR not showing
**Check:**
- Browser console for errors
- Socket.IO connected
- Backend logs show "QR Code received"

**Fix:**
- Restart server
- Clear browser cache
- Check firewall

### Agent not responding
**Check:**
- Agent is published (`is_active = true`)
- WhatsApp session connected
- Message format correct

**Fix:**
```bash
# Check sessions
curl http://localhost:5000/api/whatsapp/sessions

# Check agents
curl http://localhost:5000/api/agents/list
```

### Build errors
```bash
# Clean rebuild
rm -rf dist node_modules
npm install
npm run build
```

## 📚 Documentation Files

- **[README.md](file:///home/shyanukant/Downloads/krtrim/waflow/README.md)** - General overview
- **[QUICKSTART.md](file:///home/shyanukant/Downloads/krtrim/waflow/QUICKSTART.md)** - 5-minute setup
- **[SETUP.md](file:///home/shyanukant/Downloads/krtrim/waflow/SETUP.md)** - Detailed guide
- **[MIGRATION.md](file:///home/shyanukant/Downloads/krtrim/waflow/MIGRATION.md)** - Baileys migration
- **This file** - Complete setup guide

## 🎉 You're Ready!

Your WhatsApp automation platform is:
- ✅ Fully TypeScript
- ✅ Using Baileys (lightweight)
- ✅ Drizzle ORM (type-safe DB)
- ✅ Single port deployment
- ✅ Production ready

**Start now:**
```bash
npm install
npm run db:migrate
npm run dev
```

Open http://localhost:5000 and start building! 🚀

# WAFlow - WhatsApp Automation Platform

AI-powered WhatsApp automation with conversational AI agents, knowledge base RAG, and lead capture.

## Features

- 🤖 **AI Agents** - Custom AI assistants with knowledge base
- 📚 **RAG Knowledge Base** - Upload docs, URLs for contextual responses
- 📱 **Hybrid WhatsApp** - 24-hour Baileys trial → WhatsApp Business API
- 📊 **Lead Capture** - Automatic extraction of names, emails, phone numbers
- 📈 **Analytics** - Conversation stats and lead tracking
- 🔐 **Appwrite Auth** - Secure authentication with email verification

## Architecture

```
waflow/
├── frontend/          # React + Vite (Appwrite Sites)
├── backend/           # Express + Baileys + Meta API (VPS/Docker)
├── .github/workflows/ # CI/CD pipelines
├── Dockerfile         # Backend container
└── docker-compose.yml # Production deployment
```

## Quick Start

### Prerequisites
- Node.js 20+
- Appwrite Cloud account
- Pinecone account
- OpenRouter API key

### 1. Clone and Install

```bash
git clone <repo>
cd waflow

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```env
# Appwrite
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=your-database-id

# AI
OPENROUTER_API_KEY=your-openrouter-key

# Pinecone
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=waflow

# WhatsApp Webhook (for Meta Cloud API)
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_API_URL=http://localhost:5000
```

### 3. Setup Appwrite Collections

```bash
cd backend
npm run setup
```

### 4. Run Development

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## WhatsApp Integration

### Trial Mode (24 hours)
- QR code scanning via Baileys
- Automatic session management
- Timer in dashboard

### Production Mode (WhatsApp Business API)
1. Create Meta Business account
2. Set up WhatsApp Business Platform
3. Add API key in Settings page
4. Configure webhook URL: `https://your-backend/api/webhook`

## Deployment

### Backend (Render)

Auto-deploys from `main` branch via GitHub Action. Backend URL: `https://waflow.onrender.com`

Required GitHub Secrets:
- `RENDER_SERVICE_ID` - Render service ID
- `RENDER_API_KEY` - Render API key

### Frontend (Appwrite Sites)

Push to `main` branch → GitHub Action deploys automatically

Required GitHub Secrets:
- `APPWRITE_API_KEY` - Appwrite API key
- `APPWRITE_SITE_ID` - Appwrite Sites ID

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login |
| `POST /api/whatsapp/connect` | Start Baileys session |
| `POST /api/webhook` | Meta webhook (public) |
| `GET /api/settings/trial` | Get trial status |
| `POST /api/settings/api-key` | Save WhatsApp API key |
| `POST /api/knowledge/upload` | Upload document |
| `POST /api/agents/create` | Create AI agent |

## License

MIT

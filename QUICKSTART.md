# 🚀 Quick Start - WAFlow

## Your App is Ready!

Everything is set up for **single-port** development with **Drizzle ORM**.

## Setup (5 minutes)

### 1. Get Your API Keys

**Supabase** (Database + Auth)
- Go to https://supabase.com/dashboard
- Create/select project
- Get from **Settings → Database**:
  - Connection string (use "Connection pooling" → "Transaction" mode)
- Get from **Settings → API**:
  - Project URL
  - anon/public key
  - service_role key

**Pinecone** (Vector DB)
- Sign up at https://www.pinecone.io
- Create index: `waflow-knowledge` (dimensions: 1536, metric: cosine)
- Copy API key

**OpenRouter** (AI Models)
- Sign up at https://openrouter.ai
- Create API key

### 2. Configure Environment

Edit `.env`:
```bash
DATABASE_URL=postgresql://postgres.xxx:[password]@aws-0-region.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
PINECONE_API_KEY=your-pinecone-key
OPENROUTER_API_KEY=your-openrouter-key
```

### 3. Install & Setup

```bash
# Install dependencies
npm install

# Generate database migrations
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Start Development

```bash
npm run dev
```

Opens at: **http://localhost:5000**

✅ Frontend + Backend on **ONE PORT**
✅ Hot reload works
✅ No CORS issues

## Project Structure

```
waflow/
├── src/
│   ├── client/              # React frontend (already there!)
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── server/              # Express backend
│       ├── db/              # Drizzle ORM
│       ├── routes/          # API routes
│       ├── services/        # Business logic
│       └── middleware/      # Auth middleware
├── drizzle/                 # Generated migrations
├── dist/                    # Build output
├── package.json             # Unified deps
└── .env                     # Your config
```

## Available Commands

```bash
npm run dev          # Start dev server (port 5000)
npm run build        # Build for production
npm start            # Run production server
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio
```

## How It Works

### Development
- Vite middleware integrated into Express
- Changes auto-reload
- API at `/api/*`
- Frontend at `/`

### Production
```bash
npm run build  # Builds React to dist/public
npm start      # Serves everything on port 5000
```

## Features Ready

✅ **Authentication** - Supabase Auth
✅ **WhatsApp** - Multi-user QR connection
✅ **Knowledge Base** - Upload docs/URLs
✅ **AI Agents** - Create & manage agents
✅ **Drizzle ORM** - Type-safe database
✅ **TypeScript** - Full type safety
✅ **Single Port** - Simplified deployment

## Troubleshooting

**TypeScript errors?**
```bash
npm install
```

**Database connection failed?**
- Check DATABASE_URL in .env
- Use "Connection pooling" URL from Supabase
- Verify password is correct

**Port 5000 in use?**
```bash
# Change in .env
PORT=3000
```

**Build errors?**
```bash
rm -rf dist node_modules
npm install
npm run build
```

## Next Steps

1. Edit `.env` with your keys
2. Run `npm install`
3. Run `npm run db:migrate`  
4. Run `npm run dev`
5. Open http://localhost:5000

## Need Help?

Check:
- [README.md](README.md) - Full documentation
- [SETUP.md](SETUP.md) - Detailed setup guide
- Database schema: `src/server/db/schema.ts`
- API routes: `src/server/routes/*.ts`

---

**You're all set! 🎉**

Run `npm run dev` to start building!

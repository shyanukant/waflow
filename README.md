# WAFlow - WhatsApp Automation Agent Platform

**Unified Application** with Drizzle ORM - Single port deployment

## Architecture

- **Frontend**: React + TypeScript (served from `/dist/public` in production)
- **Backend**: Express + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth
- **Vector DB**: Pinecone
- **AI**: OpenRouter

## Project Structure

```
waflow/
├── src/
│   ├── client/           # React frontend
│   │   ├── components/
│   │   ├── services/
│   │   ├── index.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── server/           # Express backend
│       ├── db/
│       │   ├── schema.ts     # Drizzle schema
│       │   ├── index.ts      # DB connection
│       │   └── migrate.ts    # Migration runner
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       └── index.ts          # Server entry
├── dist/
│   ├── public/          # Built React app
│   └── server/          # Compiled TypeScript
├── drizzle/             # Generated migrations
├── package.json         # Unified dependencies
├── tsconfig.json        # Client TypeScript config
├── tsconfig.server.json # Server TypeScript config
├── vite.config.ts       # Vite build config
└── drizzle.config.ts    # Drizzle Kit config
```

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Supabase account
- Pinecone account
- OpenRouter API key

### 2. Setup Database

Get your Supabase PostgreSQL connection string:
1. Go to Supabase Project Settings > Database
2. Copy the "Connection string" under "Connection pooling"
3. Replace `[YOUR-PASSWORD]` with your database password

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment

Copy `.env.example` to `.env` and fill in:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Supabase Auth
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Pinecone
PINECONE_API_KEY=your_key
PINECONE_INDEX_NAME=waflow-knowledge

# OpenRouter
OPENROUTER_API_KEY=your_key
```

### 5. Run Migrations

```bash
# Generate migration files
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Open Drizzle Studio
npm run db:studio
```

### 6. Development

```bash
# Run both frontend and backend
npm run dev

# Frontend: http://localhost:5173
# Backend: http://localhost:5000
```

### 7. Production Build

```bash
# Build both client and server
npm run build

# Start production server
npm start

# App runs on single port: http://localhost:5000
```

## Key Changes from Previous Version

### ✅ Single Port
- Dev: Frontend proxies to backend (5173 → 5000)
- Prod: Express serves React build (port 5000 only)

### ✅ Drizzle ORM
- Type-safe database queries
- Automatic migration generation
- Better performance with prepared statements

### ✅ TypeScript
- Full type safety across frontend and backend
- Better IDE support and refactoring

### ✅ Unified Dependencies
- Single `package.json`
- Simpler dependency management
- Easier deployment

## Development Commands

```bash
# Development
npm run dev              # Run both frontend & backend
npm run dev:client       # Run only frontend (Vite)
npm run dev:server       # Run only backend (tsx watch)

# Build
npm run build            # Build production bundle
npm run build:client     # Build React app
npm run build:server     # Compile TypeScript server

# Database
npm run db:generate      # Generate migrations from schema
npm run db:migrate       # Run pending migrations
npm run db:studio        # Open Drizzle Studio

# Production
npm start                # Run production server
```

## Database Schema (Drizzle)

The schema is defined in `src/server/db/schema.ts`:

- **users** - User profiles (linked to Supabase Auth)
- **whatsapp_sessions** - WhatsApp connection metadata
- **knowledge_items** - Uploaded documents and URLs
- **agents** - AI agent configurations
- **conversations** - Message history

All tables have proper relations and type inference.

## API Endpoints

Same as before, all under `/api`:

- `/api/auth/*` - Authentication
- `/api/whatsapp/*` - WhatsApp management
- `/api/knowledge/*` - Knowledge base
- `/api/agents/*` - Agent CRUD

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_INDEX_NAME` | Pinecone index name |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | Environment (development/production) |

## Deployment

### Option 1: Railway / Render

1. Connect your Git repository
2. Set environment variables
3. Build command: `npm run build`
4. Start command: `npm start`
5. Port: Auto-detected or set `PORT` variable

### Option 2: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Option 3: VPS (DigitalOcean, etc.)

```bash
# Install dependencies
npm ci

# Build
npm run build

# Run with PM2
pm2 start dist/server/index.js --name waflow

# Or with systemd service
```

## Migration from Previous Version

If you have the old separate backend/frontend setup:

1. **Database**: Already in Supabase PostgreSQL - just get connection string
2. **Frontend code**: Already moved to `src/client/`
3. **Backend code**: Needs conversion to TypeScript with Drizzle queries
4. **No data migration needed** - Drizzle uses existing tables

## Drizzle ORM Usage Examples

```typescript
// Insert
await db.insert(agents).values({
  userId: 'user-id',
  name: 'My Agent',
  modelName: 'gpt-3.5-turbo'
});

// Query
const userAgents = await db.query.agents.findMany({
  where: eq(agents.userId, userId),
  with: {
    user: true,
    whatsappSession: true
  }
});

// Update
await db.update(agents)
  .set({ isActive: true })
  .where(eq(agents.id, agentId));

// Delete
await db.delete(agents)
  .where(eq(agents.id, agentId));
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Ensure IP is whitelisted (if using connection pooling)

### Migration Errors
- Run `npm run db:generate` after schema changes
- Check `drizzle/` folder for generated migrations
- Run `npm run db:migrate` to apply

### Build Errors
- Clear `dist/` and rebuild: `rm -rf dist && npm run build`
- Check TypeScript errors: `tsc --noEmit`

## License

MIT

---

Built with ❤  using **React**, **Express**, **Drizzle ORM**, and **AI**

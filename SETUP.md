# WAFlow - Single Port Setup

## Running the App

Everything now runs on **one port: 5000** in both development and production!

### Development
```bash
npm run dev
```
- Opens http://localhost:5000
- Hot reload enabled (Vite middleware integrated)
- API and frontend served together

### Production
```bash
npm run build
npm start
```
- Builds React app to `dist/public`
- Compiles TypeScript server to `dist/server`
- Runs on http://localhost:5000

## What Changed

✅ **Single Port (5000)** - No more separate frontend/backend servers
✅ **Vite Middleware in Dev** - Hot reload still works
✅ **Simpler Scripts** - Just `npm run dev` to start everything
✅ **Same URL** - Frontend and API on same origin (no CORS issues)

## Commands

```bash
# Development (single command!)
npm run dev              # Runs everything on port 5000

# Build for production
npm run build            # Builds both client and server

# Start production
npm start                # Serves on port 5000

# Database
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
npm run db:studio        # Open Drizzle Studio
```

## Architecture

```
Development (npm run dev):
┌─────────────────────────────┐
│   Express Server :5000      │
│                             │
│  ┌─────────────────────┐   │
│  │  API Routes (/api)  │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  Vite Middleware    │   │
│  │  (Hot Reload)       │   │
│  └─────────────────────┘   │
└─────────────────────────────┘

Production (npm start):
┌─────────────────────────────┐
│   Express Server :5000      │
│                             │
│  ┌─────────────────────┐   │
│  │  API Routes (/api)  │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  Static Files       │   │
│  │  (dist/public)      │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

## Benefits

- 🎯 **Simpler deployment** - One port, one process
- 🚀 **Faster development** - No proxy delays
- 🔒 **No CORS issues** - Same origin for everything
- 💻 **Less memory** - Single Node process
- 📦 **Easier to understand** - One entry point

## Troubleshooting

### Port 5000 already in use?
```bash
# Change port in .env
PORT=3000

# Or kill process using port 5000
lsof -ti:5000 | xargs kill -9
```

### Vite not found in dev?
```bash
npm install
```

### Frontend changes not reloading?
- Vite HMR works through the server
- Check console for errors
- Try hard refresh (Ctrl+Shift+R)

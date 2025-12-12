# WAFlow

AI-powered WhatsApp Automation Agent Platform - Create intelligent chatbots with custom knowledge bases.
[![Sponsor](https://img.shields.io/badge/💖%20Sponsor-Support%20My%20Work-ff69b4?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/shyanukant)
## 🎬 Demo Video

[![WAFlow Demo](https://img.youtube.com/vi/-anZcc3O_MQ/maxresdefault.jpg)](https://youtu.be/-anZcc3O_MQ)

**[Watch the full demo on YouTube →](https://youtu.be/-anZcc3O_MQ)**

## ✨ Features

- 🤖 **AI-Powered Agents** - Create intelligent WhatsApp chatbots
- 📚 **Knowledge Base** - Train agents with documents, URLs, and text
- 🔗 **Easy WhatsApp Integration** - Connect via QR code scan
- 📊 **Analytics Dashboard** - Track conversations and leads
- 🎯 **Lead Capture** - Automatically collect customer information
- 🚀 **Real-time Responses** - Instant AI-powered replies

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (Supabase)
- Pinecone account
- OpenRouter API key

### Installation

```bash
# Clone the repository
git clone https://github.com/shyanukant/waflow.git
cd waflow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=your-openrouter-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=your-index-name
```

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Supabase), Drizzle ORM
- **AI**: OpenRouter (GPT-3.5/4)
- **Vector DB**: Pinecone
- **WhatsApp**: Baileys

## 📁 Project Structure

```
waflow/
├── src/
│   ├── client/          # React frontend
│   │   ├── components/  # UI components
│   │   └── services/    # API services
│   └── server/          # Express backend
│       ├── db/          # Database schema
│       ├── routes/      # API routes
│       └── services/    # Business logic
├── dist/                # Production build
└── sessions/            # WhatsApp sessions
```

## 🚀 Deployment

### Render

1. Connect your GitHub repo to Render
2. Set build command: `npm ci && npm run build`
3. Set start command: `npm start`
4. Add environment variables in Render dashboard
5. Deploy!

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Made with ❤️ by [Shyanukant](https://github.com/shyanukant)

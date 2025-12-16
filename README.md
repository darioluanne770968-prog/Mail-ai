# Mail AI - Smart Email Assistant

AI-powered email assistant browser extension for Gmail and Outlook.

## Features

- **Smart Reply** - Generate AI-powered email replies with customizable tone and length
- **Email Summarization** - Get quick summaries of long emails and threads
- **Compose Assistant** - Draft new emails from simple descriptions
- **Content Improvement** - Fix grammar, make professional, expand, or shorten text
- **Multi-language Support** - Translate and work with emails in multiple languages
- **Sentiment Analysis** - Understand the tone and urgency of emails

## Tech Stack

### Browser Extension
- **Framework**: Plasmo
- **UI**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand

### Backend API
- **Runtime**: Node.js
- **Framework**: Fastify
- **Database**: PostgreSQL + Prisma
- **Cache**: Redis
- **AI**: OpenAI GPT / Anthropic Claude

## Project Structure

```
Mail-ai/
├── apps/
│   ├── extension/          # Browser extension
│   │   ├── src/
│   │   │   ├── background/ # Service worker
│   │   │   ├── contents/   # Content scripts (Gmail, Outlook)
│   │   │   ├── popup/      # Extension popup
│   │   │   ├── options/    # Settings page
│   │   │   ├── components/ # React components
│   │   │   ├── hooks/      # Custom hooks
│   │   │   ├── services/   # API services
│   │   │   └── types/      # TypeScript types
│   │   └── package.json
│   │
│   └── server/             # Backend API
│       ├── src/
│       │   ├── config/     # Configuration
│       │   ├── controllers/# Request handlers
│       │   ├── routes/     # API routes
│       │   ├── services/   # Business logic
│       │   │   └── ai/     # AI service + prompts
│       │   ├── middleware/ # Express middleware
│       │   └── utils/      # Utilities
│       ├── prisma/         # Database schema
│       └── package.json
│
├── packages/
│   └── shared/             # Shared code
│
├── docker-compose.yml
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (for local development with DB)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-repo/mail-ai.git
cd mail-ai
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Start the development servers:

```bash
# Start backend services
docker-compose up -d db redis

# Start API server
pnpm dev:server

# In another terminal, start extension
pnpm dev:extension
```

5. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `apps/extension/build/chrome-mv3-dev`

## API Endpoints

### AI Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ai/reply` | Generate email reply |
| POST | `/api/v1/ai/compose` | Compose new email |
| POST | `/api/v1/ai/summarize` | Summarize email |
| POST | `/api/v1/ai/analyze` | Analyze email sentiment |
| POST | `/api/v1/ai/improve` | Improve content |

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `JWT_SECRET` | JWT signing secret | - |
| `CORS_ORIGIN` | Allowed CORS origins | * |

## Building for Production

### Extension

```bash
pnpm build:extension
```

The built extension will be in `apps/extension/build/chrome-mv3-prod`.

### Server

```bash
pnpm build:server
# or
docker-compose build api
```

## Deployment

### Using Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api
```

### Manual Deployment

1. Build the server:
```bash
cd apps/server
pnpm build
```

2. Run database migrations:
```bash
pnpm db:migrate
```

3. Start the server:
```bash
NODE_ENV=production node dist/index.js
```

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines first.

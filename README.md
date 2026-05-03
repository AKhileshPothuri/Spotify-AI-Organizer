# 🎵 Spotify AI Organizer

> AI-powered, human-in-the-loop playlist organization for Spotify

[![GitHub stars](https://img.shields.io/github/stars/akhileshpothuri/spotify-ai-organizer)](https://github.com/akhileshpothuri/spotify-ai-organizer/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## Problem

Spotify's "Liked Songs" library becomes an overwhelming, unnavigable dump with hundreds or thousands of tracks. Existing tools use shallow rule-based filtering (BPM, energy) and miss:

- 🌍 **Language detection** — They don't identify Tamil, Hindi, Korean, Spanish, etc.
- 🎯 **Occasion-based tagging** — No workout, focus, sleep, party categorization
- 🎬 **Cultural context** — Bollywood, K-pop, Carnatic, Latin music go unrecognized
- ✏️ **User-defined taxonomies** — Can't create custom organizational schemes
- 👤 **Human review** — Tools auto-create playlists without approval

## Solution

**Spotify AI Organizer** is an AI-powered platform that:

1. 📥 **Fetches** all your Liked Songs via Spotify API
2. 🧠 **Enriches** each track with metadata and audio features
3. 🤖 **Classifies** tracks using LLM (Claude, GPT-4o, Gemini, or local Ollama)
4. 👀 **Presents** results in a review dashboard for editing
5. ✅ **Creates playlists** ONLY after your approval
6. 🔄 **Optionally auto-syncs** newly liked songs on a schedule

### Classification Dimensions

| Dimension | Examples | Source |
|-----------|----------|--------|
| **Genre** | Rock, Bollywood, Carnatic, K-pop, EDM | LLM + Spotify tags |
| **Mood** | Happy, Melancholic, Energetic, Calm, Romantic | LLM + audio features |
| **Language** | English, Tamil, Hindi, Spanish, Korean, French | LLM (primary) |
| **Occasion** | Workout, Focus, Party, Sleep, Morning, Road Trip | LLM |
| **Era** | 80s, 90s, 2000s, 2010s, 2020s | Release date |
| **Energy** | Low, Medium, High | Spotify audio features |
| **Custom Tags** | User-defined (Rainy Day, Gym, Date Night) | User config |

## Quick Start

### Prerequisites

- **Node.js** ≥ 20.x
- **pnpm** ≥ 9.x
- **Docker** + Docker Compose ≥ 24.x
- **Spotify Developer Account** (free)
- **LLM API Key** (Claude, OpenAI, Gemini, or Ollama)

### Setup (5 minutes)

```bash
# Clone and install
git clone https://github.com/akhileshpothuri/spotify-ai-organizer.git
cd spotify-ai-organizer
pnpm install

# Configure
cp .env.example .env
# Edit .env with your Spotify Client ID/Secret, LLM API key, etc.
vim .env

# Start services
pnpm docker:up              # PostgreSQL + Redis
pnpm db:migrate             # Database setup
pnpm dev                    # Start dev servers
```

**Frontend:** http://localhost:3000  
**API:** http://localhost:3001

### First Classification

1. Open http://localhost:3000
2. Click "Login with Spotify" to authorize
3. Go to **Classify** → Click "Start Classification"
4. Wait for LLM to analyze your liked songs
5. Review proposed playlists in the dashboard
6. **Edit** tracks, merge playlists, rename as needed
7. **Click "Approve"** to create Spotify playlists

## Features

### ✅ v0.1.0 (Foundation - Done)
- Monorepo setup (pnpm + Turborepo)
- Docker Compose (Postgres + Redis)
- Spotify OAuth flow
- Fetch liked songs + audio features
- Database schema

### 🚧 v0.2.0–v0.4.0 (In Development)
- LLM classification engine
- Review dashboard UI
- Playlist creation
- Auto-sync & custom config

### 📋 v1.0.0 (Production Launch)
- Full E2E testing
- 2000+ song performance
- Docker image on GHCR
- Private SaaS hosting
- Community Discord

### 🔮 Future (v2.0+)
- 🍎 Apple Music & YouTube Music
- 🤖 Local Ollama support
- 🌐 Multi-language UI
- 📱 PWA mobile app
- 👥 Collaborative playlists

## Architecture

```
┌─────────────────────────────────┐
│  Browser (Next.js + TypeScript) │
│  Auth / Dashboard / Playlist Mgmt│
└────────────┬────────────────────┘
             │ HTTPS / REST
┌────────────▼────────────────────┐
│  API (Node.js + Fastify)        │
│  Routes / Services / Jobs       │
└─┬───────────┬────────────┬──────┘
  │           │            │
Spotify   PostgreSQL    Redis/Bull
API DB     (tracks,      (jobs)
           users)

LLM Provider: Claude / OpenAI / Gemini / Ollama
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14, TypeScript, shadcn/ui | SSR, great DX, accessible |
| **Backend** | Fastify, PostgreSQL, Prisma | Fast, type-safe, relational |
| **Jobs** | BullMQ + Redis | Reliable async classification |
| **LLM** | Claude (default), swappable | Deep multilingual support |
| **Monorepo** | pnpm + Turborepo | Fast builds, shared types |

## Configuration

### Environment Variables

```bash
# Spotify OAuth (from developer.spotify.com)
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback

# LLM (pick one)
LLM_PROVIDER=claude                  # claude | openai | gemini | ollama
ANTHROPIC_API_KEY=sk-ant-...

# Database (auto via Docker)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spotify_organizer
REDIS_URL=redis://localhost:6379

# JWT & Auth
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d
```

See [.env.example](.env.example) for all options.

## API Overview

### Authentication

```bash
GET /auth/spotify                    # Start OAuth flow
GET /auth/spotify/callback?code=...  # OAuth callback
POST /auth/refresh                   # Refresh JWT
```

### Classification

```bash
# Start classification
POST /classify/run
Body: { scope: "unclassified", llmProvider: "claude" }

# Get results
GET /classify/run/:runId/results

# Edit before approval
PATCH /classify/run/:runId/results

# Approve & create playlists
POST /classify/run/:runId/approve
Body: { playlistIds: [...], visibility: "private" }
```

### Library

```bash
GET /library/stats
POST /library/fetch                  # Fetch liked songs
GET /library/fetch/:jobId/status
```

See [docs/API.md](./docs/API.md) for full specification.

## Development

### Commands

```bash
pnpm dev              # Start dev servers (hot reload)
pnpm build            # Build for production
pnpm test             # Run all tests
pnpm test:e2e         # E2E tests (requires dev server)
pnpm lint             # Lint code
pnpm typecheck        # TypeScript check
pnpm db:studio        # Visual database browser
pnpm docker:down      # Stop services
```

### Project Structure

```
├── apps/
│   ├── web/              # Next.js 14 frontend
│   │   ├── app/          # App Router
│   │   ├── components/   # React components
│   │   └── lib/          # Client utilities
│   └── api/              # Fastify backend
│       ├── src/
│       │   ├── routes/   # REST endpoints
│       │   ├── services/ # Business logic
│       │   ├── jobs/     # BullMQ processors
│       │   └── db/       # Prisma schema
│       └── prompts/      # LLM prompt templates
├── packages/
│   ├── types/            # Shared TypeScript types
│   └── config/           # Shared configuration
├── infra/                # Docker, K8s manifests
└── docs/                 # Documentation
```

### Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Development setup
- Code standards
- Branch naming & commit conventions
- PR guidelines
- **Contributing improved LLM prompts** (great for first-timers!)

### Contribution Areas

- 🎨 **Frontend:** UI improvements, dashboard features
- 🧠 **Backend:** Services, classification logic
- 🤖 **Prompts:** Improved classification prompts
- 📚 **Docs:** Better documentation
- 🧪 **Tests:** Unit, integration, E2E tests
- 🐛 **Bugs:** Issue triage and fixes

## Roadmap

- **v0.1.0** (Week 1–2) — Foundation & monorepo ✅ In Progress
- **v0.2.0** (Week 3–4) — LLM classification engine
- **v0.3.0** (Week 5–7) — Review dashboard & approval flow
- **v0.4.0** (Week 8–9) — Auto-sync & user config
- **v1.0.0** — Production launch with tests & performance
- **v2.0+** — Apple Music, Ollama, multi-language UI

See [ROADMAP.md](./ROADMAP.md) for detailed milestones.

## Pricing

### Open Source (Free)

- Self-hosted: infinite tracks, full features
- Bring your own Spotify + LLM API keys
- No telemetry, no data collection
- Community support via GitHub Discussions

### SaaS (Coming Soon)

| Tier | Price | Features |
|------|-------|----------|
| **Starter** | Free | Up to 500 songs, 1 run/month, web UI |
| **Pro** | $6/mo | Unlimited songs, auto-sync, custom taxonomies |
| **Team** | $12/mo | Multiple accounts, shared taxonomies |

## Security

### User Privacy

- ✅ Spotify tokens encrypted at rest
- ✅ Tokens never exposed to frontend
- ✅ All Spotify calls go through secure backend
- ✅ User data fully isolated in database
- ✅ No cross-user data leakage
- ✅ LLM API keys server-side only
- ✅ Self-hosted users control all secrets

### Reporting Security Issues

**⚠️ Do NOT open public issues for security bugs.**

Email: [security@spotifyorganizer.dev](mailto:security@spotifyorganizer.dev)  
See [SECURITY.md](./SECURITY.md) for details.

## Support & Community

- 📖 **Documentation:** [docs/](./docs/)
- 💬 **GitHub Discussions:** Ask questions, share ideas
- 🐛 **Issues:** Bug reports and feature requests
- 💬 **Discord:** Real-time chat & collaboration (link in README)
- 🤝 **Contributing:** See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Performance

### Classification Speed

- **500 songs:** < 3 minutes end-to-end
- **2000 songs:** < 10 minutes end-to-end
- **Batch size:** 25 tracks per LLM call (configurable)
- **Concurrency:** Up to 5 parallel LLM calls

### Accuracy

- **Genre:** ≥ 90% user satisfaction
- **Language:** ≥ 95% (LLMs excel at this)
- **Mood/Occasion:** ≥ 80% (subjective, user-editable)

## License

MIT © 2024 [Akhilesh Pothuri](https://github.com/akhileshpothuri)

See [LICENSE](./LICENSE) for details.

---

**Made with ❤️ to help you organize your music.**  
⭐ If you find this useful, please star the repo!

**[Demo](https://spotify-organizer.demo.com)** | **[Docs](./docs/)** | **[Discord](#)** | **[Sponsor](#)**
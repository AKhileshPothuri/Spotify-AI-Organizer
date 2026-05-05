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

## Screenshots

![Dashboard — sync, classify, and track progress](assets/dashboard.png)

![Review panel — browse, edit, and approve classifications before anything hits Spotify](assets/review_panel.png)

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

# Configure root env (Fastify API)
cp .env.example .env
# Edit .env — add your Spotify Client ID/Secret and LLM API key

# Configure Next.js env (Next.js only loads .env from its own directory)
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local — same values as .env

# Spotify OAuth redirect URI setup:
# Spotify's API accepts http://127.0.0.1 for local dev — no HTTPS tunnel needed.
# In your Spotify app dashboard (developer.spotify.com), add this exact redirect URI:
#   http://127.0.0.1:3000/api/auth/callback
# Make sure both .env files have: SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback

# Start infrastructure
pnpm docker:up                              # PostgreSQL + Redis

# Run database migrations
pnpm --filter @spotify-organizer/api db:generate
pnpm --filter @spotify-organizer/api db:migrate

# Start dev servers
pnpm dev
```

**Frontend:** http://127.0.0.1:3000  
**API:** http://localhost:3001

> **Tip:** Use `http://127.0.0.1:3000` (not `localhost`) in your browser — Spotify redirects back to the exact origin it received, and the cookie used for PKCE requires origin consistency.

### First Classification

1. Open `http://127.0.0.1:3000` and click **Login with Spotify**
2. On the Dashboard, click **Sync Now** — imports all your liked songs
3. Once synced, click **Start Classification** — Claude analyzes every track
4. When the run completes, click **Review results →**
5. Browse classifications by Genre, Mood, Language, Era, Energy, Occasion
6. Click **Approve All** to generate playlist proposals
7. Rename any playlist, then click **Push to Spotify**

## Features

### ✅ v0.1.0 — Foundation
- Monorepo (pnpm + Turborepo), Docker Compose (Postgres + Redis)
- Spotify OAuth PKCE — Next.js API routes, Fastify JWT, token refresh
- Database schema: User, Track, Classification, ClassificationRun, PlaylistProposal

### ✅ v0.2.0 — Classification Engine
- Full Spotify liked-songs sync to PostgreSQL (paginated streaming, upsert)
- LLM classification via Claude — genre, mood, language, occasion, era, energy level
- Background processing with live progress polling (no infrastructure dependency)
- Dashboard with Sync + Classify cards and real-time progress bars

### ✅ v0.3.0 — Review Dashboard
- Classification review across 6 dimensions (Genre, Mood, Language, Era, Energy, Occasion)
- Track browser with album art, full tag set, and Spotify deep links per track
- One-click **Approve All** — groups classifications into `PlaylistProposal` DB records

### ✅ v0.4.0 — Playlist Creation
- Push approved proposals to Spotify as real playlists with one click
- Background worker with live progress polling; run status tracks `CREATING_PLAYLISTS → DONE`

### ✅ v0.5.0 — Custom Taxonomy & Playlist Naming
- **Settings page** — constrain Claude to your own genre, mood, occasion, language, era, and energy-level lists; leave a dimension blank to let Claude choose freely
- **Inline renaming** — edit any playlist name after approval, before pushing to Spotify
- `PATCH /api/classify/:runId/proposals/:proposalId` rename endpoint

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
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS | App Router, server-side auth |
| **Backend** | Fastify, PostgreSQL, Prisma | Fast, type-safe, relational |
| **Background jobs** | `void asyncFn()` + polling (BullMQ in v0.4) | No infra overhead for current scale |
| **LLM** | Claude (default), swappable | Deep multilingual + cultural classification |
| **Monorepo** | pnpm workspaces + Turborepo | Fast installs, shared types |

## Configuration

### Environment Variables

```bash
# Spotify OAuth (from developer.spotify.com)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback  # use 127.0.0.1, not localhost

# LLM (pick one)
LLM_PROVIDER=claude                  # claude | openai | gemini | ollama
ANTHROPIC_API_KEY=sk-ant-your_key_here

# Database (auto via Docker)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spotify_organizer
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=run-openssl-rand-base64-32-to-generate-this
JWT_EXPIRES_IN=7d

# URLs
NEXT_PUBLIC_API_URL=http://localhost:3001
```

See [.env.example](.env.example) for all options.

## API Overview

### Authentication

OAuth is handled by Next.js API routes (server-side, keeps client secret hidden):

```bash
GET  /api/auth/login                 # Redirects browser to Spotify (PKCE)
GET  /api/auth/callback?code=...     # Spotify redirects here; exchanges code, returns JWT
```

The Fastify API exposes one auth endpoint (called server-to-server by Next.js):

```bash
POST /api/auth/token                 # Receives Spotify tokens, upserts user, returns app JWT
```

### Library

```bash
GET  /api/library/stats              # Track count (DB + live Spotify total), run count, playlist count
POST /api/library/sync               # Import all liked songs from Spotify → DB (background, 202)
GET  /api/library/sync/status        # Poll DB track count during a sync
```

### Classification

```bash
POST /api/classify/run               # Start a classification run (background, 202) → { runId }
GET  /api/classify/:runId            # Poll run status + progress
GET  /api/classify/:runId/summary    # Aggregated counts per dimension (for review sidebar)
GET  /api/classify/:runId/tracks     # Paginated tracks; filter by ?dimension=genre&value=Pop
POST /api/classify/:runId/approve    # Generate PlaylistProposal records, mark run APPROVED
```

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
│   ├── web/                          # Next.js 14 frontend
│   │   └── src/app/
│   │       ├── api/auth/             # OAuth routes (login, callback) — PKCE, server-side
│   │       ├── dashboard/            # Main app UI (sync, classify, stats)
│   │       │   └── review/[runId]/   # Classification review page
│   │       ├── page.tsx              # Landing page
│   │       └── layout.tsx
│   └── api/                          # Fastify backend
│       ├── src/
│       │   ├── config/index.ts       # Zod-validated env config
│       │   ├── db.ts                 # Prisma client singleton
│       │   ├── index.ts              # All routes + background workers
│       │   └── services/
│       │       ├── spotify.ts        # Token refresh, liked-songs streaming
│       │       ├── library.ts        # syncLibrary() — upserts tracks to DB
│       │       └── llm.ts            # classifyBatch() — Anthropic SDK
│       └── prisma/
│           └── schema.prisma         # DB schema
├── packages/
│   └── types/                        # Shared TypeScript types
├── docker-compose.yml                # PostgreSQL + Redis
└── .env.example                      # Annotated env template
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

- **v0.1.0** — Foundation & monorepo ✅
- **v0.2.0** — LLM classification engine ✅
- **v0.3.0** — Review dashboard & approval flow ✅
- **v0.4.0** — Playlist creation (push to Spotify) ✅
- **v0.5.0** — Custom taxonomy & playlist naming ✅
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

MIT © 2026 [Akhilesh Pothuri](https://github.com/AKhileshPothuri)

See [LICENSE](./LICENSE) for details.

---

**Made with ❤️ to help you organize your music.**  
⭐ If you find this useful, please star the repo!

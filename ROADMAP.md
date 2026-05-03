# Roadmap

Spotify AI Organizer development roadmap. Dates are **targets**, not guarantees. Community can contribute to accelerate timelines.

## v0.1.0 — Foundation (Week 1–2) 🚧 IN PROGRESS

### Core
- ✅ Monorepo setup (pnpm workspaces + Turborepo)
- ✅ Docker Compose (PostgreSQL 16, Redis 7)
- ✅ Prisma schema (User, Track, Classification, ClassificationRun, PlaylistProposal)
- ✅ TypeScript configuration (root + per-package)
- ✅ ESLint, Prettier setup
- ✅ GitHub Actions CI/CD templates
- ✅ Issue templates (bug, feature, prompt)

### Spotify Integration
- 🚧 OAuth 2.0 flow (authorization, token refresh)
- 🚧 Fetch liked songs endpoint
- 🚧 Audio features enrichment
- 🚧 Rate limit handling

### Documentation
- ✅ README.md
- ✅ CONTRIBUTING.md
- ✅ .env.example
- 🚧 Setup guide
- 🚧 API specification

### Testing Infrastructure
- 🚧 Vitest setup
- 🚧 Test utilities and fixtures
- 🚧 Database test setup

---

## v0.2.0 — Classification Engine (Week 3–4)

### LLM Integration
- [ ] LLM abstraction layer interface
- [ ] Claude provider implementation
- [ ] OpenAI provider implementation
- [ ] Gemini provider implementation (optional)
- [ ] Ollama provider for local models

### Classification Service
- [ ] Batch processing (25 tracks per call)
- [ ] Retry logic with exponential backoff
- [ ] Parallel batch execution (up to 5 concurrent)
- [ ] Confidence scoring (0–1 per classification)

### BullMQ Job Processing
- [ ] Job queue setup
- [ ] Classification job processor
- [ ] Job persistence and retry
- [ ] Progress tracking

### Prompts
- [ ] System prompt v1.0 (versioning)
- [ ] User prompt v1.0 (batching template)
- [ ] Classification result formatting (strict JSON)
- [ ] Prompt versioning system

### CLI Tools
- [ ] `pnpm classify:test` command
- [ ] Classification eval suite
- [ ] Sample track fixtures
- [ ] Results visualization

### Testing
- [ ] LLM provider tests (mocked)
- [ ] Classification logic tests
- [ ] Job queue tests
- [ ] E2E classification flow

---

## v0.3.0 — Review Dashboard (Week 5–7)

### Frontend (Next.js)
- [ ] App Router setup
- [ ] Auth context (Spotify OAuth)
- [ ] Login/callback pages
- [ ] Dashboard layout

### Classification Results UI
- [ ] Proposed playlists grid view
- [ ] Track list per playlist (expandable)
- [ ] Classification details (genre, mood, language, etc.)
- [ ] Confidence badges and warnings
- [ ] Taxonomy dimension switcher

### Editing Features
- [ ] Drag-and-drop tracks between playlists
- [ ] Rename playlists inline
- [ ] Delete playlist
- [ ] Remove track from playlist
- [ ] Merge playlists
- [ ] Batch edit modal

### Approval Flow
- [ ] Checkbox select which playlists to create
- [ ] Visibility selector (public/private)
- [ ] Name prefix input (e.g., "AI: ")
- [ ] Description auto-generation toggle
- [ ] Confirmation modal
- [ ] Progress bar during creation
- [ ] Success screen with Spotify links

### API Implementation
- [ ] GET `/classify/run/:runId/results`
- [ ] PATCH `/classify/run/:runId/results` (edits)
- [ ] POST `/classify/run/:runId/approve` (create playlists)
- [ ] GET `/classify/run/:runId/approve/status`

### Spotify Playlist Creation
- [ ] Create playlists via Spotify API
- [ ] Handle mixed public/private batches
- [ ] Track duplication check
- [ ] Retry logic for failures

### Testing
- [ ] Frontend component tests
- [ ] API route tests
- [ ] E2E tests (Playwright)
- [ ] Spotify API mock

---

## v0.4.0 — Auto-Sync & Config (Week 8–9)

### User Config UI
- [ ] Config page / modal
- [ ] LLM provider selector
- [ ] Active dimensions checkboxes
- [ ] Custom taxonomy editor
- [ ] Save/load config

### Auto-Sync
- [ ] Scheduled re-classification (cron via BullMQ)
- [ ] Detect new liked songs
- [ ] Incremental classification (only new tracks)
- [ ] Auto-create approved dimensions (if enabled)
- [ ] Email/webhook notifications

### Custom Taxonomy
- [ ] User-defined dimension names
- [ ] User-defined category values
- [ ] Prompt customization for custom dims
- [ ] Store and persist taxonomies

### Library History
- [ ] List past classification runs
- [ ] View results per run
- [ ] Compare runs side-by-side
- [ ] Re-run classification on old tracks

### Notifications
- [ ] In-app notifications
- [ ] Email on classification done
- [ ] Webhook triggers (optional)

### Testing
- [ ] Auto-sync job tests
- [ ] Config persistence tests
- [ ] Custom taxonomy tests

---

## v1.0.0 — Production Launch

### Quality & Performance
- [ ] 80%+ test coverage (services, jobs, routes)
- [ ] Performance tested: 2000+ songs in <10 min
- [ ] Classify 500 songs in <3 min
- [ ] Bundle size optimization
- [ ] Core Web Vitals passing

### DevOps & Hosting
- [ ] Docker image published to GHCR
- [ ] docker-compose.prod.yml with Nginx
- [ ] Kubernetes manifests (optional)
- [ ] Database migrations in production
- [ ] Health check endpoints

### Documentation
- [ ] Comprehensive API docs
- [ ] Deployment guide (Docker, K8s)
- [ ] Troubleshooting guide
- [ ] Prompt engineering guide
- [ ] Contributing guide finalized

### Community
- [ ] Public Discord server
- [ ] GitHub Discussions enabled
- [ ] Security policy (SECURITY.md)
- [ ] Code of Conduct

### SaaS Launch (Optional)
- [ ] Multi-org isolation
- [ ] Billing system (if pursuing SaaS)
- [ ] Starter tier ($0/mo)
- [ ] Pro tier ($6/mo)
- [ ] Hosted at Vercel + Railway / Fly.io

---

## v1.x.0 — Post-Launch (Community-Driven)

### Additional LLM Models
- [ ] Local Ollama support (full offline)
- [ ] Llama 2 integration
- [ ] Mixtral support
- [ ] Custom model prompt tuning

### Music Platforms
- [ ] 🍎 Apple Music integration
- [ ] 🎵 YouTube Music integration
- [ ] 🎧 SoundCloud integration

### UI & UX
- [ ] Multi-language UI (Spanish, Tamil, Korean)
- [ ] Dark mode
- [ ] Mobile-responsive review dashboard
- [ ] PWA support

### Advanced Features
- [ ] Playlist health monitor (find duplicates)
- [ ] Collaborative playlists (share with friends)
- [ ] Taxonomy library (community-curated)
- [ ] Export/import taxonomies
- [ ] Spotify stats dashboard

### Performance
- [ ] Caching layer (Redis)
- [ ] Background job optimization
- [ ] Search indexing (Elasticsearch optional)
- [ ] Analytics dashboard

---

## How to Help

### Easy (Good First Issues)
- 📝 Documentation improvements
- 🪲 Bug fixes
- 🧪 Add test cases
- 🎨 UI polish

### Medium
- 🤖 Prompt improvements (submit via issue)
- ✨ New classification dimensions
- 🧠 LLM provider implementations (Gemini, etc.)
- 📊 Frontend enhancements

### Advanced
- 🏗️ Architecture improvements
- 🚀 Performance optimization
- 🔐 Security hardening
- 📱 Mobile app / PWA

See [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

---

## Tracking Progress

- **GitHub Project Board:** [Projects](https://github.com/akhileshpothuri/spotify-ai-organizer/projects)
- **Discussions:** Ask questions in [GitHub Discussions](https://github.com/akhileshpothuri/spotify-ai-organizer/discussions)
- **Discord:** Real-time updates and collaboration

---

_Last updated: May 3, 2024. Roadmap subject to change based on community feedback and priorities._

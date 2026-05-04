# Roadmap

Spotify AI Organizer development roadmap. Dates are **targets**, not guarantees. Community can contribute to accelerate timelines.

## v0.1.0 — Foundation ✅ DONE

- Monorepo (pnpm workspaces + Turborepo), Docker Compose (PostgreSQL 16, Redis 7)
- Prisma schema: User, Track, Classification, ClassificationRun, PlaylistProposal
- Spotify OAuth PKCE flow — Next.js API routes (`/api/auth/login`, `/api/auth/callback`)
- Fastify JWT auth with token refresh, user upsert
- ESLint, Prettier, TypeScript strict mode, GitHub Actions CI templates

---

## v0.2.0 — Classification Engine ✅ DONE

- Full Spotify liked-songs sync: paginated streaming → PostgreSQL upsert
- LLM classification via Anthropic SDK — genres, moods, language, occasions, era, energy
- Batch processing (25 tracks/call), background `void asyncFn()` pattern
- `GET /api/library/stats`, `POST /api/library/sync`, `POST /api/classify/run`, `GET /api/classify/:runId`
- Dashboard UI: sync card + classify card with live progress bars, polling

---

## v0.3.0 — Review Dashboard ✅ DONE

- `GET /api/classify/:runId/summary` — per-dimension aggregated counts
- `GET /api/classify/:runId/tracks` — paginated track list with optional dimension/value filter
- `POST /api/classify/:runId/approve` — generate `PlaylistProposal` records, mark run APPROVED
- Review page (`/dashboard/review/[runId]`): 6-dimension sidebar, track panel with album art + full tags
- Dashboard wired: "Review results →" link on classify card, live "Open review" card in action panel

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

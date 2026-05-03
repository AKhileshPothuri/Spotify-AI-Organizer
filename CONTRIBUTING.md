# Contributing to Spotify AI Organizer

Thank you for your interest in contributing! We're excited to have you help build the future of music organization.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Pull Requests](#submitting-pull-requests)
- [Reporting Bugs](#reporting-bugs)
- [Contributing Prompts](#contributing-prompts)
- [Community](#community)

## Code of Conduct

Be respectful, inclusive, and constructive. We do not tolerate harassment, discrimination, or bad faith engagement.

## Getting Started

Before starting, please:

1. Fork the repository
2. Check existing issues and PRs to avoid duplication
3. If it's a significant change, open an issue to discuss first
4. Join our Discord community for questions and collaboration

## Development Setup

### Prerequisites

- **Node.js** ≥ 20.x (LTS)
- **pnpm** ≥ 9.x
- **Docker** + Docker Compose ≥ 24.x
- **Git** ≥ 2.x
- **Spotify Developer Account** (free at developer.spotify.com)
- **LLM API Key** (Claude, OpenAI, Gemini, or local Ollama)

### First-Time Setup

```bash
# Clone your fork
git clone https://github.com/{your-username}/spotify-ai-organizer.git
cd spotify-ai-organizer

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Spotify and LLM credentials
vim .env

# Start infrastructure
pnpm docker:up

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

Your apps are now running:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001

### Useful Commands

```bash
pnpm dev              # Start all apps
pnpm build            # Build for production
pnpm test             # Run all tests
pnpm lint             # Check code style
pnpm typecheck        # TypeScript checks
pnpm db:studio        # Prisma visual browser
pnpm docker:down      # Stop services
```

## Making Changes

### Branch Naming

```
feat/short-description       # New feature
fix/short-description        # Bug fix
docs/short-description       # Documentation
refactor/short-description   # Refactoring
prompt/short-description     # LLM prompt improvements
chore/short-description      # Dependencies, build, CI
```

### Code Style

- **TypeScript:** Strict mode, no `any` without comment
- **Formatting:** Prettier (run `pnpm format`)
- **Linting:** ESLint (run `pnpm lint`)
- **Tests:** Write tests for new features (target ≥ 80% coverage)

### Commit Messages (Conventional Commits)

```
feat: add language dimension to classification
fix: handle Spotify API rate limiting
docs: update setup instructions
refactor: extract LLM batching logic
test: add integration tests for approval flow
```

### Architecture Guidelines

**Backend:**
- Business logic in `/services/` — routes are thin controllers
- Database queries in `/db/queries/` — no raw SQL in services
- External API calls in dedicated service files
- BullMQ jobs for operations taking > 2 seconds

**Frontend:**
- Server Components by default; Client Components when needed
- Use TanStack Query for data fetching
- Typed API client in `/lib/api-client.ts`
- shadcn/ui components only
- Tailwind CSS only

## Submitting Pull Requests

1. **Create a branch** from `main`
2. **Make your changes** (small, focused commits are better)
3. **Write/update tests** for your changes
4. **Run checks locally:**
   ```bash
   pnpm lint && pnpm typecheck && pnpm test && pnpm build
   ```
5. **Push to your fork** and open a PR against `main`

### PR Template

```markdown
## Description
Brief description of what this PR does and why.

## Related Issues
Closes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How to Test
Steps to verify the change works correctly.

## Screenshots/Logs
If relevant, add screenshots or logs.
```

### PR Requirements

- ✅ All CI checks pass (lint, typecheck, test, build)
- ✅ At least 1 maintainer approval
- ✅ No conflicts with `main` branch
- ✅ Tests included for new functionality
- ✅ Documentation updated if needed

## Reporting Bugs

Please use the **Bug Report** issue template and include:

- Description of the bug
- Steps to reproduce
- Expected vs. actual behavior
- Your library size (approx. track count)
- LLM provider and model you're using
- Relevant logs or screenshots
- OS and Node.js version

## Contributing Prompts

Prompts are the product! We welcome prompt improvements from the community.

### How to Contribute a Prompt

1. **Fork and create a branch:** `feat/prompt-v2-language-depth`
2. **Copy the current prompt** as your starting point
3. **Make improvements** — document what changed and why
4. **Include test cases:**
   - At least 10 tracks where the new prompt classifies better
   - Show before/after results
5. **Open a PR** with your changes

We'll run our eval suite on your prompt before merging.

### Prompt File Structure

```
prompts/
├── classify-v1.system.md     # Production system prompt
├── classify-v1.user.md       # Production user prompt
├── classify-v2.system.md     # In development
└── community/
    ├── classify-v1-es.md     # Spanish-optimized
    └── classify-v1-kr.md     # Korean/K-pop optimized
```

## Community

- **GitHub Discussions:** Ask questions, share ideas
- **GitHub Issues:** Bug reports and feature requests
- **Discord:** Real-time chat and collaboration
- **Email:** hello@spotifyorganizer.dev (for security issues)

## Security

⚠️ **Do NOT open public issues for security vulnerabilities.**

See [SECURITY.md](./SECURITY.md) for responsible disclosure procedures.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! Your effort makes music organization better for everyone. 🎵**

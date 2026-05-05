import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// ─── Module mocks (hoisted) ───────────────────────────────────────────────────

vi.mock('../config/index.js', () => ({
  config: {
    NODE_ENV: 'development',
    PORT: 3001,
    LOG_LEVEL: 'silent',
    CORS_ORIGIN: '*',
    JWT_SECRET: 'a-super-secret-key-that-is-long-enough',
    JWT_EXPIRES_IN: '7d',
    LLM_PROVIDER: 'claude',
    ANTHROPIC_API_KEY: 'test-key',
    BATCH_SIZE: 25,
  },
}));

const mockPrisma = {
  user:              { upsert: vi.fn() },
  track:             { count: vi.fn().mockResolvedValue(100), findMany: vi.fn().mockResolvedValue([]) },
  classificationRun: {
    findFirst: vi.fn(),
    create:    vi.fn(),
    update:    vi.fn(),
    count:     vi.fn().mockResolvedValue(3),
  },
  playlistProposal:  {
    findMany:    vi.fn().mockResolvedValue([]),
    findFirst:   vi.fn(),
    update:      vi.fn(),
    deleteMany:  vi.fn(),
    createMany:  vi.fn(),
    count:       vi.fn().mockResolvedValue(5),
  },
  classification:    { findMany: vi.fn().mockResolvedValue([]) },
  userConfig:        { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
};

vi.mock('../db.js', () => ({ default: mockPrisma }));

vi.mock('../services/spotify.js', () => ({
  getValidToken:          vi.fn().mockResolvedValue('spotify-access-token'),
  fetchLikedSongsCount:   vi.fn().mockResolvedValue(250),
  getSpotifyUserId:       vi.fn().mockResolvedValue('sp-user-id'),
  createSpotifyPlaylist:  vi.fn().mockResolvedValue({ id: 'pl1', url: 'https://open.spotify.com/playlist/pl1' }),
  addTracksToPlaylist:    vi.fn().mockResolvedValue(undefined),
  syncUserLibrary:        vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/library.js', () => ({
  syncLibrary: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/llm.js', () => ({
  classifyBatch: vi.fn().mockResolvedValue([]),
}));

const { createServer } = await import('../index.js');

// ─── Test setup ───────────────────────────────────────────────────────────────

describe('API routes', () => {
  let app: FastifyInstance;
  let authHeader: { Authorization: string };

  beforeAll(async () => {
    app = await createServer();
    const token = app.jwt.sign({ userId: 'user-1', spotifyId: 'sp-1' });
    authHeader = { Authorization: `Bearer ${token}` };
  });

  // ─── Public ─────────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ status: string }>().status).toBe('ok');
    });
  });

  describe('GET /v1', () => {
    it('returns current version', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1' });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ version: string }>().version).toBe('0.5.0');
    });
  });

  // ─── Auth guard ─────────────────────────────────────────────────────────────

  describe('auth guard', () => {
    const protectedRoutes = [
      { method: 'GET',  url: '/api/library/stats' },
      { method: 'POST', url: '/api/library/sync'  },
      { method: 'GET',  url: '/api/config'         },
    ] as const;

    for (const { method, url } of protectedRoutes) {
      it(`${method} ${url} → 401 without token`, async () => {
        const res = await app.inject({ method, url });
        expect(res.statusCode).toBe(401);
      });
    }
  });

  // ─── GET /api/library/stats ──────────────────────────────────────────────────

  describe('GET /api/library/stats', () => {
    it('returns track counts and latest run', async () => {
      mockPrisma.classificationRun.findFirst.mockResolvedValueOnce({
        id: 'run-1', status: 'DONE', processedTracks: 100, totalTracks: 100,
      });

      const res = await app.inject({
        method: 'GET', url: '/api/library/stats', headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ trackCount: number; runCount: number }>();
      expect(body.trackCount).toBe(100);
      expect(body.runCount).toBe(3);
    });
  });

  // ─── GET/PUT /api/config ─────────────────────────────────────────────────────

  describe('GET /api/config', () => {
    it('returns default config when none exists', async () => {
      mockPrisma.userConfig.findUnique.mockResolvedValueOnce(null);
      const res = await app.inject({ method: 'GET', url: '/api/config', headers: authHeader });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ customTaxonomy: null }>().customTaxonomy).toBeNull();
    });

    it('returns stored customTaxonomy', async () => {
      mockPrisma.userConfig.findUnique.mockResolvedValueOnce({
        customTaxonomy: { genres: ['Rock', 'Pop'] }, activeDimensions: [],
      });
      const res = await app.inject({ method: 'GET', url: '/api/config', headers: authHeader });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ customTaxonomy: { genres: string[] } }>().customTaxonomy.genres).toEqual(['Rock', 'Pop']);
    });
  });

  describe('PUT /api/config', () => {
    it('saves customTaxonomy and returns config', async () => {
      const saved = { id: 'cfg-1', userId: 'user-1', customTaxonomy: { genres: ['Tamil'] } };
      mockPrisma.userConfig.upsert.mockResolvedValueOnce(saved);

      const res = await app.inject({
        method: 'PUT', url: '/api/config', headers: authHeader,
        payload: { customTaxonomy: { genres: ['Tamil'] } },
      });
      expect(res.statusCode).toBe(200);
      expect(mockPrisma.userConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ customTaxonomy: { genres: ['Tamil'] } }) }),
      );
    });
  });

  // ─── PATCH /api/classify/:runId/proposals/:proposalId ────────────────────────

  describe('PATCH /api/classify/:runId/proposals/:proposalId', () => {
    const url = '/api/classify/run-1/proposals/prop-1';

    it('returns 400 when name is empty', async () => {
      const res = await app.inject({
        method: 'PATCH', url, headers: authHeader, payload: { name: '' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when proposal does not belong to the user', async () => {
      mockPrisma.playlistProposal.findFirst.mockResolvedValueOnce(null);
      const res = await app.inject({
        method: 'PATCH', url, headers: authHeader, payload: { name: 'My Playlist' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 400 when proposal is already pushed to Spotify', async () => {
      mockPrisma.playlistProposal.findFirst.mockResolvedValueOnce({
        id: 'prop-1', spotifyPlaylistId: 'existing-pl',
      });
      const res = await app.inject({
        method: 'PATCH', url, headers: authHeader, payload: { name: 'Renamed' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('renames a pending proposal and returns updated name', async () => {
      mockPrisma.playlistProposal.findFirst.mockResolvedValueOnce({
        id: 'prop-1', spotifyPlaylistId: null,
      });
      mockPrisma.playlistProposal.update.mockResolvedValueOnce({
        id: 'prop-1', name: 'My Road Trip Mix',
      });

      const res = await app.inject({
        method: 'PATCH', url, headers: authHeader, payload: { name: 'My Road Trip Mix' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ name: string }>().name).toBe('My Road Trip Mix');
    });
  });

  // ─── POST /api/classify/:runId/approve ───────────────────────────────────────

  describe('POST /api/classify/:runId/approve', () => {
    it('returns 404 when run does not exist', async () => {
      mockPrisma.classificationRun.findFirst.mockResolvedValueOnce(null);
      const res = await app.inject({
        method: 'POST', url: '/api/classify/missing/approve', headers: authHeader,
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 400 when run is not AWAITING_APPROVAL', async () => {
      mockPrisma.classificationRun.findFirst.mockResolvedValueOnce({ id: 'run-1', status: 'DONE' });
      const res = await app.inject({
        method: 'POST', url: '/api/classify/run-1/approve', headers: authHeader,
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── POST /api/classify/:runId/playlists ─────────────────────────────────────

  describe('POST /api/classify/:runId/playlists', () => {
    it('returns 400 when run is not APPROVED', async () => {
      mockPrisma.classificationRun.findFirst.mockResolvedValueOnce({ id: 'run-1', status: 'AWAITING_APPROVAL' });
      const res = await app.inject({
        method: 'POST', url: '/api/classify/run-1/playlists', headers: authHeader,
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when no pending proposals exist', async () => {
      mockPrisma.classificationRun.findFirst.mockResolvedValueOnce({ id: 'run-1', status: 'APPROVED' });
      mockPrisma.playlistProposal.findMany.mockResolvedValueOnce([]);
      const res = await app.inject({
        method: 'POST', url: '/api/classify/run-1/playlists', headers: authHeader,
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 202 and starts background push when proposals exist', async () => {
      mockPrisma.classificationRun.findFirst.mockResolvedValueOnce({ id: 'run-1', status: 'APPROVED' });
      mockPrisma.playlistProposal.findMany.mockResolvedValueOnce([
        { id: 'p1', name: 'Rock Mix', description: null, trackIds: [] },
      ]);
      mockPrisma.classificationRun.update.mockResolvedValueOnce({});

      const res = await app.inject({
        method: 'POST', url: '/api/classify/run-1/playlists', headers: authHeader,
      });
      expect(res.statusCode).toBe(202);
      expect(res.json<{ status: string }>().status).toBe('CREATING_PLAYLISTS');
    });
  });
});

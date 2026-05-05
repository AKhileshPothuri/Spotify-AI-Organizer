import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
  type FastifyBaseLogger,
} from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import { config } from './config/index.js';
import prisma from './db.js';
import {
  getValidToken,
  fetchLikedSongsCount,
  getSpotifyUserId,
  createSpotifyPlaylist,
  addTracksToPlaylist,
} from './services/spotify.js';
import { syncLibrary } from './services/library.js';
import { classifyBatch, type CustomTaxonomy } from './services/llm.js';

// ─── Type augmentation ────────────────────────────────────────────────────────

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: { userId: string; spotifyId: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

// ─── Server factory ───────────────────────────────────────────────────────────

export async function createServer(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: { level: config.LOG_LEVEL } });

  await fastify.register(fastifyCors, {
    origin: config.CORS_ORIGIN || '*',
    credentials: true,
  });

  await fastify.register(fastifyJwt, { secret: config.JWT_SECRET });

  fastify.decorate(
    'authenticate',
    async function handler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
        await request.jwtVerify();
      } catch {
        await reply.status(401).send({ error: 'Unauthorized' });
      }
    },
  );

  // ─── Public ────────────────────────────────────────────────────────────────

  fastify.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  fastify.get('/v1', () => ({
    version: '0.5.0',
    name: 'Spotify AI Organizer API',
  }));

  // Called server-to-server by Next.js callback route
  fastify.post<{ Body: { accessToken: string; refreshToken: string; expiresIn: number } }>(
    '/api/auth/token',
    async (request, reply) => {
      const { accessToken, refreshToken, expiresIn } = request.body;

      const profileRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!profileRes.ok) return reply.status(400).send({ error: 'Invalid Spotify token' });

      const profile = await profileRes.json() as { id: string; email?: string; display_name?: string };

      const user = await prisma.user.upsert({
        where: { spotifyId: profile.id },
        update: {
          accessToken,
          refreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
          spotifyDisplayName: profile.display_name,
        },
        create: {
          spotifyId: profile.id,
          email: profile.email,
          spotifyUsername: profile.id,
          spotifyDisplayName: profile.display_name,
          accessToken,
          refreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
        },
      });

      const token = fastify.jwt.sign(
        { userId: user.id, spotifyId: user.spotifyId, displayName: user.spotifyDisplayName },
        { expiresIn: config.JWT_EXPIRES_IN },
      );
      return { token };
    },
  );

  // ─── Protected ─────────────────────────────────────────────────────────────

  const auth = { preHandler: [fastify.authenticate.bind(fastify)] };

  // GET /api/library/stats
  // Returns track count from DB + Spotify's live total
  fastify.get('/api/library/stats', auth, async (request) => {
    const { userId } = request.user;

    const [trackCount, runCount, playlistCount, latestRun] = await Promise.all([
      prisma.track.count({ where: { userId } }),
      prisma.classificationRun.count({ where: { userId, status: 'DONE' } }),
      prisma.playlistProposal.count({
        where: { userId, spotifyPlaylistId: { not: null } },
      }),
      prisma.classificationRun.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, processedTracks: true, totalTracks: true },
      }),
    ]);

    // Live Spotify total (fast — only fetches 1 item)
    let spotifyTotal: number | null = null;
    try {
      const token = await getValidToken(userId);
      spotifyTotal = await fetchLikedSongsCount(token);
    } catch {
      // Non-fatal — DB count still returned
    }

    return { trackCount, spotifyTotal, runCount, playlistCount, latestRun };
  });

  // POST /api/library/sync
  // Kicks off a background sync; returns 202 immediately
  fastify.post('/api/library/sync', auth, async (request, reply) => {
    const { userId } = request.user;

    void syncLibrary(userId).catch(err =>
      fastify.log.error({ err }, 'Library sync failed'),
    );

    return reply.status(202).send({ status: 'started' });
  });

  // GET /api/library/sync/status
  // Quick poll — returns current track count in DB
  fastify.get('/api/library/sync/status', auth, async (request) => {
    const { userId } = request.user;
    const trackCount = await prisma.track.count({ where: { userId } });
    return { trackCount };
  });

  // POST /api/classify/run
  // Creates a ClassificationRun and processes all tracks in the background
  fastify.post<{ Body?: { scope?: string } }>(
    '/api/classify/run',
    auth,
    async (request, reply) => {
      const { userId } = request.user;
      const scope = request.body?.scope ?? 'unclassified';

      const trackCount = await prisma.track.count({ where: { userId } });
      if (trackCount === 0) {
        return reply.status(400).send({ error: 'No tracks found — sync your library first.' });
      }

      const run = await prisma.classificationRun.create({
        data: {
          userId,
          scope,
          status: 'PENDING',
          totalTracks: trackCount,
          llmProvider: config.LLM_PROVIDER,
          activeDimensions: ['genre', 'mood', 'language', 'occasion', 'era', 'energyLevel'],
        },
      });

      void runClassification(userId, run.id, fastify.log).catch(err =>
        fastify.log.error({ err, runId: run.id }, 'Classification run failed'),
      );

      return reply.status(202).send({ runId: run.id, status: 'PENDING' });
    },
  );

  // GET /api/classify/:runId
  // Returns current status + progress
  fastify.get<{ Params: { runId: string } }>(
    '/api/classify/:runId',
    auth,
    async (request, reply) => {
      const { userId } = request.user;
      const run = await prisma.classificationRun.findFirst({
        where: { id: request.params.runId, userId },
      });
      if (!run) return reply.status(404).send({ error: 'Run not found' });
      return run;
    },
  );

  // PATCH /api/classify/:runId/classifications/:classificationId
  // Inline edit — updates any subset of classification fields
  fastify.patch<{
    Params: { runId: string; classificationId: string };
    Body: {
      genres?: string[]; moods?: string[]; language?: string;
      occasions?: string[]; era?: string | null; energyLevel?: string;
    };
  }>(
    '/api/classify/:runId/classifications/:classificationId',
    auth,
    async (request, reply) => {
      const { userId } = request.user;
      const { runId, classificationId } = request.params;

      const existing = await prisma.classification.findFirst({
        where: { id: classificationId, runId, userId },
      });
      if (!existing) return reply.status(404).send({ error: 'Classification not found' });

      const updated = await prisma.classification.update({
        where: { id: classificationId },
        data: request.body,
      });

      return { id: updated.id, updatedAt: updated.updatedAt };
    },
  );

  // GET /api/classify/:runId/summary
  // Aggregated counts per dimension value (for review dashboard sidebar)
  fastify.get<{ Params: { runId: string } }>(
    '/api/classify/:runId/summary',
    auth,
    async (request, reply) => {
      const { userId } = request.user;
      const run = await prisma.classificationRun.findFirst({
        where: { id: request.params.runId, userId },
      });
      if (!run) return reply.status(404).send({ error: 'Run not found' });

      const all = await prisma.classification.findMany({
        where: { runId: request.params.runId, userId },
        select: { genres: true, moods: true, language: true, occasions: true, era: true, energyLevel: true },
      });

      const tally = (map: Map<string, number>, values: string[]) => {
        for (const v of values) if (v) map.set(v, (map.get(v) ?? 0) + 1);
      };

      const genreMap   = new Map<string, number>();
      const moodMap    = new Map<string, number>();
      const langMap    = new Map<string, number>();
      const occMap     = new Map<string, number>();
      const eraMap     = new Map<string, number>();
      const energyMap  = new Map<string, number>();

      for (const c of all) {
        tally(genreMap, c.genres);
        tally(moodMap, c.moods);
        if (c.language) tally(langMap, [c.language]);
        tally(occMap, c.occasions);
        if (c.era) tally(eraMap, [c.era]);
        if (c.energyLevel) tally(energyMap, [c.energyLevel]);
      }

      const sorted = (m: Map<string, number>) =>
        [...m.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));

      return {
        genre: sorted(genreMap),
        mood: sorted(moodMap),
        language: sorted(langMap),
        occasion: sorted(occMap),
        era: sorted(eraMap),
        energyLevel: sorted(energyMap),
      };
    },
  );

  // GET /api/classify/:runId/tracks?dimension=genre&value=Pop&page=1&limit=100
  // Paginated classified tracks with optional dimension filter
  fastify.get<{
    Params: { runId: string };
    Querystring: { dimension?: string; value?: string; page?: string; limit?: string };
  }>(
    '/api/classify/:runId/tracks',
    auth,
    async (request, reply) => {
      const { userId } = request.user;
      const { runId } = request.params;
      const { dimension, value, page = '1', limit = '100' } = request.query;

      const run = await prisma.classificationRun.findFirst({ where: { id: runId, userId } });
      if (!run) return reply.status(404).send({ error: 'Run not found' });

      const where: Record<string, unknown> = { runId, userId };
      if (dimension && value) {
        if      (dimension === 'genre')       where.genres = { has: value };
        else if (dimension === 'mood')        where.moods = { has: value };
        else if (dimension === 'language')    where.language = value;
        else if (dimension === 'occasion')    where.occasions = { has: value };
        else if (dimension === 'era')         where.era = value;
        else if (dimension === 'energyLevel') where.energyLevel = value;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const [items, total] = await Promise.all([
        prisma.classification.findMany({
          where,
          include: {
            track: {
              select: { name: true, artist: true, album: true, imageUrl: true, spotifyUrl: true, releaseYear: true },
            },
          },
          skip,
          take,
          orderBy: { track: { name: 'asc' } },
        }),
        prisma.classification.count({ where }),
      ]);

      return { items, total, page: parseInt(page), limit: take };
    },
  );

  // POST /api/classify/:runId/approve
  // Groups classifications into PlaylistProposal records and marks run APPROVED
  fastify.post<{ Params: { runId: string } }>(
    '/api/classify/:runId/approve',
    auth,
    async (request, reply) => {
      const { userId } = request.user;
      const { runId } = request.params;

      const run = await prisma.classificationRun.findFirst({ where: { id: runId, userId } });
      if (!run) return reply.status(404).send({ error: 'Run not found' });
      if (run.status !== 'AWAITING_APPROVAL') {
        return reply.status(400).send({ error: `Run is ${run.status}, expected AWAITING_APPROVAL` });
      }

      const all = await prisma.classification.findMany({
        where: { runId, userId },
        select: { trackId: true, genres: true, moods: true, language: true, occasions: true, era: true, energyLevel: true },
      });

      const groupMap = new Map<string, { dimension: string; value: string; trackIds: string[] }>();

      const addToGroup = (dimension: string, value: string, trackId: string) => {
        const key = `${dimension}::${value}`;
        if (!groupMap.has(key)) groupMap.set(key, { dimension, value, trackIds: [] });
        groupMap.get(key)!.trackIds.push(trackId);
      };

      for (const c of all) {
        for (const g of c.genres) addToGroup('genre', g, c.trackId);
        for (const m of c.moods)  addToGroup('mood', m, c.trackId);
        if (c.language && c.language !== 'Unknown' && c.language !== 'Instrumental') {
          addToGroup('language', c.language, c.trackId);
        }
        for (const o of c.occasions) addToGroup('occasion', o, c.trackId);
        if (c.era)         addToGroup('era', c.era, c.trackId);
        if (c.energyLevel) addToGroup('energyLevel', c.energyLevel, c.trackId);
      }

      const proposals = [...groupMap.values()].filter(g => g.trackIds.length >= 3);

      await prisma.playlistProposal.deleteMany({ where: { runId } });
      await prisma.playlistProposal.createMany({
        data: proposals.map(g => ({
          userId,
          runId,
          name: g.value,
          description: `AI-curated ${g.dimension} playlist: ${g.value}`,
          dimension: g.dimension,
          taxonomyValue: g.value,
          trackIds: g.trackIds,
          trackCount: g.trackIds.length,
        })),
      });
      await prisma.classificationRun.update({
        where: { id: runId },
        data: { status: 'APPROVED', approvedAt: new Date() },
      });

      return { status: 'APPROVED', proposalCount: proposals.length };
    },
  );

  // POST /api/classify/:runId/playlists
  // Pushes all approved PlaylistProposals to Spotify as real playlists
  fastify.post<{ Params: { runId: string } }>(
    '/api/classify/:runId/playlists',
    auth,
    async (request, reply) => {
      const { userId } = request.user;
      const { runId } = request.params;

      const run = await prisma.classificationRun.findFirst({ where: { id: runId, userId } });
      if (!run) return reply.status(404).send({ error: 'Run not found' });
      if (run.status !== 'APPROVED') {
        return reply.status(400).send({ error: `Run is ${run.status}, expected APPROVED` });
      }

      const proposals = await prisma.playlistProposal.findMany({
        where: { runId, userId, spotifyPlaylistId: null },
      });
      if (proposals.length === 0) {
        return reply.status(400).send({ error: 'No pending proposals — all playlists may already exist.' });
      }

      await prisma.classificationRun.update({
        where: { id: runId },
        data: { status: 'CREATING_PLAYLISTS' },
      });

      void pushPlaylists(userId, runId, proposals, fastify.log).catch(err =>
        fastify.log.error({ err, runId }, 'Playlist creation failed'),
      );

      return reply.status(202).send({ status: 'CREATING_PLAYLISTS', total: proposals.length });
    },
  );

  // GET /api/config
  fastify.get('/api/config', auth, async (request) => {
    const { userId } = request.user;
    const cfg = await prisma.userConfig.findUnique({ where: { userId } });
    return cfg ?? { customTaxonomy: null, activeDimensions: ['genre', 'mood', 'language', 'occasion', 'era', 'energyLevel'] };
  });

  // PUT /api/config
  fastify.put<{ Body: { customTaxonomy?: unknown; activeDimensions?: string[] } }>(
    '/api/config',
    auth,
    async (request) => {
      const { userId } = request.user;
      const { customTaxonomy, activeDimensions } = request.body;
      const data: Record<string, unknown> = {};
      if (customTaxonomy !== undefined) data.customTaxonomy = customTaxonomy;
      if (activeDimensions !== undefined) data.activeDimensions = activeDimensions;

      const cfg = await prisma.userConfig.upsert({
        where: { userId },
        update: data,
        create: { userId, ...data },
      });
      return cfg;
    },
  );

  // PATCH /api/classify/:runId/proposals/:proposalId
  // Rename a playlist proposal before it's pushed to Spotify
  fastify.patch<{ Params: { runId: string; proposalId: string }; Body: { name: string } }>(
    '/api/classify/:runId/proposals/:proposalId',
    auth,
    async (request, reply) => {
      const { userId } = request.user;
      const { runId, proposalId } = request.params;
      const { name } = request.body;

      if (!name?.trim()) return reply.status(400).send({ error: 'name is required' });

      const proposal = await prisma.playlistProposal.findFirst({
        where: { id: proposalId, runId, userId },
      });
      if (!proposal) return reply.status(404).send({ error: 'Proposal not found' });
      if (proposal.spotifyPlaylistId) {
        return reply.status(400).send({ error: 'Playlist already pushed — rename it directly on Spotify.' });
      }

      const updated = await prisma.playlistProposal.update({
        where: { id: proposalId },
        data: { name: name.trim() },
      });
      return { id: updated.id, name: updated.name };
    },
  );

  // GET /api/classify/:runId/playlists
  // Returns all playlist proposals for a run with their Spotify URLs (if created)
  fastify.get<{ Params: { runId: string } }>(
    '/api/classify/:runId/playlists',
    auth,
    async (request, reply) => {
      const { userId } = request.user;
      const { runId } = request.params;

      const run = await prisma.classificationRun.findFirst({ where: { id: runId, userId } });
      if (!run) return reply.status(404).send({ error: 'Run not found' });

      const proposals = await prisma.playlistProposal.findMany({
        where: { runId, userId },
        select: {
          id: true, name: true, dimension: true, taxonomyValue: true,
          trackCount: true, spotifyPlaylistId: true, spotifyUrl: true,
        },
        orderBy: [{ dimension: 'asc' }, { trackCount: 'desc' }],
      });

      const created = proposals.filter(p => p.spotifyPlaylistId !== null).length;
      return { runStatus: run.status, proposals, created, total: proposals.length };
    },
  );

  return fastify;
}

// ─── Background playlist-push worker ─────────────────────────────────────────

async function pushPlaylists(
  userId: string,
  runId: string,
  proposals: { id: string; name: string; description: string | null; trackIds: string[] }[],
  log: FastifyBaseLogger,
): Promise<void> {
  const token = await getValidToken(userId);
  const spotifyUserId = await getSpotifyUserId(token);

  let created = 0;

  for (const proposal of proposals) {
    try {
      // Resolve internal Track IDs → Spotify track IDs
      const tracks = await prisma.track.findMany({
        where: { id: { in: proposal.trackIds } },
        select: { spotifyId: true },
      });
      const spotifyIds = tracks.map(t => t.spotifyId).filter(Boolean);

      const { id: playlistId, url: playlistUrl } = await createSpotifyPlaylist(
        token,
        spotifyUserId,
        proposal.name,
        proposal.description ?? `AI-curated playlist: ${proposal.name}`,
      );

      await addTracksToPlaylist(token, playlistId, spotifyIds);

      await prisma.playlistProposal.update({
        where: { id: proposal.id },
        data: { spotifyPlaylistId: playlistId, spotifyUrl: playlistUrl, approvedAt: new Date() },
      });

      created++;
    } catch (err) {
      log.error({ err, proposalId: proposal.id }, 'Failed to create playlist');
    }
  }

  await prisma.classificationRun.update({
    where: { id: runId },
    data: { status: 'DONE' },
  });

  log.info({ runId, created, total: proposals.length }, 'Playlist push complete');
}

// ─── Background classification worker ────────────────────────────────────────

async function runClassification(
  userId: string,
  runId: string,
  log: FastifyBaseLogger,
): Promise<void> {
  const BATCH = config.BATCH_SIZE;

  await prisma.classificationRun.update({
    where: { id: runId },
    data: { status: 'CLASSIFYING', startedAt: new Date() },
  });

  const [tracks, userCfg] = await Promise.all([
    prisma.track.findMany({
      where: { userId },
      select: { id: true, name: true, artist: true, album: true, releaseYear: true },
    }),
    prisma.userConfig.findUnique({ where: { userId }, select: { customTaxonomy: true } }),
  ]);

  const taxonomy = userCfg?.customTaxonomy as CustomTaxonomy | null | undefined;

  let processed = 0;

  for (let i = 0; i < tracks.length; i += BATCH) {
    const batch = tracks.slice(i, i + BATCH);

    try {
      const results = await classifyBatch(batch, taxonomy ?? undefined);

      await Promise.all(
        results.map(c =>
          prisma.classification.upsert({
            where: { trackId_runId: { trackId: c.trackId, runId } },
            update: {
              genres: c.genres,
              moods: c.moods,
              language: c.language,
              occasions: c.occasions,
              era: c.era,
              energyLevel: c.energyLevel,
            },
            create: {
              userId,
              trackId: c.trackId,
              runId,
              genres: c.genres,
              moods: c.moods,
              language: c.language,
              occasions: c.occasions,
              era: c.era,
              energyLevel: c.energyLevel,
              llmModel: 'claude-sonnet-4-6',
            },
          }),
        ),
      );

      processed += batch.length;
      await prisma.classificationRun.update({
        where: { id: runId },
        data: { processedTracks: processed },
      });
    } catch (err) {
      log.error({ err, batchStart: i }, 'Batch classification error');
    }
  }

  await prisma.classificationRun.update({
    where: { id: runId },
    data: { status: 'AWAITING_APPROVAL', completedAt: new Date(), processedTracks: processed },
  });
}

// ─── Start ───────────────────────────────────────────────────────────────────

export async function start(): Promise<void> {
  try {
    const fastify = await createServer();
    await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`🚀 API running at http://0.0.0.0:${config.PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await start();
}

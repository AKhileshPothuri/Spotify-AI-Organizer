import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import { config } from './config/index.js';
import prisma from './db.js';

export async function createServer() {
  const fastify = Fastify({
    logger: {
      level: config.LOG_LEVEL,
    },
  });

  await fastify.register(fastifyCors, {
    origin: config.CORS_ORIGIN || '*',
    credentials: true,
  });

  await fastify.register(fastifyJwt, {
    secret: config.JWT_SECRET,
  });

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  fastify.get('/v1', async () => {
    return {
      version: '0.1.0',
      name: 'Spotify AI Organizer API',
      docs: 'https://docs.spotifyorganizer.dev',
    };
  });

  // Called by the Next.js callback route (server-to-server).
  // Receives Spotify tokens, upserts the user in the DB, returns a signed app JWT.
  fastify.post<{
    Body: { accessToken: string; refreshToken: string; expiresIn: number };
  }>('/api/auth/token', async (request, reply) => {
    const { accessToken, refreshToken, expiresIn } = request.body;

    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return reply.status(400).send({ error: 'Invalid Spotify access token' });
    }

    const profile = (await profileRes.json()) as {
      id: string;
      email?: string;
      display_name?: string;
    };

    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    const user = await prisma.user.upsert({
      where: { spotifyId: profile.id },
      update: {
        accessToken,
        refreshToken,
        expiresAt,
        spotifyDisplayName: profile.display_name,
      },
      create: {
        spotifyId: profile.id,
        email: profile.email,
        spotifyUsername: profile.id,
        spotifyDisplayName: profile.display_name,
        accessToken,
        refreshToken,
        expiresAt,
      },
    });

    const token = fastify.jwt.sign(
      { userId: user.id, spotifyId: user.spotifyId, displayName: user.spotifyDisplayName },
      { expiresIn: config.JWT_EXPIRES_IN },
    );

    return { token };
  });

  return fastify;
}

export async function start() {
  try {
    const fastify = await createServer();

    await fastify.listen({ port: config.PORT, host: '0.0.0.0' });

    console.log(`🚀 Server running at http://0.0.0.0:${config.PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await start();
}

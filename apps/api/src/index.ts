import Fastify from 'fastify';
import fastifyJwt from 'fastify-jwt';
import fastifyCors from 'fastify-cors';
import { config } from './config/index.js';

export async function createServer() {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    },
  });

  // Register plugins
  await fastify.register(fastifyCors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API v1 routes
  fastify.get('/v1', async () => {
    return {
      version: '0.1.0',
      name: 'Spotify AI Organizer API',
      docs: 'https://docs.spotifyorganizer.dev',
    };
  });

  return fastify;
}

export async function start() {
  try {
    const fastify = await createServer();

    await fastify.listen({ port: config.port, host: '0.0.0.0' });

    console.log(`🚀 Server running at http://0.0.0.0:${config.port}`);
    console.log(`📚 API docs: http://0.0.0.0:${config.port}/docs`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await start();
}

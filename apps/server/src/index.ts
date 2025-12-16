import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { aiRoutes } from './routes/ai.routes.js';
import { healthRoutes } from './routes/health.routes.js';

async function main() {
  const fastify = Fastify({
    logger: false, // We use our own logger
  });

  // Register error handler
  fastify.setErrorHandler(errorHandler);

  // Register CORS
  await fastify.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  });

  // Register rate limiting
  if (config.enableRateLimit) {
    await fastify.register(rateLimit, {
      max: config.rateLimitMax,
      timeWindow: config.rateLimitWindowMs,
      errorResponseBuilder: () => ({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      }),
    });
  }

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(aiRoutes, { prefix: '/api/v1/ai' });

  // Root endpoint
  fastify.get('/', async () => ({
    name: 'Mail AI API',
    version: '1.0.0',
    docs: '/docs',
  }));

  // Start server
  try {
    await fastify.listen({ port: config.port, host: config.host });
    logger.info(`Server running at http://${config.host}:${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
  } catch (err) {
    logger.error({ msg: 'Failed to start server', error: err });
    process.exit(1);
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await fastify.close();
      process.exit(0);
    });
  });
}

main();

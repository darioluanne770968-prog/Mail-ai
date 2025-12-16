import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  fastify.get('/ready', async (request, reply) => {
    // Add more checks here (database, redis, etc.)
    return reply.send({
      status: 'ready',
      checks: {
        server: true,
      },
    });
  });
}

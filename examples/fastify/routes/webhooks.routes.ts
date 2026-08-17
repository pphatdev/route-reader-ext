import type { FastifyInstance } from 'fastify';

export async function webhooksRoutes(fastify: FastifyInstance) {
  fastify.post('/webhooks/stripe', async (req, reply) => reply.send({ received: true }));
  fastify.post('/webhooks/github', async (req, reply) => reply.send({ received: true }));
  fastify.post('/webhooks/slack', async (req, reply) => reply.send({ received: true }));
  fastify.get('/webhooks/health', async (_req, reply) => reply.send({ ok: true }));
}

import type { FastifyReply, FastifyRequest } from 'fastify';

export const UsersController = {
  list: async (_req: FastifyRequest, reply: FastifyReply) => reply.send([]),
  findOne: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) =>
    reply.send({ id: req.params.id }),
  create: async (req: FastifyRequest, reply: FastifyReply) => reply.code(201).send(req.body),
  remove: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) =>
    reply.send({ id: req.params.id, deleted: true }),
};

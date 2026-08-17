import type { FastifyInstance } from 'fastify';
import { UsersController } from '../users/users.controller';

export async function usersRoutes(fastify: FastifyInstance) {
  /**
   * @description List users.
   * @param {number} [limit=50] Maximum number of records to return.
   */
  fastify.get('/api/users', (req, reply) => UsersController.list(req, reply));

  /**
   * @description Fetch a user by id.
   * @param {string} id User identifier.
   */
  fastify.get('/api/users/:id', (req, reply) => UsersController.findOne(req as any, reply));

  fastify.post('/api/users', (req, reply) => UsersController.create(req, reply));
  fastify.delete('/api/users/:id', (req, reply) => UsersController.remove(req as any, reply));
}

import { Elysia } from 'elysia';
import { UsersController } from '../users/users.controller';

/**
 * @description User management endpoints.
 */
export const usersRoutes = new Elysia({ prefix: '/api' })
  /**
   * @description List all users.
   * @param {number} [page=1] Page number.
   */
  .get('/users', () => UsersController.list())
  /**
   * @description Fetch a user by id.
   * @param {string} id User identifier.
   */
  .get('/users/:id', (ctx) => UsersController.findOne(ctx))
  .post('/users', (ctx) => UsersController.create(ctx))
  .delete('/users/:id', (ctx) => UsersController.remove(ctx));

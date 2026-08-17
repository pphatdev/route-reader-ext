import { Hono } from 'hono';
import { UsersController } from '../users/users.controller';

const users = new Hono();

/**
 * @description List all users, optionally filtered by role.
 * @param {string} [role] Filter by role name.
 * @param {number} [limit=20] Max results to return.
 */
users.get('/users', (c) => UsersController.list(c));

/**
 * @description Fetch a single user by id.
 * @param {string} id User identifier (uuid).
 */
users.get('/users/:id', (c) => UsersController.findOne(c));

/**
 * @description Create a new user.
 * @param {string} email User email.
 * @param {string} name Display name.
 */
users.post('/users', (c) => UsersController.create(c));

users.put('/users/:id', (c) => UsersController.update(c));
users.patch('/users/:id', (c) => UsersController.update(c));
users.delete('/users/:id', (c) => UsersController.remove(c));

export { users as usersRoutes };

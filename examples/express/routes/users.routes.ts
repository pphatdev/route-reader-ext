import { Router } from 'express';
import { UsersController } from '../users/users.controller';

const router = Router();

/**
 * @description List users with optional pagination.
 * @param {number} [page=1] Page number, 1-based.
 * @param {number} [pageSize=25] Number of results per page.
 */
router.get('/users', (req, res) => UsersController.list(req, res));

/**
 * @description Fetch a single user by id.
 * @param {string} id User identifier.
 */
router.get('/users/:id', (req, res) => UsersController.findOne(req, res));

router.post('/users', (req, res) => UsersController.create(req, res));
router.put('/users/:id', (req, res) => UsersController.update(req, res));
router.patch('/users/:id', (req, res) => UsersController.update(req, res));
router.delete('/users/:id', (req, res) => UsersController.remove(req, res));

export { router as usersRouter };

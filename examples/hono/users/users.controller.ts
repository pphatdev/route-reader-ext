import type { Context } from 'hono';

export const UsersController = {
  list: (c: Context) => c.json([]),
  findOne: (c: Context) => c.json({ id: c.req.param('id') }),
  create: async (c: Context) => c.json(await c.req.json(), 201),
  update: async (c: Context) => c.json({ id: c.req.param('id'), ...(await c.req.json()) }),
  remove: (c: Context) => c.json({ id: c.req.param('id'), deleted: true }),
};

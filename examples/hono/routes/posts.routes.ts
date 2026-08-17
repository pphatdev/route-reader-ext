import { Hono } from 'hono';

const posts = new Hono();

posts.get('/posts', (c) => c.json([]));
posts.get('/posts/:slug', (c) => c.json({ slug: c.req.param('slug') }));
posts.get('/posts/:slug/comments', (c) => c.json({ slug: c.req.param('slug'), comments: [] }));
posts.post('/posts', async (c) => c.json(await c.req.json(), 201));
posts.post('/posts/:slug/comments', async (c) => c.json(await c.req.json(), 201));
posts.delete('/posts/:slug', (c) => c.json({ slug: c.req.param('slug'), deleted: true }));

export { posts as postsRoutes };

import { Elysia } from 'elysia';

export const healthRoutes = new Elysia()
  .get('/health', () => ({ ok: true }))
  .get('/health/db', () => ({ ok: true, service: 'db' }))
  .get('/health/cache', () => ({ ok: true, service: 'cache' }));

# Frameworks

Per-framework detection rules. The parser is regex-based and dependency-free
— it reads TypeScript as text, so this page documents the exact code shapes
that trigger detection.

## NestJS

**Trigger:** the `@Controller(...)` decorator on an exported class.

**Base path:** first string argument, or `path` property of the object
argument.

**Route methods:** `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@All`,
`@Options`, `@Head`. Each accepts an optional path string.

```ts
@Controller('users')
export class UsersController {
  @Get()               list() {}         // → GET /users
  @Get(':id')          findOne() {}      // → GET /users/:id
  @Post()              create() {}       // → POST /users
  @Delete(':id')       remove() {}       // → DELETE /users/:id
}
```

Object form is also recognised:

```ts
@Controller({ path: 'posts' })
export class PostsController { ... }
```

**Not recognised:**
- `@Controller('users', { version: '1' })` — only the string / `path`
  property is read; version isn't concatenated.
- Route arrays: `@Get(['/a', '/b'])` — only the first entry is captured.

## Hono

**Trigger:** `import ... from 'hono'` (any subpath allowed) **or**
`new Hono()`.

**Route shape:** `<identifier>.get('/path', ...)` chained on any
identifier. Also supports `.on('METHOD', '/path', ...)`.

```ts
import { Hono } from 'hono';

const users = new Hono();

users.get('/users', (c) => c.json([]));
users.post('/users', async (c) => c.json(await c.req.json()));
users.on('PATCH', '/users/:id', handler);
```

**Base path:** derived from the longest common prefix across all routes in
the file. `/users` and `/users/:id` share the prefix `/users`, so the file
groups under `users`.

**Handler-module resolution:** if a route handler references
`SomeController.method` and `SomeController` is imported from a path like
`../users/users.controller`, the tree attributes the route to the `users/`
folder. See [Handler-module resolution](#handler-module-resolution) below.

## Elysia

**Trigger:** `import ... from 'elysia'` **or** `new Elysia()`.

**Route shape:** identical to Hono — `.get('/path', ...)` chained on any
identifier.

```ts
import { Elysia } from 'elysia';

export const app = new Elysia({ prefix: '/api' })
  .get('/users', () => [])
  .get('/users/:id', (ctx) => ({ id: ctx.params.id }))
  .post('/users', (ctx) => ctx.body);
```

**Base path:** derived from the longest common prefix across route strings.
The constructor's `prefix: '/api'` is **not** parsed — routes above show
as `/users`, `/users/:id`, `/users`, not `/api/users` etc.

## Express

**Trigger:** `import ... from 'express'` **or** `require('express')`.

**Route shape:** `<identifier>.get('/path', handler)` on any identifier.
The identifier is typically a `Router()` instance or the `app` object.

```ts
import { Router } from 'express';

const router = Router();

router.get('/users', UsersController.list);
router.post('/users', UsersController.create);
router.get('/users/:id', UsersController.findOne);
```

**Not recognised:**
- `app.route('/foo').get(h).post(h)` chained-`route()` style
- Middleware-only calls: `app.use('/api', router)` doesn't contribute the
  `/api` prefix to child routes.

## Fastify

**Trigger:** `import ... from 'fastify'` **or** `require('fastify')`.

**Route shape:** `<identifier>.get('/path', handler)` on any identifier —
usually the `fastify` parameter inside a plugin function.

```ts
import type { FastifyInstance } from 'fastify';

export async function usersRoutes(fastify: FastifyInstance) {
  fastify.get('/api/users', handler);
  fastify.post('/api/users', handler);
  fastify.delete('/api/users/:id', handler);
}
```

**Not recognised:**
- `fastify.route({ method: 'GET', url: '/x', handler })` object-config style
- `fastify.register(routes, { prefix: '/api' })` — the plugin prefix isn't
  applied to routes declared in the registered plugin.

## Handler-module resolution

For **Hono / Elysia / Express / Fastify**, the parser inspects each route's
argument list for a `\w+Controller.method` reference. If it finds one and
the controller is imported from a path with at least two segments (e.g.
`../users/users.controller`), the second-to-last segment (`users`) becomes
the route's module folder in the tree.

```ts
import { UsersController } from '../users/users.controller';

router.get('/users', (req, res) => UsersController.list(req, res));
// → module folder: "users"
```

This gives you Nest-style module grouping in frameworks that don't have
an explicit module concept. The [`examples/`](../examples/) fixtures pair
each framework's `routes/` with a sibling `users/users.controller.ts` to
demonstrate the effect.

## File matching

All frameworks share the same `include`/`exclude` globs. By default, only
files matching `**/*.{controller,module,route,routes}.ts` are scanned. If
your files use different naming (e.g. `*.handler.ts`), update the
`nodeAutoRoutes.include` setting — see [Configuration](./configuration.md).

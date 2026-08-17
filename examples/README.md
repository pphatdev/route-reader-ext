# Route Reader — Example Fixtures

Parser fixtures for every framework the extension supports. Open this folder
(or the repo root) in VS Code with the extension installed, then run
**Node Auto Routes: Auto-Detect Settings** from the sidebar's title bar — the
tree view populates with routes grouped by module folder.

None of these examples install or run. They exist purely so you can see what
the scanner detects across NestJS, Hono, Elysia, Express, and Fastify.

## Layout

```
examples/
├── nestjs/    @Controller + @Get/@Post/... decorators
├── hono/      new Hono() with .get()/.post() chains
├── elysia/    new Elysia().get(...).get(...) chains
├── express/   Router() with router.get/post/...
└── fastify/   plugin functions with fastify.get/post/...
```

Each framework folder has a `users/` module (a plain "controller" object /
class) and a `routes/` folder containing files matched by the default
`**/*.{controller,module,route,routes}.ts` glob.

---

## `nestjs/`

Classic Nest-style decorators. The parser reads `@Controller(...)` for the
base path and `@Get/@Post/@Put/@Patch/@Delete/@All/@Options/@Head` inside the
class body for each route.

| File | Base path | Routes | Notes |
| --- | --- | --- | --- |
| `users/users.controller.ts` | `users` | 6 | All standard REST verbs on `/users` and `/users/:id` |
| `posts/posts.controller.ts` | `posts` | 6 | Uses the object form `@Controller({ path: 'posts' })`, nested `/:slug/comments` |
| `auth/auth.controller.ts` | `auth` | 4 | Shows non-CRUD verbs (`/login`, `/logout`, `/refresh`, `/me`) |

## `hono/`

`import { Hono } from 'hono'` triggers the framework parser. Each `.get()`,
`.post()`, ... call on a Hono instance is a route.

| File | Routes | Notes |
| --- | --- | --- |
| `users/users.controller.ts` | — | Handler object imported by `routes/users.routes.ts`; drives the "handler module" column in the tree |
| `routes/users.routes.ts` | 6 | JSDoc `@description` and `@param {type} [name=default] desc` annotations on the top three routes |
| `routes/posts.routes.ts` | 6 | No annotations, nested `/posts/:slug/comments` |

## `elysia/`

`new Elysia()` with chained `.get()` / `.post()` calls. The constructor's
`prefix` option is **not** parsed — the extension derives a base path only
from the longest common prefix of the route strings.

| File | Routes | Notes |
| --- | --- | --- |
| `users/users.controller.ts` | — | Handler object used by `routes/users.routes.ts` |
| `routes/users.routes.ts` | 4 | Chained builder, JSDoc annotations, `prefix: '/api'` (ignored by parser) |
| `routes/health.routes.ts` | 3 | Common `/health` prefix — the tree groups them under a shared base |

## `express/`

`import { Router } from 'express'` triggers the framework parser. Each
`router.get('/path', handler)` is a route.

| File | Routes | Notes |
| --- | --- | --- |
| `users/users.controller.ts` | — | Handler object imported by `routes/users.routes.ts` |
| `routes/users.routes.ts` | 6 | JSDoc annotations, handler-module resolution to `users/` |
| `routes/admin.routes.ts` | 4 | Groups under a common `/admin` prefix |

## `fastify/`

`import type { FastifyInstance } from 'fastify'` triggers the framework
parser. Routes are declared on the `fastify` parameter inside a plugin
function.

| File | Routes | Notes |
| --- | --- | --- |
| `users/users.controller.ts` | — | Handler object used by `routes/users.routes.ts` |
| `routes/users.routes.ts` | 4 | Plugin-style registration, JSDoc annotations |
| `routes/webhooks.routes.ts` | 4 | Common `/webhooks` prefix |

---

## Extension features these fixtures exercise

- **Base-path detection** — NestJS reads `@Controller('users')` and
  `@Controller({ path: 'posts' })`; other frameworks derive a base from the
  longest common prefix across routes in the file.
- **Handler-module resolution** — When a route callback references
  `SomethingController.method` and that symbol is imported from
  `../users/users.controller`, the tree shows `users` as the owning module.
  See any `routes/*.routes.ts` file paired with a sibling `users/` folder.
- **JSDoc annotations** — A `/** ... */` block immediately above a route
  attaches `@description` and `@param {type} [name=default] desc` metadata
  to the tree item. Used in the top routes of each framework's
  `users.routes.ts` (except NestJS, which relies on decorators).
- **Multiple controllers per workspace** — Auto-Detect will count files,
  frameworks, and routes across every folder here and offer to save the
  matching include/exclude globs to `.vscode/settings.json`.

## What the parser does *not* handle

- Elysia / Fastify prefix options passed as constructor or plugin config
  (`new Elysia({ prefix: '/api' })`, `fastify.register(routes, { prefix })`).
- Dynamic route strings (template literals with interpolations, variables).
- Routes declared inside conditionals or loops.
- NestJS `@All`-style catch-all decorators nested inside non-class scopes.

These are intentional limits of the regex-based scanner; the fixtures stick
to shapes the parser recognises.

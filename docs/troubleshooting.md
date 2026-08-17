# Troubleshooting

When the tree isn't showing what you expect, work through this checklist.

## 1. Open the Output channel

Run **Node Auto Routes: Show Output** from the command palette. Every scan
logs:

```
[activate] extension loaded
[scan] starting scan (version 0.1.0)
[scan] files=23 controllers=6 errors=0
[tree] top-level nodes=4
```

- `files=` — how many files matched `include` minus `exclude`.
- `controllers=` — how many `ControllerInfo` records were produced.
- `errors=` — files that threw during read/parse. Details follow in the
  log.

If `files=0`, your include glob doesn't match anything. Jump to
[No files found](#no-files-found).

If `files>0` but `controllers=0`, files were read but no framework
patterns matched. Jump to [Files scanned but no routes](#files-scanned-but-no-routes).

## 2. Read the empty-tree diagnostics

When the tree is empty, it renders diagnostic messages instead of leaving
you guessing:

```
ℹ No routes found. Scanned 12 file(s).
ℹ Workspace: D:\Project\my-api
ℹ Include: **/*.{controller,module,route,routes}.ts
ℹ Exclude: **/{node_modules,dist,out,build}/**
```

Read them top-to-bottom. They're the fastest signal about what the scanner
saw.

## No files found

The include glob doesn't match anything in the workspace.

**Check your file names.** The default glob only matches these suffixes:

- `*.controller.ts`
- `*.module.ts`
- `*.route.ts`
- `*.routes.ts`

If your files are named `*.handler.ts`, `*.api.ts`, or anything else,
either rename them or update the include:

```jsonc
"nodeAutoRoutes.include": "**/*.{controller,handler,routes,api}.ts"
```

**Check your exclude.** Is your source under `dist/` or `build/`? That's
excluded by default. Move your source out or narrow the exclude.

**Check the workspace root.** If you opened a parent directory but your
project is in a subfolder, the scan runs against the parent. Consider
using a more scoped include glob:

```jsonc
"nodeAutoRoutes.include": "packages/api/**/*.{controller,routes}.ts"
```

## Files scanned but no routes

Files matched the glob but no routes were extracted. Possible causes:

**Framework fingerprint doesn't match.** The parser needs one of:

| Framework | Required in file |
| --- | --- |
| NestJS | `@Controller(` |
| Hono | `new Hono` or `from 'hono'` |
| Elysia | `new Elysia` or `from 'elysia'` |
| Express | `from 'express'` or `require('express')` |
| Fastify | `from 'fastify'` or `require('fastify')` |

Files that only *import* your route definitions (e.g. an `index.ts` that
re-exports) don't count — the framework import must be in the same file
as the route calls.

**Unsupported route shape.** See [Frameworks](./frameworks.md#not-recognised)
for the shapes each framework's parser does and doesn't understand. Common
culprits:

- Express `app.route('/foo').get(h).post(h)` chained-`route()`
- Fastify `fastify.route({ ... })` object-config
- Elysia `.group('/prefix', ...)` — routes appear without the group prefix
- Hono `app.route('/prefix', subApp)` — sub-app mounts don't propagate

**Dynamic paths.** Only string / template literals starting with `/` are
detected:

```ts
router.get('/users', handler);      // ✓
router.get('users', handler);       // ✗ (must start with /)
router.get(`/users/${id}`, handler); // ✗ (interpolation)
const path = '/users';
router.get(path, handler);          // ✗ (variable)
```

## Routes appear but under the wrong module folder

The module folder comes from **handler-module resolution**. The parser
looks for `\w+Controller.method` in the route's callback and reads the
controller's import path.

**Nothing groups under a module?** Your handlers aren't calling a
`*Controller` symbol imported from a nested folder. That's fine — routes
still show, just at the top level.

**Wrong folder chosen?** The folder used is the **second-to-last** segment
of the import path:

```ts
import { UsersController } from '../modules/users/users.controller';
//                                          ^^^^^ this segment is used
```

If your layout is `src/users/users.controller.ts` and the file importing
it does `import { UsersController } from '../users/users.controller'`, the
folder is `users`. Adjust your imports if you want different grouping.

## JSDoc annotations aren't showing up

**Adjacency broken.** The `/** ... */` block must be immediately above the
route call, with only whitespace between them. See
[Annotations](./annotations.md#adjacency-rule).

**Wrong tag names.** Only `@description` and `@param` are read. Other tags
are parsed but not surfaced.

**Malformed `@param`.** The expected grammar is
`@param {type} name description` (or `[name]`, `[name=default]`). Missing
`{type}` braces or an empty name breaks the match.

## Tree doesn't refresh after editing a file

The file watcher only watches
`**/*.{controller,module,route,routes}.ts`. If your include glob is
broader (e.g. includes `*.handler.ts`), those files aren't watched —
you'll need to click the **Refresh** button manually after edits.

Changing settings (`nodeAutoRoutes.include` / `nodeAutoRoutes.exclude`)
always triggers an automatic refresh.

## Extension error banner in the tree

If you see:

```
ℹ Extension error (see Output → Node Auto Routes)
```

Open the Output channel — the first line of the stack trace is under the
tree entry as a tooltip, and the full trace is in the log. Copy it into an
issue at the extension's repo along with a minimal reproduction.

## Nuclear reset

If things get really confused:

1. Close all VS Code windows for the workspace.
2. Delete the two keys from `.vscode/settings.json`:
   ```jsonc
   "nodeAutoRoutes.include": ...
   "nodeAutoRoutes.exclude": ...
   ```
3. Reopen the workspace.
4. Run **Auto-Detect Settings** again.

This puts you back at the defaults and re-derives the include glob from
scratch.

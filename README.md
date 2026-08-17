<p align="center">
  <video src="https://github.com/user-attachments/assets/141f3233-ff45-4ef1-b5aa-d120a1d61977" controls muted autoplay playsinline></video>
</p>


# Route Reader Extension for Node.js Frameworks

A VS Code extension that scans a NestJS, Hono, Express, Fastify, or Elysia workspace for HTTP routes and lists them in a sidebar tree view. Click a route to jump to its declaration. Expand a route to see the params documented in its JSDoc block.

## What it scans

- Files matching `**/*.{controller,module,route,routes}.ts` (configurable).
- **NestJS**: `@Controller('base/path')` (string or `{ path }` form) + `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@All`, `@Options`, `@Head`.
- **Hono / Express / Fastify / Elysia**: any file that imports the framework (or does `new Hono/Elysia()`) is parsed for `<ident>.get/post/put/delete/patch/all/options/head('/path', ...)` calls, plus Hono's `.on('METHOD', '/path', ...)`. The path literal must start with `/` to be counted, so incidental `.get('key')` calls in controller code are ignored.

**Not yet supported** (routes won't appear):
- Express `app.route('/foo').get(h).post(h)` chained style
- Fastify `.route({ method, url, handler })` object-config style
- Elysia `.group('/prefix', app => …)` — nested routes show without the group prefix
- Hono `app.route('/prefix', subApp)` — sub-app mounts show the child's literal path

## Tree layout

Routes are grouped by **module folder**. Each `apps/modules/<name>/` becomes a top-level node. Handlers imported from a sibling module (e.g. `articles.route.ts` calling `ArticleCommentsController.list`) are attributed back to that module and nested as a sub-folder — matching Postman-style organization.

```
▾ articles
    GET    /v1/api/articles
    POST   /v1/api/articles
    DELETE /v1/api/articles/:id
    ▾ comments        (from article-comments module)
        GET  /v1/api/articles/:slug/comments
        POST /v1/api/articles/:slug/comments
    ▾ reactions       (from article-reactions module)
        GET  /v1/api/articles/:slug/reactions
    ▾ stats           (from article-stats module)
        GET  /v1/api/articles/:slug/stats
▾ auth
    POST /v1/api/auth/email/register
    GET  /v1/api/auth/github
▾ authors
    GET  /v1/api/authors
    POST /v1/api/authors
```

## JSDoc params

If a route has a JSDoc block immediately above the `app.method(...)` call, its `@description` becomes the route's dim label + tooltip, and every `@param` becomes an expandable child node.

```
/**
 * @description Generate content via Workers AI.
 * @param { String } title             Required title/topic
 * @param { String } [tone]            Optional writing tone
 * @param { String } [language=en]     Optional output language
 */
app.post('/v1/api/ai/generate', ...)
```

renders as:

```
▾ POST  /v1/api/ai/generate   Generate content via Workers AI.
    title      String
    [tone]     String
    [language] String
```

Required params show without brackets and use an orange icon; optional params are `[name]` and use the default foreground. Hover a param for the full type, default value, and description.

## Settings

- `nodeAutoRoutes.include` — glob for files to scan.
  Default: `**/*.{controller,module,route,routes}.ts`
- `nodeAutoRoutes.exclude` — glob for files to skip.
  Default: `**/{node_modules,dist,out,build}/**`

*(Setting keys retain the `nodeAutoRoutes.` prefix for backwards compatibility with earlier versions.)*

## Commands

- **Refresh Routes** — re-scan the workspace. Toolbar: refresh icon.
- **Auto-Detect Settings** — scans the workspace, identifies which framework(s) are in use (NestJS / Hono / Express / Fastify / Elysia), inspects which file-name conventions actually exist (`*.controller.ts`, `*.module.ts`, `*.route.ts`, `*.routes.ts`), computes the shared URL prefix, and offers to persist the resulting `include`/`exclude` globs to `.vscode/settings.json`. Toolbar: sparkle icon.
- **Show Output** — opens the extension's log channel for diagnostics.

Routes also refresh automatically when a matching file is created, changed, or deleted.

## Author

Built by [pphatdev](https://github.com/pphatdev).

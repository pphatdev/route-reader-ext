# Configuration

Every setting the extension exposes, plus how the file-matching pipeline
uses them.

## Settings reference

Both settings live under the `nodeAutoRoutes` namespace. Configure them
via **Settings → Extensions → Node Auto Routes**, in `settings.json`, or
by running **Auto-Detect Settings** to have them written for you.

### `nodeAutoRoutes.include`

- **Type:** `string` (VS Code glob)
- **Default:** `**/*.{controller,module,route,routes}.ts`
- **What it does:** Files matching this pattern are read and parsed for
  routes. Files outside the pattern are never opened.

### `nodeAutoRoutes.exclude`

- **Type:** `string` (VS Code glob)
- **Default:** `**/{node_modules,dist,out,build}/**`
- **What it does:** Files matching this pattern are skipped even if they
  match `include`. Use it to keep the scanner out of generated code,
  vendored dependencies, and build outputs.

Both settings apply immediately — changing either refreshes the tree.

## Glob syntax quick reference

VS Code uses [minimatch](https://github.com/isaacs/minimatch)-flavoured
globs:

| Pattern | Meaning |
| --- | --- |
| `*` | Any characters, not including `/`. |
| `**` | Any number of path segments, including zero. |
| `?` | A single character (not `/`). |
| `[abc]` | One character from the set. |
| `{a,b,c}` | Any of the alternatives. |
| `!(a)` | Anything except the pattern (only in `exclude`-style contexts). |

Examples:

```jsonc
{
  // Only scan the src/ tree
  "nodeAutoRoutes.include": "src/**/*.{controller,routes}.ts",

  // Ignore build output and Storybook stories
  "nodeAutoRoutes.exclude": "**/{node_modules,dist,build,coverage,*.stories.ts}/**"
}
```

## Where `.vscode/settings.json` gets written

When you accept the **Auto-Detect** suggestion, the extension calls
`configuration.update(..., ConfigurationTarget.Workspace)`. This creates
or updates `.vscode/settings.json` in the currently open workspace folder.
Nothing is written to your global user settings.

If you have a multi-root workspace, settings are written to the primary
workspace file; check that this is what you want before accepting.

## How Auto-Detect derives its suggestions

1. **Broad scan.** Every file matching
   `**/*.{controller,module,route,routes}.ts` is opened, subject to a
   broad ignore list (`node_modules`, `dist`, `out`, `build`, `coverage`,
   `.next`, `.turbo`).
2. **File-pattern detection.** File names are matched against
   `.controller.ts`, `.module.ts`, `.route.ts`, `.routes.ts`. Whichever
   patterns appear at least once are joined into the suggested `include`.
   - If your project only uses `*.controller.ts` and `*.routes.ts`, the
     suggested glob is `**/*.{controller,routes}.ts`.
   - If none match, the fallback is the broad default.
3. **Framework detection.** The file contents are checked against
   framework fingerprints:
   - NestJS: `@Controller(`
   - Hono: `new Hono` or `from 'hono'`
   - Elysia: `new Elysia` or `from 'elysia'`
   - Express: `from 'express'` or `require('express')`
   - Fastify: `from 'fastify'` or `require('fastify')`
   The list is reported in the modal for confirmation only — the include
   pattern is derived purely from file names.
4. **URL prefix.** All detected routes are joined `basePath + subPath` and
   the longest common path prefix is reported. Useful for spotting an
   `/api/v1` convention you may want to reflect elsewhere.
5. **Exclude glob.** Always the broad default —
   `**/{node_modules,dist,out,build,coverage,.next,.turbo}/**` — regardless
   of what the workspace looks like.

## Adjusting the defaults

Common scenarios:

**Your team names files `*.handler.ts`**

```jsonc
"nodeAutoRoutes.include": "**/*.{controller,handler,routes}.ts"
```

**You want to scope scans to a monorepo package**

```jsonc
"nodeAutoRoutes.include": "packages/api/src/**/*.{controller,routes}.ts"
```

**You want to ignore an integration-test directory**

```jsonc
"nodeAutoRoutes.exclude": "**/{node_modules,dist,out,build,tests/e2e}/**"
```

**You want to include `.tsx` files too**

The regex parser only expects `.ts` extensions, but `findFiles` will
happily match `.tsx`. Update:

```jsonc
"nodeAutoRoutes.include": "**/*.{controller,routes}.{ts,tsx}"
```

Just note that JSX-heavy files are unusual for route definitions — you'll
mostly want plain `.ts`.

## Programmatic access

The extension doesn't expose an API. To reset both settings to defaults,
delete the two keys from `.vscode/settings.json` and refresh the tree.

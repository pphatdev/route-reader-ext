# Getting started

This guide walks you from a fresh install to a populated route tree.

## 1. Install the extension

### From a `.vsix`

```bash
code --install-extension route-reader-ext-<version>.vsix
```

Or in VS Code: **Extensions** view → `...` menu → **Install from VSIX…**.

### From source (development)

```bash
git clone <this repo>
cd node-auto-routes
npm install
npm run compile
```

Open the folder in VS Code and press **F5** to launch an Extension
Development Host with the extension loaded.

## 2. Open the sidebar

Click the **Node Auto Routes** icon in the Activity Bar (a list-tree icon,
below the built-in explorer/search/scm/debug/extensions icons).

The view is titled **Routes**. It ships with two title-bar actions:

- **Sparkle** (`$(sparkle)`) — Auto-Detect Settings
- **Refresh** (`$(refresh)`) — Refresh Routes

## 3. Run Auto-Detect

First-time setup: click the **sparkle** icon.

The extension scans the workspace once and shows a modal summary:

```
Frameworks:  NestJS, Hono
Files:       23
Routes:      87
Patterns:    controller, routes
URL prefix:  /api

Suggested include:
  **/*.{controller,routes}.ts

Suggested exclude:
  **/{node_modules,dist,out,build,coverage,.next,.turbo}/**
```

Click **Save to workspace settings** to persist the narrowed globs to
`.vscode/settings.json`. This makes subsequent scans faster because they
only touch files matching the patterns your project actually uses.

You can re-run Auto-Detect any time — the globs it proposes are always
derived from the current workspace.

## 4. Read the tree

Once a scan completes, the tree is populated with routes grouped by module
folder:

```
▾ articles
    GET    /v1/api/articles
    POST   /v1/api/articles
    ▾ POST   /v1/api/articles                Create a new article.
        title     String
        [tone]    String
```

- Top-level nodes are **module folders**. The badge on the right is the
  route count under that folder.
- Leaf nodes are **routes**, coloured by HTTP method (GET green, POST
  yellow, PUT blue, PATCH purple, DELETE red).
- A route with a JSDoc `@description` shows the description as a dim
  suffix and in its hover tooltip.
- A route with `@param` entries is **expandable** — child nodes show each
  parameter with its type, required/optional state, and default value.

## 5. Jump to source

Click any route to open its file and position the cursor on the
declaration line. Works for all supported frameworks.

## 6. Iterate

- Edit a route file → the tree refreshes automatically. The extension
  watches `**/*.{controller,module,route,routes}.ts` for changes.
- Change `nodeAutoRoutes.include` or `nodeAutoRoutes.exclude` in settings
  → the tree refreshes automatically.
- Not seeing what you expect? Run **Node Auto Routes: Show Output** from
  the command palette to see scan logs and parse errors.

Next: [Frameworks](./frameworks.md) covers exactly what shapes the parser
recognises per framework.

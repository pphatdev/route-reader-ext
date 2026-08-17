# JSDoc annotations

The extension reads a `/** ... */` block immediately above a route call and
attaches its metadata to the tree entry. This works for **Hono, Elysia,
Express, and Fastify**. (NestJS uses `@Controller` / `@Get` decorators
instead.)

## Adjacency rule

The doc block must be **immediately above** the route — only whitespace
between the closing `*/` and the route call. Blank lines, comments, or
statements in between break the association.

```ts
// ✓ recognised
/**
 * @description List all users.
 */
router.get('/users', handler);

// ✗ NOT recognised — statement between the block and the route
/**
 * @description List all users.
 */
const enabled = true;
router.get('/users', handler);

// ✗ NOT recognised — blank line breaks adjacency? No — blank lines are OK.
/**
 * @description List all users.
 */

router.get('/users', handler);   // ← still recognised (whitespace is fine)
```

## `@description`

- **Grammar:** `@description <text-up-to-end-of-line>`
- **Effect:** Appears as a dim suffix on the route in the tree and in its
  hover tooltip.
- **Length:** No hard limit; long descriptions wrap in the tooltip but the
  tree suffix truncates.

```ts
/**
 * @description Create a new user account.
 */
router.post('/users', handler);
```

```
▾ POST  /users                   Create a new user account.
```

## `@param`

- **Grammar:** `@param {<type>} <name-with-optional-brackets-and-default> <description>`
- **Effect:** Adds a child node to the route. Required params show without
  brackets and an orange icon; optional params are wrapped in `[...]`.

### Required

```
@param {string} id  User identifier.
```

- Tree label: `id`
- Icon colour: orange (`charts.orange`)
- Tooltip: type, "required", description.

### Optional

```
@param {string} [role]  Filter by role name.
```

- Tree label: `[role]`
- Icon colour: default foreground.
- Tooltip: type, "optional", description.

### Optional with default

```
@param {number} [pageSize=25]  Results per page.
```

- Tree label: `[pageSize]`
- Tooltip: type, "optional", `Default: 25`, description.

The default value is captured verbatim from between the `=` and the
closing `]` — no expression evaluation is attempted.

### Types

The `{...}` type field is a free-form string. Everything between the
braces becomes the type shown in the tooltip and as the tree item's
`description` column. Common conventions:

```
@param {string}         name       simple type
@param {'foo'|'bar'}    variant    union
@param {string[]}       tags       array
@param {Record<string,unknown>} meta  generic
```

Nested `{...}` inside the type is **not** supported — the regex captures
up to the first `}`.

## A worked example

```ts
/**
 * @description Generate content via the AI service.
 * @param {string}   title            Required title/topic.
 * @param {string}   [tone]           Optional writing tone.
 * @param {string}   [language=en]    Output language, ISO 639-1.
 * @param {number}   [maxTokens=512]  Upper bound on generated tokens.
 */
app.post('/v1/api/ai/generate', handler);
```

Renders as:

```
▾ POST  /v1/api/ai/generate                Generate content via the AI service.
    title         string     (required)
    [tone]        string
    [language]    string     Default: en
    [maxTokens]   number     Default: 512
```

Hover any param to see its full description and default value.

## Parsing rules and gotchas

- **Line-based extraction.** Each line of the block is trimmed of its
  leading ` * ` prefix before matching. Tags may span multiple lines only
  if you don't rely on the extension seeing the continuation — additional
  lines after the first are ignored per tag.
- **Only the closest block counts.** If there are multiple `/** ... */`
  blocks between the top of the file and the route, only the last one
  immediately preceding the call is used.
- **Non-standard tags are ignored.** `@returns`, `@throws`, `@example`,
  `@deprecated`, etc. don't crash the parser but don't affect the tree
  either.
- **Order doesn't matter.** `@description` can come before, between, or
  after `@param` tags.

## When you don't want any annotations

Skip the doc block. The route still appears in the tree — it just won't
have a description or param children.

# Botplate — Development Guide

> Source of truth for how this codebase is organized, what conventions are enforced, and what *looks* unusual but is intentional. Read this end-to-end before adding code, especially if you are an AI assistant — many of the gotchas below have already burned us.

---

## 1. What this is

Botplate is a **chatbot boilerplate** for Next.js 16 + React 19 + Vercel AI SDK v6. The goal is a thin, modular, streaming-first foundation that any consumer app can fork: feature modules on top of an abstract AI port, a request-scoped DI container, and route handlers reduced to transport.

Today the AI seam, a stateless streaming chat module, a one-shot generation module, and the composition root exist. Persistence, proxy gating, OTEL, tools, and RAG are deliberately deferred — see [§18](#18-whats-not-in-the-codebase-yet-so-dont-hallucinate-it).

---

## 2. Tech stack (pinned in `package.json`)

| Concern | Choice | Notes |
|---|---|---|
| Runtime | **Bun** | Used for scripts, package management, future tests. `node` is not the runtime of record. |
| Framework | **Next.js 16** | **Breaking changes from earlier majors.** See [`AGENTS.md`](./AGENTS.md). `middleware.ts` is now `proxy.ts`. |
| UI | React 19, Tailwind 4, shadcn/ui, `@base-ui/react`, lucide-react | `src/components/` is owned by shadcn — leave it alone. |
| Auth | **better-auth** + Drizzle adapter, `nextCookies()` plugin | |
| DB | **Neon Postgres** via `drizzle-orm/neon-http` (HTTP, no websockets) | Has migration consequences — see [§10](#10-database--migrations). |
| ORM | **Drizzle 0.45** | Schema-first. |
| AI SDK | **Vercel AI SDK v6** (`ai@^6`, `@ai-sdk/react@^3`) | `streamText`, `generateText`, `Output.object`, `useChat` + `DefaultChatTransport`. |
| AI provider | **OpenRouter** via `@openrouter/ai-sdk-provider` | Single key fronts Anthropic, OpenAI, Google, etc. |
| Validation | **Zod 4** | Note: `z.url()`, `z.uuid()` (not `z.string().url()`). |
| Lint/format | **Biome 2** | `bun run lint` / `bun run format`. Auto-organizes imports. |

---

## 3. Directory layout

```
botplate/
├── AGENTS.md              ← critical Next.js 16 disclaimer for AI agents
├── CLAUDE.md              ← @-import of AGENTS.md for Claude Code
├── DEVELOPMENT.md         ← (this file)
├── README.md              ← public-facing
├── instrumentation.ts     ← Next 16 hook; OTEL skeleton
├── drizzle.config.ts      ← reads DATABASE_URL directly (phase 2 hardens this)
├── biome.json / .jsonc    ← lint + format config
└── src/
    ├── env.ts             ← Zod-validated env. Single source of truth.
    │
    ├── app/               ← App Router pages and route handlers
    │   ├── page.tsx                         ← marketing/landing placeholder
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── (app)/chat/page.tsx              ← server: renders <ChatWindow/>
    │   └── api/
    │       ├── auth/[...all]/route.ts       ← better-auth handler
    │       ├── chat/route.ts                ← POST → ChatStreamingService
    │       └── generate/route.ts            ← POST → GenerationService.text()
    │
    ├── components/        ← shadcn/ui ONLY. Do not put domain components here.
    ├── lib/               ← framework-level glue (auth client, utils)
    │   ├── auth.ts                          ← better-auth server instance
    │   ├── auth-client.ts                   ← client SDK
    │   └── utils.ts                         ← cn()
    │
    ├── db/
    │   ├── index.ts       ← `db` singleton (drizzle-orm/neon-http)
    │   ├── schema/        ← re-exports module schemas
    │   │   ├── auth.ts                      ← better-auth tables
    │   │   └── index.ts
    │   └── migrations/    ← drizzle-kit output
    │
    ├── ai/                ← AI provider adapter layer (see [§8](#8-ai-layer))
    │   ├── index.ts                         ← public barrel
    │   ├── ports/
    │   │   └── language-model.port.ts       ← abstract class
    │   ├── providers/
    │   │   └── openrouter.provider.ts       ← OpenRouter adapter (server-only)
    │   ├── registry/
    │   │   ├── models.config.ts             ← LANGUAGE_MODEL_CATALOG, logical id types
    │   │   └── language-model.registry.ts   ← request-scoped resolve cache
    │   └── streaming/
    │       └── stream-error-handler.ts      ← onError for toUIMessageStreamResponse
    │
    ├── server/            ← server-only primitives (see [§6](#6-the-server-only-boundary))
    │   ├── container.ts                     ← createContainer() request-scoped DI
    │   ├── errors.ts                        ← AppError hierarchy
    │   ├── result.ts                        ← Result<T, E> discriminated union
    │   └── logger.ts                        ← structured JSON logger
    │
    └── modules/           ← domain modules (see [§4](#4-the-module-pattern-srcmodulesname))
        ├── chat/
        │   ├── application/
        │   │   ├── chat-streaming.service.ts    ← streamText + toUIMessageStreamResponse
        │   │   └── tools/index.ts                ← empty ToolSet (placeholder)
        │   └── ui/
        │       └── chat-window.tsx               ← 'use client' useChat UI
        └── generation/
            └── application/
                └── generation.service.ts        ← generateText + Output.object
```

---

## 4. The module pattern (`src/modules/<name>/`)

A module is a **vertical slice of one domain area**. `chat` and `generation` are the initial modules; future ones (persistence, rag, agents, etc.) follow the same shape:

```
modules/<name>/
├── index.ts          (when public surface grows) public barrel — the only file other modules import from
├── schema/           (phase 2+) Drizzle tables, re-exported through src/db/schema/index.ts
├── domain/           (when needed) Zod schemas + TS types. Zero infrastructure imports.
├── application/      services / use cases. Classes with constructor-injected deps.
├── infrastructure/   (phase 2+) Drizzle repositories, external adapters.
├── ui/               ('use client' components owned by the module)
└── *.test.ts         colocated tests (when tests land)
```

Phase 1 modules use only `application/` (and `ui/` for `chat`). Don't pre-create empty `domain/` or `infrastructure/` folders — add them when the first file lands.

**Rules:**

1. **Modules import from each other only via `index.ts` barrels.** Never reach into another module's internals.
2. **`domain/` is pure.** No `db`, no `auth`, no `ai`, no `process.env`, no `Date.now()`, no `Math.random()`. Imports limited to `zod` and other modules' `domain/`.
3. **`infrastructure/` is the only place Drizzle or vendor SDKs are imported** from inside a module. `application/` depends on abstract ports and domain types only.
4. **Schema tables live inside the module** that owns them. `src/db/schema/index.ts` is just a re-export aggregator so Drizzle's introspection sees one schema.
5. **Don't put domain code in `src/lib/`.** That folder is for framework-glue only (auth client, `cn()` utils).

---

## 5. Path aliases & imports

- `@/*` resolves to `./src/*` (tsconfig).
- **Always use `@/...` for non-relative imports**, never `../../...`.
- Biome auto-sorts imports on save and via `bun run lint:fix`. Don't fight it.
- Type-only imports use `import type { ... }`. Biome will refactor mixed imports automatically.

---

## 6. The `server-only` boundary

Files that must never reach a client bundle start with:

```ts
import "server-only";
```

**Marked server-only today:**
- `src/ai/registry/language-model.registry.ts`
- `src/ai/providers/openrouter.provider.ts` *(implicit — holds the OpenRouter key; mark it if edited)*
- `src/server/container.ts`
- `src/modules/*/application/*.service.ts`

**Do NOT mark these server-only** (must be reusable from CLI scripts, tests, and pure contexts):
- `src/modules/*/domain/*` — pure types (none yet)
- `src/modules/*/schema/*` — Drizzle tables (loaded by drizzle-kit) (none yet)
- `src/ai/ports/*` — abstract classes, no I/O
- `src/ai/registry/models.config.ts` — pure data
- `src/ai/streaming/stream-error-handler.ts` — pure, imports logger only
- `src/server/{errors,result,logger}.ts` — pure primitives

The `server-only` package throws at import time outside a React Server Component / server context. If you add a CLI script later, either **construct your own dependencies locally** or invoke it with `bun --conditions react-server <script.ts>` to make `server-only`'s conditional exports resolve to a no-op stub.

---

## 7. Composition root (DI container)

`src/server/container.ts` exposes `createContainer()`:

- **Request-scoped.** Call once per route handler / server action. Never cache across requests.
- Returns `{ chat, generation }`. Will grow as modules land.
- Wires the concrete `OpenRouterLanguageModelProvider` to the abstract `LanguageModelPort`, wraps it in a `LanguageModelRegistry`, and hands the registry to each service.
- This is where you add new services. Route handlers should never construct services directly.

```ts
// src/app/api/chat/route.ts — the entire transport layer
import type { UIMessage } from "ai";
import type { LanguageModelLogicalId } from "@/ai/registry/models.config";
import { createContainer } from "@/server/container";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request): Promise<Response> {
  const { messages, modelId } = (await req.json()) as {
    messages: UIMessage[];
    modelId?: LanguageModelLogicalId;
  };
  const { chat } = createContainer();
  return chat.start({ messages, modelId });
}
```

Route handlers are transport-only. Validation, auth, streaming orchestration, and persistence live in the service.

---

## 8. AI layer

### Ports
- `LanguageModelPort.resolve(id: LanguageModelLogicalId): LanguageModel`

Services depend on **ports** and the `LanguageModelRegistry`, never on a vendor SDK directly. The chat service, generation service, and future agents all take the registry in their constructor.

### Logical IDs

Code references models by **capability**, never by vendor string:

```ts
const llm = models.get("chat.default");                    // OK
const llm = openrouter.chat("anthropic/claude-sonnet-4");  // never inline a vendor string
```

### `LANGUAGE_MODEL_CATALOG`

`src/ai/registry/models.config.ts` holds an `as const satisfies Record<string, ModelEntry>` table. Each entry is `{ providerModelId, capabilities[], settings? }`. Adding a new logical id is a **one-line edit** here. Provider strings are typed as `KnownProviderModelId` (literal union with a `(string & {})` escape hatch for ad-hoc routes like `openrouter/auto`).

### Registry

`LanguageModelRegistry` is a thin per-request cache over the port. Constructed by the container, discarded after the response. Multiple `get("chat.default")` calls in the same handler return the same instance.

### Adapters

`OpenRouterLanguageModelProvider` extends `LanguageModelPort`, holds its own OpenRouter client built from `env.OPENROUTER_API_KEY`. Constructed by the container.

### Streaming pattern (chat)

`ChatStreamingService` is the canonical streaming entry point:

```ts
const result = streamText({
  model: this.models.get(modelId),
  system,
  messages: await convertToModelMessages(messages),
  tools: chatTools,
});

return result.toUIMessageStreamResponse({ onError: streamErrorHandler });
```

`streamErrorHandler` (`src/ai/streaming/stream-error-handler.ts`) maps `AppError` instances to their `.message` and everything else to `"stream_error"`, so stack traces never leak mid-stream. Logs go through the structured logger.

Persistence hooks via `onFinish` are intentionally absent in phase 1 — see [§18](#18-whats-not-in-the-codebase-yet-so-dont-hallucinate-it).

### Structured outputs (generation)

**AI SDK v6 has no `generateObject` / `streamObject`.** Use `generateText` with `Output.object`:

```ts
import { generateText, Output } from "ai";

const { output } = await generateText({
  model: this.models.get("chat.default"),
  output: Output.object({ schema: MyZodSchema }),
  system,
  prompt,
});
// output is validated against MyZodSchema
```

`GenerationService.object<TSchema>()` is the canonical wrapper. Don't reach for the deprecated APIs — they've been removed from `ai@6`.

### Chat UI (`useChat` + `DefaultChatTransport`)

Client-side (`src/modules/chat/ui/chat-window.tsx`):

```tsx
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({ api: "/api/chat" }),
});
```

Render via `message.parts` (v6 shape), not a flat `content` string. `status` is `"ready" | "submitted" | "streaming" | "error"` — gate inputs on `status !== "ready"`. `sendMessage({ text })` is the one-liner to dispatch.

---

## 9. Auth

### Stack
- `better-auth` + Drizzle adapter (`src/lib/auth.ts`).
- Schema lives in `src/db/schema/auth.ts` and is re-exported via `src/db/schema/index.ts`.
- Client SDK in `src/lib/auth-client.ts`.

### Current state

Only the better-auth route handler is wired (`src/app/api/auth/[...all]/route.ts`). There is **no proxy gate** yet and **no `requireUser()` helper** — those land in phase 2:

| Layer | Planned file | What it will do |
|---|---|---|
| **Cheap proxy gate** | `proxy.ts` (Next 16) | `getSessionCookie(request)` — cookie-only check. No DB call. Matcher scoped to `/api/**`. |
| **Authoritative check** | `src/server/auth-context.ts` | `requireUser()` — full DB-backed `auth.api.getSession()`. Called inside route handlers. |

The proxy is defense-in-depth, not the source of truth. Forged or expired cookies still pass a cookie-only gate; route handler checks are what actually authenticate. Both layers are tracked as phase 2 work.

---

## 10. Database & migrations

### Connection

HTTP-only (`drizzle-orm/neon-http`). Stateless, no connection pool. **No interactive transactions** (`db.transaction(async tx => ...)` does not work). Use `db.batch([stmt1, stmt2, ...])` for atomic multi-statement writes — both statements ship in one HTTP round-trip and either both succeed or both fail.

### Workflow

```bash
bun run db:generate   # drizzle-kit generate — produces src/db/migrations/NNNN_*.sql
bun run db:push       # syncs schema directly to Neon (preferred in dev)
bun run db:studio     # open Drizzle Studio
```

### ⚠️ `bun run db:migrate` does NOT work

`drizzle-kit migrate` requires a websocket-capable Neon driver. With the HTTP driver in `drizzle.config.ts`, `db:migrate` fails with `'@neondatabase/serverless' can only connect ... through a websocket`.

**Workaround in this repo:** `db:push` for schema in dev. `*.sql` migration files are still generated and committed for history, but they're not executed via `migrate`. For production, use the Neon CLI / `psql` directly.

### ⚠️ `bun run db:seed` points at a non-existent file

`package.json` declares `"db:seed": "bun run src/db/seed.ts"` but `src/db/seed.ts` does not exist in phase 1. Either create the file when you need it, or remove the script. The canonical pattern (when it lands) is a `scripts/seed.ts` that **builds its own Drizzle client** rather than importing `@/db` — same reason CLI scripts avoid `server-only` chains.

### Phase 1 constraint

`src/db/**` is intentionally untouched in phase 1. The existing `src/db/index.ts` reads `process.env.DATABASE_URL!` directly (bypassing `@/env`), and `drizzle.config.ts` does the same. Both are tracked as phase 2 hardening.

---

## 11. Error handling

### `AppError` hierarchy (`src/server/errors.ts`)

All thrown errors should extend `AppError`. Each has a `code` and `httpStatus`.

| Class | Code | HTTP |
|---|---|---|
| `UnauthorizedError` | `UNAUTHORIZED` | 401 |
| `ForbiddenError` | `FORBIDDEN` | 403 |
| `NotFoundError` | `NOT_FOUND` | 404 |
| `ValidationError` | `VALIDATION` | 400 |
| `ConflictError` | `CONFLICT` | 409 |
| `RateLimitedError` | `RATE_LIMITED` | 429 |
| `ProviderError` | `PROVIDER` | 502 |
| `InternalError` | `INTERNAL` | 500 |

`ProviderError` carries a `provider` field; its message is auto-prefixed with `[provider]`. `isAppError(value)` is the type guard used by `streamErrorHandler`.

### `Result<T, E>` (`src/server/result.ts`)

Use `Result` for *expected* domain outcomes (not found, rule violation). Throw `AppError` for unexpected ones. Helpers: `ok()`, `err()`, `unwrap()`, `map()`, `mapAsync()`.

Rule of thumb: if a competent caller can recover from it, return `Result`. If only a 5xx makes sense, throw.

### Mid-stream errors

Once a streaming response has begun, thrown errors can't become HTTP status codes. `toUIMessageStreamResponse({ onError: streamErrorHandler })` maps them into the stream as terminal frames. Don't re-throw inside `streamText` callbacks; let the SDK invoke `onError`.

---

## 12. Environment variables

`src/env.ts` is the **only** place env vars are read. It's a frozen, Zod-validated object. Boot fails if anything is missing.

Currently required:
- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (≥ 16 chars)
- `BETTER_AUTH_URL`
- `OPENROUTER_API_KEY`
- `NEXT_PUBLIC_APP_URL`

`NODE_ENV` is also read (defaults to `"development"`).

**Never** read `process.env.X` directly elsewhere. The only current exceptions are `src/db/index.ts` and `drizzle.config.ts`, both of which are tracked as phase 2 hardening ([§10](#10-database--migrations)).

---

## 13. Lint, format, organize-imports

```bash
bun run lint           # biome check
bun run lint:fix       # biome check --write (auto-fix + organize imports)
bun run lint:unsafe    # biome check --write --unsafe (use sparingly)
bun run format         # biome format --write
```

Biome 2 organizes imports automatically. If you see import order changing after save, that's the source.

---

## 14. Testing

No test harness is wired yet. When it lands, the convention will be:

- Framework: **`bun:test`** (no vitest).
- Files: `*.test.ts` **colocated** with the source.
- Fixtures: `__fixtures__/` subdirectory next to the tests.

```bash
bun test                       # (future) all
bun test src/modules/chat      # (future) by path
bun test --watch               # (future) watch mode
```

Until then: rely on `bun run lint` + `bunx tsc --noEmit` for the static safety net, and hit `/chat` in the dev server for end-to-end smoke.

---

## 15. Commands cheat-sheet

| Goal | Command |
|---|---|
| Dev server | `bun run dev` |
| Production build | `bun run build` |
| Start production server | `bun run start` |
| Lint | `bun run lint` |
| Auto-fix lint + organize imports | `bun run lint:fix` |
| Format | `bun run format` |
| Generate migration SQL | `bun run db:generate` |
| Push schema to Neon (preferred in dev) | `bun run db:push` |
| Drizzle Studio | `bun run db:studio` |
| Type-check | `bunx tsc --noEmit` |

---

## 16. For AI agents (Cascade, Claude, etc.) — read this first

Things that look wrong but are intentional:

1. **`AGENTS.md` contains breaking-change warnings for Next.js 16.** Always read the relevant page under `node_modules/next/dist/docs/` before writing Next-specific code. Your training data likely predates this major.

2. **`src/db/**` is frozen in phase 1.** Don't rename `src/db/index.ts` to `client.ts`, don't edit `src/db/schema/index.ts`, don't add `import 'dotenv/config'` to `drizzle.config.ts`. All three are tracked as phase 2 work.

3. **`src/components/` is shadcn territory.** Don't put domain components there. Module UI lives in `src/modules/<name>/ui/`.

4. **`LANGUAGE_MODEL_CATALOG` is the only place provider strings live.** If you find yourself typing `"anthropic/claude-..."` or `"openai/gpt-..."` somewhere else, stop and add a logical id to the catalog instead.

5. **`generateObject` / `streamObject` do NOT exist in AI SDK v6.** Use `generateText({ output: Output.object({ schema }) })`. `GenerationService.object<TSchema>()` is the canonical wrapper.

6. **`useChat` signature changed in v6.** Transport is explicit: `new DefaultChatTransport({ api: '/api/chat' })`. Messages have a `parts` array; render via `message.parts`, not a flat `content` string. `status` gates input — wait for `"ready"`.

7. **`convertToModelMessages` is awaited in v6.** `await convertToModelMessages(messages)` — not a bare call. Missing the `await` silently passes a `Promise` to `streamText` and breaks.

8. **Route handlers return `Response` directly.** Don't wrap streaming responses. `ChatStreamingService.start()` returns the `toUIMessageStreamResponse()` object; the route just returns it. No JSON envelope, no `NextResponse.json`, no buffering.

9. **`POST` route handlers are NOT cached by default in Next 16.** Don't add `export const dynamic = 'force-dynamic'` — it's a no-op. Only `GET` handlers have opt-in caching.

10. **Next.js 16 specifics.** `middleware.ts` → `proxy.ts` (named `proxy` export). Dynamic route params are typed `{ params: Promise<{ id: string }> }` — `await ctx.params` before destructuring. The generated `RouteContext<'/path'>` helper exists but only covers routes present at the last `next dev` / `next build` / `next typegen` run; for freshly added routes, the explicit `Promise` shape is more reliable.

11. **OpenRouter returns a concrete `LanguageModelV*`, but ports type as `LanguageModel`** (`= string | LanguageModelV2 | LanguageModelV3` from `ai`). Keep the port version-agnostic; don't narrow the return type to a specific major.

12. **`db.batch([...])` over `db.transaction(...)`.** The neon-http driver does not support interactive transactions. If you reach for `db.transaction`, stop.

13. **Zod 4 syntax differs from Zod 3.** `z.url()` not `z.string().url()`. `z.uuid()` not `z.string().uuid()`. `z.record(keySchema, valueSchema)` requires both args.

14. **`server-only` is a runtime dep in `package.json`, not a devDep.** Bun's runtime needs the package on disk; if it's missing, imports throw `Cannot find package 'server-only'`.

15. **The container is request-scoped, not a module singleton.** Call `createContainer()` inside each route handler. Don't hoist it to module scope — the `LanguageModelRegistry` cache would leak across requests.

16. **Phase 1 chat is stateless — no `onFinish`, no DB writes.** Reloading `/chat` wipes history. Don't add persistence by sprinkling `db.insert` calls; it belongs in a `ConversationRepository` behind a port. See [§18](#18-whats-not-in-the-codebase-yet-so-dont-hallucinate-it).

17. **`db:migrate` is broken on purpose (see [§10](#10-database--migrations)).** Use `db:push` in dev. Don't "fix" the script by swapping drivers — the HTTP driver is a deliberate choice.

18. **`db:seed` points at `src/db/seed.ts`, which doesn't exist yet.** Running it will fail. When seeds land, put them in `scripts/seed.ts` with a locally-constructed Drizzle client (not an import from `@/db`).

19. **Mid-stream errors go through `streamErrorHandler`, not `throw`.** If you add a new streaming service, pass it to `toUIMessageStreamResponse({ onError })` and let it translate. Never re-throw inside a `streamText` callback — the client will receive a malformed frame.

When in doubt: read the file you're about to edit, run `bun run lint && bunx tsc --noEmit` after changes, and skim the relevant `node_modules/next/dist/docs/...` page if anything Next-related looks unfamiliar.

---

## 17. Phase roadmap (canonical order)

- **Phase 1 — DONE.** AI seam (`ports` / `providers` / `registry` / `streaming`), `chat` module (stateless streaming + UI), `generation` module (text + structured), `server/container.ts`, `instrumentation.ts` placeholder.
- **Phase 2.** `proxy.ts` (cookie auth gate + rate limit + request id), `requireUser()` in `src/server/auth-context.ts`, chat persistence (`modules/chat/schema/`, `modules/chat/infrastructure/conversation.repository.ts`, `onFinish` wiring), `db/` hardening (typed env in `drizzle.config.ts`, `src/db/index.ts` via `@/env`), `scripts/seed.ts`.
- **Phase 3.** Typed tool registry per feature (`chatTools` populated, `InferUITools` on the client), OTEL via `experimental_telemetry` in `streamText`, `usage-tracker` table + writer, `/chat/[id]` dynamic route with history hydration.
- **Phase 4+.** RAG module (pgvector + embeddings port + retrieval service wired as a chat tool), auth module relocation, multi-model switching UI, attachments.

Don't skip ahead. Each phase assumes the prior one landed.

---

## 18. What's NOT in the codebase yet (so don't hallucinate it)

- No **chat persistence.** `/api/chat` streams and forgets. No `conversations` / `messages` tables, no `onFinish` hook, no `/chat/[id]` dynamic route.
- No **`proxy.ts`** — all API routes are unguarded at the edge. Add auth checks inside handlers once `requireUser()` lands.
- No **`requireUser()` / `getCurrentUser()`** helper. Routes currently don't call `auth.api.getSession()` at all.
- No **tools wired into chat.** `chatTools` is `{}` — the placeholder exists so `streamText({ tools })` is type-stable.
- No **RAG / pgvector / embedding port / retrieval service.**
- No **real auth UI** — sign-up / sign-in flows are served by better-auth's handler, but there are no pages wrapping `authClient`.
- No **tests.** `bun:test` is the planned harness; no files yet.
- No **rate limiting, telemetry exporter, or background jobs.** `instrumentation.ts` is an empty `register()` skeleton.
- No **`scripts/seed.ts`** (despite `package.json`'s `db:seed` script pointing at one).
- No **multiple model UI switcher** — `modelId` is accepted by the `/api/chat` body but the default UI never sends it.
- No **conversation metadata** (titles, timestamps, user ownership). Arrives with persistence in phase 2.

These are planned. If a request mentions them, scaffold the module per [§4](#4-the-module-pattern-srcmodulesname) first; don't pile them into existing files.

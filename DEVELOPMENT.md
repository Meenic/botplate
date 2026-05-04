# Botplate — Development Guide

> Source of truth for how this codebase is organized, what conventions are enforced, and what *looks* unusual but is intentional. Read this end-to-end before adding code, especially if you are an AI assistant — many of the gotchas below have already burned us.

---

## 1. What this is

Botplate is a **chatbot boilerplate** for Next.js 16 + React 19 + Vercel AI SDK v6. The goal is a thin, modular, streaming-first foundation that any consumer app can fork: feature modules on top of an abstract AI port, a request-scoped DI container, and route handlers reduced to transport.

Today the AI seam, a **persistent** streaming chat module, a one-shot generation module, the composition root, anonymous-friendly auth, a scalable `proxy.ts`, and OTEL are all live. Tools and RAG are deliberately deferred — see [§18](#18-whats-not-in-the-codebase-yet-so-dont-hallucinate-it).

---

## 2. Tech stack (pinned in `package.json`)

| Concern | Choice | Notes |
|---|---|---|
| Runtime | **Bun** | Used for scripts, package management, future tests. `node` is not the runtime of record. |
| Framework | **Next.js 16** | **Breaking changes from earlier majors.** See [`AGENTS.md`](./AGENTS.md). `middleware.ts` is now `proxy.ts`. |
| UI | React 19, Tailwind 4, shadcn/ui, `@base-ui/react`, lucide-react | `src/components/` is owned by shadcn — leave it alone. |
| Auth | **better-auth** + Drizzle adapter, `nextCookies()` + `anonymous()` plugins | Anonymous-by-default; future email/OAuth links via `onLinkAccount`. |
| Telemetry | **OpenTelemetry** via `@vercel/otel` + `@opentelemetry/api` | Gated by `OTEL_ENABLED`; `experimental_telemetry` on every SDK call. |
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
├── proxy.ts               ← Next 16 proxy (was middleware.ts) — see [§9](#9-proxyts)
├── drizzle.config.ts      ← reads DATABASE_URL directly (phase 3 hardens this)
├── biome.json / .jsonc    ← lint + format config
└── src/
    ├── env.ts             ← Zod-validated env. Single source of truth.
    ├── instrumentation.ts ← Next 16 hook; OTEL via @vercel/otel — see [§14](#14-telemetry)
    │
    ├── app/               ← App Router pages and route handlers
    │   ├── page.tsx                         ← marketing/landing placeholder
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── (app)/chat/
    │   │   ├── page.tsx                      ← server: bootstrap anon → create convo → redirect
    │   │   └── [id]/page.tsx                 ← server: ownership check → ChatWindow + history
    │   └── api/
    │       ├── auth/[...all]/route.ts       ← better-auth handler
    │       ├── chat/route.ts                ← POST → ChatStreamingService (auth-gated)
    │       └── generate/route.ts            ← POST → GenerationService.text()
    │
    ├── components/        ← shadcn/ui ONLY. Do not put domain components here.
    ├── lib/               ← framework-level glue (auth client, utils)
    │   ├── auth.ts                          ← better-auth server (anonymous + nextCookies)
    │   ├── auth-client.ts                   ← client SDK (anonymousClient)
    │   └── utils.ts                         ← cn()
    │
    ├── db/
    │   ├── index.ts       ← `db` singleton (drizzle-orm/neon-http)
    │   ├── schema/        ← re-exports module schemas
    │   │   ├── auth.ts                      ← better-auth tables (incl. user.isAnonymous)
    │   │   └── index.ts                     ← re-exports auth + chat schemas
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
    │   ├── auth-context.ts                  ← getCurrentUser() / requireUser()
    │   ├── http.ts                          ← errorToResponse() for route handlers
    │   ├── errors.ts                        ← AppError hierarchy
    │   ├── result.ts                        ← Result<T, E> discriminated union
    │   └── logger.ts                        ← structured JSON logger
    │
    └── modules/           ← domain modules (see [§4](#4-the-module-pattern-srcmodulesname))
        ├── chat/
        │   ├── application/
        │   │   ├── chat-streaming.service.ts    ← streamText + persistence (onFinish)
        │   │   └── tools/index.ts                ← empty ToolSet (placeholder)
        │   ├── infrastructure/
        │   │   └── conversation.repository.ts    ← Drizzle-backed repo + abstract base
        │   ├── schema/
        │   │   └── chat.ts                        ← conversations + messages tables
        │   └── ui/
        │       ├── chat-window.tsx               ← 'use client' useChat UI
        │       └── anonymous-bootstrap.tsx       ← signs in anon + router.refresh()
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

`chat` now spans `application/`, `infrastructure/`, `schema/`, `ui/`. `generation` is `application/`-only. Don't pre-create empty `domain/` folders — add them when the first file lands.

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
- `src/server/auth-context.ts`
- `src/modules/*/application/*.service.ts`
- `src/modules/chat/infrastructure/conversation.repository.ts`

**Do NOT mark these server-only** (must be reusable from CLI scripts, tests, and pure contexts):
- `src/modules/*/domain/*` — pure types (none yet)
- `src/modules/chat/schema/chat.ts` — Drizzle tables (loaded by drizzle-kit)
- `src/ai/ports/*` — abstract classes, no I/O
- `src/ai/registry/models.config.ts` — pure data
- `src/ai/streaming/stream-error-handler.ts` — pure, imports logger only
- `src/server/{errors,result,logger,http}.ts` — pure primitives

The `server-only` package throws at import time outside a React Server Component / server context. If you add a CLI script later, either **construct your own dependencies locally** or invoke it with `bun --conditions react-server <script.ts>` to make `server-only`'s conditional exports resolve to a no-op stub.

---

## 7. Composition root (DI container)

`src/server/container.ts` exposes `createContainer()`:

- **Request-scoped.** Call once per route handler / server action. Never cache across requests.
- Returns `{ chat, generation, conversations }`. Will grow as modules land.
- Wires the concrete `OpenRouterLanguageModelProvider` to the abstract `LanguageModelPort`, wraps it in a `LanguageModelRegistry`, constructs the `DrizzleConversationRepository`, and hands both to `ChatStreamingService`.
- Route handlers never construct services directly.

```ts
// src/app/api/chat/route.ts — the entire transport layer
import type { UIMessage } from "ai";
import type { LanguageModelLogicalId } from "@/ai/registry/models.config";
import { requireUser } from "@/server/auth-context";
import { createContainer } from "@/server/container";
import { errorToResponse } from "@/server/http";

export const maxDuration = 30;

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireUser();
    const { message, id, modelId } = (await req.json()) as {
      message: UIMessage;
      id: string;
      modelId?: LanguageModelLogicalId;
    };
    const { chat } = createContainer();
    return await chat.start({
      userId: user.id,
      conversationId: id,
      lastMessage: message,
      modelId,
    });
  } catch (err) {
    return errorToResponse(err);
  }
}
```

Route handlers are transport-only: auth, validation, streaming orchestration, and persistence live in the service.

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

### Streaming pattern (chat) — persistent

`ChatStreamingService` is the canonical streaming entry point and now owns persistence:

```ts
const owned = await this.conversations.getOwned(conversationId, userId);
if (!owned) throw new NotFoundError("conversation not found");

const previous = await this.conversations.listMessages(conversationId);
const thread = [...previous, lastMessage];
await this.conversations.insertMessages(conversationId, [lastMessage]);

const result = streamText({
  model: this.models.get(modelId),
  system,
  messages: await convertToModelMessages(thread),
  tools: chatTools,
  experimental_telemetry: {
    isEnabled: env.OTEL_ENABLED,
    functionId: "chat.stream",
    metadata: { conversationId, userId, modelId },
  },
});

result.consumeStream(); // run to completion even if the client aborts

return result.toUIMessageStreamResponse({
  originalMessages: thread,
  onFinish: async ({ messages: full }) => {
    const known = new Set(thread.map((m) => m.id));
    const newly = full.filter((m) => !known.has(m.id));
    if (newly.length) await this.conversations.insertMessages(conversationId, newly);
    await this.conversations.touch(conversationId);
  },
  onError: streamErrorHandler,
});
```

Key invariants:

- The user message is **persisted before** `streamText` so a partial failure still leaves a durable trail.
- `consumeStream()` keeps the upstream call running through client disconnects, so `onFinish` always fires.
- `onFinish` receives the **full** `UIMessage[]`. We diff against the in-memory thread by id and insert only the new (assistant) row(s). The id-set guard prevents double-inserting the user message.
- `experimental_telemetry` is wired on every call; `OTEL_ENABLED=false` makes it a no-op.
- `streamErrorHandler` (`src/ai/streaming/stream-error-handler.ts`) maps `AppError` to `.message` and everything else to `"stream_error"` so stack traces never leak mid-stream.

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
import { DefaultChatTransport, type UIMessage } from "ai";

const { messages, sendMessage, status } = useChat({
  id: chatId,
  messages: initialMessages,
  transport: new DefaultChatTransport({
    api: "/api/chat",
    // Server loads history from DB; we only ship the new user message.
    prepareSendMessagesRequest: ({ messages, id }) => ({
      body: { message: messages[messages.length - 1], id },
    }),
  }),
});
```

Key points:

- `id` and `messages` come from the parent Server Component (`/chat/[id]/page.tsx`).
- `prepareSendMessagesRequest` ships only the **last** message + the chat id; the server reloads the rest from DB. Cuts payload size on long threads and matches the v6 persistence guide.
- Render via `message.parts` (v6 shape), not a flat `content` string. `status` is `"ready" | "submitted" | "streaming" | "error"` — gate inputs on `status !== "ready"`. `sendMessage({ text })` is the dispatch one-liner.

---

## 9. Auth

### Stack
- `better-auth` + Drizzle adapter (`src/lib/auth.ts`) with `anonymous()` + `nextCookies()` plugins.
- Schema lives in `src/db/schema/auth.ts` (`user.isAnonymous` is the column the plugin needs).
- Client SDK in `src/lib/auth-client.ts` with `anonymousClient()`.

### Two-layer protection

| Layer | File | What it does |
|---|---|---|
| **Cheap proxy gate** | `proxy.ts` | `getSessionCookie(request)` — cookie presence only, no DB call. Returns 401 if absent on `/api/chat/**`. |
| **Authoritative check** | `src/server/auth-context.ts` | `requireUser()` — full DB-backed `auth.api.getSession()`. **Always call this inside route handlers**, never trust the proxy alone. |

Forged or expired cookies still pass a cookie-only gate; the route handler check is what actually authenticates. The proxy is defense-in-depth.

### Anonymous-by-default flow

1. User hits `/chat` with no session.
2. `getCurrentUser()` returns `null`. The Server Component renders `<AnonymousBootstrap />`.
3. The bootstrap shim calls `authClient.signIn.anonymous()`, then `router.refresh()`.
4. The Server Component re-runs with a session. It generates a chat id, creates a `conversations` row, and `redirect()`s to `/chat/[id]`.
5. Subsequent visits skip the bootstrap entirely — the cookie is already there.

Anon users carry the same `user.id` shape as real users, so all repository code (`conversations.user_id` FK, ownership checks) works uniformly.

### Linking to a real account (phase 4 hook)

`auth.ts` registers `onLinkAccount({ anonymousUser, newUser })`. When email/OAuth sign-up ships, this callback should reparent conversations:

```ts
// UPDATE conversations SET user_id = newUser.id WHERE user_id = anonymousUser.id;
```

The TODO is in place; the implementation lands with the real auth UI.

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

### `db/` policy

`src/db/**` is largely off-limits. The one phase 2 exception is `src/db/schema/index.ts`, which now re-exports `@/modules/chat/schema/chat` so drizzle-kit's introspection sees a single schema. **No other `db/` file should change** until the dedicated hardening pass lands:

- `src/db/index.ts` still reads `process.env.DATABASE_URL!` directly (bypassing `@/env`).
- `drizzle.config.ts` still does the same.
- Both tracked as phase 3 hardening.

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

Required:
- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (≥ 16 chars)
- `BETTER_AUTH_URL`
- `OPENROUTER_API_KEY`
- `NEXT_PUBLIC_APP_URL`

Optional (with defaults):
- `NODE_ENV` — defaults to `"development"`.
- `OTEL_ENABLED` — `z.stringbool()`, defaults to `false`. Gates `instrumentation.ts` and the `experimental_telemetry` flag on every SDK call.
- `OTEL_SERVICE_NAME` — defaults to `"botplate"`. Used by `@vercel/otel`.

**Never** read `process.env.X` directly elsewhere. The only current exceptions are `src/db/index.ts` and `drizzle.config.ts`, both of which are tracked as phase 3 hardening ([§10](#10-database--migrations)).

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

2. **`src/db/**` is frozen except for `src/db/schema/index.ts`.** That one file re-exports module schemas (`auth` + `chat`). Don't touch `src/db/index.ts` or `drizzle.config.ts` — phase 3 hardens them together.

3. **`src/components/` is shadcn territory.** Don't put domain components there. Module UI lives in `src/modules/<name>/ui/`.

4. **`LANGUAGE_MODEL_CATALOG` is the only place provider strings live.** If you find yourself typing `"anthropic/claude-..."` or `"openai/gpt-..."` somewhere else, stop and add a logical id to the catalog instead.

5. **`generateObject` / `streamObject` do NOT exist in AI SDK v6.** Use `generateText({ output: Output.object({ schema }) })`. `GenerationService.object<TSchema>()` is the canonical wrapper.

6. **`useChat` signature changed in v6.** Transport is explicit: `new DefaultChatTransport({ api: '/api/chat' })`. Messages have a `parts` array; render via `message.parts`, not a flat `content` string. `status` gates input — wait for `"ready"`. Pass `id` and `messages` from a Server Component for hydration.

7. **`prepareSendMessagesRequest` ships only the last message.** The server reloads history from DB. Don't post the entire `messages` array — you'll re-validate and re-tokenize the whole thread on every turn.

8. **`convertToModelMessages` is awaited in v6.** `await convertToModelMessages(messages)` — not a bare call. Missing the `await` silently passes a `Promise` to `streamText` and breaks.

9. **`result.consumeStream()` is intentional.** It runs the model call to completion even if the client disconnects, so `onFinish` fires and persists the assistant message. Removing it means lost responses on flaky networks.

10. **`onFinish` does an id-set diff, not a blind insert.** The user message is persisted **before** `streamText`; `onFinish` filters out already-known ids and inserts only the new (assistant) row(s). Don't "simplify" this into `insertMessages(full)` — you'll double-insert the user turn.

11. **Route handlers return `Response` directly.** Don't wrap streaming responses. `ChatStreamingService.start()` returns the `toUIMessageStreamResponse()` object; the route just returns it. No JSON envelope, no buffering.

12. **`POST` route handlers are NOT cached by default in Next 16.** Don't add `export const dynamic = 'force-dynamic'` — it's a no-op. Only `GET` handlers have opt-in caching.

13. **Next.js 16 specifics.** `middleware.ts` → `proxy.ts` (named `proxy` export at project root). Dynamic route params are typed `{ params: Promise<{ id: string }> }` — `await ctx.params` before destructuring.

14. **The proxy is cookie-presence-only.** Forged cookies pass it. Always call `requireUser()` inside route handlers — don't skip thinking the proxy gates you.

15. **`requireUser()` works for both anonymous and real users.** Don't gate features on `user.isAnonymous` unless the requirement is explicitly "real account only".

16. **`AnonymousBootstrap` runs once per first-visit, then never again.** It's not a top-level provider. Adding it to a layout would re-trigger anonymous sign-ins on every refresh — don't.

17. **OTEL is opt-in via `OTEL_ENABLED`.** `experimental_telemetry: { isEnabled: env.OTEL_ENABLED, ... }` is the canonical shape on every `streamText` / `generateText`. Don't hardcode `isEnabled: true`.

18. **The container is request-scoped, not a module singleton.** Call `createContainer()` inside each route handler / server component. Don't hoist it — the `LanguageModelRegistry` cache would leak across requests.

19. **OpenRouter returns a concrete `LanguageModelV*`, but ports type as `LanguageModel`** (`= string | LanguageModelV2 | LanguageModelV3` from `ai`). Keep the port version-agnostic; don't narrow the return type to a specific major.

20. **`db.batch([...])` over `db.transaction(...)`.** The neon-http driver does not support interactive transactions. If you reach for `db.transaction`, stop.

21. **Zod 4 syntax differs from Zod 3.** `z.url()` not `z.string().url()`. `z.uuid()` not `z.string().uuid()`. `z.stringbool()` (no `.()` chain) for env booleans.

22. **`server-only` is a runtime dep in `package.json`, not a devDep.** Bun's runtime needs the package on disk; if it's missing, imports throw `Cannot find package 'server-only'`.

23. **`db:migrate` is broken on purpose** (see [§10](#10-database--migrations)). Use `db:push` in dev. Don't "fix" it by swapping drivers — the HTTP driver is a deliberate choice.

24. **`db:seed` points at `src/db/seed.ts`, which doesn't exist yet.** Running it will fail. When seeds land, put them in `scripts/seed.ts` with a locally-constructed Drizzle client (not an import from `@/db`).

25. **Mid-stream errors go through `streamErrorHandler`, not `throw`.** If you add a new streaming service, pass it to `toUIMessageStreamResponse({ onError })` and let it translate. Never re-throw inside a `streamText` callback — the client will receive a malformed frame.

When in doubt: read the file you're about to edit, run `bun run lint && bunx tsc --noEmit` after changes, and skim the relevant `node_modules/next/dist/docs/...` page if anything Next-related looks unfamiliar.

---

## 17. Phase roadmap (canonical order)

- **Phase 1 — DONE.** AI seam (`ports` / `providers` / `registry` / `streaming`), stateless `chat` module + UI, `generation` module, `server/container.ts`, `instrumentation.ts` placeholder.
- **Phase 2 — DONE.** `proxy.ts` (`ProxyStep` chain: request-id, cookie auth gate, rate-limit slot), `requireUser()` + `getCurrentUser()` in `src/server/auth-context.ts`, chat persistence (`modules/chat/schema/`, `modules/chat/infrastructure/conversation.repository.ts`, `onFinish` diff insert + `consumeStream()`), `/chat/[id]` dynamic route with history hydration, anonymous-friendly auth via better-auth's `anonymous()` plugin + `<AnonymousBootstrap />` shim, OTEL via `@vercel/otel` + `experimental_telemetry` on every SDK call.
- **Phase 3.** Typed tool registry per feature (`chatTools` populated, `InferUITools` on the client), rate-limit step implementation (Upstash / Redis token bucket), conversation list / sidebar at `/chat`, title auto-generation via `GenerationService.text()` on first turn, `db/` hardening (typed env in `drizzle.config.ts`, `src/db/index.ts` via `@/env`), `scripts/seed.ts`.
- **Phase 4+.** Real auth UI + `onLinkAccount` reparenting, RAG module (pgvector + embeddings port + retrieval service wired as a chat tool), multi-model switching UI, attachments.

Don't skip ahead. Each phase assumes the prior one landed.

---

## 18. What's NOT in the codebase yet (so don't hallucinate it)

- No **tools wired into chat.** `chatTools` is `{}` — the placeholder exists so `streamText({ tools })` is type-stable.
- No **RAG / pgvector / embedding port / retrieval service.**
- No **real auth UI.** All sign-ins are anonymous. The `onLinkAccount` callback in `src/lib/auth.ts` is a stub for the phase 4 reparenting logic.
- No **conversation list / sidebar.** `/chat` always creates a new conversation and redirects; older threads are reachable only by URL.
- No **rate limiting.** The `rateLimit` step in `proxy.ts` is a no-op slot — wire Upstash / Redis in phase 3.
- No **title auto-generation.** `conversations.title` is nullable and never written. Backfill via `GenerationService.text()` lands in phase 3.
- No **telemetry exporter wired.** `@vercel/otel` registers with default settings; configure exporters (OTLP, Honeycomb, Axiom) per environment.
- No **tests.** `bun:test` is the planned harness; no files yet.
- No **`scripts/seed.ts`** (despite `package.json`'s `db:seed` script pointing at one).
- No **multi-model UI switcher** — `modelId` is accepted by `/api/chat` but the default UI never sends it.
- No **`db:migrate` fix.** The HTTP driver is deliberate; use `db:push`.
- No **`db/` hardening.** `src/db/index.ts` and `drizzle.config.ts` still read `process.env` directly.

These are planned. If a request mentions them, scaffold the module per [§4](#4-the-module-pattern-srcmodulesname) first; don't pile them into existing files.

---

## 19. Proxy (`proxy.ts`)

Lives at the project root. Next 16 invokes it before any route handler resolves. We use it for cheap, edge-friendly cross-cutting concerns only — anything DB-backed belongs in route handlers.

### Shape

```ts
type ProxyStepResult = Response | undefined;
type ProxyStep = (req: NextRequest, res: NextResponse) =>
  ProxyStepResult | Promise<ProxyStepResult>;
```

A step returns a `Response` to **short-circuit** (e.g. the auth gate's 401), or `undefined` to continue. Steps that don't short-circuit must `return undefined;` explicitly — the type rejects implicit-`void` arrows on purpose so a forgotten branch is a type error, not a silent skip.

### Pipelines

```ts
const PIPELINES: readonly Pipeline[] = [
  { test: (p) => p.startsWith("/api/auth"),     steps: [withRequestId] },
  { test: (p) => p.startsWith("/api/chat"),     steps: [withRequestId, requireSessionCookie, rateLimit] },
  { test: (p) => p.startsWith("/api/generate"), steps: [withRequestId, rateLimit] },
];
```

Order matters — the first matching `test` wins. The `matcher` config is broad (`/api/:path*`); per-prefix routing happens in this array. **Adding a new feature endpoint = one entry; adding a new cross-cutting concern = one function.**

### Phase 2 steps

- `withRequestId` — generates / propagates `x-request-id` for log correlation. Live everywhere.
- `requireSessionCookie` — `getSessionCookie(req)` from `better-auth/cookies`. Returns 401 if absent. Defense-in-depth only; route handlers always re-check via `requireUser()`.
- `rateLimit` — no-op slot. Phase 3 wires a token bucket (Upstash / Redis).

### Why not call `requireUser()` here?

`auth.api.getSession()` does a DB round-trip. Doing that in proxy doubles the DB pressure on every request and breaks at the edge runtime. Keep the proxy cheap; let route handlers do the authoritative check.

---

## 20. Telemetry

### `instrumentation.ts`

Lives at `src/instrumentation.ts`. Next.js 16 calls `register()` once on server boot. We dynamic-import `@vercel/otel` so the OTEL SDK stays out of cold starts when telemetry is off.

```ts
export async function register(): Promise<void> {
  if (env.OTEL_ENABLED) {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: env.OTEL_SERVICE_NAME });
  }
}
```

### `experimental_telemetry` on every SDK call

The canonical shape:

```ts
experimental_telemetry: {
  isEnabled: env.OTEL_ENABLED,
  functionId: "chat.stream", // or "generation.text", "generation.object", ...
  metadata: { conversationId, userId, modelId },
}
```

`functionId` doubles as a span name; pick stable, dot-cased identifiers per call site. `metadata` shows up as span attributes — great for filtering by user / conversation in your collector.

### Exporters

`@vercel/otel` ships with sensible defaults. To send spans to OTLP / Honeycomb / Axiom, set the standard `OTEL_EXPORTER_*` env vars; `@vercel/otel` picks them up automatically. We don't hardcode an exporter so this boilerplate works in any environment.

### What `OTEL_ENABLED=false` does

Both the `register()` import and the `isEnabled` flag short-circuit. No spans are created, no SDK is loaded. Set it to `true` only when you have a collector ready — otherwise you'll silently drop spans.

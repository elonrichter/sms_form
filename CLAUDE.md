# CLAUDE.md

Guidance for Claude Code (and any AI/automation) working in this repository.
**Read these first, every session:**

- 🏛️ [CODING_GUIDELINES.md](./CODING_GUIDELINES.md) — locked architecture decisions + standards (do not violate).
- 🗺️ [ARCHITECTURE.md](./ARCHITECTURE.md) — how the system is built (keep in sync).
- 🤖 [BOTS.md](./BOTS.md) — **the operating protocol you must follow on every prompt** (auto-checks, tests, docs, commits).
- 📘 [README.md](./README.md) — setup, env vars, deploy.

## What this project is

A **stateless, TCPA-compliant SMS opt-in form** (Next.js App Router + TypeScript),
deployed once per brand on Vercel. It POSTs consent events to an external
Aggregator. No database, no PII persistence, no phone numbers in logs.

## Golden rules (never break)

1. **Secrets are server-only.** Read them only via `src/lib/env.ts`
   (`import "server-only"`). Never expose `AGGREGATOR_API_TOKEN` / `CAPTCHA_SECRET`
   to the client; never use `NEXT_PUBLIC_` for them.
2. **Compliance copy is locked.** The SMS-consent disclosure lives only in
   `src/lib/disclosure.ts`. The rendered text MUST equal `consent_text_snapshot`.
   Both checkboxes are unchecked by default. Legal contrast ≥ 4.5:1.
3. **The architecture in CODING_GUIDELINES.md §1 does not change** during feature
   work.
4. **Validate on the server too** — never trust the client.
5. **Test everything you add**; update the OpenAPI doc for any API change.

## The per-prompt loop (summary — full version in BOTS.md)

For **every** change you make:

1. **Plan** against the locked architecture.
2. **Implement** following the layering rules.
3. **Test** — add/update colocated `*.test.ts(x)` for new behavior.
4. **Auto-check** — run `npm run verify` (typecheck → lint → tests → build).
   Everything must be green.
5. **Sync docs** — update `ARCHITECTURE.md` (and its change log) if structure/flow
   changed; update `src/lib/openapi.ts` if the API changed; update env tables if
   env changed.
6. **Commit** — Conventional Commits; the pre-commit hook re-runs checks.

If you add a **database**, also follow the migrations protocol
(CODING_GUIDELINES.md §6) and wire `db:migrate` into startup + CI.
If you add an **API route**, document it in `src/lib/openapi.ts` (surfaced at
`/api/docs`) in the same change.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run verify` | typecheck + lint + tests + build (the gate) |
| `npm run test` / `test:run` / `test:coverage` | Vitest |
| `npm run lint` / `format` | ESLint / Prettier |
| `npm run build` / `start` | Production build / serve |

API docs (when running): `/api/docs` (Swagger UI), `/api/openapi.json`.

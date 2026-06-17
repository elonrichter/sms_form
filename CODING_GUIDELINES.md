# Coding Guidelines & Locked Architecture Decisions

> This file is the project **constitution**. The decisions in §1 are **locked** —
> do not change them while implementing features. If a change is genuinely
> required, it is a deliberate architectural decision: update §1 **and**
> [ARCHITECTURE.md](./ARCHITECTURE.md) in the same change and call it out
> explicitly in the commit/PR. Day-to-day feature work must conform, not redefine.

---

## 1. Locked architecture decisions (ADRs)

1. **Framework: Next.js App Router + TypeScript.** No switch to Pages Router or
   another framework.
2. **Stateless app.** No database, no session store, no PII persistence in this
   app. Consent events are owned by the external Aggregator.
3. **Secret isolation.** All secrets (`AGGREGATOR_API_TOKEN`, `CAPTCHA_SECRET`)
   are read **only** through `src/lib/env.ts`, which begins with
   `import "server-only"`. Secrets never use the `NEXT_PUBLIC_` prefix and never
   reach a client component. Non-secret brand values pass from server → client as
   props, not via the bundle.
4. **Single source for compliance copy.** The SMS-consent disclosure exists only
   in `src/lib/disclosure.ts`. It is generated as ordered segments so the
   rendered text and the snapshot are derived from one function and always equal.
   Compliance copy is **not reskinnable**.
5. **Shared validation.** `src/lib/phone.ts` and `src/lib/validation.ts` are pure
   and run on **both** client (UX) and server (authoritative). Never trust the
   client alone.
6. **Reskin = two files + assets + env.** Only `src/config/theme.ts`,
   `src/config/brand.config.ts`, and `public/brand/*` change for a new brand look.
   All visual values flow through CSS variables emitted by `theme-css.ts`. No
   functional code is touched in a reskin.
7. **The page is `force-dynamic`.** Brand/disclosure env is resolved per request
   so it cannot desync from the route's server-side re-derivation.
8. **API is documented in OpenAPI.** `src/lib/openapi.ts` is the contract, served
   at `/api/openapi.json` + `/api/docs`.

## 2. Layering rules

- `app/**` (routes/pages) → may import `components/**`, `lib/**`, `config/**`.
- `components/**` → may import `lib/**`, `config/**`. **No** `server-only` imports
  in client components (`"use client"`).
- `lib/**` → pure or server-only; no imports from `app/**` or `components/**`.
- Anything reading secrets imports from `lib/env.ts` only.
- `lib/*` that touches secrets/headers/process starts with `import "server-only"`.

## 3. Conventions

- **TypeScript strict.** No `any` in committed code unless justified with a
  comment; prefer precise types. No non-null assertions on external input.
- **Naming:** files `kebab-case.ts`; React components `PascalCase.tsx`; functions
  `camelCase`; types/`interface` `PascalCase`.
- **Errors to users:** never surface raw upstream error codes; use the friendly
  copy in `brand.config.ts`. Map upstream 4xx→422, 5xx/network→502.
- **Logging:** only via `lib/logger.ts`. Never log phone numbers or secrets.
- **Comments:** explain *why*, reference the SPEC/rule when enforcing compliance.
- **Formatting:** Prettier is authoritative (`npm run format`). ESLint
  (`next/core-web-vitals`) must pass with **zero** warnings.

## 4. Testing requirements (non-negotiable)

- Every new `src/**` module ships with a colocated `*.test.ts(x)` in the **same
  change**. No new behavior merges untested.
- Bugs get a failing test first, then the fix.
- Cover: happy path + each validation/branch + each compliance invariant.
- Compliance invariants that MUST always have a test:
  - both checkboxes unchecked by default,
  - submit gated by the §3.1 state table,
  - rendered disclosure text == `consent_text_snapshot`,
  - server rejects snapshot skew,
  - no phone numbers in logs (redaction),
  - token absent from the client bundle (CI grep).
- Keep the suite fast and deterministic (mock `fetch`, fake timers for time).

## 5. API changes

- Update `src/lib/openapi.ts` in the same change as any route addition/edit.
- Add/extend `src/lib/openapi.test.ts` to assert the route + response codes exist.
- Keep request/response types in `src/types.ts` aligned with the schema.

## 6. Database & migrations

Currently **N/A (stateless)**. If introduced:
- Use timestamped, append-only migration files under `supabase/migrations/` (or
  the chosen tool's dir); never edit a shipped migration.
- Provide `npm run db:migrate` and run it in CI before tests that need the DB.
- Document schema + how to run locally in `ARCHITECTURE.md §9`.
- Never put real PII in fixtures/seeds.

## 7. Definition of Done (every change)

`npm run verify` (typecheck → lint → tests → build) is green, **and**:
- new/changed behavior is tested,
- `ARCHITECTURE.md` updated (incl. change log) if structure/flow changed,
- `openapi.ts` updated if the API changed,
- docs/env tables updated if env changed,
- a commit is made (see [BOTS.md](./BOTS.md)).

## 8. Commits

- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`,
  `ci:`. Imperative subject ≤ 72 chars; body explains *why*.
- One logical change per commit. Never commit secrets or `.env.local`.
- The pre-commit hook runs typecheck + tests; do not bypass with `--no-verify`.

# Architecture

> **Source of truth for how this system is built.** Keep this file in sync with
> the code on **every** change (see [BOTS.md](./BOTS.md) → "Definition of Done").
> The high-level shape described here is **locked** — see
> [CODING_GUIDELINES.md](./CODING_GUIDELINES.md) for the decisions that must not
> drift. Last updated: **2026-06-17**.

---

## 1. Purpose

A TCPA-compliant SMS opt-in form. **One repo, deployed once per brand** on Vercel
subdomains. Functionality is identical across deployments; only the theme, brand
config, and env vars change. The app is **stateless** — it holds no database,
persists no PII, and logs no phone numbers. It POSTs consent events to an external
**Aggregator** API.

Implements: SPEC 00 (compliance copy), SPEC 01 (functional contract), SPEC 02
(design/reskin layer).

## 2. Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js (App Router) + TypeScript, React 19 |
| Hosting | Vercel (one project per brand) |
| Styling | CSS Modules + CSS variables generated from `theme.ts` |
| Tests | Vitest (node + jsdom), Testing Library |
| API docs | OpenAPI 3.1 served at `/api/openapi.json`, Swagger UI at `/api/docs` |
| Lint/format | ESLint (`next/core-web-vitals`) + Prettier |
| Hooks/CI | Husky pre-commit + GitHub Actions |

## 3. Directory map

```
src/
  app/
    layout.tsx                 # injects theme CSS vars; sets <head>
    page.tsx                   # SERVER, force-dynamic; resolves brand env -> props
    page.module.css
    globals.css
    api/
      subscribe/route.ts       # SERVER route: validate -> token -> forward
      openapi.json/route.ts    # serves the OpenAPI document
      docs/route.ts            # Swagger UI
  components/
    SubscriptionForm.tsx       # CLIENT: fields, live validation, all states
    SubscriptionForm.module.css
    Turnstile.tsx              # optional captcha widget (env-gated)
  config/
    theme.ts                   # RESKIN: design tokens (locked structure)
    brand.config.ts            # RESKIN: strings & assets
  lib/
    phone.ts                   # E.164 / NANP validation (client + server)
    disclosure.ts              # COMPLIANCE-LOCKED consent copy + snapshot
    validation.ts              # shared field validation (§3.1 table)
    countries.ts               # country/dial-code list
    env.ts                     # server-only env access (secrets isolated)
    rate-limit.ts              # best-effort per-IP limiter
    logger.ts                  # PII-redacting logger
    captcha.ts                 # Turnstile verification (server)
    theme-css.ts               # theme tokens -> CSS variables
    openapi.ts                 # OpenAPI 3.1 document
  types.ts                     # request/response contract types
test/                          # vitest setup + stubs
*.md                           # governance docs (this file, CLAUDE, BOTS, guidelines)
```

Every `src/**` module has a colocated `*.test.ts(x)`.

## 4. Request / data flow

```
Browser (SubscriptionForm, client)
  │  live validation (validation.ts, phone.ts)
  │  builds consent_text_snapshot from disclosure.ts (== rendered text)
  ▼  POST /api/subscribe   (same-origin, NO token, NO IP, NO timestamp)
Route Handler (app/api/subscribe/route.ts, server)
  │  1. resolve env (env.ts) — fail closed if secrets missing -> 500
  │  2. honeypot -> silently 200
  │  3. rate-limit per IP (rate-limit.ts) -> 429
  │  4. captcha verify if configured (captcha.ts) -> 422
  │  5. re-validate names/country/phone/consent (validation.ts, phone.ts) -> 422
  │  6. re-derive canonical snapshot (disclosure.ts) & compare -> 422 on skew
  │  7. attach Authorization: Bearer <token> + Idempotency-Key
  ▼  POST {AGGREGATOR_API_URL}/v1/subscriptions
Aggregator (external) — derives brand_id from token, captures IP + occurred_at
  ▲  { success, status, duplicate? }
  │  normalize -> { success, message?, status?, duplicate? }   (no raw codes)
Browser renders: success / duplicate / error(+Try again) / in-flight
```

### Key invariants (do not break)
- **Token isolation:** `AGGREGATOR_API_TOKEN` / `CAPTCHA_SECRET` are read only in
  server code via `env.ts` (`import "server-only"`). They never appear in any
  client bundle. Verified in CI by grepping `.next/static`.
- **Snapshot equality:** the text rendered beside the SMS-consent checkbox equals
  `consent_text_snapshot`, re-derived and re-checked server-side.
- **Unchecked by default:** both consent checkboxes initialize unchecked.
- **No PII in logs:** `logger.ts` redacts phone-like sequences; phone numbers are
  never passed to it.
- **Fail closed:** required env (`AGGREGATOR_API_URL/TOKEN`, `SMS_TERMS_URL`,
  `PRIVACY_URL`, `CONSENT_TEXT_VERSION`) throws if missing/invalid.

## 5. Environment variables

See [README.md](./README.md#environment-variables-spec-01-§11) for the full table.
Required (fail closed): `AGGREGATOR_API_URL`, `AGGREGATOR_API_TOKEN`,
`SMS_TERMS_URL`, `PRIVACY_URL`, `CONSENT_TEXT_VERSION`. Optional: `BRAND_NAME`,
`BRAND_SLUG`, `DEFAULT_COUNTRY`, `CAPTCHA_SITE_KEY`, `CAPTCHA_SECRET`.

The home page is `force-dynamic`, so env changes take effect on the next request
(no rebuild needed) and the rendered snapshot can never desync from the route.

## 6. Compliance model (SPEC 00 / locked)

The disclosure copy lives **only** in `lib/disclosure.ts` and is not reskinnable.
It contains: recurring automated marketing wording, brand name, "not a condition
of any purchase", "Msg & data rates may apply", frequency, "Reply STOP/HELP", and
Terms + Privacy links. Legal copy contrast stays ≥ 4.5:1 (dedicated
`--color-legal-link` token). Two separate checkboxes; both unchecked by default.

## 7. API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/subscribe` | POST | Submit an opt-in (see OpenAPI for schema/codes) |
| `/api/openapi.json` | GET | OpenAPI 3.1 document |
| `/api/docs` | GET | Swagger UI |

The OpenAPI document (`lib/openapi.ts`) is the contract; it is asserted by
`lib/openapi.test.ts`. **Any API change updates `openapi.ts` in the same commit.**

## 8. Testing

- Unit: every `lib/*` pure module (phone, disclosure, validation, countries,
  rate-limit, logger, theme-css, env, openapi).
- Integration: `app/api/subscribe/route.test.ts` (happy path, honeypot, validation
  failures, snapshot skew, duplicate, 5xx→502, network→502, missing-env→500,
  rate-limit, method-not-allowed) with mocked `fetch`.
- Component: `SubscriptionForm.test.tsx` (unchecked-by-default, submit gating,
  rendered-text == snapshot, real link URLs, happy-path submit → success).

Run: `npm test` (watch) / `npm run test:run` (CI) / `npm run test:coverage`.

## 9. Persistence & migrations

**None today** — the app is stateless by design (SPEC 01). If a database is ever
introduced, follow the protocol in [CODING_GUIDELINES.md](./CODING_GUIDELINES.md#database--migrations)
and document the schema + migration runner here. Until then this section stays
"N/A — stateless".

## 10. Deployment

Vercel auto-detects Next.js. Per brand: new Vercel project → set env vars → add
the brand subdomain → deploy. A reskin additionally swaps `theme.ts`,
`brand.config.ts`, and `public/brand/*`. CI (`.github/workflows/ci.yml`) runs
typecheck + lint + tests + build + token-leak check on every push/PR.

## 11. Change log

- **2026-06-17** — Design reskin (theme.ts only, per the reskin contract): light/airy
  palette, soft rounded sans-serif headings + system-sans body, wider card
  (440→540px) and tightened vertical rhythm. Fixed an invalid `var(--font-*)` with
  no fallback in the font stacks. Country dropdown + phone moved onto one row
  (`.phoneRow`) to save vertical space (DOM order preserved); page `color-scheme`
  set to light.
- **2026-06-17** — Initial architecture: stateless Next.js form, server route with
  token isolation, compliance-locked disclosure, reskin layer, OpenAPI/Swagger,
  full test suite, CI + pre-commit. 12 review findings remediated (fail-closed
  env, legal-link contrast, dynamic page snapshot sync, captcha submit gating,
  re-entrancy guard, etc.).

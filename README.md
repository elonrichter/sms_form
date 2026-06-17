# SMS Subscription Form

A TCPA-compliant SMS opt-in form built with **Next.js (App Router) + TypeScript**,
designed to be deployed **once per brand** on Vercel. Functionality is identical
across every deployment — only the **theme**, **brand config**, and **env vars**
change (SPEC 01 + SPEC 02).

- **Stateless** — no database, no PII persisted, no phone numbers in logs.
- The browser POSTs to an internal route (`/api/subscribe`); the server attaches
  the secret Aggregator token and forwards to the Aggregator. **The token never
  reaches the browser bundle.**

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local   # fill in AGGREGATOR_API_URL + AGGREGATOR_API_TOKEN
npm run dev                  # http://localhost:3000
```

```bash
npm run typecheck            # tsc --noEmit
npm run build                # production build
```

---

## Deploy to Vercel (per brand)

A new brand = a new Vercel project on the same repo, differing **only** by env vars.

1. Push this repo to GitHub/GitLab.
2. In Vercel → **New Project** → import the repo. Framework auto-detected (Next.js).
3. Add the environment variables below (Project → Settings → Environment Variables).
4. Add the brand subdomain (e.g. `sms.subscribe.{brand}.com`) under **Domains**.
5. Deploy. Repeat per brand — code is untouched.

> For a true "reskin" deployment, also swap `src/config/theme.ts`,
> `src/config/brand.config.ts`, and the assets in `public/brand/` (logo, hero).
> No functional code changes are required (SPEC 02 §6).

### Environment variables (SPEC 01 §1.1)

| Var | Required | Secret | Purpose |
|-----|----------|--------|---------|
| `AGGREGATOR_API_URL` | **yes** | — | Base URL of the Aggregator API (absolute http(s)). |
| `AGGREGATOR_API_TOKEN` | **yes** | **yes** | Per-brand bearer token. Server-only. Maps to brand. |
| `SMS_TERMS_URL` | **yes** | — | Link target in the disclosure (absolute http(s)). |
| `PRIVACY_URL` | **yes** | — | Link target in the disclosure (absolute http(s)). |
| `CONSENT_TEXT_VERSION` | **yes** | — | Versions the disclosure snapshot. |
| `BRAND_NAME` | no¹ | — | Interpolated into the disclosure copy. |
| `BRAND_SLUG` | no¹ | — | Sanity-check value sent in body (token is authoritative). |
| `DEFAULT_COUNTRY` | no (`US`) | — | Default dial-code selection (`US` / `CA`). |
| `CAPTCHA_SITE_KEY` | no | — | (Optional) Cloudflare Turnstile site key. |
| `CAPTCHA_SECRET` | no | **yes** | (Optional) Turnstile secret. Server-only. |

¹ Falls back to the value in `brand.config.ts` when unset.

**Fail closed:** required vars throw on a missing/invalid value rather than
silently degrading (e.g. the compliance-locked Terms/Privacy links never render
a dead `#`). `AGGREGATOR_API_TOKEN` and `CAPTCHA_SECRET` are used **only** in the
server route handler (`src/lib/env.ts` is `server-only`); they never reach the
client. The home page is rendered per-request, so changing any of these in Vercel
takes effect on the next request — no rebuild required.

---

## How a reskin works (SPEC 02)

Two files + assets + env vars, nothing else:

- **`src/config/theme.ts`** — design tokens (color, font, radius, space, layout).
  Injected as CSS variables at `:root`; every component reads `var(--token)`.
- **`src/config/brand.config.ts`** — strings & assets (logo, headline, subhead,
  success/error copy, hero, layout variant).
- **`public/brand/`** — `logo.svg`, optional `hero.svg`/hero image.

Layout variants (`brand.config.ts → layoutVariant`): `centered-card` (default),
`split-hero`, `full-bleed`.

### Self-hosted brand fonts (optional)
The default uses CDN-free system font stacks (no render-blocking external font
request). To ship brand fonts, wire `next/font/local` in `src/app/layout.tsx` and
set `--font-heading` / `--font-body` (see the comment in that file).

---

## Compliance (locked — not reskinnable)

These are **fixed** across all brands and may not be hidden, pre-checked, or
made low-contrast (SPEC 00 / SPEC 01 §7 / SPEC 02 lock):

- Two separate checkboxes (Terms & Privacy; SMS marketing/PEWC consent).
- Both render **unchecked** on every load.
- The SMS-consent disclosure: "not a condition of purchase", "Msg & data rates
  may apply", frequency, "Reply STOP/HELP", Terms + Privacy links.
- `consent_text_snapshot` sent to the Aggregator equals the **exact** text shown
  next to the consent checkbox (re-derived and verified server-side).

The disclosure copy lives in `src/lib/disclosure.ts`.

---

## Architecture

```
Browser form
  └─(POST /api/subscribe, same-origin, no token)→ Next.js Route Handler
        ├─ re-validates everything (§3)
        ├─ adds Authorization: Bearer AGGREGATOR_API_TOKEN
        ├─ adds Idempotency-Key (per attempt)
        └─(POST {AGGREGATOR_API_URL}/v1/subscriptions)→ Aggregator
  ←─ normalized { success, message?, duplicate?, status? } ─┘
```

| Path | Role |
|------|------|
| `src/app/page.tsx` | Server component; resolves non-secret brand runtime → props. |
| `src/app/api/subscribe/route.ts` | Server route; validation, token, forward, normalize. |
| `src/components/SubscriptionForm.tsx` | Client form: fields, live validation, states. |
| `src/lib/phone.ts` | E.164 normalization + NANP validation (client + server). |
| `src/lib/disclosure.ts` | Compliance-locked consent copy + snapshot. |
| `src/lib/validation.ts` | Shared validation (§3 / §3.1 table). |
| `src/lib/env.ts` | `server-only` env access (secrets isolated). |
| `src/lib/rate-limit.ts` | Best-effort per-IP rate limit. |
| `src/lib/captcha.ts` | Optional Turnstile verification. |

---

## Anti-abuse

- Honeypot field (silently dropped server-side).
- Per-IP rate limit (best-effort in-memory; front with a shared store for a hard
  limit — see `src/lib/rate-limit.ts`).
- Optional Cloudflare Turnstile (env-gated).
- Idempotency-Key per submission attempt so retries don't double-write.

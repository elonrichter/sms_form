# BOTS.md — Operating Protocol for AI Agents

This is the **standard operating procedure** every AI/automation (Claude Code,
CI bots, etc.) must follow when changing this repository. It exists so the project
stays correct, tested, documented, and deployable **automatically on every prompt**
— without the architecture drifting.

Referenced from [CLAUDE.md](./CLAUDE.md). Pairs with the locked decisions in
[CODING_GUIDELINES.md](./CODING_GUIDELINES.md) and the map in
[ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 0. Prime directive

> Leave the repo **green, tested, documented, and committed** after every prompt,
> and **never change the locked architecture** (CODING_GUIDELINES.md §1) while
> doing feature work.

## 1. The loop to run on EVERY prompt

```
1. ORIENT    Read CLAUDE.md + this file. Skim ARCHITECTURE.md for the area you'll touch.
2. PLAN      Decide the change. Check it conforms to the locked architecture.
3. IMPLEMENT Write code obeying the layering rules (CODING_GUIDELINES.md §2).
4. TEST      Add/update colocated *.test.ts(x) for all new/changed behavior.
5. VERIFY    Run `npm run verify` (typecheck → lint → tests → build). Fix until green.
6. SECURE    Confirm no secret in client bundle, no PII in logs (see §4 checks).
7. DOCUMENT  Update ARCHITECTURE.md (+ change log), openapi.ts, env tables as needed.
8. COMMIT    Conventional Commit. Pre-commit hook re-runs checks. Don't bypass it.
```

If any step fails, stop and fix before moving on. Do not commit red.

## 2. Definition of Done (checklist)

A change is done only when ALL are true:

- [ ] `npm run verify` is green (typecheck, lint = 0 warnings, all tests, build).
- [ ] New/changed behavior has tests; bugs got a regression test first.
- [ ] Compliance invariants still covered by tests (see §4).
- [ ] `ARCHITECTURE.md` reflects reality; change log has a dated entry if
      structure/flow/contracts changed.
- [ ] API changes are in `src/lib/openapi.ts` **and** asserted in
      `src/lib/openapi.test.ts`.
- [ ] Env changes are in `.env.example`, the README table, and `src/lib/env.ts`
      (required ones fail closed).
- [ ] DB changes (if any) ship a migration + `db:migrate` wired into CI/startup.
- [ ] A commit exists (no secrets, no `.env.local`).

## 3. When to add tests / docs (triggers)

| You did this… | …then you must |
|---------------|----------------|
| Add/modify a `lib/*` function | Add/extend its colocated unit test |
| Add/modify an API route | Update `openapi.ts` + `openapi.test.ts`; add route test |
| Add/modify a form field or state | Extend `SubscriptionForm.test.tsx` |
| Touch compliance copy/logic | Re-assert snapshot equality + unchecked-default |
| Add an env var | `.env.example` + README table + `env.ts` (+ fail-closed if required) |
| Change request/response shape | Update `src/types.ts` + `openapi.ts` + tests |
| Add a dependency | Justify it; prefer zero-dep; keep the client bundle lean |

## 4. Mandatory safety checks (every change)

- **Token isolation:** `grep -rl "AGGREGATOR_API_TOKEN value / secret" .next/static`
  finds nothing. CI runs the equivalent grep on the built client bundle.
- **No PII in logs:** phone numbers never passed to `logger.ts`; `redact()` masks
  phone-like sequences. Keep the logger test green.
- **Snapshot equality:** rendered consent text == `consent_text_snapshot`; server
  re-derives and rejects skew. Keep the disclosure + route tests green.
- **Unchecked by default:** both consent checkboxes start unchecked.
- **Fail closed:** required env throws when missing/invalid.

## 5. API & Swagger rule

Every route under `src/app/api/**` MUST be described in `src/lib/openapi.ts`
(OpenAPI 3.1), surfaced at `/api/docs` (Swagger UI) and `/api/openapi.json`.
The doc is part of the contract — update it in the **same** change as the route,
and assert it in `openapi.test.ts`.

## 6. Database & migrations rule

The app is **stateless today (no DB)**. If you add persistence:
- Add a migration tool and timestamped, append-only migrations (never edit a
  shipped one).
- Provide `npm run db:migrate`; run it before the app starts and before DB tests
  in CI.
- Document schema + local run steps in `ARCHITECTURE.md §9` and the migrations
  policy stays as in CODING_GUIDELINES.md §6.
- Never commit real PII in seeds/fixtures.

## 7. Commits & CI

- **Conventional Commits** (`feat|fix|docs|test|refactor|chore|ci`). Imperative,
  ≤ 72-char subject; body says *why*.
- One logical change per commit. Commit after each completed prompt's work.
- The **pre-commit hook** (`.husky/pre-commit`) runs `typecheck` + `test:run`.
  Never bypass with `--no-verify`.
- **CI** (`.github/workflows/ci.yml`) runs the full `verify` + token-leak grep on
  push/PR. CI must be green before merge.

## 8. Optional: deep review for risky changes

For large or compliance-sensitive changes, run a multi-agent review (the project
was bootstrapped with one): fan out reviewers per dimension (compliance, security,
phone/validation, a11y, Next/Vercel correctness, completeness), adversarially
verify each finding, then fix confirmed issues. Prefer this over a single pass for
anything touching consent, secrets, or the API contract.

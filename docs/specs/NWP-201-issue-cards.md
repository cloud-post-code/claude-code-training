# SPEC · NWP-201 — Issue virtual cards from the console

> Written before any code. Generated with `/spec`, then edited by a human.
> Load it as context when you build: `@docs/specs/NWP-201-issue-cards.md`

**Ticket:** [NWP-201](../tickets/NWP-201.md)
**Author:** Blake (with Claude)
**Status:** done

## Problem

Ops issues virtual cards by messaging the platform team, who create them by hand. It takes hours, it happens twelve to twenty times a week, and last month two cards went out with the wrong spend limit because the request lived in a Slack thread. Marcus wants ops to issue a card, see the cards they have issued, and open one to check it, from the console, today.

## Current state

- `build-battle/merchant-console/src/data/types.ts` — `Currency` is already the allowlist `"USD" | "EUR" | "GBP"`. `Merchant` has `id`, `name`, `currency`, `timezone`. No card type existed; this spec adds `Card`, `CardStatus`, `CardCategory`, `CardEvent`, `IssueCardInput`.
- `src/data/store.ts` — in-memory `Store` on `globalThis`, seeded once by `generate()` from `src/data/generate.ts`. It holds `merchants`, `payments`, `refunds`, `disputes`, `payouts`. No `cards` slice.
- `src/data/generate.ts` — deterministic seed via `mulberry32(SEED)`, anchored at `GENERATED_AT`. Seed cards belong here so every machine gets identical records.
- `src/data/queries.ts` — the payment query builder (`parseFilters`, `filterPayments`, `sortPayments`, `paginate`, `queryPayments`) and `paymentById`. Cards do not filter payments, so no new payment query path is needed.
- `src/data/merchants.ts` — `merchants` array and `merchantById(id)`. The merchant select in the form and the merchant column in the list both read from here.
- `src/lib/money.ts` — `formatMoney(minorUnits, currency)` for display and `parseAmountToMinorUnits(input)` for the one boundary conversion. Both are reused; no new money code.
- `src/lib/dates.ts` — `formatDate(iso)` for table cells, `formatInZone(iso, tz)` for detail pages. Reused as is.
- `src/app/api/payments/route.ts` — the route handler pattern: parse, allowlist, `NextResponse.json`. There is no shared error helper; routes return `{ message }` with a meaningful status.
- `src/app/payments/page.tsx` and `src/app/payments/[id]/page.tsx` — the list and detail layout to match: `TableRoot`/`Table` from `src/components/Table.tsx`, `StatusBadge` from `src/components/ui/payments/StatusBadge.tsx`, the `Field` dl pattern, a written empty state.
- `src/components/` — `Button`, `Input`, `Select`, `Badge`, `Drawer` (Radix Dialog underneath, with `DrawerTitle` for the accessible name). There is no `Dialog.tsx`; the components rule names one but the repo ships `Drawer`. Use `Drawer`.
- `src/app/siteConfig.ts` and `src/components/ui/navigation/AppSidebar.tsx` — navigation lives here. Cards is not in it.
- `vitest.config.ts` — plain Node, `src/**/*.test.ts`. 28 tests pass on `main`.
- Ticket vs code: the ticket says "seeded from JSON"; the store is seeded from a TypeScript generator, not JSON. Seed cards go in the generator.

## Domain rules

| Rule | Source | What breaks if ignored |
| --- | --- | --- |
| "Money is integer minor units. `$250.00` is `25000`. Format once, at the edge" | `merchant-console/CLAUDE.md` §1 | Limits drift, grader fails correctness |
| "Generated numbers use the `4242` test BIN and a valid Luhn check digit" | `CLAUDE.md` Card rules, `.claude/rules/cards.md` | A generated PAN could resemble a real one |
| "The full number is returned exactly once, in the creation response. After that, last four only" | `CLAUDE.md` Card rules, ticket rule 2 | Card number leaks into store, list, detail |
| "`active ⇄ frozen`, either to `cancelled`, and `cancelled` is terminal" and "Guard the transition on the server" | `CLAUDE.md`, `.claude/rules/cards.md` | Cancelled cards come back to life |
| "Anything from the client … is checked against an allowlist before it reaches … the store" | `CLAUDE.md` §4, `.claude/rules/api-routes.md` | Bad currency or limit persisted |
| Reject missing merchant, limit ≤ 0, limit > 5,000,000 minor units, currency outside USD/EUR/GBP | Ticket, core criterion 6 | Wrong-limit cards, the bug that started this |
| Currency must match the merchant's currency in `src/data/merchants.ts` | Reviewer credit beyond the ticket | A GBP merchant with a USD card cannot reconcile |
| "Never edit seed data to make a failing case disappear" | root `CLAUDE.md` | Hidden defects |
| "Use what is here … Tailwind only … Dialogs and forms must be operable" | `.claude/rules/components.md` | A11y and convention findings |

## Approach

Add a `cards` slice to the existing in-memory store and a small pure library, `src/lib/cards.ts`, that owns number generation on the `4242` BIN with a Luhn check digit, masking, and the status transition table. A data module, `src/data/cards.ts`, owns server-side validation against allowlists and the store operations (`issueCard`, `listCards`, `cardById`, `transitionCard`). Three route handlers expose this: `GET`/`POST /api/cards`, `GET /api/cards/[id]`, and `PATCH /api/cards/[id]` for status. `issueCard` returns the full number alongside the stored record exactly once; the record itself carries `last4` and `numberRef` only. The UI is a `/cards` list page mirroring `/payments`, an issue drawer with a reveal-once success screen, and a `/cards/[id]` detail page with a spend progress bar and status timeline. Freeze/unfreeze/cancel call `PATCH` from client components and update local state, so no page reload.

**Considered and rejected:** generating the number in the issue drawer and posting it up. Rejected because `.claude/rules/cards.md` says a card number produced in the browser is a bug, and the client is not trusted. Also rejected: a `cards` array outside the store module. The store on `globalThis` is what survives Next.js module reloads; a separate array would reset on every hot reload.

## API contract

Every agent builds against this. Bodies are JSON; money is integer minor units.

| Route | Request | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/cards` | — | `200 { cards: Card[] }` newest first | — |
| `POST /api/cards` | `IssueCardInput`, optional `Idempotency-Key` header | `201 { card: Card, number: string }`; a replay of a known key returns `200 { card, replayed: true }` with no number | `400 { message }` |
| `GET /api/cards/[id]` | — | `200 { card: Card }` | `404 { message }` |
| `PATCH /api/cards/[id]` | `{ status: CardStatus }` | `200 { card: Card }` | `400` bad status, `404` unknown, `409 { message }` illegal transition |

`src/lib/cards.ts` exports: `luhnCheckDigit(digits)`, `isValidLuhn(number)`, `generateCardNumber(random?)` (16 digits, starts `4242`), `maskCardNumber(last4)` → `•••• 4242`, `CARD_TRANSITIONS`, `canTransition(from, to)`.

`src/data/cards.ts` exports: `CARD_CURRENCIES`, `CARD_CATEGORIES`, `MAX_SPEND_LIMIT` (5,000,000), `validateIssueCardInput(body)`, `issueCard(input, idempotencyKey?)`, `issuedCardForKey(key)`, `listCards()`, `cardById(id)`, `transitionCard(id, status)`. The allowlists themselves live in `src/lib/cards.ts` so client components can import them without pulling in the store.

## File map

| File | Add or change | Why |
| --- | --- | --- |
| `src/data/types.ts` | change | `Card`, `CardStatus`, `CardCategory`, `CardEvent`, `IssueCardInput` |
| `src/lib/cards.ts` | add | Luhn, `4242` generator, masking, transition table |
| `src/lib/cards.test.ts` | add | Stretch: tests on the generator and transitions |
| `src/data/cards.ts` | add | Validation allowlists, store operations, reveal-once return |
| `src/data/cards.test.ts` | add | Validation rejections and guarded transitions |
| `src/data/store.ts` | change | `cards: Card[]` slice |
| `src/data/generate.ts` | change | Deterministic seed cards with some spend |
| `src/app/api/cards/route.ts` | add | `GET` list, `POST` issue |
| `src/app/api/cards/[id]/route.ts` | add | `GET` detail, `PATCH` status |
| `src/app/cards/page.tsx` | add | List route, server component |
| `src/app/cards/cards-table.tsx` | add | Client table with freeze/unfreeze, written empty and error states |
| `src/app/cards/issue-card-drawer.tsx` | add | Form, server error display, reveal-once success screen |
| `src/app/cards/[id]/page.tsx` | add | Detail: full record, spend against limit, timeline |
| `src/app/cards/[id]/card-actions.tsx` | add | Freeze/unfreeze/cancel on detail |
| `src/components/ui/cards/SpendProgress.tsx` | add | Bar, amber past 80% |
| `src/components/ui/payments/StatusBadge.tsx` | change | Add `active`, `frozen`, `cancelled` |
| `src/app/siteConfig.ts`, `src/components/ui/navigation/AppSidebar.tsx` | change | Cards nav entry |

## Plan

Agents own disjoint files. Phase 1 runs four Sonnet agents in parallel; phase 2 integrates.

1. **Types** (done) — done when: `tsc --noEmit` passes with `Card` in `types.ts`.
2. **Card library + tests** — done when: `npm test` shows Luhn, `4242` prefix, masking, and every transition case green.
3. **Store, validation, routes** — done when: `curl` rejects the four bad inputs with `400`, issues with `201` and a `4242…` number, the list never contains a full number, and `PATCH` on a cancelled card returns `409`.
4. **List page + issue drawer + nav** — done when: `/cards` renders seed cards, the drawer issues a card, the full number appears once on the success screen, and the list updates without reload.
5. **Detail page + spend bar + actions** — done when: `/cards/<id>` shows the record, a bar that is amber above 80%, the timeline, and freeze/cancel update in place.
6. **Integrate** — done when: `tsc`, `npm run lint`, `npm test` pass; org-standards review on the diff finds nothing; `/ship-ready` is clean; browser screenshots taken.
7. **PR** — done when: `/pr` description is written with only verified claims and `/submit` has pushed.

## Verification

| Acceptance criterion | How it is proven |
| --- | --- |
| Issue a card | Drawer submit → `201`, row appears in `/cards` table; screenshot |
| Card list at `/cards` | Page renders nickname, merchant, `•••• 4242`, limit via `formatMoney`, `StatusBadge`, `formatDate` |
| Card detail | `/cards/<id>` shows every field plus spend vs limit |
| Generated numbers | `src/lib/cards.test.ts`: starts `4242`, 16 digits, `isValidLuhn` true; `curl POST` output |
| Reveal once | `GET /api/cards` and `GET /api/cards/[id]` payloads contain no 16-digit string; `Card` type has no number field |
| Server-side validation | `src/data/cards.test.ts` and `curl` for missing merchant, `0`, `-1`, `5000001`, `JPY` → `400` |
| Freeze/unfreeze (stretch) | Click in list, badge flips, no navigation; `PATCH` visible in network log |
| Spend progress (stretch) | Seed card above 80% renders amber class |
| Category lock (stretch) | Category on form, stored, shown in list and detail |
| Tests (stretch) | `npm test` summary line in PR |
| Empty and error states (stretch) | Empty table copy; drawer shows server `message` on `400`; action failure shows message |
| Currency matches merchant (beyond ticket) | `src/data/cards.test.ts` rejects `GBP` on a USD merchant; `curl` → `400` |
| Idempotent issue (beyond ticket) | `src/data/cards.test.ts` same key → same card, no second row; `curl` replay → `200 replayed` |

## Risks

- Four agents in parallel could drift from the contract. Mitigation: the contract above and disjoint file ownership; integration typecheck catches the rest.
- `StatusBadge` is shared with payments; adding card statuses must not change existing labels.
- Client table state must resync after `router.refresh()` so a newly issued card appears.

## Out of scope

- Persistence (NWP-203), auth, real issuer calls, editing a limit after issue (NWP-202).
- Filtering or paginating the card list. The ticket asks for every issued card.

## Open questions

- Spend: no transactions exist for cards, so `spent` is a stored minor-unit field seeded on some cards and `0` on new ones. Decision: proceed this way and say so in the PR.
- Currency vs merchant currency: the ticket lists currency as a free choice from the allowlist, so it is not forced to match the merchant. Decision: allow any of the three; default the form to the merchant's currency.

# Vonga — Agent Briefing

Bespoke fashion e-commerce site for Vonga, a Pretoria atelier. This file exists so any AI coding
assistant (Codex, Claude Code, etc.) can pick up this project without re-deriving context that's
already been established. Read this before making changes.

## Stack

- **Next.js (App Router)**, deployed on **Vercel** — production domain `www.vonga.co.za`
  (apex `vonga.co.za` 308-redirects to `www`), plus the default `vonga.vercel.app`.
- **Supabase** (Postgres + Auth) — dedicated project, ref `lcwyqwmaakqygkemmuks`. This is
  **not** shared with any other business — the codebase originated from a bakery template
  ("Crunch & Crumbs") but Vonga now runs on its own fully separate Supabase project.
- **Resend** — transactional email for order confirmations, merchant alerts and order-status
  updates, sent through a durable outbox (see "Email automation" below). The WhatsApp `wa.me`
  link in the storefront footer is a manual concierge chat only — no Meta API, templates or
  business verification are used anywhere in this codebase anymore.
- **Mailchimp** — newsletter signups sync here for campaign sending (composing/sending
  campaigns happens in Mailchimp's own dashboard, not in this codebase).
- **PayFast** — the only checkout payment method (added 25 November 2026; see "Checkout
  payment — PayFast" below). Runs in sandbox mode by default; `PAYFAST_MODE=live` plus the
  merchant's own credentials switch it to real payments once the merchant account is verified.

## Where things live

- `lib/vonga.ts` — the entire product catalog. `vongaProducts` is the single source of truth
  for every product; `vongaCategoryStyles` defines the Signature Collections (categories) and
  their display order. Categories are matched by a product's `style` field; `subStyle` further
  splits a category into sub-rows (e.g. Traditional has `signature` and `couples`).
- `app/storefront.tsx` — the entire storefront UI in one large client component (hero, product
  rows, quick-view modal, cart/checkout drawer, footer). `app/globals.css` is one large,
  intentionally near-minified stylesheet; add new rules near related existing ones rather than
  reformatting the whole file.
- `lib/repository.ts` — checkout/order logic, Supabase reads/writes, dashboard data. Has a
  local-JSON fallback path (`isSupabaseConfigured()` false) that's dev-only, not the real path.
- `lib/whatsapp.ts` / `lib/mailchimp.ts` / `lib/site.ts` — integration helpers and shared
  business constants (phone, address, site URL).

## Product photo conventions

- New product photos get resized to 1200×1200 (`fit: 'cover'`) and saved as WebP via `sharp`
  into `public/vonga/images/products/` (or a category-specific subfolder for older assets).
- Multi-angle products use the `secondaryImages: string[]` field on a product — this powers a
  clickable dot toggle (`.photo-dots`) in both the grid card and the quick-view modal. Reuse
  this pattern for any "front/back/close-up" style photo set.
- Any Signature Collection row with more than 4 products automatically gets a **"View more"**
  button (added so nothing is silently hidden past the 4th item) — this is handled generically
  in `renderStyleRow` in `storefront.tsx`, no per-category work needed.
- When a user pastes a photo in chat, it lands in `~/Downloads` with a system-generated
  filename — sometimes reused from an existing asset name, sometimes a ChatGPT-style
  timestamped name. **Always view the file before processing it** — filenames are not reliable,
  and stale/wrong files can linger from earlier in a session.

## Email automation — durable outbox

Order confirmations, merchant alerts and status-change emails replaced the old Meta WhatsApp
automation (migrated 20 November 2026, see `Vonga_Email_Automation_Handoff.md` if still around).
No Meta business verification, WhatsApp templates or WhatsApp API credentials are needed for
notifications anymore — only the `wa.me` concierge link remains, and it's just a static link.

- `lib/email.ts` — thin Resend HTTPS wrapper (`RESEND_API_KEY`, `ORDER_EMAIL_FROM`,
  `ORDER_EMAIL_REPLY_TO`). Returns a `retryable` flag so the caller can tell a transient failure
  (network/5xx/429 — worth retrying) from a permanent one (missing config, invalid recipient —
  not worth retrying).
- `lib/email-templates.ts` — subject/HTML/text builders for the three email kinds. All dynamic
  values are HTML-escaped (customer notes are free text). Currency uses
  `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })`; dates use
  `Africa/Johannesburg`.
- `lib/notifications.ts` — claims due rows from the `notification_jobs` table (migration
  `004_notification_outbox.sql`) via the `claim_notification_jobs` RPC (uses `FOR UPDATE SKIP
  LOCKED` + a lease so two workers can't double-send), sends the email, and on failure
  reschedules with exponential backoff + jitter up to 8 attempts before marking the job
  `failed`. Every outcome also writes an `automation_events` row so the dashboard's existing
  "Automation log" panel keeps working unchanged.
- `app/api/jobs/process-notifications/route.ts` — the worker endpoint, authorized by a
  `NOTIFICATION_WORKER_SECRET` bearer token. `.github/workflows/process-notifications.yml` calls
  it every 5 minutes (repo secrets `NOTIFICATION_WORKER_URL` + `NOTIFICATION_WORKER_SECRET` —
  GitHub Actions cron was used instead of Vercel Cron because this repo already has that pattern
  in `database-backup.yml`, and Vercel's Hobby-tier cron only runs daily).
- Jobs are also drained inline (best-effort, `void processDueNotificationJobs(...).catch(...)`)
  right after an order is created or its status changes, so customers usually get email within
  seconds; the scheduled worker above is the retry backstop, not the primary path.
- `ORDER_ALERT_EMAIL` is the owner's notification inbox (there is no more `ORDER_ALERT_PHONE` —
  that WhatsApp-only alert number was removed from `lib/site.ts`).
- `EMAIL_AUTOMATION_ENABLED=false` is a kill switch: `sendEmail()` short-circuits as a permanent
  failure without calling Resend, if sending ever needs to be paused without touching other config.

## Checkout payment — PayFast

PayFast is the only checkout payment method; the storefront's old multi-option payment-method
picker (card/Yoco/Ozow/SnapScan/etc.) was always decorative ("Preview only" — no provider was
wired up) and has been removed entirely.

- `lib/payfast.ts` — signature generation (`phpUrlEncode` + MD5, matching PayFast's own PHP SDK
  algorithm exactly — insertion order, not alphabetical; see `tests/payfast.test.ts` for a
  signature verified against an independently hand-derived fixture) and `buildPaymentFields()`.
  `getPayfastConfig()` defaults to PayFast's public sandbox credentials in `PAYFAST_MODE=sandbox`
  (the default); `PAYFAST_MODE=live` requires `PAYFAST_MERCHANT_ID`/`PAYFAST_MERCHANT_KEY`/
  `PAYFAST_PASSPHRASE` to be set explicitly and throws if they're missing — it never silently
  falls back to sandbox credentials in live mode.
- `app/api/payfast/redirect/route.ts` — after `createCheckoutOrder` succeeds, the storefront
  navigates the browser here (`/api/payfast/redirect?order=<id>`); it looks the order up, builds
  the signed PayFast fields server-side (the passphrase never reaches the browser) and returns
  an auto-submitting HTML form that POSTs to PayFast's hosted payment page.
- `app/api/payfast/notify/route.ts` — the ITN (Instant Transaction Notification) webhook PayFast
  calls server-to-server once payment completes/fails/is cancelled. Validates, in order: the
  signature, the merchant ID, a server-to-server confirmation POST to PayFast's own
  `/eng/query/validate` endpoint (must respond `VALID` — this is what stops a forged POST from
  being trusted, not the signature check alone), then the amount. Only after all of that does it
  update the order.
- On `payment_status=COMPLETE`, it calls the existing `updateOrderStatus(id, "confirmed")` —
  reusing the status that was already wired to the "Payment confirmed" customer email in
  `STATUS_COPY` (`lib/email-templates.ts`) before PayFast existed. Only bumps status if the order
  is still `new`/`payment_pending`, so a late/retried ITN can't regress an order the owner has
  already moved further in the dashboard Kanban. Every outcome (complete/failed/cancelled) is
  also logged to `automation_events` via `recordPayfastPayment()` in `lib/repository.ts`, so it
  shows in the dashboard's existing "Automation log" panel with no new UI needed.
- `app/checkout/success` / `app/checkout/cancelled` — PayFast's `return_url`/`cancel_url` land
  here (plain pages, not part of the storefront SPA, since the browser left and came back from
  PayFast's own domain).
- As of 25 November 2026 the business hadn't yet completed PayFast's own merchant verification
  (FICA documents) — sandbox mode is safe to leave running until that's done; don't flip
  `PAYFAST_MODE=live` without the real merchant credentials in hand.

## Checkout flow

`createCheckoutOrder()` in `lib/repository.ts` validates the email server-side, then calls the
`create_checkout_order` Postgres RPC, which — in one transaction — upserts the customer by phone
(dedup key), inserts the order + order_items, and inserts the two initial `notification_jobs`
rows (customer confirmation + merchant alert), each keyed with a dedup key like
`order:<id>:customer-confirmation:v1` so retries can never create a duplicate order or duplicate
email. The client sends a per-checkout-attempt `idempotencyKey` (generated once per attempt in
`storefront.tsx`, cleared only after a successful response) so repeat clicks or network retries
return the original order instead of creating a second one. The checkout form also does
phone-based customer lookup (`/api/vonga/customers/lookup`) to auto-fill name/email/address for
returning customers — no login wall, just recognition by phone number.

Status changes (`updateOrderStatus()`) insert a row into `order_status_events` (so a dedup key
can reference a specific transition, since an order may legitimately revisit the same status)
and a matching `notification_jobs` row, skipping entirely on a no-op (same-status) update and
logging (not throwing) when an older order has no email on file.

## Merchant dashboard

`/dashboard` requires signing in at `/login` with a real Supabase Auth account (not the simple
password-only fallback — that only applies when Supabase isn't configured, which it always is
here). Current login email is `info@vonga.co.za`; the password is **not** recorded in this file
— ask the project owner for it directly, never commit credentials to the repo.

## Environment (`.env.local`, gitignored — never commit this)

Required keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MERCHANT_SLUG` (=`vonga`), `DASHBOARD_PASSWORD`,
`AUTH_SECRET`, `RESEND_API_KEY`, `ORDER_EMAIL_FROM`, `ORDER_EMAIL_REPLY_TO`,
`ORDER_ALERT_EMAIL`, `NOTIFICATION_WORKER_SECRET`, `MAILCHIMP_API_KEY`,
`MAILCHIMP_AUDIENCE_ID`, `PAYFAST_MODE` (plus `PAYFAST_MERCHANT_ID`/`PAYFAST_MERCHANT_KEY`/
`PAYFAST_PASSPHRASE` once `PAYFAST_MODE=live`). If working in a fresh environment (not this same machine), these need
to be recreated manually — ask the project owner, don't regenerate/rotate them without asking.

## Business facts (for structured data / copy consistency)

- WhatsApp Business line: **+27 76 246 8320**
- Office: Menlyn Square Office Park, 134 Aramist Ave, Menlyn, Pretoria, Gauteng, South Africa
- Free delivery threshold: **R5,000** (kept consistent across top bar, experience section, and
  the actual delivery-fee logic in `lib/repository.ts` — update all of these together if it
  ever changes, they're not derived from one constant)

## Working environment quirks

- This machine runs **critically low on disk space** repeatedly — it has hit 0 bytes free
  multiple times during this project. Always check `df -h /c` (or equivalent) before large
  file operations, and don't assume a write succeeded without verifying — files have
  disappeared mid-task before due to background cleanup when space is critical.
- The dev server does not survive a machine restart/sleep and needs to be manually restarted
  (`npm run dev`, logs to `local-dev.out.log` / `local-dev.err.log` in the project root).
- Windows + Git Bash environment — watch for spaces in the path
  (`C:\Users\CHRISTO PC\Desktop\Vonga Website\github-vonga`).

## SEO

Already done — don't redo: `app/robots.ts`, `app/sitemap.ts`, Open Graph/Twitter metadata and
`ClothingStore`/`ItemList` JSON-LD structured data in `app/layout.tsx`, all driven by constants
in `lib/site.ts`.

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
- **Meta WhatsApp Cloud API** — order confirmations and merchant alerts.
- **Mailchimp** — newsletter signups sync here for campaign sending (composing/sending
  campaigns happens in Mailchimp's own dashboard, not in this codebase).

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

## WhatsApp — known gotchas

- The approved order-confirmation template is named `order_confirmation` with language code
  **`en`** — NOT `en_US`. Meta rejects the send with a confusing "template does not exist"
  error if you use the wrong code. This broke real customer confirmations silently until fixed.
- `WHATSAPP_ACCESS_TOKEN` must be a **permanent System User token** (Business Settings → System
  Users), not the 24-hour temporary token Meta shows during initial test setup.
- Freeform text messages (used for order status updates: payment_pending, confirmed, etc.) only
  deliver within a 24-hour window the *customer* opens by messaging first. This is a known
  follow-up — those status messages are not yet converted to templates the way order
  confirmation was.
- New WhatsApp phone numbers sometimes need an explicit `/register` API call (with a PIN) before
  they can send at all — if you see error 133010 "Account not registered," that's why.

## Checkout flow

`createCheckoutOrder()` in `lib/repository.ts`: upserts the customer by phone (dedup key),
creates the order + order_items, then `recordConfirmation()` fires two WhatsApp sends — the
customer's order-confirmation template, and a freeform alert to the merchant's own number
(`BUSINESS_PHONE` in `lib/site.ts`). The checkout form also does phone-based customer lookup
(`/api/vonga/customers/lookup`) to auto-fill name/email/address for returning customers —
no login wall, just recognition by phone number.

## Merchant dashboard

`/dashboard` requires signing in at `/login` with a real Supabase Auth account (not the simple
password-only fallback — that only applies when Supabase isn't configured, which it always is
here). Current login email is `info@vonga.co.za`; the password is **not** recorded in this file
— ask the project owner for it directly, never commit credentials to the repo.

## Environment (`.env.local`, gitignored — never commit this)

Required keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MERCHANT_SLUG` (=`vonga`), `DASHBOARD_PASSWORD`,
`AUTH_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `MAILCHIMP_API_KEY`,
`MAILCHIMP_AUDIENCE_ID`. If working in a fresh environment (not this same machine), these need
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

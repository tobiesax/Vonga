# Crunch & Crumbs Commerce

A WhatsApp-first storefront and merchant operations dashboard. Customers place structured orders on the storefront; merchants manage fulfilment in a protected dashboard; each order and status change produces a WhatsApp automation event.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`. Without Supabase variables the app intentionally uses its local JSON adapter and the dashboard password defaults to `admin123`.

## Production architecture

- Next.js hosts the storefront, dashboard and server APIs.
- Supabase provides Postgres, merchant authentication and row-level security.
- Meta Cloud API sends WhatsApp messages from server-side routes.
- Every product, customer, order and event is scoped to a merchant.

## 1. Create Supabase

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`.
3. In **Authentication → Users**, create the merchant owner user.
4. Add that user to the seeded merchant with this SQL, replacing the email:

```sql
insert into public.merchant_members (merchant_id, user_id, role)
select m.id, u.id, 'owner'
from public.merchants m
join auth.users u on u.email = 'owner@example.com'
where m.slug = 'crunch-and-crumbs'
on conflict do nothing;
```

## 2. Configure environment variables

Copy `.env.example` to `.env.local` locally. Configure the same variables in the deployment provider:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MERCHANT_SLUG=crunch-and-crumbs
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `WHATSAPP_ACCESS_TOKEN` to browser code. Do not commit `.env.local`.

When all three Supabase variables are present, the app automatically switches from local mode to Supabase mode and the dashboard login changes from shared-password login to the Supabase user's email and password.

## 3. Configure WhatsApp

Create a Meta developer app with the WhatsApp product, connect a WhatsApp Business Account and add the permanent access token and phone-number ID above. Without these credentials, messages are recorded as `queued`; with them, server routes send through Meta and record `sent` or `failed`.

Automated events currently include:

- New-order confirmation
- Payment-pending reminder
- Payment confirmed
- Preparing notification
- Ready for collection/delivery
- Delivered and review request

## 4. Deploy to Vercel

1. Push the repository to GitHub.
2. Import it into Vercel as a Next.js project.
3. Add all production environment variables.
4. Deploy and test checkout with Meta's test recipient before using a live number.
5. Add the production domain to the Supabase authentication URL configuration.

## Production checklist

- Use a custom domain with HTTPS.
- Rotate any token that has ever been shared in chat or committed.
- Keep the service-role key server-only.
- Test row-level security using a non-member account.
- Create database backups and an incident/contact process.
- Add rate limiting and bot protection before public campaigns.
- Obtain customer consent and publish privacy, delivery and refund policies.

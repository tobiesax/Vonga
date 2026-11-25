# Vonga

Luxury womenswear and bespoke tailoring storefront for Vonga, Pretoria.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run typecheck
npm run build
```

## Commerce

- Product discovery, quick view, sizing, wishlist and persistent bag
- Checkout with real PayFast payment (see "Checkout payment — PayFast" in `AGENTS.md`), backed by
  Supabase and a durable transactional-email outbox (order confirmation, merchant alert,
  status-change emails — see "Email automation" in `AGENTS.md`)
- Appointment requests
- WhatsApp concierge — a manual `wa.me` chat link only; no automated WhatsApp messaging

In production, orders are written to Supabase and notification emails are sent via Resend
through a retryable outbox (`notification_jobs`), drained both inline after each order/status
change and by a scheduled worker (`.github/workflows/process-notifications.yml`). Set
`RESEND_API_KEY`, `ORDER_EMAIL_FROM`, `ORDER_ALERT_EMAIL` and `NOTIFICATION_WORKER_SECRET`
before accepting live customer orders — see `.env.example`. Without Supabase configured, the
app falls back to local JSON files for local development only; it refuses that fallback when
`NODE_ENV=production`.

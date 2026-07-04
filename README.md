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

## Commerce prototype

- Product discovery, quick view, sizing, wishlist and persistent bag
- Order-request checkout with placeholder payment preferences
- Appointment requests
- WhatsApp concierge

Order and appointment requests are written to local JSON files during local development. Connect the Vonga API routes to durable production storage and an email or messaging provider before accepting live customer requests.

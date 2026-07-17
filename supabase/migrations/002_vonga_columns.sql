-- Vonga's checkout needs an email address, a chosen payment method, and a garment size per
-- line item — none of which the original bakery schema had. Additive only: nothing removed.
alter table public.orders add column if not exists email text;
alter table public.orders add column if not exists payment_method text;
alter table public.customers add column if not exists email text;
alter table public.order_items add column if not exists size text;

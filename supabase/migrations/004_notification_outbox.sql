-- Replaces Meta WhatsApp order automation with a durable transactional-email outbox.
-- Additive only: existing tables, data and the automation_events audit log are preserved.
-- automation_events keeps logging human-readable outcomes for the dashboard; notification_jobs
-- is the new retryable source of truth that the worker (app/api/jobs/process-notifications) drains.

create type public.notification_job_status as enum ('pending', 'processing', 'sent', 'failed');
create type public.notification_kind as enum ('order_confirmation', 'merchant_order_alert', 'order_status_changed');

-- Persisted per-transition record so a dedup key can reference a specific status change,
-- since an order may legitimately revisit the same status (e.g. corrected back to "preparing").
create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  order_id text not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  created_at timestamptz not null default now()
);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  order_id text not null references public.orders(id) on delete cascade,
  kind public.notification_kind not null,
  dedup_key text not null unique,
  recipient_email text not null default '',
  recipient_name text not null default '',
  payload jsonb not null default '{}'::jsonb,
  status public.notification_job_status not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  last_error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_status_events_merchant_created_idx on public.order_status_events (merchant_id, created_at desc);
create index notification_jobs_merchant_created_idx on public.notification_jobs (merchant_id, created_at desc);
create index notification_jobs_claim_idx on public.notification_jobs (status, next_attempt_at);

alter table public.order_status_events enable row level security;
alter table public.notification_jobs enable row level security;

-- Read-only for merchant staff (parity with automation_events); all writes go through the
-- service-role client, which bypasses RLS, exactly like every other admin write in this app.
create policy "members read status events" on public.order_status_events for select using (public.is_merchant_member(merchant_id));
create policy "members read notification jobs" on public.notification_jobs for select using (public.is_merchant_member(merchant_id));

-- A stable client-supplied key lets repeat clicks or network retries return the original order
-- instead of creating a duplicate. Null for any pre-existing historical order.
alter table public.orders add column if not exists idempotency_key text;
create unique index if not exists orders_merchant_idempotency_idx on public.orders (merchant_id, idempotency_key) where idempotency_key is not null;

-- Atomically creates the customer, order, order_items and the two initial notification jobs.
-- SECURITY DEFINER because it writes across merchant-scoped tables on the caller's behalf, but
-- it is never exposed to anon/authenticated roles below — only the server's service-role client
-- may call it, after it has already validated items/prices and resolved merchant_id itself.
create or replace function public.create_checkout_order(
  p_merchant_id uuid,
  p_idempotency_key text,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_notes text,
  p_payment_method text,
  p_items jsonb,
  p_owner_alert_email text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.orders;
  v_order public.orders;
  v_customer_id uuid;
  v_subtotal numeric(12,2);
  v_delivery_fee numeric(12,2);
  v_total numeric(12,2);
  v_order_id text;
begin
  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select * into v_existing from public.orders where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
    if found then
      return v_existing;
    end if;
  end if;

  select coalesce(sum((item->>'price')::numeric * (item->>'quantity')::int), 0)
    into v_subtotal
    from jsonb_array_elements(p_items) as item;
  v_delivery_fee := case when v_subtotal >= 5000 then 0 else 120 end;
  v_total := v_subtotal + v_delivery_fee;

  insert into public.customers (merchant_id, name, phone, email, address, order_count, total_spent, updated_at)
  values (p_merchant_id, p_customer_name, p_phone, p_email, p_address, 1, v_total, now())
  on conflict (merchant_id, phone) do update set
    name = excluded.name,
    email = excluded.email,
    address = excluded.address,
    order_count = public.customers.order_count + 1,
    total_spent = public.customers.total_spent + excluded.total_spent,
    updated_at = now()
  returning id into v_customer_id;

  v_order_id := 'VO-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  begin
    insert into public.orders (id, merchant_id, customer_id, customer_name, phone, email, address, notes, payment_method, subtotal, delivery_fee, total, status, idempotency_key)
    values (v_order_id, p_merchant_id, v_customer_id, p_customer_name, p_phone, p_email, p_address, p_notes, p_payment_method, v_subtotal, v_delivery_fee, v_total, 'new', p_idempotency_key)
    returning * into v_order;
  exception when unique_violation then
    v_order_id := 'VO-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
    insert into public.orders (id, merchant_id, customer_id, customer_name, phone, email, address, notes, payment_method, subtotal, delivery_fee, total, status, idempotency_key)
    values (v_order_id, p_merchant_id, v_customer_id, p_customer_name, p_phone, p_email, p_address, p_notes, p_payment_method, v_subtotal, v_delivery_fee, v_total, 'new', p_idempotency_key)
    returning * into v_order;
  end;

  insert into public.order_items (order_id, merchant_id, product_id, product_external_id, name, size, price, quantity)
  select
    v_order.id, p_merchant_id,
    (item->>'product_id')::uuid,
    item->>'product_external_id',
    item->>'name',
    item->>'size',
    (item->>'price')::numeric,
    (item->>'quantity')::int
  from jsonb_array_elements(p_items) as item;

  if p_email is not null and length(trim(p_email)) > 0 then
    insert into public.notification_jobs (merchant_id, order_id, kind, dedup_key, recipient_email, recipient_name, payload)
    values (p_merchant_id, v_order.id, 'order_confirmation', 'order:' || v_order.id || ':customer-confirmation:v1', p_email, p_customer_name, jsonb_build_object('order', row_to_json(v_order), 'items', p_items))
    on conflict (dedup_key) do nothing;
  end if;

  insert into public.notification_jobs (merchant_id, order_id, kind, dedup_key, recipient_email, recipient_name, payload)
  values (p_merchant_id, v_order.id, 'merchant_order_alert', 'order:' || v_order.id || ':merchant-alert:v1', coalesce(p_owner_alert_email, ''), 'Vonga', jsonb_build_object('order', row_to_json(v_order), 'items', p_items))
  on conflict (dedup_key) do nothing;

  return v_order;
end;
$$;

revoke all on function public.create_checkout_order(uuid, text, text, text, text, text, text, text, jsonb, text) from public;
revoke all on function public.create_checkout_order(uuid, text, text, text, text, text, text, text, jsonb, text) from anon, authenticated;
grant execute on function public.create_checkout_order(uuid, text, text, text, text, text, text, text, jsonb, text) to service_role;

-- Atomically claims due jobs for sending: fresh pending jobs, plus processing jobs whose lease
-- expired (a worker died mid-send). FOR UPDATE SKIP LOCKED prevents concurrent workers double-claiming.
create or replace function public.claim_notification_jobs(p_limit int, p_lease_expires_at timestamptz)
returns setof public.notification_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.notification_jobs
  set status = 'processing', lease_expires_at = p_lease_expires_at, updated_at = now()
  where id in (
    select id from public.notification_jobs
    where (status = 'pending' and next_attempt_at <= now())
       or (status = 'processing' and lease_expires_at < now())
    order by next_attempt_at
    limit p_limit
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_notification_jobs(int, timestamptz) from public;
revoke all on function public.claim_notification_jobs(int, timestamptz) from anon, authenticated;
grant execute on function public.claim_notification_jobs(int, timestamptz) to service_role;

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (merchant_id, email)
);

create index newsletter_subscribers_merchant_created_idx on public.newsletter_subscribers (merchant_id, created_at desc);

alter table public.newsletter_subscribers enable row level security;

create policy "members read newsletter subscribers" on public.newsletter_subscribers for select using (public.is_merchant_member(merchant_id));

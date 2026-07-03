create extension if not exists pgcrypto;

create type public.merchant_role as enum ('owner', 'admin', 'staff', 'viewer');
create type public.order_status as enum ('new', 'payment_pending', 'confirmed', 'preparing', 'ready', 'delivered');
create type public.automation_status as enum ('queued', 'sent', 'failed');

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.merchant_members (
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.merchant_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (merchant_id, user_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  external_id text not null,
  name text not null,
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  image text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (merchant_id, external_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  phone text not null,
  address text not null default '',
  order_count integer not null default 0,
  total_spent numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, phone)
);

create table public.orders (
  id text primary key,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  customer_name text not null,
  phone text not null,
  address text not null,
  notes text not null default '',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  status public.order_status not null default 'new',
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_external_id text not null,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  quantity integer not null check (quantity between 1 and 20)
);

create table public.automation_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  type text not null,
  order_id text not null references public.orders(id) on delete cascade,
  status public.automation_status not null default 'queued',
  message text not null,
  created_at timestamptz not null default now()
);

create index orders_merchant_created_idx on public.orders (merchant_id, created_at desc);
create index customers_merchant_created_idx on public.customers (merchant_id, created_at desc);
create index events_merchant_created_idx on public.automation_events (merchant_id, created_at desc);

create or replace function public.is_merchant_member(target uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.merchant_members where merchant_id = target and user_id = auth.uid()) $$;

alter table public.merchants enable row level security;
alter table public.merchant_members enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.automation_events enable row level security;

create policy "members read merchant" on public.merchants for select using (public.is_merchant_member(id));
create policy "members read membership" on public.merchant_members for select using (user_id = auth.uid());
create policy "members read products" on public.products for select using (public.is_merchant_member(merchant_id));
create policy "admins manage products" on public.products for all using (exists(select 1 from public.merchant_members m where m.merchant_id = products.merchant_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "members read customers" on public.customers for select using (public.is_merchant_member(merchant_id));
create policy "members read orders" on public.orders for select using (public.is_merchant_member(merchant_id));
create policy "staff update orders" on public.orders for update using (exists(select 1 from public.merchant_members m where m.merchant_id = orders.merchant_id and m.user_id = auth.uid() and m.role in ('owner','admin','staff')));
create policy "members read order items" on public.order_items for select using (public.is_merchant_member(merchant_id));
create policy "members read events" on public.automation_events for select using (public.is_merchant_member(merchant_id));

insert into public.merchants (slug, name) values ('crunch-and-crumbs', 'Crunch & Crumbs') on conflict do nothing;
insert into public.products (merchant_id, external_id, name, description, price, image)
select m.id, p.external_id, p.name, p.description, p.price, p.image from public.merchants m cross join (values
  ('cookie-stack','Chocolate Chip Cookies','Soft, chewy and loaded with chocolate chips.',25.00,'/assets/products/cookie-stack.jpg'),
  ('classic-chinchin','Classic Chinchin','Crispy, golden and perfectly sweetened.',20.00,'/assets/products/bowl-chinchin.jpg'),
  ('red-velvet','Red Velvet Cookies','Rich red velvet with white chocolate chips.',30.00,'/assets/products/cookie-single.jpg'),
  ('coconut-chinchin','Coconut Chinchin','Coconut-infused chinchin with a delightful crunch.',25.00,'/assets/products/coconut-chinchin.jpg'),
  ('mix-combo','Mix Combo Pack','A gift-ready mix of cookies and chinchin favourites.',40.00,'/assets/products/mix-combo.png'),
  ('gift-box','Celebration Gift Box','A beautifully packed selection made for sharing and gifting.',120.00,'/assets/products/gift-box.jpg')
) as p(external_id,name,description,price,image) where m.slug = 'crunch-and-crumbs' on conflict do nothing;

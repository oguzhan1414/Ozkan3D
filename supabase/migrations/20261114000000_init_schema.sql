-- Ozkan3D — MongoDB'den Supabase Postgres'e ilk şema
-- Not: İç içe (embedded) Mongo alt dokümanları JSONB olarak tutulur
-- (sipariş kalemleri, adresler, sepet kalemleri, hero slider vb.).
-- JSONB içeriği API'nin döndürdüğü şekildedir: camelCase anahtarlar, alt kayıtlarda "_id".
-- Erişim yalnızca backend (service_role) üzerinden: RLS açık, policy yok.

create extension if not exists pgcrypto;

-- updated_at otomatik güncelleme
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- users
create table public.users (
  id                   uuid primary key default gen_random_uuid(),
  first_name           text not null check (char_length(first_name) <= 30),
  last_name            text not null check (char_length(last_name) <= 30),
  email                text not null unique check (email = lower(email)),
  password             text not null,           -- bcrypt hash
  phone                text,
  birth_date           timestamptz,
  role                 text not null default 'user' check (role in ('user', 'admin')),
  addresses            jsonb not null default '[]'::jsonb,   -- [{_id, title, fullName, phone, city, district, neighborhood, address, isDefault}]
  favorites            uuid[] not null default '{}',
  google_id            text,
  email_verified       boolean not null default false,
  email_verify_token   text,
  email_verify_expire  timestamptz,
  reset_password_token text,
  reset_password_expire timestamptz,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index users_google_id_idx on public.users (google_id) where google_id is not null;
create index users_reset_token_idx on public.users (reset_password_token) where reset_password_token is not null;
create index users_verify_token_idx on public.users (email_verify_token) where email_verify_token is not null;

-- ----------------------------------------------------------- categories
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text unique check (slug = lower(slug)),
  icon       text not null default '📦',
  parent_id  uuid references public.categories (id) on delete set null,
  "order"    integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_active_order_idx on public.categories (is_active, "order");
create index categories_parent_idx on public.categories (parent_id, is_active, "order");

-- -------------------------------------------------------------- products
-- array_to_string STABLE olduğu için generated column'da kullanılamıyor;
-- text[] için sonuç sabit olduğundan immutable sarmalayıcı güvenli.
create or replace function public.text_array_to_string(arr text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$ select array_to_string(arr, ' ') $$;

create table public.products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text unique check (slug = lower(slug)),
  description    text,
  short_desc     text,
  category       text not null,
  subcategory    text,
  price          numeric(12,2) not null check (price >= 0),
  old_price      numeric(12,2),
  stock          integer not null default 0 check (stock >= 0),
  sku            text unique,
  images         text[] not null default '{}',
  image_variants jsonb not null default '[]'::jsonb,   -- [{url, color}]
  material       text[] not null default '{}',
  colors         text[] not null default '{}',
  badge          text check (badge in ('Yeni', 'İndirim', 'Çok Satan')),
  rating         numeric(2,1) not null default 0 check (rating between 0 and 5),
  review_count   integer not null default 0,
  featured       boolean not null default false,
  is_active      boolean not null default true,
  weight         numeric,
  dimensions     jsonb,                                -- {width, height, depth}
  print_time     numeric,
  difficulty     text default 'Orta' check (difficulty in ('Kolay', 'Orta', 'Zor')),
  meta_title     text,
  meta_desc      text,
  tags           text[] not null default '{}',
  search_vector  tsvector generated always as (
    to_tsvector('simple',
      coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(public.text_array_to_string(tags), ''))
  ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index products_search_idx on public.products using gin (search_vector);
create index products_category_price_idx on public.products (category, price, rating desc);
create index products_active_created_idx on public.products (is_active, created_at desc);
create index products_active_featured_idx on public.products (is_active, featured, created_at desc);
create index products_active_cat_sub_idx on public.products (is_active, category, subcategory);
create index products_active_badge_idx on public.products (is_active, badge, created_at desc);

-- --------------------------------------------------------------- coupons
create table public.coupons (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code = upper(code)),
  type        text not null check (type in ('percent', 'fixed', 'shipping')),
  value       numeric(12,2) not null check (value >= 0),
  min_order   numeric(12,2) not null default 0,
  max_use     integer not null default 0,     -- 0 = sınırsız
  used        integer not null default 0,
  start_date  timestamptz,
  end_date    timestamptz,
  status      text not null default 'Aktif' check (status in ('Aktif', 'Pasif')),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- orders
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users (id) on delete set null,
  order_no         text unique,
  items            jsonb not null default '[]'::jsonb,   -- [{_id, product, name, image, price, quantity, material, color}]
  shipping_address jsonb not null,                       -- {fullName, phone, city, district, address}
  payment_method   text not null check (payment_method in ('card', 'transfer')),
  shipping_method  text not null default 'standard' check (shipping_method in ('standard', 'express')),
  shipping_details jsonb,
  status_history   jsonb not null default '[]'::jsonb,   -- [{_id, status, date, note}]
  payment_result   jsonb,
  shipping_cost    numeric(12,2) not null default 0,
  subtotal         numeric(12,2) not null,
  discount         numeric(12,2) not null default 0,
  total_price      numeric(12,2) not null,
  coupon_id        uuid references public.coupons (id) on delete set null,
  coupon_code      text,
  status           text not null default 'Bekliyor'
                   check (status in ('Bekliyor', 'Basımda', 'Hazırlanıyor', 'Kargoda', 'Teslim Edildi', 'İptal')),
  total_cost       numeric(12,2) not null default 0,
  tracking_no      text,
  carrier          text,
  customer_note    text,
  admin_note       text,
  is_paid          boolean not null default false,
  paid_at          timestamptz,
  is_delivered     boolean not null default false,
  delivered_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_coupon_idx on public.orders (coupon_id);

-- --------------------------------------------------------------- reviews
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  order_id    uuid references public.orders (id) on delete set null,
  rating      integer not null check (rating between 1 and 5),
  comment     text not null check (char_length(comment) <= 500),
  is_verified boolean not null default false,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, product_id)
);
create index reviews_status_idx on public.reviews (status, created_at desc);
create index reviews_product_idx on public.reviews (product_id, status, created_at desc);
create index reviews_order_idx on public.reviews (order_id);

-- Yorum eklenince/silinince/güncellenince ürün puanını güncelle
-- (Mongoose'taki calcAverageRating post-hook'unun karşılığı)
create or replace function public.recalc_product_rating()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  pid uuid;
begin
  for pid in
    select distinct x from unnest(array[
      case when tg_op in ('INSERT', 'UPDATE') then new.product_id end,
      case when tg_op in ('DELETE', 'UPDATE') then old.product_id end
    ]) as x where x is not null
  loop
    update public.products p
       set rating = coalesce(s.avg_rating, 0),
           review_count = coalesce(s.cnt, 0)
      from (
        select round(avg(rating)::numeric, 1) as avg_rating, count(*)::int as cnt
          from public.reviews
         where product_id = pid and status = 'approved'
      ) s
     where p.id = pid;
  end loop;
  return null;
end;
$$;

create trigger reviews_recalc_rating
after insert or update of rating, status, product_id or delete on public.reviews
for each row execute function public.recalc_product_rating();

-- ----------------------------------------------------------------- carts
create table public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references public.users (id) on delete cascade,
  items      jsonb not null default '[]'::jsonb,   -- [{_id, product, name, image, price, quantity, material, color}]
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index carts_expires_idx on public.carts (expires_at);
-- Mongo TTL index karşılığı: süresi dolan sepetler backend tarafında
-- okunurken filtrelenir; istenirse pg_cron ile periyodik silinebilir.

-- -------------------------------------------------------------- settings
create table public.settings (
  id                         uuid primary key default gen_random_uuid(),
  site_name                  text not null default 'Ozkan3D.design',
  site_desc                  text not null default 'Türkiye''nin en yenilikçi 3D baskı mağazası',
  currency                   text not null default 'TRY',
  language                   text not null default 'tr',
  timezone                   text not null default 'Europe/Istanbul',
  logo                       text not null default '',
  local_shipping_cost        numeric(12,2) not null default 89,
  near_shipping_cost         numeric(12,2) not null default 109,
  standard_shipping_cost     numeric(12,2) not null default 139,
  far_shipping_cost          numeric(12,2) not null default 179,
  express_shipping_surcharge numeric(12,2) not null default 35,
  carriers                   text[] not null default array['Yurtiçi Kargo', 'MNG Kargo', 'Aras Kargo'],
  notify_new_order           boolean not null default true,
  notify_low_stock           boolean not null default true,
  notify_new_review          boolean not null default true,
  notify_return_request      boolean not null default true,
  notify_new_customer        boolean not null default false,
  email_notif                boolean not null default true,
  browser_notif              boolean not null default true,
  low_stock_threshold        integer not null default 10,
  email_from                 text not null default 'Ozkan3D <ozkan3d.design@gmail.com>',
  email_sender               text not null default 'ozkan3d.design@gmail.com',
  hero_slides                jsonb not null default '[]'::jsonb,   -- [{_id, imageUrl, altText, isActive, sortOrder}]
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

-- ------------------------------------------------------ support_requests
create table public.support_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users (id) on delete set null,
  email           text not null check (email = lower(email)),
  subject         text not null check (char_length(subject) <= 140),
  message         text not null check (char_length(message) <= 3000),
  attachment_url  text,
  attachment_name text,
  status          text not null default 'new' check (status in ('new', 'in-progress', 'resolved')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index support_requests_user_idx on public.support_requests (user_id);
create index support_requests_status_idx on public.support_requests (status, created_at desc);

-- ------------------------------------------------- updated_at triggerları
do $$
declare
  t text;
begin
  foreach t in array array['users','categories','products','coupons','orders','reviews','carts','settings','support_requests']
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end;
$$;

-- --------------------------------------------------------------- RLS
-- Tüm veri erişimi backend üzerinden service_role ile yapılır (RLS'i bypass eder).
-- anon/authenticated rolleri hiçbir tabloya doğrudan erişemez.
alter table public.users            enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.coupons          enable row level security;
alter table public.orders           enable row level security;
alter table public.reviews          enable row level security;
alter table public.carts            enable row level security;
alter table public.settings         enable row level security;
alter table public.support_requests enable row level security;

-- ------------------------------------------------- sipariş numarası sayacı
-- OZ + YYMMDD + günlük sıra (OZ241114001). Eşzamanlı siparişlerde çakışmaz.
create table public.order_counters (
  day        date primary key,
  last_value integer not null default 0
);
alter table public.order_counters enable row level security;

create or replace function public.next_order_no()
returns text
language plpgsql
set search_path = ''
as $$
declare
  d date := (now() at time zone 'Europe/Istanbul')::date;
  n integer;
begin
  insert into public.order_counters (day, last_value) values (d, 1)
  on conflict (day) do update set last_value = public.order_counters.last_value + 1
  returning last_value into n;
  return 'OZ' || to_char(d, 'YYMMDD') || lpad(n::text, 3, '0');
end;
$$;

-- ------------------------------------------------------ atomik güncellemeler
-- p_items: sipariş kalemleri [{product, quantity}], p_sign: -1 düş, +1 iade
create or replace function public.adjust_stock(p_items jsonb, p_sign integer)
returns void
language sql
set search_path = ''
as $$
  update public.products p
     set stock = greatest(0, p.stock + p_sign * x.qty)
    from (
      select (e ->> 'product')::uuid as pid, sum((e ->> 'quantity')::int) as qty
        from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) e
       where e ->> 'product' is not null and (e ->> 'quantity')::int > 0
       group by 1
    ) x
   where p.id = x.pid;
$$;

create or replace function public.increment_coupon_used(p_coupon_id uuid, p_delta integer)
returns void
language sql
set search_path = ''
as $$
  update public.coupons set used = greatest(0, used + p_delta) where id = p_coupon_id;
$$;

-- Admin dashboard satış grafiği (Mongo $dateToString aggregate karşılığı)
-- p_format: 'YYYY-MM-DD' | 'HH24:00' | 'YYYY-MM'
create or replace function public.dashboard_sales(p_start timestamptz, p_end timestamptz, p_format text)
returns table (_id text, revenue numeric, orders bigint)
language sql
stable
set search_path = ''
as $$
  select to_char(created_at at time zone 'Europe/Istanbul', p_format) as _id,
         sum(total_price) as revenue,
         count(*) as orders
    from public.orders
   where created_at between p_start and p_end
     and is_paid
   group by 1
   order by 1;
$$;

-- Fonksiyonlar sadece backend'den (service_role) çağrılabilsin
revoke execute on function public.next_order_no() from public, anon, authenticated;
revoke execute on function public.adjust_stock(jsonb, integer) from public, anon, authenticated;
revoke execute on function public.increment_coupon_used(uuid, integer) from public, anon, authenticated;
revoke execute on function public.dashboard_sales(timestamptz, timestamptz, text) from public, anon, authenticated;
grant execute on function public.next_order_no() to service_role;
grant execute on function public.adjust_stock(jsonb, integer) to service_role;
grant execute on function public.increment_coupon_used(uuid, integer) to service_role;
grant execute on function public.dashboard_sales(timestamptz, timestamptz, text) to service_role;

-- ------------------------------------------------------- tablo yetkileri
-- Yeni projelerde tablolar Data API'ye otomatik açılmayabiliyor: backend'e açıkça ver.
-- anon/authenticated'ın tablo yetkisi yok (RLS'e ek ikinci katman).
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
revoke all on all tables in schema public from anon, authenticated;

-- ------------------------------------------------------------ Storage
-- Destek talebi ekleri (özel bucket; admin'e süreli imzalı link gönderilir).
-- Ürün ve hero görselleri Cloudinary'de kalıyor.
insert into storage.buckets (id, name, public, file_size_limit)
values ('support-attachments', 'support-attachments', false, 4194304)
on conflict (id) do nothing;

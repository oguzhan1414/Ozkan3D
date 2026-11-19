-- Ürün seçenekleri, siparişe özel üretim, hazırlık süresi, kişiselleştirme ve renk paleti

-- 1) Ürün alanları
alter table public.products
  -- true: siparişe özel basılır, stok düşmez ve "stokta yok" olmaz
  add column made_to_order boolean not null default true,
  -- Kargoya veriliş süresi (iş günü). Boşsa ayarlardaki varsayılan kullanılır.
  add column lead_min_days smallint check (lead_min_days between 0 and 60),
  add column lead_max_days smallint check (lead_max_days between 0 and 60),
  -- Fiyatı etkileyen seçenek grupları:
  -- [{ id, name: 'Boyut', values: [{ id, label: '18 cm', priceDelta: 150 }] }]
  add column option_groups jsonb not null default '[]'::jsonb
    check (jsonb_typeof(option_groups) = 'array'),
  -- Kişiselleştirme: null = kapalı, { label, maxLength, required, priceDelta }
  add column personalization jsonb
    check (personalization is null or jsonb_typeof(personalization) = 'object');

alter table public.products
  add constraint products_lead_range check (
    lead_min_days is null or lead_max_days is null or lead_min_days <= lead_max_days
  );

-- 2) Varsayılan hazırlık süresi (ayarlar)
alter table public.settings
  add column default_lead_min_days smallint not null default 1,
  add column default_lead_max_days smallint not null default 6;

-- 3) Renk paleti: ürünlerde hex tutulur, müşteriye görünen ad buradan gelir
create table public.colors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  hex         text not null unique check (hex ~ '^#[0-9a-f]{6}$'),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.colors enable row level security;
grant select, insert, update, delete on public.colors to service_role;
revoke all on public.colors from anon, authenticated;

insert into public.colors (name, hex, sort_order) values
  ('Beyaz', '#ffffff', 1), ('Siyah', '#111827', 2), ('Gri', '#9ca3af', 3), ('Açık gri', '#e5e7eb', 4),
  ('Kırmızı', '#dc2626', 5), ('Mavi', '#2563eb', 6), ('Açık mavi', '#0ea5e9', 7), ('Yeşil', '#16a34a', 8),
  ('Haki', '#4d7c0f', 9), ('Mint', '#a7f3d0', 10), ('Mor', '#7c3aed', 11), ('Pembe', '#f472b6', 12),
  ('Pudra', '#fbcfe8', 13), ('Turuncu', '#f97316', 14), ('Amber', '#f59e0b', 15), ('Bronz', '#a16207', 16),
  ('Kahverengi', '#78350f', 17), ('Krem', '#fef3c7', 18), ('Taş', '#d6d3d1', 19),
  ('Saf siyah', '#000000', 20), ('Koyu kırmızı', '#b91c1c', 21), ('Açık kırmızı', '#ef4444', 22),
  ('Gül', '#e11d48', 23), ('Açık yeşil', '#22c55e', 24), ('Parlak mavi', '#3b82f6', 25)
on conflict (hex) do nothing;

-- Ürünlerde kullanılıp palette olmayan renkleri de ekle (ad = kod; admin sonra düzeltir)
insert into public.colors (name, hex, sort_order)
select distinct lower(c), lower(c), 100
  from public.products, unnest(colors) c
 where lower(c) ~ '^#[0-9a-f]{6}$'
on conflict (hex) do nothing;

-- 4) Stok düşümü sadece stoklu ürünlerde
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
   where p.id = x.pid
     and not p.made_to_order;
$$;

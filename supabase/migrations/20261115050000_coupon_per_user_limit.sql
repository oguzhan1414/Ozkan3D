-- Kişi başı kupon kullanım sınırı (0 = sınırsız)
alter table public.coupons
  add column per_user_limit integer not null default 1 check (per_user_limit >= 0);

-- Yüzde indirim 100'ü geçemez
alter table public.coupons
  add constraint coupons_percent_max check (type <> 'percent' or value <= 100);

create index if not exists orders_coupon_user_idx on public.orders (coupon_id, user_id);

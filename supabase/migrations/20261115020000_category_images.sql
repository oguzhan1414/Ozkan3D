-- Kategori kapak görseli (anasayfa kategori karoları). Görsel Supabase Storage "media"
-- bucket'ında (categories/ klasörü) durur; admin panelinden yüklenir.
alter table public.categories
  add column image_url text,
  add column image_alt text;

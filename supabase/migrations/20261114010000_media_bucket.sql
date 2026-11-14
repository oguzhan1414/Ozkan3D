-- Ürün ve anasayfa slider görselleri (Cloudinary yerine).
-- Public bucket: görseller herkese açık URL ile okunur; yükleme/silme sadece backend (service_role).
-- Backend görselleri yüklemeden önce sharp ile küçültüp WebP'ye çevirir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

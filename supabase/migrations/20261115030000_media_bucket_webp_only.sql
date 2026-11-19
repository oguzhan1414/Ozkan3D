-- Storage şişmesin: backend her görseli küçültüp WebP'ye çevirdiği için "media" bucket'ı
-- sadece WebP kabul eder ve dosya başına 2 MB ile sınırlıdır. Backend atlanarak
-- yapılan büyük/ham yüklemeler Storage seviyesinde reddedilir.
update storage.buckets
   set allowed_mime_types = array['image/webp'],
       file_size_limit = 2097152
 where id = 'media';

-- Destek ekleri: sadece backend'in kabul ettiği türler (fotoğraflar WebP'ye çevrilir)
update storage.buckets
   set allowed_mime_types = array[
         'image/webp', 'image/jpeg', 'image/png',
         'application/pdf', 'text/plain', 'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
       ]
 where id = 'support-attachments';

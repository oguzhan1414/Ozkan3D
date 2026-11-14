-- Mock veriyi silmek için bu dosya yerine şunu kullan (görselleri Storage'dan da siler):
--   cd backend && npm run cleanup:mock -- --dry-run   (önce kontrol)
--   cd backend && npm run cleanup:mock
--
-- Aşağıdaki SQL sadece veritabanı kayıtlarını siler; Storage'daki görseller kalır.
begin;

delete from public.reviews  where user_id in (select id from public.users where email like '%@mock.ozkan3d.test');
delete from public.orders   where user_id in (select id from public.users where email like '%@mock.ozkan3d.test');
delete from public.support_requests where user_id in (select id from public.users where email like '%@mock.ozkan3d.test');
delete from public.users    where email like '%@mock.ozkan3d.test';
delete from public.products where sku like 'MOCK-%';
delete from public.coupons  where code like 'MOCK%';

commit;

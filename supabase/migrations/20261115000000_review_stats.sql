-- Anasayfa güven bölümü: onaylı yorumların ortalaması ve sayısı
create or replace function public.review_stats()
returns table (average numeric, total bigint)
language sql
stable
set search_path = ''
as $$
  select round(avg(rating)::numeric, 1), count(*)
    from public.reviews
   where status = 'approved';
$$;

revoke execute on function public.review_stats() from public, anon, authenticated;
grant execute on function public.review_stats() to service_role;

-- Ürünleri kategorilere kimlikle bağla (önceden sadece isimle bağlıydı).
-- category / subcategory metin alanları görüntü ve filtre için kalır, ama artık
-- trigger ile kimliklerden türetilir: kategori yeniden adlandırılınca ürünler
-- kategorisiz kalmaz.

alter table public.products
  add column category_id uuid references public.categories (id) on delete set null,
  add column subcategory_id uuid references public.categories (id) on delete set null;

create index products_category_id_idx on public.products (category_id);
create index products_subcategory_id_idx on public.products (subcategory_id);

-- Mevcut ürünleri isimlerine göre eşle
update public.products p
   set category_id = c.id
  from public.categories c
 where c.name = p.category and c.parent_id is null;

update public.products p
   set subcategory_id = s.id
  from public.categories s
 where s.name = p.subcategory and s.parent_id is not null;

-- Ürün kaydında kimlik <-> isim senkronu.
-- Kimlik verilirse isim ondan yazılır; sadece isim verilirse kimlik isimden bulunur.
-- Alt kategori seçiliyse ana kategori her zaman onun üst kategorisidir.
create or replace function public.products_sync_category()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  sub_id_changed boolean;
  cat_id_changed boolean;
  sub_name_changed boolean;
  cat_name_changed boolean;
  v_parent uuid;
begin
  if tg_op = 'UPDATE' then
    sub_id_changed := new.subcategory_id is distinct from old.subcategory_id;
    cat_id_changed := new.category_id is distinct from old.category_id;
    sub_name_changed := new.subcategory is distinct from old.subcategory;
    cat_name_changed := new.category is distinct from old.category;
  else
    sub_id_changed := new.subcategory_id is not null;
    cat_id_changed := new.category_id is not null;
    sub_name_changed := true;
    cat_name_changed := true;
  end if;

  -- 1) Alt kategori
  if sub_id_changed then
    if new.subcategory_id is null then
      new.subcategory := null;
    else
      select c.name, c.parent_id into new.subcategory, v_parent
        from public.categories c where c.id = new.subcategory_id;
      new.category_id := v_parent;
      cat_id_changed := true;
    end if;
  elsif sub_name_changed then
    if nullif(btrim(coalesce(new.subcategory, '')), '') is null then
      new.subcategory := null;
      new.subcategory_id := null;
    else
      select c.id, c.parent_id into new.subcategory_id, v_parent
        from public.categories c where c.name = new.subcategory and c.parent_id is not null;
      if new.subcategory_id is not null then
        new.category_id := v_parent;
        cat_id_changed := true;
      end if;
    end if;
  end if;

  -- 2) Ana kategori
  if cat_id_changed and new.category_id is not null then
    select c.name into new.category from public.categories c where c.id = new.category_id;
  elsif cat_name_changed then
    select c.id into new.category_id
      from public.categories c where c.name = new.category and c.parent_id is null;
  end if;

  return new;
end;
$$;

create trigger products_sync_category
before insert or update of category, subcategory, category_id, subcategory_id on public.products
for each row execute function public.products_sync_category();

-- Kategori yeniden adlandırılınca ya da alt kategori başka ana kategoriye taşınınca ürünleri güncelle
create or replace function public.categories_propagate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.name is distinct from old.name then
    update public.products set category = new.name where category_id = new.id;
    update public.products set subcategory = new.name where subcategory_id = new.id;
  end if;
  if new.parent_id is distinct from old.parent_id and new.parent_id is not null then
    update public.products set category_id = new.parent_id where subcategory_id = new.id;
  end if;
  return null;
end;
$$;

create trigger categories_propagate
after update of name, parent_id on public.categories
for each row execute function public.categories_propagate();

revoke execute on function public.products_sync_category() from public, anon, authenticated;
revoke execute on function public.categories_propagate() from public, anon, authenticated;

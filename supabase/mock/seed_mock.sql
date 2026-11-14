-- Ozkan3D — DEMO / MOCK VERİ
-- Mağazanın dolu halini görmek için. Gerçek veri DEĞİLDİR.
-- Tanıma işaretleri: ürün SKU'ları 'MOCK-', müşteri e-postaları '@mock.ozkan3d.test',
-- sipariş numaraları 'OZyymmddM..', kuponlar 'MOCK' ile başlar. Silmek için: cleanup_mock.sql
-- Görseller: önce picsum.photos ile eklenir; picsum bazı ağlarda erişilemediği için ARDINDAN
-- images_mock.sql çalıştırılmalı (Wikimedia Commons), sonra görselleri Storage'a almak için:
--   cd backend && npm run migrate:images
-- Demo admin: npm run seed -- admin@mock.ozkan3d.test 'Demo1234!'
-- Demo müşteri şifresi: Demo1234!

begin;

-- ------------------------------------------------------------- kategoriler
insert into public.categories (name, slug, icon, "order") values
  ('Figürler', 'figurler', '🐉', 1),
  ('Hediyelik / Dekor', 'hediyelik-dekor', '🎁', 2),
  ('Konsol & Oyun', 'konsol-oyun', '🎮', 3),
  ('Ev Aletleri', 'ev-aletleri', '🏠', 4)
on conflict (name) do nothing;

insert into public.categories (name, slug, icon, parent_id, "order")
select s.name, s.slug, '📦', p.id, s.ord
from (values
  ('Katana', 'katana', 'Figürler', 1),
  ('Ejderha Koleksiyonu', 'ejderha-koleksiyonu', 'Figürler', 2),
  ('Anime Figürler', 'anime-figurler', 'Figürler', 3),
  ('Fantastik Yaratıklar', 'fantastik-yaratiklar', 'Figürler', 4),
  ('Masa Dekorasyonu', 'masa-dekorasyonu', 'Hediyelik / Dekor', 1),
  ('Ev Dekorasyon', 'ev-dekorasyon', 'Hediyelik / Dekor', 2),
  ('Anahtarlıklar', 'anahtarliklar', 'Hediyelik / Dekor', 3),
  ('PS5 & Xbox Aksesuarları', 'ps5-xbox-aksesuarlari', 'Konsol & Oyun', 1),
  ('Kulaklık Tutucular', 'kulaklik-tutucular', 'Konsol & Oyun', 2),
  ('Joystick Tutucular', 'joystick-tutucular', 'Konsol & Oyun', 3),
  ('Kablo Düzenleyici', 'kablo-duzenleyici', 'Konsol & Oyun', 4),
  ('Mutfak Yardımcıları', 'mutfak-yardimcilari', 'Ev Aletleri', 1),
  ('Banyo Düzenleyiciler', 'banyo-duzenleyiciler', 'Ev Aletleri', 2),
  ('Pratik Ev Aparatları', 'pratik-ev-aparatlari', 'Ev Aletleri', 3)
) as s(name, slug, parent_name, ord)
join public.categories p on p.name = s.parent_name
on conflict (name) do nothing;

-- ---------------------------------------------------------------- ürünler
with src(sku, name, slug, category, subcategory, price, old_price, stock, badge, featured,
         colors, short_desc, description, weight, w, h, d, print_time, difficulty, tags) as (
  values
  ('MOCK-001', 'Kızıl Ejderha Figürü', 'kizil-ejderha-figuru', 'Figürler', 'Ejderha Koleksiyonu', 649, 799, 12, 'İndirim', true,
   array['#b91c1c','#111827'], 'Kanatları açık, el boyamalı detaylı ejderha figürü.',
   'Yüksek çözünürlükte basılan kızıl ejderha figürü pullarından pençelerine kadar detaylı. Masa ya da raf dekoru için ideal, el boyaması ile son kat verilir.',
   420, 24, 18, 20, 14, 'Zor', array['ejderha','figür','hediye']),
  ('MOCK-002', 'Eklemli Kristal Ejderha', 'eklemli-kristal-ejderha', 'Figürler', 'Ejderha Koleksiyonu', 349, null, 30, 'Çok Satan', true,
   array['#7c3aed','#0ea5e9','#f59e0b'], 'Tek parça basılan, her eklemi hareket eden ejderha.',
   'Destek gerektirmeyen print-in-place tasarım. Her eklemi hareketli, stres oyuncağı ve dekor olarak kullanılabilir. Çocuklar için güvenli PLA.',
   95, 30, 4, 8, 6, 'Kolay', array['eklemli','ejderha','oyuncak']),
  ('MOCK-003', 'Samuray Katana Replika 100 cm', 'samuray-katana-replika-100-cm', 'Figürler', 'Katana', 1299, null, 5, 'Yeni', true,
   array['#111827','#9ca3af'], 'Kını ile birlikte 1:1 ölçek dekoratif katana.',
   'Parçalı basılıp birleştirilen 100 cm dekoratif katana replikası. Kını, tsuba ve sap sarımı detaylı. Kesici değildir, sadece dekor ve cosplay amaçlıdır.',
   1100, 100, 4, 3, 38, 'Zor', array['katana','cosplay','samuray']),
  ('MOCK-004', 'Ork Savaşçı Figürü', 'ork-savasci-figuru', 'Figürler', 'Fantastik Yaratıklar', 449, null, 9, null, false,
   array['#4d7c0f','#78350f'], 'Baltalı ork savaşçı, 18 cm yükseklik.',
   'Masa oyunları ve koleksiyon için 18 cm yükseklikte ork savaşçı figürü. Boyamaya hazır gri astar seçeneği de mevcuttur.',
   210, 12, 18, 10, 9, 'Orta', array['ork','fantastik','masaüstü oyun']),
  ('MOCK-005', 'Anime Karakter Büstü', 'anime-karakter-bustu', 'Figürler', 'Anime Figürler', 529, null, 7, 'Yeni', false,
   array['#f472b6','#ffffff'], 'Reçine kalitesinde yüzey, kaideli büst.',
   'İnce katman yüksekliğinde basılan anime tarzı büst. Zımparalanıp astarlanmış yüzey ile boyamaya hazır gelir.',
   180, 10, 15, 9, 11, 'Orta', array['anime','büst','koleksiyon']),
  ('MOCK-006', 'Grifon Heykeli', 'grifon-heykeli', 'Figürler', 'Fantastik Yaratıklar', 589, 690, 4, 'İndirim', false,
   array['#a16207','#e5e7eb'], 'Kanatları açık mitolojik grifon heykeli.',
   'Aslan gövdeli ve kartal başlı grifon heykeli. Kaya kaidesi ile birlikte 22 cm yükseklikte.',
   360, 20, 22, 14, 16, 'Zor', array['grifon','mitoloji','heykel']),
  ('MOCK-007', 'Low-Poly Ayı Saksı', 'low-poly-ayi-saksi', 'Hediyelik / Dekor', 'Ev Dekorasyon', 189, null, 40, 'Çok Satan', true,
   array['#ffffff','#22c55e','#f97316'], 'Sukulentler için drenaj delikli geometrik saksı.',
   'Low-poly tarzında ayı formunda mini saksı. Altında drenaj deliği ve tabağı vardır, sukulent ve kaktüsler için uygundur.',
   140, 11, 10, 11, 5, 'Kolay', array['saksı','dekor','bitki']),
  ('MOCK-008', 'Spiral Vazo', 'spiral-vazo', 'Hediyelik / Dekor', 'Ev Dekorasyon', 229, null, 18, null, false,
   array['#0ea5e9','#e11d48','#ffffff'], 'Vazo modunda basılan dalgalı form.',
   'Tek duvar vazo modunda basılan spiral desenli dekoratif vazo. Kuru çiçekler için idealdir, su geçirmez iç kaplama opsiyoneldir.',
   120, 12, 25, 12, 4, 'Kolay', array['vazo','dekor']),
  ('MOCK-009', 'Ay Lambası (LED''li)', 'ay-lambasi-ledli', 'Hediyelik / Dekor', 'Masa Dekorasyonu', 399, null, 15, 'Yeni', true,
   array['#fef3c7','#ffffff'], 'Ay yüzeyi dokulu, USB ile çalışan gece lambası.',
   'NASA verileriyle modellenmiş ay yüzeyi dokusuna sahip lamba. Sıcak beyaz LED ve ahşap stand ile gelir, USB ile çalışır.',
   260, 15, 15, 15, 12, 'Orta', array['lamba','ay','hediye']),
  ('MOCK-010', 'İsme Özel Anahtarlık', 'isme-ozel-anahtarlik', 'Hediyelik / Dekor', 'Anahtarlıklar', 79, null, 100, null, false,
   array['#2563eb','#dc2626','#16a34a','#111827'], 'Dilediğiniz isimle çift renk baskı.',
   'Sipariş notuna yazdığınız isimle çift renk basılan kişiye özel anahtarlık. Metal halka dahildir.',
   12, 6, 2, 0.5, 1, 'Kolay', array['anahtarlık','kişiye özel','hediye']),
  ('MOCK-011', 'PS5 Dikey Stand', 'ps5-dikey-stand', 'Konsol & Oyun', 'PS5 & Xbox Aksesuarları', 279, null, 22, null, true,
   array['#ffffff','#111827'], 'Disk ve dijital sürüme uyumlu dikey stand.',
   'PS5 disk ve dijital sürümleriyle uyumlu, havalandırmayı kapatmayan dikey stand. Kaymaz pedler ile birlikte gönderilir.',
   190, 26, 6, 12, 7, 'Kolay', array['ps5','stand','konsol']),
  ('MOCK-012', 'Masa Altı Kulaklık Askısı', 'masa-alti-kulaklik-askisi', 'Konsol & Oyun', 'Kulaklık Tutucular', 149, null, 35, 'Çok Satan', false,
   array['#111827','#ef4444'], 'Vidasız, masa kenarına sıkıştırmalı askı.',
   'Masa kenarına vidasız sıkıştırılan kulaklık askısı. 1 ile 4 cm arası masa kalınlığına uyar, oyuncu kulaklıklarıyla uyumludur.',
   60, 8, 10, 6, 3, 'Kolay', array['kulaklık','masa','oyuncu']),
  ('MOCK-013', 'Çift Joystick Tutucu', 'cift-joystick-tutucu', 'Konsol & Oyun', 'Joystick Tutucular', 169, null, 20, null, false,
   array['#111827','#ffffff','#3b82f6'], 'İki kol için şık masa standı.',
   'DualSense, Xbox ve Switch Pro kollarıyla uyumlu çift joystick standı. Kablo geçiş kanalı vardır.',
   110, 18, 12, 9, 5, 'Kolay', array['joystick','stand','oyun']),
  ('MOCK-014', 'Kablo Düzenleyici Klips Seti', 'kablo-duzenleyici-klips-seti', 'Konsol & Oyun', 'Kablo Düzenleyici', 99, null, 3, null, false,
   array['#111827','#ffffff'], '8 adet yapışkan tabanlı kablo klipsi.',
   'Masa ve duvar için yapışkan tabanlı 8 parçalık kablo düzenleyici set. Şarj ve kulaklık kablolarını toplar.',
   40, 3, 2, 2, 2, 'Kolay', array['kablo','düzen','masa']),
  ('MOCK-015', 'Baharat Rafı Organizer', 'baharat-rafi-organizer', 'Ev Aletleri', 'Mutfak Yardımcıları', 259, null, 14, null, false,
   array['#ffffff','#d6d3d1'], '3 katlı, dolap içine uygun baharat rafı.',
   'Dolap içine sığan 3 kademeli baharat rafı. 12 standart baharat kavanozu alır, gıda ile temas etmez.',
   230, 30, 10, 20, 9, 'Orta', array['mutfak','baharat','düzen']),
  ('MOCK-016', 'Diş Fırçası Tutucu', 'dis-fircasi-tutucu', 'Ev Aletleri', 'Banyo Düzenleyiciler', 119, 149, 25, 'İndirim', false,
   array['#ffffff','#a7f3d0','#fbcfe8'], '4 bölmeli, su tahliyeli tutucu.',
   'Banyo tezgahı için 4 diş fırçası ve 1 macun bölmeli tutucu. Altındaki tahliye kanalı su birikmesini önler, PETG dayanıklılığında.',
   85, 12, 10, 7, 4, 'Kolay', array['banyo','düzen']),
  ('MOCK-017', 'Duvar Anahtar Organizeri', 'duvar-anahtar-organizeri', 'Ev Aletleri', 'Pratik Ev Aparatları', 139, null, 0, null, false,
   array['#111827','#ffffff'], '5 kancalı, mektup cepli duvar organizeri.',
   'Kapı girişleri için 5 kancalı ve mektup cepli anahtar organizeri. Vida ve dübel dahildir. Şu an stokta yok (stok uyarısını görmek için).',
   150, 25, 15, 5, 6, 'Kolay', array['anahtar','duvar','giriş'])
)
insert into public.products (
  sku, name, slug, category, subcategory, price, old_price, stock, badge, featured,
  colors, material, short_desc, description, weight, dimensions, print_time, difficulty, tags,
  images, image_variants, meta_title, meta_desc
)
select
  sku, name, slug, category, subcategory, price, old_price, stock, badge, featured,
  colors, array['PLA'], short_desc, description, weight,
  jsonb_build_object('width', w, 'height', h, 'depth', d), print_time, difficulty, tags,
  -- ürün başına 3 görsel; her görsel bir renge eşlenir
  array(select format('https://picsum.photos/seed/oz3d-%s-%s/800/800', slug, n) from generate_series(1, 3) n),
  (select jsonb_agg(jsonb_build_object(
            'url', format('https://picsum.photos/seed/oz3d-%s-%s/800/800', slug, n),
            'color', colors[1 + ((n - 1) % array_length(colors, 1))]) order by n)
     from generate_series(1, 3) n),
  name || ' | ' || category, short_desc
from src
on conflict (sku) do nothing;

-- -------------------------------------------------------------- kuponlar
insert into public.coupons (code, type, value, min_order, max_use, status, description, end_date) values
  ('MOCKHOSGELDIN10', 'percent', 10, 200, 0, 'Aktif', 'Demo: ilk siparişe %10', now() + interval '60 days'),
  ('MOCKKARGO', 'shipping', 0, 500, 100, 'Aktif', 'Demo: 500 TL üzeri ücretsiz kargo', now() + interval '30 days'),
  ('MOCK50TL', 'fixed', 50, 400, 20, 'Pasif', 'Demo: pasif kupon örneği', null)
on conflict (code) do nothing;

-- ------------------------------------------------------- demo müşteriler
insert into public.users (first_name, last_name, email, password, phone, birth_date, email_verified, addresses, created_at)
select fn, ln, email, '$2b$10$uMag6e1pVXyUmd58FiEVGu9wmZHseg0joFBUyO3fj7/my38mK5v22', phone, bd::timestamptz, true,
       jsonb_build_array(jsonb_build_object(
         '_id', gen_random_uuid(), 'title', 'Ev', 'fullName', fn || ' ' || ln, 'phone', phone,
         'city', city, 'district', district, 'neighborhood', '', 'address', addr, 'isDefault', true)),
       now() - (joined || ' days')::interval
from (values
  ('Ayşe', 'Yılmaz', 'ayse@mock.ozkan3d.test', '+905321110001', '1994-03-12', 'İstanbul', 'Kadıköy', 'Moda Cad. No:12 D:4', 40),
  ('Mehmet', 'Kaya', 'mehmet@mock.ozkan3d.test', '+905321110002', '1988-07-25', 'Ankara', 'Çankaya', 'Tunalı Hilmi Cad. No:45', 35),
  ('Zeynep', 'Demir', 'zeynep@mock.ozkan3d.test', '+905321110003', '2000-11-02', 'İzmir', 'Karşıyaka', 'Cemal Gürsel Cad. No:210', 28),
  ('Can', 'Arslan', 'can@mock.ozkan3d.test', '+905321110004', '1997-01-18', 'Bolu', 'Merkez', 'İzzet Baysal Cad. No:8', 20),
  ('Elif', 'Şahin', 'elif@mock.ozkan3d.test', '+905321110005', '1991-09-30', 'Trabzon', 'Ortahisar', 'Uzun Sk. No:33', 12)
) as u(fn, ln, email, phone, bd, city, district, addr, joined)
on conflict (email) do nothing;

-- ------------------------------------------------- siparişler + yorumlar
do $$
declare
  statuses text[] := array['Teslim Edildi','Teslim Edildi','Teslim Edildi','Teslim Edildi','Kargoda','Kargoda',
                           'Hazırlanıyor','Basımda','Bekliyor','Bekliyor','İptal'];
  comments text[] := array[
    'Baskı kalitesi beklediğimden çok daha iyi, detaylar harika.',
    'Paketleme çok özenliydi, hızlı geldi. Teşekkürler!',
    'Hediye olarak aldım, çok beğenildi.',
    'Fiyatına göre gayet kaliteli, tekrar sipariş vereceğim.',
    'Renkler fotoğraftakiyle aynı, sağlam bir ürün.',
    'Küçük bir katman izi vardı ama genel olarak memnunum.'];
  u record;
  i int := 0;
  n_items int;
  items jsonb;
  p record;
  qty int;
  sub numeric;
  ship numeric;
  st text;
  created timestamptz;
  oid uuid;
  hist jsonb;
begin
  perform setseed(0.42);

  for u in select id, first_name, last_name, phone, addresses -> 0 as addr
             from public.users where email like '%@mock.ozkan3d.test' order by email loop
    for k in 1..(2 + floor(random() * 3))::int loop
      i := i + 1;
      created := now() - (random() * 29 || ' days')::interval - (random() * 20 || ' hours')::interval;
      st := statuses[1 + floor(random() * array_length(statuses, 1))::int];
      n_items := 1 + floor(random() * 3)::int;
      items := '[]'::jsonb;
      sub := 0;

      for p in select id, name, price, images, colors from public.products
                where sku like 'MOCK-%' and stock > 0 order by random() limit n_items loop
        qty := 1 + floor(random() * 2)::int;
        items := items || jsonb_build_array(jsonb_build_object(
          '_id', gen_random_uuid(), 'product', p.id, 'name', p.name, 'image', p.images[1],
          'price', p.price, 'quantity', qty, 'material', 'PLA', 'color', p.colors[1]));
        sub := sub + p.price * qty;
      end loop;

      ship := case when (u.addr ->> 'city') = 'Bolu' then 89 when (u.addr ->> 'city') = 'Ankara' then 109
                   when (u.addr ->> 'city') = 'Trabzon' then 179 else 139 end;

      hist := jsonb_build_array(jsonb_build_object('_id', gen_random_uuid(), 'status', 'Bekliyor', 'date', created, 'note', 'Sipariş alındı'));
      if st in ('Basımda','Hazırlanıyor','Kargoda','Teslim Edildi') then
        hist := hist || jsonb_build_array(jsonb_build_object('_id', gen_random_uuid(), 'status', 'Basımda', 'date', created + interval '1 day'));
      end if;
      if st in ('Hazırlanıyor','Kargoda','Teslim Edildi') then
        hist := hist || jsonb_build_array(jsonb_build_object('_id', gen_random_uuid(), 'status', 'Hazırlanıyor', 'date', created + interval '2 days'));
      end if;
      if st in ('Kargoda','Teslim Edildi') then
        hist := hist || jsonb_build_array(jsonb_build_object('_id', gen_random_uuid(), 'status', 'Kargoda', 'date', created + interval '3 days', 'note', 'Yurtiçi Kargo - MOCK' || lpad(i::text, 6, '0')));
      end if;
      if st = 'Teslim Edildi' then
        hist := hist || jsonb_build_array(jsonb_build_object('_id', gen_random_uuid(), 'status', 'Teslim Edildi', 'date', created + interval '5 days'));
      end if;
      if st = 'İptal' then
        hist := hist || jsonb_build_array(jsonb_build_object('_id', gen_random_uuid(), 'status', 'İptal', 'date', created + interval '2 hours', 'note', 'Müşteri tarafından iptal edildi.'));
      end if;

      insert into public.orders (
        user_id, order_no, items, shipping_address, payment_method, shipping_method, shipping_details,
        status_history, payment_result, shipping_cost, subtotal, discount, total_price, status,
        tracking_no, carrier, is_paid, paid_at, is_delivered, delivered_at, created_at, updated_at
      ) values (
        u.id,
        'OZ' || to_char(created at time zone 'Europe/Istanbul', 'YYMMDD') || 'M' || lpad(i::text, 2, '0'),
        items,
        jsonb_build_object('fullName', u.first_name || ' ' || u.last_name, 'phone', u.phone,
                           'city', u.addr ->> 'city', 'district', u.addr ->> 'district', 'address', u.addr ->> 'address'),
        case when random() < 0.8 then 'card' else 'transfer' end,
        'standard',
        jsonb_build_object('city', upper(u.addr ->> 'city'), 'totalCost', ship, 'policyVersion', 'shipping-v2', 'mock', true),
        hist,
        case when st not in ('Bekliyor','İptal') then jsonb_build_object('id', 'MOCK', 'status', 'success', 'paidAt', created) end,
        ship, sub, 0, sub + ship, st,
        case when st in ('Kargoda','Teslim Edildi') then 'MOCK' || lpad(i::text, 6, '0') end,
        case when st in ('Kargoda','Teslim Edildi') then 'Yurtiçi Kargo' end,
        st not in ('Bekliyor','İptal'),
        case when st not in ('Bekliyor','İptal') then created + interval '5 minutes' end,
        st = 'Teslim Edildi',
        case when st = 'Teslim Edildi' then created + interval '5 days' end,
        created, created
      )
      returning id into oid;

      -- Teslim edilen siparişlerdeki ürünlere yorum (çoğu onaylı, biri onay bekliyor)
      if st = 'Teslim Edildi' then
        insert into public.reviews (user_id, product_id, order_id, rating, comment, is_verified, status, created_at)
        select u.id, (it ->> 'product')::uuid, oid,
               case when random() < 0.75 then 5 else 4 end,
               comments[1 + floor(random() * array_length(comments, 1))::int],
               true,
               case when random() < 0.85 then 'approved' else 'pending' end,
               created + interval '7 days'
          from jsonb_array_elements(items) it
        on conflict (user_id, product_id) do nothing;
      end if;
    end loop;
  end loop;
end;
$$;

-- -------------------------------------------- ayarlar + anasayfa slider
insert into public.settings (hero_slides)
select '[]'::jsonb where not exists (select 1 from public.settings);

update public.settings set hero_slides = jsonb_build_array(
  jsonb_build_object('_id', gen_random_uuid(), 'imageUrl', 'https://picsum.photos/seed/oz3d-hero-1/1600/600', 'altText', 'Ejderha koleksiyonu', 'isActive', true, 'sortOrder', 0),
  jsonb_build_object('_id', gen_random_uuid(), 'imageUrl', 'https://picsum.photos/seed/oz3d-hero-2/1600/600', 'altText', 'Konsol aksesuarları', 'isActive', true, 'sortOrder', 1),
  jsonb_build_object('_id', gen_random_uuid(), 'imageUrl', 'https://picsum.photos/seed/oz3d-hero-3/1600/600', 'altText', 'Ev dekorasyonu', 'isActive', true, 'sortOrder', 2)
)
where hero_slides = '[]'::jsonb;

-- -------------------------------------------------------- destek talebi
insert into public.support_requests (user_id, email, subject, message, status)
select id, email, 'Sipariş kargo süresi', 'Merhaba, siparişim ne zaman kargoya verilir? (demo talep)', 'new'
  from public.users where email = 'ayse@mock.ozkan3d.test'
   and not exists (select 1 from public.support_requests where message like '%(demo talep)%');

commit;

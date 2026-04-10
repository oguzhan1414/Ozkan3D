import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiLayers,
  FiTag,
  FiTrendingUp,
} from 'react-icons/fi'
import SEO from '../components/SEO'
import siteLogo from '../images/logo-wordmark.png'
import './BlogPage.css'

const heroVisual = siteLogo
const cardVisualOne = siteLogo
const cardVisualTwo = siteLogo
const cardVisualThree = siteLogo

const allPosts = [
  {
    id: 'filament-secimi-pla-petg-abs',
    category: 'Malzeme Rehberi',
    readTime: '8 dk',
    updatedAt: '09 Nisan 2026',
    title: 'PLA, PETG ve ABS Karşılaştırması: Hangi Filament Hangi Ürün İçin Doğru?',
    excerpt:
      'Filament seçimi, baskı kalitesini ve dayanımı doğrudan etkiler. Bu yazıda PLA, PETG ve ABS için gerçek kullanım senaryoları ve karar kriterleri bulunur.',
    image: cardVisualOne,
  },
  {
    id: 'katman-izini-azaltmanin-yollari',
    category: 'Baskı Kalitesi',
    readTime: '7 dk',
    updatedAt: '08 Nisan 2026',
    title: 'Katman İzini Azaltmanın 9 Uygulanabilir Yolu',
    excerpt:
      'Nozzle sıcaklığı, hız, fan ve katman yüksekliği birlikte değerlendirildiğinde yüzey kalitesi dramatik biçimde iyileşir. Pratik ayar tablosunu inceleyin.',
    image: cardVisualTwo,
  },
  {
    id: '72-saatte-prototip',
    category: 'Girişim ve Prototipleme',
    readTime: '8 dk',
    updatedAt: '07 Nisan 2026',
    title: 'Bir Ürün Fikrini 72 Saatte Prototipe Dönüştürme Planı',
    excerpt:
      'CAD hazırlık, hızlı prototip, kullanıcı geri bildirimi ve revizyon adımlarıyla ürün fikirlerini test edilebilir hale getiren sprint akışını öğrenin.',
    image: cardVisualThree,
  },
  {
    id: 'kirilma-riskini-azaltan-paketleme',
    category: 'Operasyon',
    readTime: '5 dk',
    updatedAt: '06 Nisan 2026',
    title: '3D Baskı Ürünlerinde Kırılma Riskini Azaltan Paketleme Standardı',
    excerpt:
      'Kırılgan geometrili modellerde koruma katmanı, kutu içi sabitleme ve doğru dolgu malzemesi seçimi ile hasar ve iade oranını düşürme rehberi.',
    image: cardVisualOne,
  },
  {
    id: '3d-tarama-ne-zaman-gerekli',
    category: '3D Tarama',
    readTime: '5 dk',
    updatedAt: '05 Nisan 2026',
    title: '3D Tarama Hizmeti Hangi Durumlarda Zamandan Tasarruf Sağlar?',
    excerpt:
      'Parçayı baştan modellemek yerine tarama kullanmanın daha doğru olduğu durumları doğruluk, maliyet ve teslim süresi açısından karşılaştırıyoruz.',
    image: cardVisualTwo,
  },
  {
    id: 'baski-maliyeti-hesaplama-formulu',
    category: 'Fiyatlandırma',
    readTime: '7 dk',
    updatedAt: '04 Nisan 2026',
    title: '3D Baskı Maliyeti Nasıl Hesaplanır? Net ve Şeffaf Formül',
    excerpt:
      'Filament tüketimi, baskı süresi, post-process, fire payı ve kargo etkisini tek tabloda toplayarak sürdürülebilir fiyatlandırma modelini kurun.',
    image: cardVisualThree,
  },
  {
    id: 'stl-dosya-hata-kontrol-listesi',
    category: 'Dosya Hazırlığı',
    readTime: '6 dk',
    updatedAt: '03 Nisan 2026',
    title: 'STL Dosya Göndermeden Önce 12 Maddelik Hata Kontrol Listesi',
    excerpt:
      'Delik yüzey, manifold hatası, ince duvar ve yüzey normali sorunlarını siparişten önce tespit ederek üretim gecikmelerini önleyin.',
    image: cardVisualOne,
  },
  {
    id: 'figur-satisi-icin-urun-fotograf',
    category: 'E-Ticaret',
    readTime: '5 dk',
    updatedAt: '02 Nisan 2026',
    title: '3D Figür Satışında Dönüşümü Artıran Ürün Fotoğrafı Düzeni',
    excerpt:
      'Ürün fotoğraflarında açı seçimi, ışık planı ve ölçek gösteriminin satışa etkisini örnek ekranlarla anlatıyoruz.',
    image: cardVisualTwo,
  },
  {
    id: 'siparis-oncesi-musteri-sorulari',
    category: 'Müşteri Deneyimi',
    readTime: '4 dk',
    updatedAt: '01 Nisan 2026',
    title: 'Sipariş Öncesi Müşterinin Sorduğu 20 Soru ve Net Cevapları',
    excerpt:
      'Fiyat, teslim süresi, kırılma riski, iade, renk farkı gibi karar anındaki kritik sorular için standart yanıt şablonları.',
    image: cardVisualThree,
  },
  {
    id: 'masaustu-3d-yazici-bakim-rutini',
    category: 'Bakım',
    readTime: '7 dk',
    updatedAt: '31 Mart 2026',
    title: 'Masaüstü 3D Yazıcı İçin Haftalık Bakım Rutini',
    excerpt:
      'Nozzle temizliği, tabla kalibrasyonu, kayış kontrolü ve ekstrüder bakım adımlarını iş akışını durdurmadan uygulama planı.',
    image: cardVisualOne,
  },
  {
    id: 'baski-suresini-kisaltma-yontemleri',
    category: 'Verimlilik',
    readTime: '6 dk',
    updatedAt: '30 Mart 2026',
    title: 'Kaliteyi Düşürmeden Baskı Süresini Kısaltmanın Yolları',
    excerpt:
      'Katman yüksekliği, duvar çizgisi ve infill ayarları ile kalite/süre dengesini nasıl optimize edeceğinizi somut örneklerle gösteriyoruz.',
    image: cardVisualTwo,
  },
  {
    id: 'urun-iade-orani-dusurme',
    category: 'Operasyon',
    readTime: '5 dk',
    updatedAt: '29 Mart 2026',
    title: '3D Baskı Ürünlerinde İade Oranını Düşüren 6 Süreç İyileştirmesi',
    excerpt:
      'Sipariş onayı, görsel doğrulama, kırılganlık uyarısı ve paketleme akışı ile iade oranını ölçülebilir şekilde düşüren yöntemler.',
    image: cardVisualThree,
  },
  {
    id: 'ozel-uretim-teklif-sablonu',
    category: 'Satış Süreci',
    readTime: '4 dk',
    updatedAt: '28 Mart 2026',
    title: 'Özel Üretim Talepleri İçin Hızlı Teklif Şablonu',
    excerpt:
      'Teklif süresini kısaltmak ve kapsamı netleştirmek için kullanılabilecek pratik bir form yapısı ve fiyatlandırma akışı.',
    image: cardVisualOne,
  },
  {
    id: 'renk-secenegi-yonetimi',
    category: 'Katalog Yönetimi',
    readTime: '5 dk',
    updatedAt: '27 Mart 2026',
    title: '50+ Renk Seçeneğini Müşteriyi Yormadan Sunma Stratejisi',
    excerpt:
      'Renk varyasyonlarını katalogda doğru sıralama, filtreleme ve görsel standartlarla sunarak karar süresini kısaltın.',
    image: cardVisualTwo,
  },
  {
    id: 'anahtarlik-seri-uretim-rehberi',
    category: 'Seri Üretim',
    readTime: '6 dk',
    updatedAt: '26 Mart 2026',
    title: 'Kişiye Özel Anahtarlıkta Seri Üretim Akışı Nasıl Kurulur?',
    excerpt:
      'Dosya otomasyonu, baskı dizilimi ve son işlem adımlarıyla kişiselleştirilmiş ürünlerde üretim hızını artıran sistem kurulum rehberi.',
    image: cardVisualThree,
  },
  {
    id: 'boyama-ve-son-islem',
    category: 'Post-Process',
    readTime: '7 dk',
    updatedAt: '25 Mart 2026',
    title: '3D Baskı Sonrası Boyama ve Son İşlem İçin Başlangıç Rehberi',
    excerpt:
      'Zımpara sırası, astar uygulaması ve boya katman planı ile figürlerde profesyonel görünümü nasıl elde edeceğinizi öğrenin.',
    image: cardVisualOne,
  },
  {
    id: 'urun-etiketleme-standardi',
    category: 'Operasyon',
    readTime: '4 dk',
    updatedAt: '24 Mart 2026',
    title: 'Kargo ve Depoda Karışıklığı Önleyen Ürün Etiketleme Standardı',
    excerpt:
      'SKU düzeni, üretim kodu ve paketleme etiketleri ile yanlış gönderim oranını azaltan sade operasyon standardı.',
    image: cardVisualTwo,
  },
  {
    id: 'urun-aciklamasi-seo',
    category: 'SEO',
    readTime: '6 dk',
    updatedAt: '23 Mart 2026',
    title: '3D Baskı Ürün Açıklamalarında SEO İçin İçerik Kurgusu',
    excerpt:
      'Arama niyetine uygun başlıklar, teknik detay dengesi ve doğal anahtar kelime kullanımıyla ürün sayfalarında görünürlüğü artırın.',
    image: cardVisualThree,
  },
  {
    id: 'whatsapp-destek-akisi',
    category: 'Müşteri İletişimi',
    readTime: '5 dk',
    updatedAt: '22 Mart 2026',
    title: 'WhatsApp Destek Akışını Siparişe Dönüştüren Mesaj Dizisi',
    excerpt:
      'İlk mesajdan sipariş teyidine kadar güven oluşturan kısa mesaj kalıpları ve yanıt süresi yönetimi stratejileri.',
    image: cardVisualOne,
  },
  {
    id: 'hobi-urunlerinde-fiyat-psikolojisi',
    category: 'Fiyatlandırma',
    readTime: '6 dk',
    updatedAt: '21 Mart 2026',
    title: 'Hobi Ürünlerinde Fiyat Psikolojisi: Müşteri Neye Karar Veriyor?',
    excerpt:
      'Kargo, kalite, paketleme ve sosyal kanıt etkisini birlikte kullanarak fiyat direncini azaltmanın pratik yolları.',
    image: cardVisualTwo,
  },
  {
    id: 'urun-lansmani-checklist',
    category: 'Lansman',
    readTime: '5 dk',
    updatedAt: '20 Mart 2026',
    title: 'Yeni 3D Baskı Ürünü Yayına Almadan Önce Kontrol Listesi',
    excerpt:
      'Ürün fotoğrafı, açıklama, stok eşlemesi, varyasyon testi ve sipariş akışı denetimi ile hatasız lansman adımları.',
    image: cardVisualThree,
  },
  {
    id: 'scanner-kullanimi-baslangic',
    category: '3D Tarama',
    readTime: '7 dk',
    updatedAt: '19 Mart 2026',
    title: 'CR-Scan Raptor ile İlk Taramada Doğru Sonuç Alma Kılavuzu',
    excerpt:
      'Işık koşulu, obje sabitleme ve tarama açısı seçiminde yapılan yaygın hataları önleyerek daha temiz mesh elde edin.',
    image: cardVisualOne,
  },
  {
    id: 'hediyelik-urun-trendleri',
    category: 'Trend Analizi',
    readTime: '5 dk',
    updatedAt: '18 Mart 2026',
    title: '2026 Hediyelik 3D Baskı Trendleri: En Çok Talep Gören Kategoriler',
    excerpt:
      'Figür, masaüstü aksesuar, kişiye özel anahtarlık ve gamer ürünlerinde arama trendlerinden çıkan yeni fırsat alanları.',
    image: cardVisualTwo,
  },
  {
    id: 'stok-planlama-3d-magaza',
    category: 'Stok Planlama',
    readTime: '6 dk',
    updatedAt: '17 Mart 2026',
    title: '3D Baskı Mağazasında Stok Planlaması: Ne Kadar Üretmeli?',
    excerpt:
      'Sipariş yoğunluğu, sezon etkisi ve baskı süresi verilerini birlikte kullanarak stok-outs riskini azaltan planlama modeli.',
    image: cardVisualThree,
  },
  {
    id: 'yorum-yonetimi',
    category: 'Müşteri Güveni',
    readTime: '4 dk',
    updatedAt: '16 Mart 2026',
    title: 'Olumsuz Yorumları Satış Fırsatına Çevirmek Mümkün mü?',
    excerpt:
      'Şeffaf iletişim, çözüm odaklı yanıt ve teslim sonrası takip ile yorum krizlerini güven puanına dönüştürme rehberi.',
    image: cardVisualOne,
  },
  {
    id: 'urun-fotograf-arka-plan',
    category: 'Görsel İçerik',
    readTime: '5 dk',
    updatedAt: '15 Mart 2026',
    title: 'Ürün Fotoğrafında Arka Plan ve Işık Seçimi: Hızlı Kurulum',
    excerpt:
      'Ev/ofis ortamında düşük bütçeyle ürün fotoğrafı kalitesini yükselten arka plan ve ışık kombinasyonları.',
    image: cardVisualTwo,
  },
  {
    id: 'modellerde-destek-izi',
    category: 'Baskı Kalitesi',
    readTime: '6 dk',
    updatedAt: '14 Mart 2026',
    title: 'Destek İzini Azaltmak İçin Parça Yönü Nasıl Seçilir?',
    excerpt:
      'Parça konumlandırma, support tipi ve temas noktası ayarları ile son işlem ihtiyacını azaltan teknik yaklaşım.',
    image: cardVisualThree,
  },
  {
    id: 'fiyat-dususu-email-kampanyasi',
    category: 'E-Posta Pazarlama',
    readTime: '5 dk',
    updatedAt: '13 Mart 2026',
    title: 'Fiyat Düşüşü Bildirimiyle Favoriden Siparişe Dönüşüm',
    excerpt:
      'Favori ürün indirim e-postalarında başlık, görsel ve CTA optimizasyonuyla açılma ve dönüşüm oranlarını artıran yöntemler.',
    image: cardVisualOne,
  },
  {
    id: 'teslimat-sozu-ve-guven',
    category: 'Operasyon',
    readTime: '4 dk',
    updatedAt: '12 Mart 2026',
    title: 'Teslimat Sözünü Gerçekçi Vermek Neden Daha Çok Satış Getirir?',
    excerpt:
      'Aşırı iyimser teslimat vaadi yerine gerçekçi planlama ile müşteri memnuniyeti ve tekrar sipariş oranını nasıl artırabilirsiniz.',
    image: cardVisualTwo,
  },
  {
    id: 'urun-varyasyon-yonetimi',
    category: 'Katalog Yönetimi',
    readTime: '6 dk',
    updatedAt: '11 Mart 2026',
    title: 'Ürün Varyasyonları (Renk/Boyut) Karışmadan Nasıl Yönetilir?',
    excerpt:
      'Varyasyon kodu, stok eşlemesi ve sipariş ekranı kontrolleriyle yanlış ürün gönderimini düşüren sistem önerisi.',
    image: cardVisualThree,
  },
  {
    id: 'ilk-100-siparis-plani',
    category: 'Büyüme',
    readTime: '7 dk',
    updatedAt: '10 Mart 2026',
    title: 'Yeni 3D Baskı Markaları İçin İlk 100 Sipariş Yol Haritası',
    excerpt:
      'Katalog başlangıcı, fiyat-konumlandırma, içerik üretimi ve destek akışıyla ilk satışları daha hızlı yakalamanın yol haritası.',
    image: cardVisualOne,
  },
  {
    id: 'baskida-hata-tespit-formu',
    category: 'Kalite Kontrol',
    readTime: '5 dk',
    updatedAt: '09 Mart 2026',
    title: 'Baskı Hatalarını Erken Yakalamak İçin Kontrol Formu',
    excerpt:
      'Layer shift, under-extrusion, warping ve stringing sorunlarını üretim sırasında yakalamaya yardımcı kontrol formu.',
    image: cardVisualTwo,
  },
  {
    id: 'tasarimci-ile-calisma-rehberi',
    category: 'Tasarım Süreci',
    readTime: '6 dk',
    updatedAt: '08 Mart 2026',
    title: 'Freelance Tasarımcı ile Sorunsuz Çalışma Rehberi',
    excerpt:
      'Brief hazırlığı, revizyon sınırı, dosya teslim standardı ve telif beklentisi gibi konularda net anlaşma çerçevesi.',
    image: cardVisualThree,
  },
  {
    id: 'urun-sayfasi-hiz-optimizasyonu',
    category: 'Teknik SEO',
    readTime: '6 dk',
    updatedAt: '07 Mart 2026',
    title: 'Ürün Sayfası Hızını Artırmanın SEO ve Satışa Etkisi',
    excerpt:
      'Görsel optimizasyonu, lazy-load, script yükleme sırası ve CLS yönetimi ile kullanıcı deneyimi ve görünürlük artışı.',
    image: cardVisualOne,
  },
  {
    id: 'kucuk-seri-uretim-fiyatlama',
    category: 'Fiyatlandırma',
    readTime: '7 dk',
    updatedAt: '06 Mart 2026',
    title: 'Küçük Seri Üretimde Birim Maliyet Nasıl Düşürülür?',
    excerpt:
      'Batch planlama, nozzle ve malzeme standardizasyonu, tekrarlı işler için iş akışı tasarımıyla birim maliyet düşürme önerileri.',
    image: cardVisualTwo,
  },
]

const longFormChapters = [
  {
    id: 'chapter-filament-stratejisi',
    title: '1. Filament Stratejisi: Ürün Tipine Göre Malzeme Kararı',
    intro:
      'Başarılı 3D baskı operasyonlarında ilk doğru karar, baskıdan önce verilen malzeme kararıdır. Görsel kalite mi, mekanik dayanım mı, yoksa dış ortam uyumu mu daha kritik; bunu netleştirmek tüm süreci etkiler.',
    paragraphs: [
      'Dekoratif ürünlerde yüzey kalitesi ve temiz detay çoğu zaman önceliklidir. Bu tip ürünlerde PLA, düşük büzülme ve stabil baskı karakteri nedeniyle güçlü bir başlangıç seçeneğidir.',
      'Fonksiyonel parçalarda darbe dayanımı ve esneklik gerektiğinde PETG daha dengeli sonuç verir. Yüksek sıcaklık veya mekanik zorlanma beklentisi yükseldiğinde ABS devreye alınabilir.',
      'Malzeme seçimini sadece teknik değerlerle değil, hedef teslim süresi, stok durumu ve son işlem planı ile birlikte değerlendirmek gerekir. Bu yaklaşım, yeniden baskı oranını düşürür.',
    ],
    checklist: [
      'Ürünün kullanım senaryosunu net yazın (dekor, taşıyıcı parça, dış ortam).',
      'Isı, darbe ve esneklik gereksinimini sipariş öncesi puanlayın.',
      'Malzeme kararını teslim süresi ve stok gerçekliğiyle birlikte verin.',
      'İlk baskıda küçük test parçası ile malzeme davranışını doğrulayın.',
    ],
    takeaway:
      'En iyi filament diye tek bir cevap yoktur. Doğru filament, ürünün gerçek kullanım ihtiyacına göre seçilen filamenttir.',
  },
  {
    id: 'chapter-kalite-optimizasyonu',
    title: '2. Baskı Kalitesi: Katman İzi, Destek İzi ve Yüzey Bütünlüğü',
    intro:
      'Yüksek kaliteli ürün hissi çoğu zaman milimetre altı ayarların doğru kombinasyonundan gelir. Katman yüksekliği, hız, sıcaklık ve destek yaklaşımı birbirinden bağımsız değildir.',
    paragraphs: [
      'Katman izi azaltma çalışmalarında tek parametre değiştirmek yanıltıcıdır. Dış duvar hızı, nozzle sıcaklığı ve fan seviyesini birlikte optimize etmek gerekir.',
      'Destek izi yoğun parçalarda geometriye uygun parça yönü seçimi, son işlem süresini ciddi biçimde düşürür. Bu sayede teslimat süresi de daha öngörülebilir olur.',
      'Kalite kontrol sadece son üründe yapılmamalıdır. Üretim sırasında ara kontrol noktaları koymak, seri işlerde hatanın çoğalmasını engeller.',
    ],
    checklist: [
      'Görsel öncelikli ürünlerde katman yüksekliğini düşük tutun.',
      'Dış duvar hızını iç dolgu hızından ayrı yönetin.',
      'Destek temasını minimize edecek parça yönünü deneyin.',
      'Her baskıda kısa kalite kontrol notu tutarak standart oluşturun.',
    ],
    takeaway:
      'Kalite tesadüf değil, tekrar edilebilir süreçtir. Ölçtüğünüz kaliteyi büyütebilirsiniz.',
  },
  {
    id: 'chapter-fiyat-ve-karlilik',
    title: '3. Fiyatlandırma ve Karlılık: Sadece Filament Gramına Bakmayın',
    intro:
      '3D baskı maliyet hesabında en sık yapılan hata, yalnızca malzeme tüketimine odaklanmaktır. Gerçek maliyet modeli doğrudan ve dolaylı tüm kalemleri içermelidir.',
    paragraphs: [
      'Doğrudan maliyetlerde filament/reçine, enerji ve operatör süresi vardır. Dolaylı tarafta bakım, nozzle tüketimi, başarısız baskı payı ve paketleme bulunur.',
      'Özellikle kırılgan ürünlerde koruyucu paketleme ve lojistik etkisi fiyatı anlamlı biçimde değiştirir. Bu kalemi görünmez bırakmak, operasyon sonunda karlılığı düşürür.',
      'Şeffaf fiyatlandırma yaklaşımı müşteri güvenini artırır. Kapsamı net fiyatlandırılan işler, iade ve itiraz oranlarında daha iyi performans gösterir.',
    ],
    checklist: [
      'Maliyet tablolarını doğrudan ve dolaylı olarak ayırın.',
      'Başarısız baskı oranını gerçek veriye göre modele dahil edin.',
      'Kargo ve paketleme maliyetini şehir/ölçü bazlı değerlendirin.',
      'Teklifte kapsam ve teslim kriterini yazılı biçimde belirtin.',
    ],
    takeaway:
      'Doğru fiyat, sadece satış getirmez; markanın sürdürülebilir büyümesini mümkün kılar.',
  },
  {
    id: 'chapter-operasyon-ve-teslimat',
    title: '4. Operasyon Akışı: Siparişten Teslime Hatasız Süreç Tasarımı',
    intro:
      'Üretim kalitesi kadar operasyon kalitesi de müşteri deneyimini belirler. Sipariş doğrulama, etiketleme, paketleme ve bilgilendirme adımları standarda bağlanmalıdır.',
    paragraphs: [
      'Sipariş onayı aşamasında ürün varyasyonu, renk, ölçü ve teslim beklentisinin tekrar doğrulanması yanlış üretim riskini azaltır.',
      'Depo ve kargo adımlarında standart etiketleme kullanmak karışıklık oranını düşürür. Özellikle benzer model isimlerinde bu standart kritik önem taşır.',
      'Müşteriye düzenli süreç bilgilendirmesi yapmak, destek yükünü azaltır ve güveni artırır. Sessiz süreçler yerine şeffaf süreçler tercih edilmelidir.',
    ],
    checklist: [
      'Sipariş öncesi kısa doğrulama maddelerini standart hale getirin.',
      'Üretim ve paketleme için tek tip etiket yapısı kullanın.',
      'Kırılgan ürünler için zorunlu koruma katmanı planlayın.',
      'Teslimat boyunca müşteriye en az iki bilgilendirme mesajı gönderin.',
    ],
    takeaway:
      'Hatasız operasyon, iyi ürünü iyi deneyime dönüştürür. Tekrar siparişin temelinde bu vardır.',
  },
  {
    id: 'chapter-seo-ve-buyume',
    title: '5. SEO ve Büyüme: İçerik Kütüphanesiyle Organik Trafik Artırma',
    intro:
      'Blog içerikleri yalnızca bilgi paylaşımı değil, arama görünürlüğünü büyüten uzun vadeli bir varlıktır. Düzenli, niyet odaklı ve teknik olarak doğru içerik planı şarttır.',
    paragraphs: [
      'Her içerikte tek bir ana niyet hedeflemek, hem okuyucuya hem arama motoruna net sinyal verir. Başlık ve alt başlık yapısı bu nedenle stratejik kurgulanmalıdır.',
      'İç linkleme yapısı, kullanıcıyı ilgili rehbere ve uygun ürün sayfasına doğal şekilde taşır. Bu yaklaşım oturum süresini artırır ve dönüşümü destekler.',
      'Yapısal veri (JSON-LD), güçlü meta açıklamalar ve güncel tarih bilgisi; blog içeriklerinin önerilme ihtimalini artıran önemli teknik sinyallerdir.',
    ],
    checklist: [
      'Aylık içerik takviminde en az 4 hedef konu belirleyin.',
      'Her içerikte ilgili ürün veya hizmet sayfasına iç link verin.',
      'Meta başlık/açıklama ve schema alanlarını eksiksiz doldurun.',
      'Eski içerikleri 60-90 gün aralığında güncelleyerek canlı tutun.',
    ],
    takeaway:
      'SEO bir kerelik iş değildir; sürekli güncellenen bilgi kütüphanesiyle büyüyen bir sistemdir.',
  },
  {
    id: 'chapter-musteri-memnuniyeti-ve-surdurulebilirlik',
    title: '6. Müşteri Memnuniyeti: Sipariş Sonrası Süreç ve Sürdürülebilir Büyüme',
    intro:
      'Satış sonrası iletişim, yeniden sipariş oranını belirleyen kritik adımdır. Teslimat sonrası geri bildirim toplamak, sorunları hızla çözmek ve memnuniyet takibi yapmak uzun vadeli büyümeyi destekler.',
    paragraphs: [
      'Müşteriye yalnızca ürün teslim etmek yeterli değildir. Ürün deneyiminin gerçekten başarılı olup olmadığını anlamak için kısa geri bildirim adımı planlanmalıdır.',
      'Sorun yaşayan müşteriye hızlı ve net dönüş yapmak, olumsuz yorumu güvene çevirebilir. Bu yaklaşım marka algısında kalıcı fark yaratır.',
      'Tekrar siparişleri artırmak için teslimat sonrası doğru zamanda bilgilendirici içerik ve tamamlayıcı ürün önerileri paylaşılabilir.',
    ],
    checklist: [
      'Teslimat sonrası 24-48 saat içinde kısa memnuniyet mesajı gönderin.',
      'Şikayet süreçleri için tek bir hızlı iletişim kanalı belirleyin.',
      'Sık gelen sorunları aylık olarak analiz edip süreç iyileştirin.',
      'Memnun müşterileri yorum paylaşmaya nazikçe teşvik edin.',
    ],
    takeaway:
      'Kalıcı büyüme, yalnızca yeni sipariş almakla değil, memnun müşteriyi tekrar geri getirmekle mümkün olur.',
  },
]

const POSTS_PER_PAGE = 6

const BlogPage = () => {
  const [activePage, setActivePage] = useState(1)
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE)

  const pagedPosts = useMemo(() => {
    const start = (activePage - 1) * POSTS_PER_PAGE
    return allPosts.slice(start, start + POSTS_PER_PAGE)
  }, [activePage])

  const goToPage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return
    setActivePage(pageNumber)
    document.getElementById('blog-grid-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const blogStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Ozkan3D Blog',
    description:
      '3D baskı, filament seçimi, prototipleme ve 3D tarama konularında uygulamalı rehberler ve güncel içerikler.',
    inLanguage: 'tr-TR',
    publisher: {
      '@type': 'Organization',
      name: 'Ozkan3D',
    },
    blogPost: allPosts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      dateModified: post.updatedAt,
      url: `/blog#${post.id}`,
      inLanguage: 'tr-TR',
    })),
  }

  return (
    <div className="blog-page">
      <SEO
        title="3D Baskı Blog Rehberi"
        description="Filament seçimi, baskı kalitesi, fiyatlandırma, operasyon, e-ticaret, 3D tarama ve prototipleme konularında kapsamlı 3D baskı blog arşivi."
        keywords="3D baskı blog, filament rehberi, baskı kalite artırma, prototipleme, 3D tarama, 3D baskı fiyatlandırma, e-ticaret rehberi"
        url="/blog"
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogStructuredData) }}
      />

      <section className="blog-hero">
        <div className="blog-hero-content">
          <p className="blog-sup">Bilgi Merkezi</p>
          <h1 className="blog-title">
            3D Baskı İçin
            <span> Kapsamlı Bilgi Kütüphanesi</span>
          </h1>
          <p className="blog-subtitle">
            Filament seçimi, kalite ayarı, fiyatlandırma, üretim, kargo, müşteri iletişimi ve SEO dahil
            uçtan uca büyüme rehberlerini tek sayfada topladık. Bu arşiv en az 5 sayfalık içerik akışıyla
            sürekli genişleyen bir başvuru kaynağıdır.
          </p>

          <div className="blog-hero-stats" aria-label="Blog istatistikleri">
            <div className="blog-hero-stat"><FiBookOpen size={16} /> <strong>{allPosts.length}+</strong> yazı</div>
            <div className="blog-hero-stat"><FiLayers size={16} /> <strong>{totalPages}</strong> sayfa arşiv</div>
            <div className="blog-hero-stat"><FiTrendingUp size={16} /> düzenli güncelleme</div>
          </div>
        </div>
      </section>

      <div className="blog-container">
        <Link
          to="/blog/filament-secimi-pla-petg-abs"
          state={{
            post: {
              id: 'filament-secimi-pla-petg-abs',
              title: 'PLA, PETG ve ABS Karşılaştırması: Pratik Seçim Rehberi',
              excerpt:
                'Hangi filament daha iyi sorusuna ürün türüne, dayanım beklentisine ve teslim süresine göre pratik yanıtlar sunan kapsamlı rehber.',
              category: 'Malzeme Rehberi',
              readTime: '7 dk',
              updatedAt: '09 Nisan 2026',
              image: heroVisual,
            },
          }}
          className="blog-featured-link"
          aria-label="Öne çıkan blogu aç"
        >
          <article className="blog-featured" id="one-cikan-yazi">
            <div className="featured-image-wrap">
              <img src={heroVisual} alt="3D baskı blog öne çıkan içerik" className="featured-image" />
              <span className="article-badge">Öne Çıkan</span>
            </div>

            <div className="featured-content">
              <div className="article-meta">
                <span className="meta-item"><FiTag size={14} /> Malzeme Rehberi</span>
                <span className="meta-item"><FiClock size={14} /> 7 dk okuma</span>
                <span className="meta-item"><FiCalendar size={14} /> 09 Nisan 2026</span>
              </div>

              <h2 className="featured-title">PLA, PETG ve ABS Karşılaştırması: Pratik Seçim Rehberi</h2>
              <p className="featured-excerpt">
                “Hangi filament daha iyi?” sorusunun tek cevabı yok. Bu yazıda ürün türüne,
                dayanım beklentisine ve teslim süresine göre doğru filament seçimini,
                gerçek sipariş senaryoları üzerinden sade bir şekilde anlatıyoruz.
              </p>

              <span className="btn-read-more">
                Yazıya Git <FiArrowRight size={16} />
              </span>
            </div>
          </article>
        </Link>

        <section id="blog-grid-list" className="blog-grid-section" aria-label="Blog kartları">
          <div className="blog-grid-head">
            <h2>Blog Arşivi</h2>
            <p>
              Şu anda <strong>{activePage}. sayfayı</strong> görüntülüyorsunuz.
              Toplam {allPosts.length} içerik, {totalPages} sayfada listeleniyor.
            </p>
          </div>

          <div className="blog-grid">
            {pagedPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.id}`}
                state={{ post }}
                className="blog-card-link-wrap"
                aria-label={`${post.title} detayını aç`}
              >
                <article className="blog-card">
                  <div className="blog-card-image-wrap">
                    <img src={post.image} alt={post.title} className="blog-card-image" loading="lazy" />
                    <span className="blog-card-category">{post.category}</span>
                  </div>

                  <div className="blog-card-content">
                    <div className="blog-card-meta">
                      <span><FiClock size={13} /> {post.readTime}</span>
                      <span><FiCalendar size={13} /> {post.updatedAt}</span>
                    </div>
                    <h3 className="blog-card-title">{post.title}</h3>
                    <p className="blog-card-excerpt">{post.excerpt}</p>
                    <span className="blog-card-link">
                      Detaylı İncele <FiArrowRight size={15} />
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          <div className="blog-pagination" aria-label="Blog sayfalama">
            <button
              type="button"
              className="blog-page-btn"
              onClick={() => goToPage(activePage - 1)}
              disabled={activePage === 1}
            >
              <FiChevronLeft size={16} /> Önceki
            </button>

            <div className="blog-page-list">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`blog-page-pill ${activePage === pageNumber ? 'is-active' : ''}`}
                  onClick={() => goToPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="blog-page-btn"
              onClick={() => goToPage(activePage + 1)}
              disabled={activePage === totalPages}
            >
              Sonraki <FiChevronRight size={16} />
            </button>
          </div>
        </section>

        <section className="blog-chapter-boxes" aria-label="Büyük tıklanabilir rehber kutuları">
          <div className="blog-grid-head">
            <h2>Büyük Tıklanabilir Rehberler</h2>
            <p>
              Aşağıdaki 1'den 6'ya kadar uzanan rehberleri kutu kart yapısında sunuyoruz.
              İlgili kutuya tıklayarak bölümün detayına anında gidebilirsiniz.
            </p>
          </div>

          <div className="blog-chapter-grid">
            {longFormChapters.map((section) => (
              <Link
                key={`chapter-link-${section.id}`}
                to={`/blog/${section.id}`}
                state={{
                  post: {
                    id: section.id,
                    title: section.title,
                    excerpt: section.intro,
                    category: 'Uzun Rehber',
                    readTime: '10 dk',
                    updatedAt: '09 Nisan 2026',
                  },
                }}
                className="blog-chapter-card"
              >
                <p className="blog-chapter-label">Uzun Rehber</p>
                <h3>{section.title}</h3>
                <p>{section.intro}</p>
                <span className="blog-chapter-cta">
                    Detaylı İncele <FiArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="blog-faq" aria-label="Sık sorulan sorular">
          <h2>Blog Kütüphanesi Hakkında Sık Sorulanlar</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>Bu içerikler kimler için?</h3>
              <p>
                3D baskıya yeni başlayanlar, ürün geliştiren ekipler ve baskı sürecini
                daha verimli yönetmek isteyen satıcılar için hazırlandı.
              </p>
            </div>
            <div className="faq-item">
              <h3>İçerikler ne sıklıkla güncelleniyor?</h3>
              <p>
                Üretim ve sipariş süreçlerinden gelen gerçek verilerle eski yazıları periyodik olarak
                güncelliyor, yeni konuları arşive düzenli şekilde ekliyoruz.
              </p>
            </div>
            <div className="faq-item">
              <h3>Özel bir konu önerisi yapabilir miyim?</h3>
              <p>
                Evet. İhtiyacınız olan konu başlığını bize iletebilirsiniz; blog planına
                alıp teknik rehber olarak yayınlıyoruz.
              </p>
            </div>
            <div className="faq-item">
              <h3>Bu sayfa neden uzun tutuluyor?</h3>
              <p>
                Arşivin kapsamlı olması hem ziyaretçinin ihtiyaç duyduğu bilgiye tek yerde ulaşmasını
                sağlar hem de organik arama görünürlüğünü güçlendirir.
              </p>
            </div>
            <div className="faq-item">
              <h3>Sayfa sayısı artacak mı?</h3>
              <p>
                Evet. Yeni içeriklerle blog sayfaları artacak şekilde planlıyoruz; hedefimiz düzenli
                ve sürdürülebilir bir bilgi kütüphanesi oluşturmak.
              </p>
            </div>
            <div className="faq-item">
              <h3>Teknik rehberler uygulamalı mı?</h3>
              <p>
                Rehberlerin çoğu üretim sürecinde test edilmiş pratik adımları içerir. Teoriden çok
                uygulanabilir yöntem ve kontrol listeleri paylaşılır.
              </p>
            </div>
          </div>
        </section>

        <section className="blog-cta">
          <h2>Uygulamaya Geçmek İster misiniz?</h2>
          <p>
            Rehberi okuduktan sonra ürün siparişi verebilir, özel baskı talebi açabilir veya
            tarama hizmeti için doğrudan bizimle iletişime geçebilirsiniz.
          </p>
          <div className="blog-cta-actions">
            <Link to="/shop" className="btn-solid">Mağazaya Git</Link>
            <Link to="/custom" className="btn-outline">Özel Baskı Talebi</Link>
            <Link to="/scan" className="btn-outline">3D Tarama Hizmeti</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default BlogPage

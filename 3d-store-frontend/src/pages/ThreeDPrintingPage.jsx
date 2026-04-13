import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import './ThreeDPrintingPage.css'

const faqItems = [
  {
    q: '3D baski urunlerinde teslim suresi ne kadar?',
    a: 'Stokta olan urunlerde siparisler genellikle 1-2 is gununde kargoya verilir. Ozel uretim urunlerde sure model karmaasina gore degisebilir.',
  },
  {
    q: 'Hangi malzeme ile baski aliyorsunuz?',
    a: 'Urunlerimizde agirlikli olarak PLA malzeme kullaniyoruz. Kullanim amacina gore uygun doluluk ve duvar kalinligi secilerek dayaniklilik saglanir.',
  },
  {
    q: 'Kisiye ozel 3D baski yaptirabilir miyim?',
    a: 'Evet. Ozel tasarim talebinizi model dosyasi veya referans gorsel ile iletebilir, size uygun fiyat ve termin plani alabilirsiniz.',
  },
]

const quickLinks = [
  { label: '3D Baski Figurler', to: '/shop?search=3d%20baski%20figur' },
  { label: '3D Baski Anahtarlik', to: '/shop?search=3d%20baski%20anahtarlik' },
  { label: 'Kisiye Ozel 3D Baski', to: '/custom' },
  { label: '3D Tarama Hizmeti', to: '/scan' },
  { label: 'Tum 3D Baski Urunleri', to: '/shop' },
]

const ThreeDPrintingPage = () => {
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: '3D Baski Urunleri',
      description:
        'Figur, dekor, anahtarlik ve ozel tasarim dahil 3D baski urunleri icin rehber sayfasi. Kategori bazli gezinin ve ihtiyaciniza uygun urunu bulun.',
      inLanguage: 'tr-TR',
      url: 'https://www.ozkan3d.com.tr/3d-baski',
      isPartOf: {
        '@type': 'WebSite',
        name: 'Ozkan3D',
        url: 'https://www.ozkan3d.com.tr',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    },
  ]

  return (
    <div className="three-d-page">
      <SEO
        title="3D Baski Urunleri"
        description="3D baski figur, anahtarlik, dekor ve ozel tasarim urunlerini tek sayfada kesfedin. Ozkan3D ile kalite, hizli uretim ve guvenli teslimat."
        keywords="3d baski, 3d baski urunleri, 3d figur, 3d baski anahtarlik, ozel 3d baski, ozkan3d"
        url="/3d-baski"
        structuredData={structuredData}
      />

      <section className="three-d-hero">
        <div className="three-d-hero-inner">
          <p className="three-d-sup">Ozkan3D Rehber Sayfasi</p>
          <h1>3D Baski Urunleri</h1>
          <p>
            Guncel 3D baski koleksiyonumuzu kategori bazli inceleyin. Figurden anahtarliga,
            ozel tasarimdan fonksiyonel aksesuarlara kadar tum urunleri tek noktadan
            karsilastirabilirsiniz.
          </p>
          <div className="three-d-actions">
            <Link to="/shop" className="three-d-btn three-d-btn-primary">Magazayi Kesfet</Link>
            <Link to="/custom" className="three-d-btn three-d-btn-ghost">Ozel Uretim Talebi</Link>
          </div>
        </div>
      </section>

      <section className="three-d-section">
        <div className="three-d-section-inner">
          <h2>Populer 3D Baski Aramalari</h2>
          <div className="three-d-link-grid">
            {quickLinks.map((item) => (
              <Link key={item.label} to={item.to} className="three-d-link-card">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="three-d-section three-d-section-alt">
        <div className="three-d-section-inner">
          <h2>3D Baski Siparisinde Nelere Dikkat Etmelisiniz?</h2>
          <ul className="three-d-checklist">
            <li>Kullanim amacina gore malzeme ve baski ayari secin.</li>
            <li>Boyut ve dayaniklilik beklentisini urun aciklamasinda netlestirin.</li>
            <li>Teslim suresi ve uretim adimlarini siparis oncesi kontrol edin.</li>
            <li>Renk secimi ve gorsel varyantlarin urun kartinda eslestiginden emin olun.</li>
          </ul>
        </div>
      </section>

      <section className="three-d-section">
        <div className="three-d-section-inner">
          <h2>Sik Sorulan Sorular</h2>
          <div className="three-d-faq-list">
            {faqItems.map((item) => (
              <article key={item.q} className="three-d-faq-item">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default ThreeDPrintingPage

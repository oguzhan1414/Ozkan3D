import { Link, useLocation, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiClock, FiTag } from 'react-icons/fi'
import SEO from '../components/SEO'
import './BlogDetailPage.css'

const buildFallbackPost = (slug) => {
  const normalized = String(slug || '')
    .replaceAll('-', ' ')
    .trim()

  const title = normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    id: slug,
    category: '3D Baskı Rehberi',
    readTime: '8 dk',
    updatedAt: '09 Nisan 2026',
    title: title || 'Blog Detayı',
    excerpt:
      'Bu blog içeriğinde ilgili konu başlığını adım adım ele alıyor; doğru karar vermeniz için kısa, net ve uygulanabilir öneriler sunuyoruz.',
    image: '',
  }
}

const buildSections = (post) => [
  {
    title: 'Konu Özeti',
    paragraphs: [
      `${post.title} başlığında en kritik nokta, kararları yalnızca tek bir metriğe göre vermemektir. Üretim kalitesi, maliyet, süre ve müşteri beklentisi birlikte düşünülmelidir.`,
      `${post.excerpt} Uygulamada en iyi sonucu almak için önce hedefi netleştirip ardından ayar, malzeme ve süreç tarafını uyumlu hale getirmek gerekir.`,
    ],
  },
  {
    title: 'Neden Önemli?',
    paragraphs: [
      'Sipariş süreçlerinde küçük bir teknik hata bile teslimat gecikmesi, yeniden üretim maliyeti veya müşteri memnuniyetsizliği olarak geri döner.',
      'Bu yüzden her adımda standart bir kontrol yaklaşımı kullanmak, ölçek büyüdüğünde operasyonu daha öngörülebilir hale getirir.',
    ],
  },
  {
    title: 'Adım Adım Uygulama',
    paragraphs: [
      'İlk adımda hedef kullanım senaryosunu yazılı hale getirin. Ürünün dekoratif mi fonksiyonel mi olduğu, kullanılacak malzeme ve ayarları doğrudan belirler.',
      'İkinci adımda küçük bir test üretimi ile kritik riskleri doğrulayın. Böylece seri üretime geçmeden önce hataları düşük maliyetle yakalarsınız.',
      'Son adımda kalite kontrol ve teslimat standardını sabitleyin. Bu yaklaşım tekrar siparişlerde hız ve tutarlılık sağlar.',
    ],
  },
]

const buildChecklist = (post) => [
  `${post.category} odaklı kararları teslim süresiyle birlikte değerlendirin.`,
  'Üretim öncesi kısa test ile kritik riski erkenden ölçün.',
  'Sipariş notu, kalite kontrol ve paketleme adımlarını standartlaştırın.',
  'Teslim sonrası geri bildirimleri bir sonraki üretim için kayıt altına alın.',
]

const BlogDetailPage = () => {
  const { slug } = useParams()
  const location = useLocation()

  const statePost = location.state?.post
  const post = statePost?.id === slug ? statePost : buildFallbackPost(slug)

  const sections = buildSections(post)
  const checklist = buildChecklist(post)

  return (
    <div className="blog-detail-page">
      <SEO
        title={`${post.title} | Blog`}
        description={post.excerpt}
        keywords={`${post.category}, 3D baskı blog, ${post.title}`}
        url={`/blog/${post.id}`}
      />

      <section className="blog-detail-hero">
        <div className="blog-detail-hero-inner">
          <Link to="/blog" className="blog-detail-back">
            <FiArrowLeft size={16} /> Blog Arşivine Dön
          </Link>

          <div className="blog-detail-meta">
            <span><FiTag size={14} /> {post.category}</span>
            <span><FiClock size={14} /> {post.readTime}</span>
            <span><FiCalendar size={14} /> {post.updatedAt}</span>
          </div>

          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
        </div>
      </section>

      <div className="blog-detail-container">
        <article className="blog-detail-article">
          {sections.map((section) => (
            <section key={section.title} className="blog-detail-section">
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}

          <section className="blog-detail-section">
            <h2>Hızlı Kontrol Listesi</h2>
            <ul className="blog-detail-checklist">
              {checklist.map((item) => (
                <li key={item}><FiCheckCircle size={15} /> {item}</li>
              ))}
            </ul>
          </section>
        </article>

        <aside className="blog-detail-aside">
          <h3>Sonraki Adım</h3>
          <p>
            Benzer konulardaki içerikleri görmek için blog arşivine dönüp diğer yazıları da
            detay sayfasından okuyabilirsiniz.
          </p>
          <Link to="/blog" className="blog-detail-cta">Diğer Blogları İncele</Link>
        </aside>
      </div>
    </div>
  )
}

export default BlogDetailPage

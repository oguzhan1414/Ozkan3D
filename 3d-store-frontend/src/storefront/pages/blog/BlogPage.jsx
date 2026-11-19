import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiSearch, FiArrowRight, FiClock } from 'react-icons/fi'
import SEO from '../../../components/SEO'
import { POSTS, GUIDES } from '../../blog/blogData'
import '../../storefront.css'
import './Blog.css'

const PAGE_SIZE = 9
const SITE = 'https://www.ozkan3d.com.tr'

// Rehber numarası "1. Filament Stratejisi: ..." başlığından ayrılır
const splitGuideTitle = (title) => {
  const m = title.match(/^(\d+)\.\s*(.*)$/)
  return m ? { no: m[1], text: m[2] } : { no: '', text: title }
}

/** Görseli olmayan yazılar için katmanlı kapak (kategoriye göre ton) */
const TONES = ['#fbe3dc', '#ececea', '#e9eef2', '#efe6f3', '#e6f0e7', '#fdf0d8']
const toneOf = (key) => TONES[[...key].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length]

export const PostCover = ({ post }) => (
  <span className="sf-blog-cover" style={{ '--tone': toneOf(post.category) }} aria-hidden="true">
    <span className="sf-blog-cover-word">{post.category}</span>
  </span>
)

const BlogPage = () => {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  // En çok yazısı olan kategoriler hızlı filtre olarak görünür
  const topCategories = useMemo(() => {
    const counts = new Map()
    for (const p of POSTS) counts.set(p.category, (counts.get(p.category) || 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    return POSTS.filter((p) =>
      (!category || p.category === category)
      && (!q || `${p.title} ${p.excerpt} ${p.category}`.toLocaleLowerCase('tr').includes(q)))
  }, [query, category])

  const shown = filtered.slice(0, visible)

  return (
    <div className="sf-root sf-page sf-blog">
      <SEO
        title="Blog ve rehberler"
        description="3D baskı malzemeleri, baskı kalitesi, fiyatlandırma ve sipariş süreçleri üzerine pratik rehberler."
        url="/blog"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'Ozkan3d Blog',
          url: `${SITE}/blog`,
          blogPost: POSTS.slice(0, 12).map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}/blog/${p.id}` })),
        }}
      />

      <div className="sf-container sf-blog-wrap">
        <header className="sf-blog-hero">
          <span className="sf-cut-tag sf-cut-tag--soft">Atölyeden notlar</span>
          <h1>3D baskıya dair bildiklerimiz</h1>
          <p>Malzeme seçiminden yüzey kalitesine, fiyatlandırmadan paketlemeye kadar atölyede öğrendiklerimizi sade bir dille yazıyoruz.</p>
        </header>

        {/* Rehberler: tam metinli uzun içerikler */}
        <section className="sf-blog-guides" aria-labelledby="sf-guides-title">
          <div className="sf-blog-section-head">
            <h2 id="sf-guides-title">Rehberler</h2>
            <p>Baştan sona okunacak, kontrol listeli uzun yazılar.</p>
          </div>
          <ol className="sf-blog-guide-grid">
            {GUIDES.map((g) => {
              const t = splitGuideTitle(g.title)
              return (
                <li key={g.id}>
                  <Link to={`/blog/${g.id}`} className="sf-blog-guide sf-cut">
                    <span className="sf-blog-guide-no">{t.no.padStart(2, '0')}</span>
                    <strong>{t.text}</strong>
                    <span className="sf-blog-guide-intro">{g.intro}</span>
                    <span className="sf-blog-guide-more">Rehberi oku <FiArrowRight aria-hidden="true" /></span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>

        {/* Yazılar */}
        <section className="sf-blog-posts" aria-labelledby="sf-posts-title">
          <div className="sf-blog-section-head">
            <h2 id="sf-posts-title">Yazılar</h2>
            <label className="sf-blog-search">
              <FiSearch aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setVisible(PAGE_SIZE) }}
                placeholder="Yazılarda ara"
                aria-label="Yazılarda ara"
              />
            </label>
          </div>

          <div className="sf-blog-chips" role="group" aria-label="Kategori">
            <button type="button" className={`sf-chip ${!category ? 'is-active' : ''}`} onClick={() => { setCategory(''); setVisible(PAGE_SIZE) }} aria-pressed={!category}>Tümü</button>
            {topCategories.map((c) => (
              <button
                key={c}
                type="button"
                className={`sf-chip ${category === c ? 'is-active' : ''}`}
                onClick={() => { setCategory(c); setVisible(PAGE_SIZE) }}
                aria-pressed={category === c}
              >
                {c}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="sf-blog-empty">Aramana uygun yazı bulamadık.</p>
          ) : (
            <ul className="sf-blog-grid">
              {shown.map((p) => (
                <li key={p.id}>
                  <Link to={`/blog/${p.id}`} className="sf-blog-card">
                    <PostCover post={p} />
                    <span className="sf-blog-meta">
                      <span>{p.category}</span>
                      <span aria-hidden="true">·</span>
                      <span><FiClock aria-hidden="true" /> {p.readTime}</span>
                    </span>
                    <strong className="sf-blog-title">{p.title}</strong>
                    <span className="sf-blog-excerpt">{p.excerpt}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {visible < filtered.length && (
            <div className="sf-blog-more">
              <button type="button" className="sf-btn sf-btn--ghost" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Daha fazla yazı ({filtered.length - visible})
              </button>
            </div>
          )}
        </section>

        <section className="sf-blog-cta sf-cut">
          <div>
            <h2>Aklındaki parçayı birlikte basalım</h2>
            <p>Dosyan varsa yükle, yoksa fotoğraf ya da çizimle anlat; malzeme ve fiyatı birlikte netleştirelim.</p>
          </div>
          <Link to="/custom" className="sf-btn sf-btn--accent">Özel baskı talebi</Link>
        </section>
      </div>
    </div>
  )
}

export default BlogPage

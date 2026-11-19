import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FiChevronLeft, FiChevronRight, FiArrowRight, FiPackage, FiLock, FiRefreshCw, FiTruck } from 'react-icons/fi'
import { getHomeBootstrapApi } from '../../api/homeApi'
import SEO from '../../components/SEO'
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard'
import Rail from '../components/Rail'
import Stars, { Star } from '../components/Stars'
import { categoryHref, productHref, formatPrice } from '../catalog'
import useCategories from '../useCategories'
import '../storefront.css'
import './HomePage.css'

/* ------------------------------------------------------------------- Hero */
const HeroBanner = ({ slides }) => {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = slides.length

  useEffect(() => {
    if (count < 2 || paused) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 7000)
    return () => clearInterval(t)
  }, [count, paused])

  if (count === 0) return <div className="sf-hero sf-skeleton" aria-hidden="true" />

  const i = index % count
  const current = slides[i]
  const step = (d) => setIndex((n) => (n + d + count) % count)
  const isInternal = current.ctaHref?.startsWith('/')

  return (
    <section
      className="sf-hero"
      aria-roledescription="carousel"
      aria-label="Öne çıkanlar"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((s, n) => (
        <img
          key={s._id || s.imageUrl}
          src={s.imageUrl}
          alt={n === i ? (s.altText || '') : ''}
          aria-hidden={n !== i}
          className={`sf-hero-img ${n === i ? 'is-active' : ''}`}
          loading={n === 0 ? 'eager' : 'lazy'}
          fetchPriority={n === 0 ? 'high' : 'auto'}
        />
      ))}
      <div className="sf-hero-shade" aria-hidden="true" />

      <div className="sf-hero-copy" key={i} aria-live="polite">
        {current.title && <h2 className="sf-hero-title">{current.title}</h2>}
        {current.subtitle && <p className="sf-hero-sub">{current.subtitle}</p>}
        {current.ctaLabel && current.ctaHref && (
          isInternal
            ? <Link to={current.ctaHref} className="sf-hero-cta">{current.ctaLabel}</Link>
            : <a href={current.ctaHref} className="sf-hero-cta" target="_blank" rel="noreferrer">{current.ctaLabel}</a>
        )}
      </div>

      {count > 1 && (
        <>
          <div className="sf-hero-dots" role="tablist" aria-label="Slayt seç">
            {slides.map((s, n) => (
              <button
                key={s._id || n}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={`Slayt ${n + 1}`}
                className={n === i ? 'is-active' : ''}
                onClick={() => setIndex(n)}
              />
            ))}
          </div>
          <div className="sf-hero-arrows">
            <button type="button" className="sf-arrow" onClick={() => step(-1)} aria-label="Önceki slayt"><FiChevronLeft /></button>
            <button type="button" className="sf-arrow" onClick={() => step(1)} aria-label="Sonraki slayt"><FiChevronRight /></button>
          </div>
        </>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------- Vitrin */
// İlk ekranda üç kapı: kampanya (slider), hizmet (özel baskı), ürün (yeni çıktı)
const SpotlightTile = ({ product, loading }) => {
  if (loading) return <div className="sf-tile sf-skeleton" aria-hidden="true" />
  if (!product) {
    return (
      <Link to="/scan" className="sf-tile sf-tile--light">
        <span className="sf-tile-kicker">3D tarama</span>
        <h2>Elindeki objeyi dijital modele çevirelim.</h2>
        <span className="sf-tile-link">Nasıl çalışır <FiArrowRight aria-hidden="true" /></span>
      </Link>
    )
  }
  return (
    <Link to={productHref(product)} className="sf-tile sf-tile--product">
      {product.images?.[0] && <img src={product.images[0]} alt="" className="sf-tile-img" loading="eager" />}
      <span className="sf-tile-kicker">Yeni çıktı</span>
      <div className="sf-tile-product">
        <h2>{product.name}</h2>
        <span className="sf-tile-price">{formatPrice(product.price)}</span>
      </div>
    </Link>
  )
}

const HeroShowcase = ({ slides, newest, loading }) => (
  <div className="sf-showcase">
    <HeroBanner slides={slides} />
    <Link to="/custom" className="sf-tile sf-tile--ink">
      <span className="sf-tile-kicker">Özel baskı</span>
      <h2>Aklındaki parçayı basalım.</h2>
      <p className="sf-tile-spec sf-mono">STL · OBJ · 3MF ya da sadece bir fikir</p>
      <span className="sf-tile-link">Teklif iste <FiArrowRight aria-hidden="true" /></span>
    </Link>
    <SpotlightTile product={newest} loading={loading} />
  </div>
)

/* ------------------------------------------------------------- Bölümler */
const CategoryTiles = () => {
  const { categories, isLoading } = useCategories()
  return (
    <section className="sf-section" aria-labelledby="sf-cats-title">
      <div className="sf-section-head">
        <h2 id="sf-cats-title" className="sf-section-title">Kategoriler</h2>
      </div>
      <div className="sf-cat-grid">
        {isLoading && Array.from({ length: 4 }, (_, i) => <div key={i} className="sf-cat-media sf-skeleton" aria-hidden="true" />)}
        {categories.map((c) => (
          <Link key={c.name} to={categoryHref(c)} className="sf-cat">
            <div className="sf-cat-media">
              {c.imageUrl ? <img src={c.imageUrl} alt={c.imageAlt || ''} width="1448" height="1086" loading="lazy" decoding="async" /> : <div className="sf-cat-fallback" aria-hidden="true" />}
            </div>
            <h3>{c.name}</h3>
            <p>{c.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

const SERVICES = [
  {
    to: '/custom',
    tone: 'ink',
    title: 'Özel baskı',
    text: 'Model dosyanı gönder ya da ne istediğini anlat. Yazılı teklif, onayınla baskı.',
    facts: [['Dosya', 'STL · OBJ · 3MF'], ['Malzeme', 'PLA · PETG · TPU'], ['Adet', 'Tek parçadan itibaren']],
    cta: 'Özel baskı iste',
  },
  {
    to: '/scan',
    tone: 'light',
    title: '3D tarama',
    text: 'Kırık bir parçayı, figürü ya da objeyi tarayıp dijital modele çevirelim; istersen basalım.',
    facts: [['Başlangıç', 'Birkaç fotoğraf'], ['Teslim', 'STL · OBJ · PLY'], ['Sonrası', 'İstersen baskı']],
    cta: 'Taramaya bak',
  },
]

const ServicesDuo = () => (
  <section className="sf-section" aria-labelledby="sf-services-title">
    <div className="sf-section-head">
      <h2 id="sf-services-title" className="sf-section-title">Mağazada yoksa, biz basarız</h2>
    </div>
    <div className="sf-services">
      {SERVICES.map((sv) => (
        <article key={sv.to} className={`sf-service sf-service--${sv.tone}`}>
          <h3>{sv.title}</h3>
          <p>{sv.text}</p>
          <dl>
            {sv.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          <Link to={sv.to} className={`sf-btn ${sv.tone === 'ink' ? 'sf-btn--light' : 'sf-btn--ink'}`}>
            {sv.cta} <FiArrowRight aria-hidden="true" />
          </Link>
        </article>
      ))}
    </div>
  </section>
)

const ReviewCard = ({ review }) => {
  const name = [review.user?.firstName, review.user?.lastName?.[0] && `${review.user.lastName[0]}.`]
    .filter(Boolean).join(' ') || 'Müşteri'
  const product = review.product

  return (
    <figure className="sf-review">
      <Stars value={review.rating} count={0} compact size={13} />
      <blockquote>{review.comment}</blockquote>
      <figcaption>
        {product?.images?.[0] && <img src={product.images[0]} alt="" loading="lazy" />}
        <span>
          <strong>{name}</strong>
          {product && <Link to={productHref(product)}>{product.name}</Link>}
        </span>
      </figcaption>
    </figure>
  )
}

/* ------------------------------------------------------------- Güven */
const PROMISES = [
  { icon: FiPackage, title: 'Siparişe özel basılır', text: "Her ürün sipariş geldiğinde Bolu'daki atölyemizde, seçtiğin renkte basılır." },
  { icon: FiLock, title: 'Güvenli ödeme', text: "Kart bilgilerin PayTR'nin 3D Secure sayfasında işlenir, bize ulaşmaz." },
  { icon: FiRefreshCw, title: 'Kusurlu gelirse yenisi', text: 'Baskı hatası ya da kargo hasarında parçayı yeniden basıp gönderiyoruz.' },
  { icon: FiTruck, title: 'Takipli kargo', text: 'Şehrine göre 1–6 iş gününde, takip numarasıyla kapında.' },
]

const ratingFmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const TrustPanel = ({ stats }) => {
  const hasReviews = stats?.total > 0
  return (
    <section className={`sf-trust ${hasReviews ? '' : 'is-compact'}`} aria-label="Neden Özkan3D">
      {hasReviews && (
        <div className="sf-trust-proof">
          <p className="sf-trust-score">
            <strong>{ratingFmt.format(stats.average)}</strong>
            <span className="sf-trust-stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= Math.round(stats.average) ? 'is-on' : ''}><Star size={15} /></span>
              ))}
            </span>
          </p>
          <p className="sf-trust-count">{stats.total} doğrulanmış yorum</p>
          <p className="sf-trust-note">Yalnızca ürünü satın alıp teslim alanlar yorum yapabilir.</p>
        </div>
      )}
      <ul className="sf-trust-list">
        {PROMISES.map((p) => (
          <li key={p.title}>
            <span className="sf-trust-icon" aria-hidden="true"><p.icon /></span>
            <div>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ Sayfa */
const HomePage = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['home-bootstrap'],
    queryFn: () => getHomeBootstrapApi({ productsLimit: 20, featuredLimit: 10, reviewsLimit: 8 }),
    staleTime: 60 * 1000,
  })

  const payload = data?.data || {}
  const featured = payload.featuredProducts || []
  const latest = payload.products || []
  const reviews = payload.reviews || []
  const slides = useMemo(
    () => (payload.settings?.heroSlides || [])
      .filter((s) => s?.isActive !== false && s?.imageUrl)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [payload.settings]
  )

  const skeletons = Array.from({ length: 5 }, (_, i) => <ProductCardSkeleton key={i} />)

  return (
    <div className="sf-root sf-page">
      <SEO
        title="3D Baskı Figür, Dekor ve Aparatlar"
        description="Bolu'daki atölyemizde PLA ve PETG ile basılan figürler, dekorlar, konsol aksesuarları ve ev aparatları. Kişiye özel 3D baskı siparişi."
        url="/"
      />

      <div className="sf-container">
        <h1 className="sf-visually-hidden">Ozkan3D: 3D baskı figür, dekor ve ev aparatları</h1>
        <HeroShowcase slides={slides} newest={latest[0]} loading={isLoading} />
        <TrustPanel stats={payload.reviewStats} />

        {isError && (
          <div className="sf-notice" role="alert">
            Ürünler yüklenemedi. Bağlantını kontrol edip tekrar dene.
            <button type="button" className="sf-btn sf-btn--ghost" onClick={() => refetch()}>Tekrar dene</button>
          </div>
        )}

        <Rail title="Öne çıkanlar" href="/shop">
          {isLoading ? skeletons : featured.map((p, i) => <ProductCard key={p._id} product={p} priority={i < 5} />)}
        </Rail>

        <CategoryTiles />

        <Rail title="Yeni eklenenler" href="/shop">
          {isLoading ? skeletons : latest.map((p) => <ProductCard key={p._id} product={p} />)}
        </Rail>


        <ServicesDuo />

        {reviews.length > 0 && (
          <Rail title="Müşteriler ne diyor" itemWidth="var(--sf-review-w)" label="Müşteri yorumları">
            {reviews.map((r) => <ReviewCard key={r._id} review={r} />)}
          </Rail>
        )}
      </div>
    </div>
  )
}

export default HomePage

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiStar, FiZap, FiPackage, FiTruck, FiCheck } from 'react-icons/fi'
import { getProductsApi, getFeaturedProductsApi } from '../api/productApi'
import { getPublicReviewsApi } from '../api/reviweApi'
import { getSettingsApi } from '../api/settingsApi'
import SEO from '../components/SEO'
import FavoriteButton from '../components/FavoriteButton'
import { optimizeImage } from '../utils/imageUtils'
import './HomePage.css'
import siteLogo from '../images/logo-wordmark.png'

const resolveAssetUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const origin = apiBase.replace(/\/api\/?$/, '')

  if (url.startsWith('/')) return `${origin}${url}`
  return `${origin}/${url}`
}

const normalizeHeroSlides = (slides) => {
  if (!Array.isArray(slides)) return []

  return slides
    .filter((slide) => slide && slide.isActive !== false && String(slide.imageUrl || '').trim())
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .map((slide, index) => ({
      src: resolveAssetUrl(slide.imageUrl),
      alt: slide.altText || `Anasayfa slider ${index + 1}`,
    }))
}

/* ── 3D Tilt Card ── */
const TiltCard = ({ children, className }) => {
  const cardRef = useRef(null)
  const handleMove = (e) => {
    const card = cardRef.current; if (!card) return
    const rect = card.getBoundingClientRect()
    const rotX = (((e.clientY - rect.top) / rect.height) - 0.5) * -16
    const rotY = (((e.clientX - rect.left) / rect.width) - 0.5) * 16
    card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.03)`
  }
  const handleLeave = () => { if (cardRef.current) cardRef.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)' }
  return (
    <div ref={cardRef} className={className} onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={{ transition: 'transform 0.15s ease', willChange: 'transform' }}>
      {children}
    </div>
  )
}

/* ── Parallax ── */
const useParallax = (speed = 0.3) => {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const onScroll = () => {
      const rect = el.getBoundingClientRect()
      el.style.transform = `translateY(${(rect.top + rect.height / 2 - window.innerHeight / 2) * speed}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [speed])
  return ref
}


/* ── Product Card ── */
const ProductCard = ({ product }) => (
  <TiltCard className="product-card">
    <Link to={`/product/${product.slug || product._id}`} style={{ textDecoration: 'none', display: 'contents' }}>
      <div className="product-card-image">
        <FavoriteButton productId={product._id} className="absolute-top-right" />
        {product.images?.[0] ? (
          <img src={optimizeImage(product.images[0])} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="product-card-placeholder">3D</div>
        )}
        {product.badge && (
          <span className={`product-badge badge-${product.badge === 'İndirim' ? 'sale' : product.badge === 'Yeni' ? 'new' : 'hot'}`}>
            {product.badge}
          </span>
        )}
      </div>
      <div className="product-card-body">
        <p className="product-card-cat">{product.category}</p>
        <h3 className="product-card-name">{product.name}</h3>
        <div className="product-card-rating">
          <FiStar size={12} fill="currentColor" />
          <span>{product.rating?.toFixed(1) || '0.0'}</span>
          <span className="rating-count">({product.reviewCount || 0})</span>
        </div>
        <div className="product-card-footer">
          <div className="product-card-price">
            {product.oldPrice && <span className="price-old">{product.oldPrice}₺</span>}
            <span className="price-current">{product.price}₺</span>
          </div>
          <div className="product-colors">
            {product.colors?.slice(0, 3).map((c, i) => (
              <span key={i} className="color-dot" style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
    </Link>
  </TiltCard>
)


const features = [
  { icon: '🎯', title: 'Hassas Baskı', desc: '0.1mm katman kalınlığıyla pürüzsüz yüzey ve ultra detay.' },
  { icon: '🎨', title: 'Sınırsız Renk', desc: 'Her RAL renk koduna uygun filament seçeneği sunuyoruz.' },
  { icon: '⚡', title: 'Hızlı Üretim', desc: 'Siparişiniz 2-3 iş günü içinde hazırlanıp kargoya verilir.' },
  { icon: '🔧', title: 'Özel Tasarım', desc: 'STL dosyanı getir, biz basalım. Prototipten seri üretime.' },
  { icon: '📦', title: 'Güvenli Kargo', desc: 'Özel köpük ambalaj ile kırılmadan teslim garantisi.' },
  { icon: '💎', title: 'Kalite Garantisi', desc: '%100 memnuniyet garantisi. Sorun varsa ücretsiz yeniden baskı.' },
]

const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [heroSlides, setHeroSlides] = useState([])

  useEffect(() => {
    if (heroSlides.length <= 1) return undefined

    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [heroSlides.length])

  useEffect(() => {
    if (currentSlide >= heroSlides.length) {
      setCurrentSlide(0)
    }
  }, [currentSlide, heroSlides.length])

  useEffect(() => {
    if (heroSlides.length <= 1) return

    const nextSlideIndex = (currentSlide + 1) % heroSlides.length
    const preloader = new Image()
    preloader.src = heroSlides[nextSlideIndex].src
  }, [currentSlide, heroSlides])

  const [reviewIndex, setReviewIndex] = useState(0)
  const parallaxRef = useParallax(0.15)

  // Backend data
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

const fetchData = async () => {
  setDataLoading(true)
  try {
    const results = await Promise.all([
      getFeaturedProductsApi(),
      getProductsApi({ limit: 20 }),
      getSettingsApi(),
    ])
    setFeaturedProducts(results[0].data || [])
    setAllProducts(results[1].data || [])

    const dynamicSlides = normalizeHeroSlides(results[2]?.data?.heroSlides)
    setHeroSlides(dynamicSlides)

    try {
      const reviewRes = await getPublicReviewsApi({ status: 'approved', limit: 6 })
      setReviews(reviewRes.data || [])
    } catch {
      setReviews([])
    }
  } catch (err) {
    console.log('HomePage data hatası:', err.message)
  } finally {
    setDataLoading(false)
  }
}
  // Fallback static reviews — backend'de yorum yoksa bunlar gösterilir
  const staticReviews = [
    { user: { firstName: 'Ahmet', lastName: 'Y.' }, rating: 5, comment: 'Ejderha figürü inanılmaz kalitede geldi! Detaylar muhteşem.', product: { name: 'Ejderha Figürü' }, createdAt: new Date(Date.now() - 2 * 86400000) },
    { user: { firstName: 'Merve', lastName: 'K.' }, rating: 5, comment: 'Kulaklık standım tam istediğim gibi olmuş. Hızlı kargo süper!', product: { name: 'Kulaklık Standı' }, createdAt: new Date(Date.now() - 5 * 86400000) },
    { user: { firstName: 'Can', lastName: 'T.' }, rating: 5, comment: 'Arkadaşıma hediye aldım çok beğendi. Paketleme çok özenliydi.', product: { name: 'Mini Kaktüs Seti' }, createdAt: new Date(Date.now() - 7 * 86400000) },
    { user: { firstName: 'Zeynep', lastName: 'A.' }, rating: 4, comment: 'PS5 joystick tutucu tam oturdu, kalite çok iyi.', product: { name: 'PS5 Joystick Tutucu' }, createdAt: new Date(Date.now() - 7 * 86400000) },
    { user: { firstName: 'Emre', lastName: 'S.' }, rating: 5, comment: 'Özel tasarım servisini denedim, STL dosyamı gönderdim harika sonuç!', product: { name: 'Özel Tasarım' }, createdAt: new Date(Date.now() - 14 * 86400000) },
    { user: { firstName: 'Selin', lastName: 'B.' }, rating: 5, comment: 'Anime figürüm beklediğimden çok daha güzel geldi. Reçine baskı inanılmaz.', product: { name: 'Anime Figür' }, createdAt: new Date(Date.now() - 14 * 86400000) },
  ]

  const displayReviews = reviews.length > 0 ? reviews : staticReviews
  const reviewsPerPage = 3
  const totalPages = Math.ceil(displayReviews.length / reviewsPerPage)
  const visibleReviews = displayReviews.slice(reviewIndex * reviewsPerPage, reviewIndex * reviewsPerPage + reviewsPerPage)

  const getTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Bugün'
    if (days === 1) return 'Dün'
    if (days < 7) return `${days} gün önce`
    if (days < 30) return `${Math.floor(days / 7)} hafta önce`
    return `${Math.floor(days / 30)} ay önce`
  }

  // Marquee için ürünler — featured + all
  const marqueeProducts = [...featuredProducts, ...allProducts].slice(0, 16)

  return (
    <div className="home">
      <SEO 
        title="Ana Sayfa" 
        description="PLA'dan reçineye, figürden dekorasyona — her fikir burada hayat bulur. Yüksek kaliteli 3D baskı ürünleri, hızlı kargo, sınırsız renk seçeneği." 
      />

      {/* ── Hero Slider ── */}
      <section className="hero-slider">
        {heroSlides.length > 0 ? (
          <>
            <div className="hero-slide active" key={currentSlide}>
              <img
                src={heroSlides[currentSlide]?.src}
                alt={heroSlides[currentSlide]?.alt}
                fetchPriority="high"
                loading="eager"
                decoding="async"
              />
            </div>

            {heroSlides.length > 1 && (
              <div className="hero-slider-dots">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    className={`slider-dot ${index === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="hero-slide-placeholder">
            <p>Anasayfa slider gorselleri admin panelinden yonetilir.</p>
          </div>
        )}
      </section>



      {/* ── Marquee — Gerçek ürünler ── */}
      {marqueeProducts.length > 0 && (
        <section className="marquee-section">
          <div className="marquee-track">
            <div className="marquee-content">
              {[...marqueeProducts, ...marqueeProducts].map((p, i) => (
                <Link to={`/product/${p.slug || p._id}`} key={i} className="marquee-card">
                  <div className="marquee-card-img">
                    {p.images?.[0] ? (
                      <img src={optimizeImage(p.images[0])} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                    ) : (
                      <div className="marquee-placeholder">3D</div>
                    )}
                    {p.badge && (
                      <span className={`marquee-badge badge-${p.badge === 'İndirim' ? 'sale' : p.badge === 'Yeni' ? 'new' : 'hot'}`}>
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="marquee-card-info">
                    <p className="marquee-card-name">{p.name}</p>
                    <p className="marquee-card-price">{p.price}₺</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Features ── */}
      <section className="section features-section" ref={parallaxRef}>
        <div className="section-inner">
          <div className="section-header">
            <div>
              <p className="section-sup">Neden Biz?</p>
              <h2 className="section-title">Fark Yaratan Özellikler</h2>
            </div>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <TiltCard key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kategoriler ── */}
      <section className="section section-gray">
        <div className="section-inner">
          <div className="section-header">
            <div>
              <p className="section-sup">Ürün Kategorileri</p>
              <h2 className="section-title">Ne Arıyorsunuz?</h2>
            </div>
            <Link to="/shop" className="section-link">Tüm Ürünler <FiArrowRight size={14} /></Link>
          </div>
          <div className="categories-grid">
            {[
              { icon: '🐉', label: 'Figürler', sub: 'Ejderha, Katana & Daha Fazlası', color: '#7c3aed', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', path: '/shop?category=figurler' },
              { icon: '🎧', label: 'Kulaklık Tutucular', sub: 'Ağaç, Modern & Özel Tasarım', color: '#0ea5e9', bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', path: '/shop?category=elektronik-aksesuar' },
              { icon: '🗂️', label: 'Masa Düzenleyiciler', sub: 'Kalemlik, Stand & Organizer', color: '#16a34a', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', path: '/shop?category=masa-duzenleyici' },
              { icon: '🔑', label: 'Anahtarlıklar', sub: 'Kişiye Özel İsimli & Temalı', color: '#ea580c', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', path: '/shop?category=anahtarlik' },
              { icon: '🎨', label: 'Özel Tasarım', sub: 'Fikrini Getir, Biz Üretelim', color: '#db2777', bg: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', path: '/custom' },
              { icon: '🖨️', label: 'Tarama İşlemi', sub: 'Nesnenizin 3D Modelini Çıkarın', color: '#2563eb', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', path: '/scan' },
            ].map((cat, i) => (
              <Link to={cat.path} key={i} className="cat-card" style={{ '--cat-color': cat.color, background: cat.bg }}>
                <div className="cat-icon">{cat.icon}</div>
                <div className="cat-info">
                  <strong className="cat-label">{cat.label}</strong>
                  <span className="cat-sub">{cat.sub}</span>
                </div>
                <div className="cat-arrow"><FiArrowRight size={18} /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Öne Çıkan Ürünler — Gerçek backend verisi ── */}
      <section className="section">
        <div className="section-inner">
          <div className="section-header">
            <div>
              <p className="section-sup">En Popülerler</p>
              <h2 className="section-title">Öne Çıkan Ürünler</h2>
            </div>
            <Link to="/shop" className="section-link">Tümünü Gör <FiArrowRight size={14} /></Link>
          </div>

          {dataLoading ? (
            <div className="products-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="product-card-skeleton" />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="products-grid">
              {featuredProducts.slice(0, 6).map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          ) : allProducts.length > 0 ? (
            <div className="products-grid">
              {allProducts.slice(0, 6).map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
              <p>Henüz ürün eklenmedi.</p>
              <Link to="/shop" className="btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>
                Mağazaya Git
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Yorumlar — Gerçek + Fallback ── */}
      <section className="section section-gray">
        <div className="section-inner">
          <div className="section-header">
            <div>
              <p className="section-sup">Müşteri Deneyimleri</p>
              <h2 className="section-title">Ne Dediler?</h2>
            </div>
            <div className="reviews-overall">
              <div className="reviews-stars">
                {[1,2,3,4,5].map(s => <FiStar key={s} size={16} fill="currentColor" className="star-filled" />)}
              </div>
              <span className="reviews-overall-score">4.8 / 5</span>
              <span className="reviews-overall-count">
                {reviews.length > 0 ? `${reviews.length} değerlendirme` : '150+ değerlendirme'}
              </span>
            </div>
          </div>

          <div className="reviews-score-card">
            <div className="score-logo">
              <img src={siteLogo} alt="Ozkan3D logo" className="score-logo-image" />
              <div>
                <div className="score-stars-row">
                  {[1,2,3,4,5].map(s => <FiStar key={s} size={14} fill="currentColor" className="star-filled" />)}
                  <span className="score-number">4.8</span>
                </div>
                <p className="score-sub">Gerçek müşteri yorumları</p>
              </div>
            </div>
            <Link to="/shop" className="score-review-btn">Alışverişe Başla</Link>
          </div>

          <div className="reviews-slider">
            <div className="reviews-grid">
              {visibleReviews.map((r, i) => (
                <TiltCard key={i} className="review-card">
                  <div className="review-card-top">
                    <div className="review-avatar">
                      {r.user?.firstName?.[0]}{r.user?.lastName?.[0]}
                    </div>
                    <div className="review-meta">
                      <strong>{r.user?.firstName} {r.user?.lastName}</strong>
                      <span>{getTimeAgo(r.createdAt)}</span>
                    </div>
                    <div className="review-verified">
                      {r.isVerified && <span className="verified-badge">✓ Doğrulandı</span>}
                    </div>
                  </div>
                  <div className="review-stars">
                    {[1,2,3,4,5].map(s => (
                      <FiStar key={s} size={14} fill={s <= r.rating ? 'currentColor' : 'none'}
                        className={s <= r.rating ? 'star-filled' : 'star-empty'} />
                    ))}
                  </div>
                  <p className="review-comment">"{r.comment}"</p>
                  {r.product?.name && (
                    <span className="review-product">📦 {r.product.name}</span>
                  )}
                </TiltCard>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="reviews-pagination">
                <button className="reviews-nav-btn" onClick={() => setReviewIndex(p => Math.max(0, p - 1))} disabled={reviewIndex === 0}>‹</button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} className={`reviews-dot ${i === reviewIndex ? 'reviews-dot-active' : ''}`} onClick={() => setReviewIndex(i)} />
                ))}
                <button className="reviews-nav-btn" onClick={() => setReviewIndex(p => Math.min(totalPages - 1, p + 1))} disabled={reviewIndex === totalPages - 1}>›</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Nasıl Sipariş Verilir? ── */}
      <section className="section how-section">
        <div className="section-inner">
          <div className="section-header" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <div>
              <p className="section-sup">Kolay & Hızlı</p>
              <h2 className="section-title">Nasıl Sipariş Verilir?</h2>
            </div>
          </div>
          <div className="how-steps">
            {[
              {
                num: '01',
                icon: '🛒',
                title: 'Ürünü Seç',
                desc: 'Mağazamızdaki yüzlerce 3D baskı ürünü arasından beğenini seç. Renk, boyut ve kişiselleştirme seçeneklerini belirle.',
                color: '#2563eb',
              },
              {
                num: '02',
                icon: '🖨️',
                title: 'Biz Üretelim',
                desc: 'Siparişin onaylandıktan sonra yüksek kaliteli PLA filament ile 2-3 iş günü içinde üretim tamamlanır.',
                color: '#7c3aed',
              },
              {
                num: '03',
                icon: '📦',
                title: 'Kapında',
                desc: 'Özenle paketlenen ürünün anlaşmalı kargo şirketiyle adresine teslim edilir. Bolu\'dan Türkiye\'nin her yerine!',
                color: '#16a34a',
              },
            ].map((step, i) => (
              <div key={i} className="how-step" style={{ '--step-color': step.color }}>
                <div className="how-step-num">{step.num}</div>
                <div className="how-step-icon">{step.icon}</div>
                <h3 className="how-step-title">{step.title}</h3>
                <p className="how-step-desc">{step.desc}</p>
                {i < 2 && <div className="how-step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}

export default HomePage
import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiStar, FiZap, FiPackage, FiTruck, FiCheck } from 'react-icons/fi'
import { getProductsApi, getFeaturedProductsApi } from '../api/productApi'
import { getDashboardStatsApi } from '../api/userApi'
import { getReviewsApi } from '../api/reviweApi'
import './HomePage.css'
import { useAuth } from '../context/AuthContext'
/* ── Typewriter Hook ── */
const useTypewriter = (words, speed = 80, pause = 2000) => {
  const [text, setText] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  useEffect(() => {
    const current = words[wordIndex % words.length]
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(current.slice(0, text.length + 1))
        if (text.length + 1 === current.length) setTimeout(() => setIsDeleting(true), pause)
      } else {
        setText(current.slice(0, text.length - 1))
        if (text.length - 1 === 0) { setIsDeleting(false); setWordIndex(i => i + 1) }
      }
    }, isDeleting ? speed / 2 : speed)
    return () => clearTimeout(timeout)
  }, [text, isDeleting, wordIndex, words, speed, pause])
  return text
}

/* ── Count Up Hook ── */
const useCountUp = (target, duration = 2000, start = false) => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return count
}

/* ── Animated Canvas ── */
const AnimatedCanvas = () => {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    let W = canvas.offsetWidth
    let H = canvas.offsetHeight
    canvas.width = W
    canvas.height = H
    const shapes = Array.from({ length: 22 }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H,
      size: Math.random() * 55 + 15,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: (Math.random() - 0.5) * 0.35,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.007,
      type: i % 3,
      opacity: Math.random() * 0.1 + 0.03,
      color: i % 4 === 0 ? '#2563eb' : i % 4 === 1 ? '#93c5fd' : i % 4 === 2 ? '#1d4ed8' : '#dbeafe',
    }))
    const drawShape = (s) => {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rotation)
      ctx.globalAlpha = s.opacity; ctx.strokeStyle = s.color; ctx.lineWidth = 1.5
      if (s.type === 0) {
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6
          i === 0 ? ctx.moveTo(Math.cos(a) * s.size, Math.sin(a) * s.size) : ctx.lineTo(Math.cos(a) * s.size, Math.sin(a) * s.size)
        }
        ctx.closePath(); ctx.stroke()
      } else if (s.type === 1) {
        ctx.strokeRect(-s.size / 2, -s.size / 2, s.size, s.size)
      } else {
        ctx.beginPath(); ctx.moveTo(0, -s.size)
        ctx.lineTo(s.size * 0.866, s.size * 0.5); ctx.lineTo(-s.size * 0.866, s.size * 0.5)
        ctx.closePath(); ctx.stroke()
      }
      ctx.restore()
    }
    const animate = () => {
      ctx.clearRect(0, 0, W, H)
      shapes.forEach(s => {
        s.x += s.speedX; s.y += s.speedY; s.rotation += s.rotSpeed
        if (s.x < -100) s.x = W + 100; if (s.x > W + 100) s.x = -100
        if (s.y < -100) s.y = H + 100; if (s.y > H + 100) s.y = -100
        drawShape(s)
      })
      animId = requestAnimationFrame(animate)
    }
    animate()
    const onResize = () => { W = canvas.offsetWidth; H = canvas.offsetHeight; canvas.width = W; canvas.height = H }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize) }
  }, [])
  return <canvas ref={canvasRef} className="hero-canvas" />
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

/* ── InView ── */
const useInView = () => {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, inView]
}

/* ── Product Card ── */
const ProductCard = ({ product }) => (
  <TiltCard className="product-card">
    <Link to={`/product/${product.slug || product._id}`} style={{ textDecoration: 'none', display: 'contents' }}>
      <div className="product-card-image">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

/* ── Stat Counter ── */
const StatCounter = ({ target, suffix, label, start }) => {
  const count = useCountUp(target, 2200, start)
  return (
    <div className="hero-stat">
      <strong>{count.toLocaleString('tr-TR')}{suffix}</strong>
      <span>{label}</span>
    </div>
  )
}

const materials = [
  { name: 'PLA', color: '#27ae60', bg: '#f0fdf4', border: '#bbf7d0', desc: 'En yaygın kullanılan filament. Çevre dostu, kolay baskı, canlı renkler.', props: ['Biyobozunur', 'Kolay işlem', 'Canlı renk', 'Ekonomik'], best: 'Figürler, Dekorasyon' },
  { name: 'ABS', color: '#2980b9', bg: '#eff6ff', border: '#bfdbfe', desc: 'Yüksek dayanıklılık ve ısı direnci. Fonksiyonel parçalar için ideal.', props: ['Isıya dayanıklı', 'Sert yapı', 'Uzun ömür', 'İşlenebilir'], best: 'Fonksiyonel parçalar' },
  { name: 'PETG', color: '#8e44ad', bg: '#faf5ff', border: '#e9d5ff', desc: 'PLA\'nın kolaylığı, ABS\'in dayanıklılığı. Su geçirmez, esnek yapı.', props: ['Su geçirmez', 'Esnek', 'Şeffaf seçenek', 'Dayanıklı'], best: 'Kaplar, Mekanik parça' },
  { name: 'Reçine', color: '#e67e22', bg: '#fff7ed', border: '#fed7aa', desc: 'Ultra yüksek detay ve pürüzsüz yüzey. Koleksiyon figürleri için mükemmel.', props: ['Ultra detay', 'Pürüzsüz yüzey', 'Hassas baskı', 'Profesyonel'], best: 'Koleksiyon, Minyatür' },
]

const features = [
  { icon: '🎯', title: 'Hassas Baskı', desc: '0.1mm katman kalınlığıyla pürüzsüz yüzey ve ultra detay.' },
  { icon: '🎨', title: 'Sınırsız Renk', desc: 'Her RAL renk koduna uygun filament seçeneği sunuyoruz.' },
  { icon: '⚡', title: 'Hızlı Üretim', desc: 'Siparişiniz 2-3 iş günü içinde hazırlanıp kargoya verilir.' },
  { icon: '🔧', title: 'Özel Tasarım', desc: 'STL dosyanı getir, biz basalım. Prototipten seri üretime.' },
  { icon: '📦', title: 'Güvenli Kargo', desc: 'Özel köpük ambalaj ile kırılmadan teslim garantisi.' },
  { icon: '💎', title: 'Kalite Garantisi', desc: '%100 memnuniyet garantisi. Sorun varsa ücretsiz yeniden baskı.' },
]

const HomePage = () => {
  const typeText = useTypewriter(['Hayal Et.', 'Tasarla.', 'Dokunuş Al.', 'Üret.'], 90, 1800)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const heroRef = useRef(null)
  const cubeRef = useRef(null)
  const [statsRef, statsInView] = useInView()
  const [reviewIndex, setReviewIndex] = useState(0)
  const parallaxRef = useParallax(0.15)

  // Backend data
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const { isAuthenticated, isAdmin } = useAuth()
  useEffect(() => {
    fetchData()
  }, [])

const fetchData = async () => {
  setDataLoading(true)
  try {
    const promises = [
      getFeaturedProductsApi(),
      getProductsApi({ limit: 20 }),
    ]

    // Stats sadece admin ise çek
    if (isAuthenticated && isAdmin) {
      promises.push(getDashboardStatsApi())
    }

    const results = await Promise.all(promises)
    setFeaturedProducts(results[0].data || [])
    setAllProducts(results[1].data || [])
    if (results[2]) setStats(results[2].data)

    try {
      const reviewRes = await getReviewsApi({ status: 'approved', limit: 6 })
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

  // Stats — backend veya fallback
  const totalOrders = stats?.totalOrders || 0
  const totalUsers = stats?.totalUsers || 0
  const productCount = allProducts.length || 0

  const handleMouseMove = useCallback((e) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setMousePos({ x, y })
    if (cubeRef.current) {
      cubeRef.current.style.transform = `rotateX(${(y - 0.5) * -40}deg) rotateY(${(x - 0.5) * 40}deg)`
    }
  }, [])

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

      {/* ── Hero ── */}
      <section className="hero" ref={heroRef} onMouseMove={handleMouseMove}>
        <AnimatedCanvas />
        <div className="hero-mouse-glow" style={{ left: `${mousePos.x * 100}%`, top: `${mousePos.y * 100}%` }} />

        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-tag-wrap">
              <span className="hero-tag">
                <span className="hero-tag-dot" />
                🇹🇷 Türkiye'nin 3D Baskı Mağazası
              </span>
            </div>
            <h1 className="hero-title">
              <span className="hero-title-line">Hayal Et.</span>
              <span className="hero-title-line hero-accent">
                <span className="typewriter">{typeText}</span>
                <span className="typewriter-cursor">|</span>
              </span>
            </h1>
            <p className="hero-desc">
              PLA'dan reçineye, figürden dekorasyona — her fikir burada hayat bulur.
              Yüksek kaliteli 3D baskı ürünleri, hızlı kargo, sınırsız renk seçeneği.
            </p>
            <div className="hero-btns">
              <Link to="/shop" className="btn-primary hero-btn-primary">
                Alışverişe Başla <FiArrowRight size={16} />
              </Link>
              <Link to="/custom" className="btn-outline hero-btn-outline">
                Özel Tasarım
              </Link>
            </div>
            <div className="hero-badges">
              {['Ücretsiz Kargo', '%99 Memnuniyet', 'Hızlı Üretim'].map((b, i) => (
                <span key={i} className="hero-badge"><FiCheck size={12} /> {b}</span>
              ))}
            </div>
          </div>

          {/* 3D Visual */}
          <div className="hero-visual">
            <div className="hero-visual-rings">
              <div className="hvr hvr-1" /><div className="hvr hvr-2" /><div className="hvr hvr-3" />
            </div>
            <div className="hero-cube-wrap" style={{ perspective: '800px' }}>
              <div className="hero-cube" ref={cubeRef}>
                <div className="cube-face cube-front">3D</div>
                <div className="cube-face cube-back">OK</div>
                <div className="cube-face cube-left">🖨</div>
                <div className="cube-face cube-right">✨</div>
                <div className="cube-face cube-top" />
                <div className="cube-face cube-bottom" />
              </div>
            </div>
            <div className="hero-float-card hero-float-1">
              <span>⭐</span>
              <div><strong>4.9/5</strong><span>Puan</span></div>
            </div>
            <div className="hero-float-card hero-float-2">
              <span>🚀</span>
              <div><strong>2 Gün</strong><span>Teslimat</span></div>
            </div>
            <div className="hero-float-card hero-float-3">
              <span>🎨</span>
              <div><strong>50+</strong><span>Renk</span></div>
            </div>
          </div>
        </div>

        {/* Stats — gerçek backend verisi */}
        <div className="hero-stats-bar" ref={statsRef}>
          <div className="hero-stats-inner">
            <StatCounter target={Math.max(totalUsers, 100)} suffix="+" label="Mutlu Müşteri" start={statsInView} />
            <div className="hero-stat-sep" />
            <StatCounter target={Math.max(productCount, 50)} suffix="+" label="Ürün Çeşidi" start={statsInView} />
            <div className="hero-stat-sep" />
            <StatCounter target={99} suffix="%" label="Memnuniyet" start={statsInView} />
            <div className="hero-stat-sep" />
            <StatCounter target={Math.max(totalOrders, 100)} suffix="+" label="Tamamlanan Proje" start={statsInView} />
          </div>
        </div>

        {/* Feature Strip */}
        <div className="hero-features">
          <div className="hero-feature"><FiTruck size={16} /><span>500₺ Üzeri Ücretsiz Kargo</span></div>
          <div className="hero-feature-sep" />
          <div className="hero-feature"><FiPackage size={16} /><span>Güvenli Paketleme</span></div>
          <div className="hero-feature-sep" />
          <div className="hero-feature"><FiZap size={16} /><span>2-3 Gün Üretim</span></div>
          <div className="hero-feature-sep" />
          <div className="hero-feature"><FiStar size={16} /><span>%99 Memnuniyet</span></div>
        </div>
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
                      <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
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

      {/* ── Malzemeler ── */}
      <section className="section section-gray">
        <div className="section-inner">
          <div className="section-header">
            <div>
              <p className="section-sup">Üretim Kalitesi</p>
              <h2 className="section-title">Malzemelerimiz</h2>
            </div>
            <Link to="/shop" className="section-link">Ürünleri Keşfet <FiArrowRight size={14} /></Link>
          </div>
          <div className="materials-grid">
            {materials.map((m, i) => (
              <TiltCard key={i} className="material-card" style={{ '--m-color': m.color, '--m-bg': m.bg, '--m-border': m.border }}>
                <div className="material-card-top">
                  <div className="material-badge" style={{ background: m.bg, border: `1.5px solid ${m.border}`, color: m.color }}>{m.name}</div>
                  <div className="material-dot-big" style={{ background: m.color }} />
                </div>
                <p className="material-card-desc">{m.desc}</p>
                <div className="material-props">
                  {m.props.map((p, pi) => (
                    <span key={pi} className="material-prop">{p}</span>
                  ))}
                </div>
                <div className="material-card-footer">
                  <span className="material-best-label">En İyi:</span>
                  <span className="material-best-value">{m.best}</span>
                </div>
              </TiltCard>
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
              <div className="score-logo-icon"><span>O</span></div>
              <div>
                <p className="score-brand">Ozkan3D.design</p>
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

      {/* ── Banner ── */}
      <section className="section">
        <div className="section-inner">
          <div className="banner">
            <div className="banner-bg-shapes">
              <div className="banner-shape banner-shape-1" />
              <div className="banner-shape banner-shape-2" />
              <div className="banner-shape banner-shape-3" />
            </div>
            <div className="banner-content">
              <span className="banner-tag">⚡ Özel Tasarım Hizmeti</span>
              <h2 className="banner-title">Kendi modelini mi getirmek istiyorsun?</h2>
              <p className="banner-desc">STL dosyanı yükle, biz senin için basalım. Prototipten seri üretime kadar yanındayız.</p>
              <Link to="/custom" className="btn-white">Teklif Al <FiArrowRight size={16} /></Link>
            </div>
            <div className="banner-visual">
              <div className="banner-cube">
                <div className="bcube-face bcube-front">STL</div>
                <div className="bcube-face bcube-back" />
                <div className="bcube-face bcube-left" />
                <div className="bcube-face bcube-right" />
                <div className="bcube-face bcube-top" />
                <div className="bcube-face bcube-bottom" />
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

export default HomePage
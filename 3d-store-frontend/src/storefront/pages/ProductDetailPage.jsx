import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiHeart, FiShare2, FiMinus, FiPlus, FiCheck, FiTruck, FiRefreshCw, FiChevronRight } from 'react-icons/fi'
import { getProductApi, getProductsApi } from '../../api/productApi'
import { getProductReviewsApi, createReviewApi } from '../../api/reviweApi'
import { checkPurchaseApi } from '../../api/orderApi'
import { useCart } from '../../context/CartContext'
import { useFavorite } from '../../context/FavoriteContext'
import { useAuth } from '../../context/AuthContext'
import SEO from '../../components/SEO'
import ProductCard from '../components/ProductCard'
import Rail from '../components/Rail'
import Stars, { Star } from '../components/Stars'
import VoxelMark from '../components/VoxelMark'
import usePalette, { formatLeadDays, productLeadDays } from '../usePalette'
import {
  categoryHref, subcategoryHref, formatPrice, formatPrintTime,
  formatDimensions, discountPercent,
} from '../catalog'
import '../storefront.css'
import './ProductDetailPage.css'

const SITE = 'https://www.ozkan3d.com.tr'


const dateFmt = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' })

/* ---------------------------------------------------------------- Galeri */
const Gallery = ({ images, active, onSelect, name }) => {
  if (!images.length) return <div className="sf-pd-main sf-skeleton" aria-hidden="true" />

  return (
    <div className="sf-pd-gallery">
      <div className="sf-pd-main">
        <img src={images[active]?.url} alt={`${name}, görsel ${active + 1}`} fetchPriority="high" />
      </div>
      {images.length > 1 && (
        <div className="sf-pd-thumbs" role="list" aria-label="Ürün görselleri">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              role="listitem"
              className={`sf-pd-thumb ${i === active ? 'is-active' : ''}`}
              onClick={() => onSelect(i)}
              aria-label={`Görsel ${i + 1}`}
              aria-current={i === active}
            >
              <img src={img.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------- Baskı künyesi */
const PrintSpec = ({ product }) => {
  const rows = [
    ['Malzeme', (product.material || []).join(' · ') || null],
    ['Baskı süresi', formatPrintTime(product.printTime)],
    ['Ölçüler (G × Y × D)', formatDimensions(product.dimensions)],
    ['Ağırlık', product.weight ? `${product.weight} g` : null],
    ['Zorluk', product.difficulty || null],
    ['Stok kodu', product.sku || null],
  ].filter(([, v]) => v)

  if (!rows.length) return null

  return (
    <section className="sf-pd-block" aria-labelledby="sf-spec-title">
      <div className="sf-spec-head">
        <VoxelMark size={22} />
        <h2 id="sf-spec-title">Baskı künyesi</h2>
      </div>
      <dl className="sf-spec">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/* -------------------------------------------------------------- Yorumlar */
const ReviewForm = ({ productId, onDone }) => {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [state, setState] = useState({ sending: false, error: '', sent: false })

  const submit = async (e) => {
    e.preventDefault()
    if (!comment.trim()) {
      setState({ sending: false, error: 'Yorum alanı boş olamaz.', sent: false })
      return
    }
    setState({ sending: true, error: '', sent: false })
    try {
      await createReviewApi({ productId, rating, comment: comment.trim() })
      setState({ sending: false, error: '', sent: true })
      onDone?.()
    } catch (err) {
      setState({ sending: false, error: err.response?.data?.message || 'Yorum gönderilemedi.', sent: false })
    }
  }

  if (state.sent) {
    return <p className="sf-pd-note"><FiCheck aria-hidden="true" /> Yorumun alındı. Onaylandıktan sonra burada görünecek.</p>
  }

  return (
    <form className="sf-review-form" onSubmit={submit}>
      <fieldset>
        <legend>Puanın</legend>
        <div className="sf-rate">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={n <= rating ? 'is-on' : ''}
              onClick={() => setRating(n)}
              aria-label={`${n} yıldız`}
              aria-pressed={n === rating}
            >
              <Star size={22} />
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor="sf-review-text">Yorumun</label>
      <textarea
        id="sf-review-text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={4}
        placeholder="Baskı kalitesi, renk, paketleme…"
      />
      <div className="sf-review-form-foot">
        <span className="sf-mono">{comment.length}/500</span>
        <button type="submit" className="sf-btn sf-btn--ink" disabled={state.sending}>
          {state.sending ? 'Gönderiliyor…' : 'Yorumu gönder'}
        </button>
      </div>
      {state.error && <p className="sf-pd-error" role="alert">{state.error}</p>}
    </form>
  )
}

const Reviews = ({ product, reviews, canReview }) => {
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? reviews : reviews.slice(0, 6)

  return (
    <section className="sf-pd-block" aria-labelledby="sf-reviews-title">
      <div className="sf-reviews-head">
        <h2 id="sf-reviews-title">
          {product.reviewCount > 0 ? (
            <>
              <Star size={20} />
              {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1 }).format(product.rating)}
              <span aria-hidden="true">·</span>
              {product.reviewCount} değerlendirme
            </>
          ) : 'Henüz değerlendirme yok'}
        </h2>
        {canReview && !showForm && (
          <button type="button" className="sf-btn sf-btn--ghost" onClick={() => setShowForm(true)}>
            Yorum yaz
          </button>
        )}
      </div>

      {showForm && <ReviewForm productId={product._id} onDone={() => {}} />}

      {reviews.length > 0 ? (
        <div className="sf-reviews">
          {visible.map((r) => (
            <article key={r._id} className="sf-pd-review">
              <header>
                <span className="sf-avatar is-user" aria-hidden="true">
                  {(r.user?.firstName?.[0] || '?').toUpperCase()}
                </span>
                <span>
                  <strong>{r.user?.firstName} {r.user?.lastName?.[0] ? `${r.user.lastName[0]}.` : ''}</strong>
                  <span className="sf-pd-review-date">{dateFmt.format(new Date(r.createdAt))}</span>
                </span>
              </header>
              <Stars value={r.rating} count={0} compact />
              <p>{r.comment}</p>
              {r.isVerified && <span className="sf-mono sf-verified">Satın aldı</span>}
            </article>
          ))}
        </div>
      ) : (
        <p className="sf-pd-muted">
          Bu ürünü satın aldıysan ilk yorumu sen yaz. Yorumlar sadece ürünü teslim alan müşterilerden gelir.
        </p>
      )}

      {reviews.length > 6 && !expanded && (
        <button type="button" className="sf-btn sf-btn--ghost" onClick={() => setExpanded(true)}>
          {reviews.length} yorumun tamamını göster
        </button>
      )}
    </section>
  )
}

/* ------------------------------------------------------- Satın alma kartı */
const BuyBox = ({ product, colors, selectedColor, onColor, onAdded }) => {
  const { addToCart } = useCart()
  const { colorName, leadDays } = usePalette()
  const groups = product.optionGroups || []
  const pers = product.personalization?.enabled ? product.personalization : null

  const [material, setMaterial] = useState(product.material?.[0] || null)
  // Fiyatlı seçenekler: her gruptan ilk değer varsayılan
  const [chosen, setChosen] = useState(() => Object.fromEntries(groups.map((g) => [g.id, g.values?.[0]?.id])))
  const [note, setNote] = useState('')
  const [qty, setQty] = useState(1)
  const [status, setStatus] = useState({ state: 'idle', error: '' })

  const madeToOrder = product.madeToOrder !== false
  const stock = Number(product.stock) || 0
  const available = madeToOrder || stock > 0
  const max = madeToOrder ? 20 : Math.max(1, Math.min(stock, 20))
  const maxLen = pers?.maxLength || 30

  const selectedOptions = groups
    .map((g) => {
      const v = g.values?.find((x) => x.id === chosen[g.id])
      return v ? { groupId: g.id, valueId: v.id, group: g.name, value: v.label, priceDelta: Number(v.priceDelta) || 0 } : null
    })
    .filter(Boolean)
  const noteText = note.trim()
  const unitPrice = (Number(product.price) || 0)
    + selectedOptions.reduce((sum, o) => sum + o.priceDelta, 0)
    + (pers && noteText ? Number(pers.priceDelta) || 0 : 0)
  // İndirim oranı taban fiyattan; eski fiyat seçilen seçeneğe göre kaydırılır
  const off = discountPercent(product.price, product.oldPrice)
  const oldUnit = off ? unitPrice + (Number(product.oldPrice) - Number(product.price)) : null
  const leadRange = productLeadDays(product, leadDays)
  const lead = formatLeadDays(leadRange.min, leadRange.max)

  const add = async () => {
    if (pers?.required && !noteText) {
      setStatus({ state: 'error', error: `${pers.label} alanını doldurun.` })
      return
    }
    setStatus({ state: 'adding', error: '' })
    try {
      await addToCart(product, qty, material, selectedColor, {
        options: selectedOptions,
        personalization: pers && noteText ? { label: pers.label, text: noteText } : null,
        unitPrice,
      })
      setStatus({ state: 'added', error: '' })
      onAdded?.()
    } catch (err) {
      setStatus({ state: 'error', error: err.message || 'Sepete eklenemedi, tekrar dene.' })
    }
  }

  const delta = (n) => {
    if (n > 0) return `+${formatPrice(n)}`
    if (n < 0) return `−${formatPrice(-n)}`
    return null
  }

  return (
    <div className="sf-buy">
      <p className="sf-buy-price" aria-live="polite">
        <strong>{formatPrice(unitPrice)}</strong>
        {off && <s>{formatPrice(oldUnit)}</s>}
        {off && <span className="sf-buy-off">%{off} indirim</span>}
      </p>

      {colors.length > 0 && (
        <fieldset className="sf-opt">
          <legend>Renk: <span>{selectedColor ? colorName(selectedColor) : 'Seç'}</span></legend>
          <div className="sf-swatches">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className={`sf-swatch ${c === selectedColor ? 'is-active' : ''}`}
                style={{ '--swatch': c }}
                onClick={() => onColor(c)}
                aria-label={colorName(c)}
                title={colorName(c)}
                aria-pressed={c === selectedColor}
              />
            ))}
          </div>
        </fieldset>
      )}

      {groups.map((g) => (
        <fieldset key={g.id} className="sf-opt">
          <legend>{g.name}</legend>
          <div className="sf-chips">
            {(g.values || []).map((v) => {
              const on = chosen[g.id] === v.id
              const d = delta(Number(v.priceDelta) || 0)
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`sf-chip ${on ? 'is-active' : ''}`}
                  onClick={() => setChosen((c) => ({ ...c, [g.id]: v.id }))}
                  aria-pressed={on}
                >
                  {v.label}
                  {d && <small className="sf-chip-delta">{d}</small>}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      {product.material?.length > 0 && (
        <fieldset className="sf-opt">
          <legend>Malzeme</legend>
          <div className="sf-chips">
            {product.material.map((m) => (
              <button
                key={m}
                type="button"
                className={`sf-chip ${m === material ? 'is-active' : ''}`}
                onClick={() => setMaterial(m)}
                aria-pressed={m === material}
              >
                {m}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {pers && (
        <div className="sf-opt sf-personal">
          <label htmlFor="sf-personal">
            {pers.label}
            {!pers.required && <span> (isteğe bağlı)</span>}
            {Number(pers.priceDelta) > 0 && <small className="sf-chip-delta">+{formatPrice(pers.priceDelta)}</small>}
          </label>
          <input
            id="sf-personal"
            className="sf-input"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, maxLen))}
            maxLength={maxLen}
            placeholder="Buraya yazın"
          />
          <small className="sf-personal-count">{note.length}/{maxLen}</small>
        </div>
      )}

      <div className="sf-buy-row">
        <div className="sf-stepper" role="group" aria-label="Adet">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Azalt"><FiMinus /></button>
          <output aria-live="polite">{qty}</output>
          <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} aria-label="Artır"><FiPlus /></button>
        </div>
        <button
          type="button"
          className="sf-btn sf-btn--accent sf-buy-cta"
          onClick={add}
          disabled={!available || status.state === 'adding'}
        >
          {!available ? 'Stokta yok' : status.state === 'adding' ? 'Ekleniyor…' : 'Sepete ekle'}
        </button>
      </div>

      {status.state === 'added' && (
        <p className="sf-pd-note" role="status">
          <FiCheck aria-hidden="true" /> Sepete eklendi. <Link to="/cart">Sepete git</Link>
        </p>
      )}
      {status.state === 'error' && <p className="sf-pd-error" role="alert">{status.error}</p>}

      <ul className="sf-buy-facts">
        <li>
          <FiTruck aria-hidden="true" />
          <span>
            <strong>
              {madeToOrder ? 'Siparişe özel basılır' : stock > 0 && stock <= 5 ? `Hazır stokta, son ${stock} adet` : 'Hazır stokta'}
            </strong>
            {lead} içinde kargoya verilir. Kargo ücreti şehre göre ödeme adımında hesaplanır.
          </span>
        </li>
        <li>
          <FiRefreshCw aria-hidden="true" />
          <span>
            <strong>Baskı hatasında yenisi</strong>
            Hasarlı ya da kusurlu gelen parçayı yeniden basıp gönderiyoruz.
          </span>
        </li>
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ Sayfa */
const ProductDetailPage = () => {
  const { id: slug } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorite()

  const productQuery = useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductApi(slug),
    retry: (count, err) => err?.response?.status !== 404 && count < 1,
  })
  const product = productQuery.data?.data

  const reviewsQuery = useQuery({
    queryKey: ['reviews', product?._id],
    queryFn: () => getProductReviewsApi(product._id),
    enabled: Boolean(product?._id),
  })

  const purchaseQuery = useQuery({
    queryKey: ['purchased', product?._id],
    queryFn: () => checkPurchaseApi(product._id),
    enabled: Boolean(product?._id && isAuthenticated),
  })

  const relatedQuery = useQuery({
    queryKey: ['related', product?.category],
    queryFn: () => getProductsApi({ category: product.category, limit: 12 }),
    enabled: Boolean(product?.category),
  })

  // Görsel ve renk eşleşmesi
  const images = useMemo(() => {
    if (!product) return []
    if (product.imageVariants?.length) return product.imageVariants.filter((v) => v?.url)
    return (product.images || []).map((url, i) => ({ url, color: product.colors?.[i] || null }))
  }, [product])

  const colors = product?.colors || []

  // Seçim ürüne bağlı: başka ürüne geçilince varsayılanlara döner
  const [selection, setSelection] = useState({ id: null, image: 0, color: null })
  const isCurrent = selection.id === product?._id
  const activeImage = isCurrent ? selection.image : 0
  const selectedColor = isCurrent ? selection.color : (colors[0] || null)

  const pickColor = (c) => {
    const idx = images.findIndex((img) => img.color === c)
    setSelection({ id: product._id, image: idx >= 0 ? idx : activeImage, color: c })
  }

  const pickImage = (i) => {
    setSelection({ id: product._id, image: i, color: images[i]?.color || selectedColor })
  }

  if (productQuery.isLoading) {
    return (
      <div className="sf-root sf-page">
        <div className="sf-container sf-pd-loading" role="status" aria-label="Ürün yükleniyor">
          <VoxelMark size={56} loop />
        </div>
      </div>
    )
  }

  if (productQuery.isError || !product) {
    return (
      <div className="sf-root sf-page">
        <div className="sf-container sf-pd-missing">
          <h1>Bu ürünü bulamadık.</h1>
          <p>Ürün kaldırılmış ya da bağlantı hatalı olabilir.</p>
          <Link to="/shop" className="sf-btn sf-btn--ink">Mağazaya dön</Link>
        </div>
      </div>
    )
  }

  const favored = isFavorite(product._id)
  const reviews = reviewsQuery.data?.data || []
  const related = (relatedQuery.data?.data || []).filter((p) => p._id !== product._id)
  const canReview = Boolean(purchaseQuery.data?.hasPurchased)

  const onFavorite = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    toggleFavorite(product._id)
  }

  const onShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: product.name, url })
      else await navigator.clipboard.writeText(url)
    } catch {
      // kullanıcı paylaşımı iptal etti
    }
  }

  return (
    <div className="sf-root sf-page">
      <SEO
        title={product.metaTitle || product.name}
        description={product.metaDesc || product.shortDesc || product.description?.slice(0, 155)}
        image={product.images?.[0]}
        url={`/product/${product.slug}`}
        type="product"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          image: product.images,
          description: product.description,
          sku: product.sku || undefined,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'TRY',
            price: product.price,
            availability: product.madeToOrder !== false || product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `${SITE}/product/${product.slug}`,
          },
          ...(product.reviewCount > 0 && {
            aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount },
          }),
        }}
      />

      <div className="sf-container sf-container--narrow">
        <nav className="sf-crumbs" aria-label="Konum">
          <Link to="/shop">Mağaza</Link>
          <FiChevronRight aria-hidden="true" />
          <Link to={categoryHref(product.category)}>{product.category}</Link>
          {product.subcategory && (
            <>
              <FiChevronRight aria-hidden="true" />
              <Link to={subcategoryHref(product.subcategory, product.category)}>{product.subcategory}</Link>
            </>
          )}
        </nav>

        <header className="sf-pd-head">
          <div>
            <h1>{product.name}</h1>
            <p className="sf-pd-sub">
              {product.reviewCount > 0 && (
                <>
                  <a href="#sf-reviews-title"><Stars value={product.rating} count={product.reviewCount} /></a>
                  <span aria-hidden="true">·</span>
                </>
              )}
              {product.badge && <span className="sf-pd-badge">{product.badge}</span>}
              <span>{product.shortDesc}</span>
            </p>
          </div>
          <div className="sf-pd-tools">
            <button type="button" className="sf-tool" onClick={onShare}>
              <FiShare2 aria-hidden="true" /> Paylaş
            </button>
            <button type="button" className={`sf-tool ${favored ? 'is-on' : ''}`} onClick={onFavorite} aria-pressed={favored}>
              <FiHeart aria-hidden="true" /> {favored ? 'Kaydedildi' : 'Kaydet'}
            </button>
          </div>
        </header>

        <div className="sf-pd-layout">
          <div className="sf-pd-left">
            <Gallery images={images} active={activeImage} onSelect={pickImage} name={product.name} />

            <section className="sf-pd-block" aria-labelledby="sf-desc-title">
              <h2 id="sf-desc-title">Ürün hakkında</h2>
              <p className="sf-pd-desc">{product.description}</p>
              {product.tags?.length > 0 && (
                <ul className="sf-tags" aria-label="Etiketler">
                  {product.tags.map((t) => <li key={t}>{t}</li>)}
                </ul>
              )}
            </section>

            <PrintSpec product={product} />
          </div>

          <aside className="sf-pd-right" aria-label="Satın alma">
            <BuyBox
              key={product._id}
              product={product}
              colors={colors}
              selectedColor={selectedColor}
              onColor={pickColor}
              onAdded={() => queryClient.invalidateQueries({ queryKey: ['cart'] })}
            />
          </aside>
        </div>

        <Reviews product={product} reviews={reviews} canReview={canReview} />

        {related.length > 0 && (
          <Rail title={`${product.category} kategorisinden`} href={categoryHref(product.category)}>
            {related.map((p) => <ProductCard key={p._id} product={p} />)}
          </Rail>
        )}
      </div>
    </div>
  )
}

export default ProductDetailPage

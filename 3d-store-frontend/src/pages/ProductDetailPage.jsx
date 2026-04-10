import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useFavorite } from '../context/FavoriteContext'
import { useAuth } from '../context/AuthContext'
import {
  FiStar, FiShoppingCart, FiHeart, FiShare2,
  FiTruck, FiShield, FiRefreshCw, FiChevronRight,
  FiMinus, FiPlus, FiCheck, FiAlertTriangle, FiSend
} from 'react-icons/fi'
import { getProductApi, getProductsApi } from '../api/productApi'
import { getProductReviewsApi, createReviewApi } from '../api/reviweApi'
import { checkPurchaseApi } from '../api/orderApi'
import { optimizeImage } from '../utils/imageUtils'
import './ProductDetailPage.css'

const getRelatedImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('cloudinary.com')) return url

  if (url.includes('/upload/f_auto,q_auto:best,dpr_auto/')) return url
  if (url.includes('/upload/f_auto,q_auto/')) {
    return url.replace('/upload/f_auto,q_auto/', '/upload/f_auto,q_auto:best,dpr_auto/')
  }

  return optimizeImage(url).replace('/upload/f_auto,q_auto/', '/upload/f_auto,q_auto:best,dpr_auto/')
}

const ProductDetailPage = () => {
  const { id } = useParams()
  const { addToCart } = useCart()
  const { toggleFavorite, isFavorite } = useFavorite()
  const { isAuthenticated } = useAuth()

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [activeTab, setActiveTab] = useState('description')
  const [activeImg, setActiveImg] = useState(0)
  const [favoriting, setFavoriting] = useState(false)

  // Yorum formu
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [hoveredStar, setHoveredStar] = useState(0)
  const [reviewPage, setReviewPage] = useState(1)
  const [hasPurchased, setHasPurchased] = useState(false)
  const REVIEWS_PER_PAGE = 5

  const fetchProduct = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getProductApi(id)
      const p = res.data
      setProduct(p)
      setSelectedColor(p.colors?.[0] || null)
      setSelectedMaterial(p.material?.[0] || null)

      const related = await getProductsApi({ category: p.category, limit: 4 })
      setRelatedProducts(related.data.filter(rp => rp._id !== p._id).slice(0, 3))

      try {
        const reviewRes = await getProductReviewsApi(p._id)
        setReviews(reviewRes.data || [])
      } catch {
        setReviews([])
      }

      if (isAuthenticated) {
        try {
          const purchaseRes = await checkPurchaseApi(p._id)
          setHasPurchased(purchaseRes.hasPurchased)
        } catch {
          setHasPurchased(false)
        }
      }
    } catch {
      setError('Ürün bulunamadı.')
    } finally {
      setLoading(false)
    }
  }, [id, isAuthenticated])

  useEffect(() => {
    fetchProduct()
    window.scrollTo(0, 0)
  }, [fetchProduct])

  const handleAddToCart = async () => {
    if (!product) return
    await addToCart(product, quantity, selectedMaterial, selectedColor)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      alert('Favorilere eklemek için giriş yapmalısınız.')
      return
    }
    setFavoriting(true)
    await toggleFavorite(product._id)
    setFavoriting(false)
  }

  const handleShare = async () => {
    try {
      await navigator.share({ title: product.name, url: window.location.href })
    } catch {
      navigator.clipboard.writeText(window.location.href)
      alert('Link kopyalandı!')
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      setReviewError('Yorum yapmak için giriş yapmalısınız.')
      return
    }
    if (!reviewForm.comment.trim()) {
      setReviewError('Lütfen yorum yazın.')
      return
    }

    setReviewLoading(true)
    setReviewError('')
    try {
      await createReviewApi({
        productId: product._id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      })
      setReviewSuccess(true)
      setReviewForm({ rating: 5, comment: '' })
      setTimeout(() => setReviewSuccess(false), 4000)
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Yorum gönderilemedi.')
    } finally {
      setReviewLoading(false)
    }
  }

  if (loading) return (
    <div className="detail-page">
      <div className="detail-loading">
        <div className="detail-skeleton-gallery" />
        <div className="detail-skeleton-info">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-price" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-short" />
        </div>
      </div>
    </div>
  )

  if (error || !product) return (
    <div className="detail-page">
      <div className="detail-error">
        <FiAlertTriangle size={40} />
        <h2>Ürün Bulunamadı</h2>
        <p>Aradığınız ürün mevcut değil veya kaldırılmış.</p>
        <Link to="/shop" className="btn-primary">Mağazaya Dön</Link>
      </div>
    </div>
  )

  const discountPercent = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : null

  const favorited = isFavorite(product._id)

  return (
    <div className="detail-page">

      {/* Breadcrumb */}
      <div className="detail-breadcrumb">
        <div className="detail-breadcrumb-inner">
          <Link to="/">Ana Sayfa</Link>
          <FiChevronRight size={14} />
          <Link to="/shop">Mağaza</Link>
          <FiChevronRight size={14} />
          <span>{product.name}</span>
        </div>
      </div>

      {/* Main */}
      <div className="detail-main">
        <div className="detail-inner">

          {/* Sol — Görseller */}
          <div className="detail-gallery">
            <div className="gallery-main">
              <div className="gallery-main-img">
                {product.images?.length > 0 ? (
                  <img src={product.images[activeImg]} alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="gallery-placeholder">3D</div>
                )}
                {product.badge && (
                  <span className={`product-badge badge-${
                    product.badge === 'İndirim' ? 'sale' :
                    product.badge === 'Yeni' ? 'new' : 'hot'
                  }`}>{product.badge}</span>
                )}
              </div>
            </div>
            {product.images?.length > 1 && (
              <div className="gallery-thumbs">
                {product.images.map((img, i) => (
                  <div key={i}
                    className={`gallery-thumb ${activeImg === i ? 'gallery-thumb-active' : ''}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img src={img} alt={`${product.name} ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sağ — Bilgiler */}
          <div className="detail-info">
            <div className="detail-info-top">
              <p className="detail-category">{product.category}</p>
              <h1 className="detail-name">{product.name}</h1>

              <div className="detail-rating">
                <div className="rating-stars">
                  {[1,2,3,4,5].map(s => (
                    <FiStar key={s} size={16}
                      fill={s <= Math.round(product.rating) ? 'currentColor' : 'none'}
                      className={s <= Math.round(product.rating) ? 'star-filled' : 'star-empty'} />
                  ))}
                </div>
                <span className="rating-value">{product.rating?.toFixed(1) || '0.0'}</span>
                <span className="rating-count">({product.reviewCount || 0} değerlendirme)</span>
              </div>

              <div className="detail-price">
                {product.oldPrice && <span className="detail-price-old">{product.oldPrice}₺</span>}
                <span className="detail-price-current">{product.price}₺</span>
                {discountPercent && <span className="detail-discount">%{discountPercent} İndirim</span>}
              </div>

              {product.shortDesc && (
                <p className="detail-short-desc">{product.shortDesc}</p>
              )}

              {product.stock <= 5 && product.stock > 0 && (
                <p className="detail-low-stock">
                  <FiAlertTriangle size={14} /> Son {product.stock} ürün!
                </p>
              )}
              {product.stock === 0 && <p className="detail-out-of-stock">Stokta Yok</p>}
            </div>

            <div className="detail-divider" />

            {/* Renk */}
            {product.colors?.length > 0 && (
              <div className="detail-option">
                <div className="detail-option-header">
                  <span className="detail-option-label">Renk</span>
                  <span className="detail-option-value" style={{
                    background: selectedColor, width: 16, height: 16,
                    borderRadius: '50%', display: 'inline-block', border: '1px solid #eee'
                  }} />
                </div>
                <div className="color-options">
                  {product.colors.map((color, i) => (
                    <button key={i}
                      className={`color-option ${selectedColor === color ? 'color-option-active' : ''}`}
                      style={{ background: color }}
                      onClick={() => {
                        setSelectedColor(color)
                        if (product.images && product.images[i]) {
                          setActiveImg(i)
                        }
                      }}
                    >
                      {selectedColor === color && <FiCheck size={12} color="#fff" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Malzeme */}
            {product.material?.length > 0 && (
              <div className="detail-option">
                <div className="detail-option-header">
                  <span className="detail-option-label">Malzeme</span>
                  <span className="detail-option-selected">{selectedMaterial}</span>
                </div>
                <div className="material-options">
                  {product.material.map((mat, i) => (
                    <button key={i}
                      className={`material-option ${selectedMaterial === mat ? 'material-option-active' : ''}`}
                      onClick={() => setSelectedMaterial(mat)}
                    >
                      {mat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-divider" />

            {/* Adet */}
            <div className="detail-option">
              <span className="detail-option-label">Adet</span>
              <div className="quantity-wrap">
                <button className="qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                  <FiMinus size={14} />
                </button>
                <span className="qty-value">{quantity}</span>
                <button className="qty-btn"
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                >
                  <FiPlus size={14} />
                </button>
              </div>
            </div>

            {/* Butonlar */}
            <div className="detail-actions">
              <button
                className={`btn-add-cart ${addedToCart ? 'btn-add-cart-success' : ''}`}
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                {addedToCart
                  ? <><FiCheck size={18} /> Sepete Eklendi!</>
                  : <><FiShoppingCart size={18} /> Sepete Ekle</>
                }
              </button>
              <button
                className={`btn-wishlist ${favorited ? 'btn-wishlist-active' : ''}`}
                onClick={handleToggleFavorite}
                disabled={favoriting}
                title={favorited ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
              >
                <FiHeart size={20} fill={favorited ? 'currentColor' : 'none'} />
              </button>
              <button className="btn-share" onClick={handleShare} title="Paylaş">
                <FiShare2 size={20} />
              </button>
            </div>

            {/* Kargo */}
            <div className="detail-meta">
              <div className="detail-meta-item">
                <FiTruck size={16} />
                <span><strong>Kargo bilgisi</strong> — ücret ve teslim süresi ödeme adımında adrese göre hesaplanır</span>
              </div>
              <div className="detail-meta-item">
                <FiShield size={16} />
                <span><strong>Ödeme güvenliği</strong> — işlemler iyzico altyapısı ile korunur</span>
              </div>
              <div className="detail-meta-item">
                <FiRefreshCw size={16} />
                <span><strong>İade ve değişim</strong> — talepler ürün durumuna göre destek ekibi tarafından değerlendirilir</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs-section">
        <div className="detail-tabs-inner">
          <div className="detail-tabs">
            {['description', 'specs', 'reviews'].map(tab => (
              <button key={tab}
                className={`detail-tab ${activeTab === tab ? 'detail-tab-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'description' ? 'Açıklama' :
                 tab === 'specs' ? 'Teknik Özellikler' :
                 `Değerlendirmeler (${reviews.length})`}
              </button>
            ))}
          </div>

          <div className="detail-tab-content">

            {/* Açıklama */}
            {activeTab === 'description' && (
              <div className="tab-description">
                {product.description ? (
                  <p>{product.description}</p>
                ) : (
                  <>
                    <p><strong>{product.name}</strong>, yüksek kaliteli {product.material?.join(' ve ')} malzeme kullanılarak üretilmiş premium bir 3D baskı ürünüdür.</p>
                    <ul className="desc-list">
                      <li>Yüksek çözünürlüklü FDM baskı teknolojisi</li>
                      <li>UV dayanımlı malzeme</li>
                      <li>El yapımı finishing detayları</li>
                      <li>2-3 iş günü üretim süresi</li>
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* Teknik */}
            {activeTab === 'specs' && (
              <div className="tab-specs">
                <table className="specs-table">
                  <tbody>
                    <tr><td>Malzeme</td><td>{product.material?.join(', ') || '—'}</td></tr>
                    <tr><td>Baskı Teknolojisi</td><td>FDM / SLA</td></tr>
                    <tr><td>Katman Kalınlığı</td><td>0.1mm</td></tr>
                    <tr><td>Renk Seçeneği</td><td>{product.colors?.length || 0} renk</td></tr>
                    {product.dimensions?.width && (
                      <tr><td>Boyutlar</td><td>{product.dimensions.width} x {product.dimensions.height} x {product.dimensions.depth} cm</td></tr>
                    )}
                    {product.weight && <tr><td>Ağırlık</td><td>{product.weight}g</td></tr>}
                    {product.printTime && <tr><td>Baskı Süresi</td><td>{product.printTime} saat</td></tr>}
                    <tr><td>Zorluk</td><td>{product.difficulty || 'Orta'}</td></tr>
                    <tr><td>Kargo</td><td>1-3 iş günü</td></tr>
                    <tr><td>Stok</td><td>{product.stock} adet</td></tr>
                    {product.sku && <tr><td>SKU</td><td>{product.sku}</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* Yorumlar */}
            {activeTab === 'reviews' && (
              <div className="tab-reviews">

                {/* Özet */}
                <div className="reviews-summary">
                  <div className="reviews-score">
                    <span className="score-big">{product.rating?.toFixed(1) || '0.0'}</span>
                    <div className="rating-stars">
                      {[1,2,3,4,5].map(s => (
                        <FiStar key={s} size={18}
                          fill={s <= Math.round(product.rating) ? 'currentColor' : 'none'}
                          className={s <= Math.round(product.rating) ? 'star-filled' : 'star-empty'} />
                      ))}
                    </div>
                    <span className="score-count">{product.reviewCount || 0} değerlendirme</span>
                  </div>
                </div>

                {/* Yorum Listesi */}
                <div className="reviews-list">
                  {reviews.length > 0 ? reviews
                    .slice((reviewPage - 1) * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE)
                    .map((r, i) => (
                    <div key={i} className="review-item">
                      <div className="review-header">
                        <div className="review-avatar">
                          {r.user?.firstName?.[0]}{r.user?.lastName?.[0]}
                        </div>
                        <div className="review-meta">
                          <strong>{r.user?.firstName} {r.user?.lastName}</strong>
                          <span>{new Date(r.createdAt).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div className="rating-stars small">
                          {[1,2,3,4,5].map(s => (
                            <FiStar key={s} size={12}
                              fill={s <= r.rating ? 'currentColor' : 'none'}
                              className={s <= r.rating ? 'star-filled' : 'star-empty'} />
                          ))}
                        </div>
                        {r.isVerified && <span className="verified-badge">✓ Doğrulandı</span>}
                      </div>
                      <p className="review-comment">{r.comment}</p>
                    </div>
                  )) : (
                    <div className="reviews-empty">
                      <p>Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {reviews.length > REVIEWS_PER_PAGE && (
                  <div className="reviews-pagination">
                    <button
                      className="reviews-page-btn"
                      disabled={reviewPage === 1}
                      onClick={() => setReviewPage(p => p - 1)}
                    >
                      ← Önceki
                    </button>
                    <span className="reviews-page-info">
                      {reviewPage} / {Math.ceil(reviews.length / REVIEWS_PER_PAGE)}
                    </span>
                    <button
                      className="reviews-page-btn"
                      disabled={reviewPage >= Math.ceil(reviews.length / REVIEWS_PER_PAGE)}
                      onClick={() => setReviewPage(p => p + 1)}
                    >
                      Sonraki →
                    </button>
                  </div>
                )}

                {/* Yorum Formu */}
                <div className="review-form-section">
                  <h3 className="review-form-title">Yorum Yap</h3>

                  {!isAuthenticated ? (
                    <div className="review-login-notice">
                      <p>Yorum yapmak için <Link to="/login" className="auth-link">giriş yapın</Link>.</p>
                    </div>
                  ) : !hasPurchased ? (
                    <div className="review-login-notice">
                      <p>🛝 Bu ürüne yorum yapabilmek için önce satın almış olmanız gerekmektedir.</p>
                    </div>
                  ) : reviewSuccess ? (
                    <div className="review-success">
                      <FiCheck size={20} />
                      <p>Yorumunuz alındı! Admin onayından sonra yayınlanacak.</p>
                    </div>
                  ) : (
                    <form className="review-form" onSubmit={handleSubmitReview}>

                      {/* Puan */}
                      <div className="review-form-group">
                        <label>Puanınız</label>
                        <div className="review-star-picker">
                          {[1,2,3,4,5].map(s => (
                            <button
                              key={s}
                              type="button"
                              className="review-star-btn"
                              onMouseEnter={() => setHoveredStar(s)}
                              onMouseLeave={() => setHoveredStar(0)}
                              onClick={() => setReviewForm(p => ({ ...p, rating: s }))}
                            >
                              <FiStar
                                size={28}
                                fill={(hoveredStar || reviewForm.rating) >= s ? 'currentColor' : 'none'}
                                className={(hoveredStar || reviewForm.rating) >= s ? 'star-filled' : 'star-empty'}
                              />
                            </button>
                          ))}
                          <span className="review-rating-label">
                            {['', 'Çok Kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel'][hoveredStar || reviewForm.rating]}
                          </span>
                        </div>
                      </div>

                      {/* Yorum */}
                      <div className="review-form-group">
                        <label>Yorumunuz</label>
                        <textarea
                          className="review-textarea"
                          value={reviewForm.comment}
                          onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                          placeholder="Bu ürün hakkında düşüncelerinizi paylaşın..."
                          rows={4}
                          maxLength={500}
                        />
                        <small className="review-char-count">{reviewForm.comment.length}/500</small>
                      </div>

                      {reviewError && (
                        <div className="review-error">{reviewError}</div>
                      )}

                      <button
                        type="submit"
                        className="review-submit-btn"
                        disabled={reviewLoading}
                      >
                        {reviewLoading
                          ? <><FiRefreshCw size={15} className="spin" /> Gönderiliyor...</>
                          : <><FiSend size={15} /> Yorum Gönder</>
                        }
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* İlgili Ürünler */}
      {relatedProducts.length > 0 && (
        <div className="detail-related">
          <div className="detail-related-inner">
            <h2 className="related-title">Benzer Ürünler</h2>
            <div className="related-grid">
              {relatedProducts.map(p => (
                <Link key={p._id} to={`/product/${p.slug || p._id}`} className="related-card">
                  <div className="related-card-img">
                    {p.images?.[0] ? (
                      <img
                        src={getRelatedImageUrl(p.images[0])}
                        alt={p.name}
                        className="related-card-image"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="related-placeholder">3D</div>
                    )}
                  </div>
                  <div className="related-card-body">
                    <p className="related-card-cat">{p.category}</p>
                    <h3 className="related-card-name">{p.name}</h3>
                    <div className="related-card-footer">
                      <span className="price-current">{p.price}₺</span>
                      <div className="rating-stars small">
                        <FiStar size={12} fill="currentColor" className="star-filled" />
                        <span>{p.rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductDetailPage
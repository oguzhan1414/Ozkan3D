import { Link, useNavigate } from 'react-router-dom'
import { FiHeart } from 'react-icons/fi'
import { useFavorite } from '../../context/FavoriteContext'
import { useAuth } from '../../context/AuthContext'
import { formatPrice, productHref, specLine, discountPercent } from '../catalog'
import Stars from './Stars'
import './ProductCard.css'

const ProductCard = ({ product, priority = false }) => {
  const { isFavorite, toggleFavorite } = useFavorite()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const favored = isFavorite(product._id)
  const [first, second] = product.images || []
  const spec = specLine(product)
  const off = discountPercent(product.price, product.oldPrice)
  // Fiyatlı seçenek varsa en düşük kombinasyon gösterilir
  const groups = product.optionGroups || []
  const minDelta = groups.reduce((sum, g) => sum + Math.min(0, ...(g.values || []).map((v) => Number(v.priceDelta) || 0)), 0)
  const hasRange = groups.some((g) => (g.values || []).some((v) => Number(v.priceDelta)))
  const fromPrice = (Number(product.price) || 0) + minDelta
  const outOfStock = Number(product.stock) <= 0

  const onHeart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } })
      return
    }
    toggleFavorite(product._id)
  }

  return (
    <Link to={productHref(product)} className="sf-card">
      <div className="sf-card-media">
        {first ? (
          <img
            src={first}
            alt={product.name}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="sf-card-img"
          />
        ) : (
          <div className="sf-card-img sf-card-img--empty" aria-hidden="true" />
        )}
        {second && (
          <img src={second} alt="" loading="lazy" decoding="async" className="sf-card-img sf-card-img--alt" aria-hidden="true" />
        )}

        {(outOfStock || product.badge) && (
          <span className={`sf-card-badge ${outOfStock ? 'is-muted' : ''}`}>
            {outOfStock ? 'Tükendi' : product.badge}
          </span>
        )}

        <button
          type="button"
          className={`sf-heart ${favored ? 'is-on' : ''}`}
          onClick={onHeart}
          aria-pressed={favored}
          aria-label={favored ? `${product.name} favorilerden çıkar` : `${product.name} favorilere ekle`}
        >
          <FiHeart />
        </button>
      </div>

      <div className="sf-card-body">
        <div className="sf-card-row">
          <h3 className="sf-card-title">{product.name}</h3>
          {product.reviewCount > 0 && <Stars value={product.rating} count={product.reviewCount} compact />}
        </div>
        <p className="sf-card-meta">
          {product.subcategory || product.category}
          {spec && <span className="sf-mono"> · {spec}</span>}
        </p>
        <p className="sf-card-price">
          <strong>{formatPrice(fromPrice)}</strong>
          {hasRange && <span className="sf-card-from">&apos;den başlayan</span>}
          {off && (
            <>
              <s>{formatPrice(product.oldPrice)}</s>
              <span className="sf-card-off">%{off}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  )
}

export const ProductCardSkeleton = () => (
  <div className="sf-card" aria-hidden="true">
    <div className="sf-card-media sf-skeleton" />
    <div className="sf-card-body">
      <div className="sf-skeleton" style={{ height: 14, width: '70%', marginTop: 4 }} />
      <div className="sf-skeleton" style={{ height: 12, width: '45%', marginTop: 8 }} />
      <div className="sf-skeleton" style={{ height: 14, width: '30%', marginTop: 8 }} />
    </div>
  </div>
)

export default ProductCard

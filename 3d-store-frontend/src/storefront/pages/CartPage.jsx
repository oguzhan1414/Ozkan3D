import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMinus, FiPlus, FiX, FiCheck, FiLock } from 'react-icons/fi'
import { useCart, lineKey } from '../../context/CartContext'
import LineOptions from '../components/LineOptions'
import { useAuth } from '../../context/AuthContext'
import { validateCouponApi } from '../../api/couponApi'
import VoxelMark from '../components/VoxelMark'
import { formatPrice } from '../catalog'
import '../storefront.css'
import './CartPage.css'

const CouponBox = ({ subtotal, coupon, onApply, onRemove }) => {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [state, setState] = useState({ loading: false, error: '' })

  if (coupon) {
    return (
      <div className="sf-coupon-applied">
        <span>
          <FiCheck aria-hidden="true" />
          <strong className="sf-mono">{coupon.code}</strong>
          {coupon.freeShipping ? ' ücretsiz kargo' : ' uygulandı'}
        </span>
        <button type="button" className="sf-link-btn" onClick={onRemove}>Kaldır</button>
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" className="sf-link-btn sf-coupon-toggle" onClick={() => setOpen(true)}>
        Kupon kodun var mı?
      </button>
    )
  }

  const apply = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setState({ loading: true, error: '' })
    try {
      const res = await validateCouponApi(code.trim(), subtotal)
      onApply(res.data)
      setState({ loading: false, error: '' })
    } catch (err) {
      setState({ loading: false, error: err.response?.data?.message || 'Bu kupon kodu geçerli değil.' })
    }
  }

  return (
    <form className="sf-coupon" onSubmit={apply}>
      <label htmlFor="sf-coupon-code" className="sf-visually-hidden">Kupon kodu</label>
      <input
        id="sf-coupon-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Kupon kodu"
        autoComplete="off"
        autoFocus
        aria-invalid={Boolean(state.error)}
        aria-describedby={state.error ? 'sf-coupon-error' : undefined}
      />
      <button type="submit" className="sf-btn sf-btn--ghost" disabled={state.loading || !code.trim()}>
        {state.loading ? '…' : 'Uygula'}
      </button>
      {state.error && <p id="sf-coupon-error" className="sf-field-error" role="alert">{state.error}</p>}
    </form>
  )
}

const CartPage = () => {
  const { items, removeFromCart, updateQuantity, totalItems, totalPrice } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [coupon, setCoupon] = useState(null)

  const discount = coupon?.discount || 0
  const total = Math.max(0, totalPrice - discount)

  const goCheckout = () => {
    const state = { couponCode: coupon?.code, discount }
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } })
      return
    }
    navigate('/checkout', { state })
  }

  if (items.length === 0) {
    return (
      <div className="sf-root sf-page">
        <div className="sf-container sf-container--narrow sf-cart-empty">
          <VoxelMark size={44} />
          <h1>Sepetin boş.</h1>
          <p>Beğendiğin ürünleri sepete ekle, siparişe özel basıp gönderelim.</p>
          <Link to="/shop" className="sf-btn sf-btn--ink">Mağazaya göz at</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="sf-root sf-page">
      <div className="sf-container sf-container--narrow">
        <header className="sf-cart-head">
          <h1>Sepet</h1>
          <p>{totalItems} ürün</p>
        </header>

        <div className="sf-cart-layout">
          <ul className="sf-cart-list" aria-label="Sepetteki ürünler">
            {items.map((item, i) => (
              <li key={lineKey(item) || i} className="sf-line">
                <Link to={`/product/${item.slug || item.productId}`} className="sf-line-img" tabIndex={-1} aria-hidden="true">
                  {item.image && <img src={item.image} alt="" loading="lazy" />}
                </Link>

                <div className="sf-line-info">
                  <Link to={`/product/${item.slug || item.productId}`} className="sf-line-name">{item.name}</Link>
                  <LineOptions item={item} />
                  <p className="sf-line-meta">
                    <span>{formatPrice(item.price)} / adet</span>
                  </p>

                  <div className="sf-line-actions">
                    <div className="sf-stepper sf-stepper--sm" role="group" aria-label={`${item.name} adedi`}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Azalt"
                      >
                        <FiMinus />
                      </button>
                      <output>{item.quantity}</output>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, item.quantity + 1)}
                        aria-label="Artır"
                      >
                        <FiPlus />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="sf-link-btn sf-line-remove"
                      onClick={() => removeFromCart(item)}
                    >
                      Kaldır
                    </button>
                  </div>
                </div>

                <p className="sf-line-total">{formatPrice((item.price || 0) * item.quantity)}</p>
              </li>
            ))}
          </ul>

          <aside className="sf-summary" aria-label="Sipariş özeti">
            <h2>Özet</h2>
            <dl className="sf-summary-rows">
              <div><dt>Ara toplam</dt><dd>{formatPrice(totalPrice)}</dd></div>
              {discount > 0 && <div className="is-discount"><dt>Kupon indirimi</dt><dd>−{formatPrice(discount)}</dd></div>}
              <div>
                <dt>Kargo</dt>
                <dd className="sf-summary-muted">{coupon?.freeShipping ? 'Ücretsiz' : 'Adrese göre hesaplanır'}</dd>
              </div>
            </dl>

            <CouponBox
              subtotal={totalPrice}
              coupon={coupon}
              onApply={setCoupon}
              onRemove={() => setCoupon(null)}
            />

            <div className="sf-summary-total">
              <span>Toplam</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <p className="sf-summary-note">Kargo ücreti ödeme adımında eklenir.</p>

            <button type="button" className="sf-btn sf-btn--accent sf-summary-cta" onClick={goCheckout}>
              {isAuthenticated ? 'Ödemeye geç' : 'Giriş yap ve öde'}
            </button>
            <p className="sf-summary-secure"><FiLock aria-hidden="true" /> Kart ödemeleri PayTR güvencesiyle</p>
          </aside>
        </div>

        <Link to="/shop" className="sf-link-btn sf-cart-back">Alışverişe devam et</Link>
      </div>
    </div>
  )
}

export default CartPage

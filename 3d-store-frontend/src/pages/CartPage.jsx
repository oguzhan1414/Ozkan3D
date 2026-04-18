import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiTrash2, FiMinus, FiPlus, FiShoppingCart,
  FiArrowLeft, FiTag, FiTruck, FiShield, FiChevronRight, FiCheck
} from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { validateCouponApi } from '../api/couponApi'
import './CartPage.css'

const CartPage = () => {
  const { items: cartItems, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice } = useCart()
  const navigate = useNavigate()

  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponData, setCouponData] = useState(null)
  const [couponError, setCouponError] = useState('')

  const hasCouponFreeShipping = Boolean(couponData?.freeShipping)
  const shippingCost = hasCouponFreeShipping ? 0 : null
  const discount = couponData?.discount || 0
  const grandTotal = totalPrice - discount + (shippingCost || 0)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError('')
    setCouponData(null)
    try {
      const res = await validateCouponApi(couponCode, totalPrice)
      setCouponData(res.data)
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Geçersiz kupon kodu.')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponData(null)
    setCouponCode('')
    setCouponError('')
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-breadcrumb">
          <div className="cart-breadcrumb-inner">
            <Link to="/">Ana Sayfa</Link>
            <FiChevronRight size={14} />
            <span>Sepetim</span>
          </div>
        </div>
        <div className="cart-empty">
          <div className="cart-empty-icon">
            <FiShoppingCart size={48} />
          </div>
          <h2>Sepetiniz Boş</h2>
          <p>Henüz sepetinize ürün eklemediniz.</p>
          <Link to="/shop" className="btn-primary">
            Alışverişe Başla <FiArrowLeft size={16} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-page">

      {/* Breadcrumb */}
      <div className="cart-breadcrumb">
        <div className="cart-breadcrumb-inner">
          <Link to="/">Ana Sayfa</Link>
          <FiChevronRight size={14} />
          <span>Sepetim</span>
        </div>
      </div>

      <div className="cart-inner">
        <div className="cart-header">
          <h1 className="cart-title">
            Sepetim <span className="cart-count">({totalItems} ürün)</span>
          </h1>
          <button className="cart-clear-btn" onClick={clearCart}>
            <FiTrash2 size={14} />
            Sepeti Temizle
          </button>
        </div>

        <div className="cart-layout">

          {/* Sol — Ürünler */}
          <div className="cart-items">

            {/* Kargo Bildirimi */}
            {!hasCouponFreeShipping && (
              <div className="cart-shipping-notice">
                <FiTruck size={16} />
                <div className="shipping-notice-content">
                  <span>
                    Kargo ücreti teslimat iline ve kargo seçiminize göre ödeme adımında netleşir.
                  </span>
                </div>
              </div>
            )}

            {hasCouponFreeShipping && (
              <div className="cart-shipping-notice cart-shipping-success">
                <FiTruck size={16} />
                <span>Bu siparişte kupon avantajı ile ücretsiz kargo uygulanacak.</span>
              </div>
            )}

            {/* Ürün Listesi */}
            {cartItems.map((item, index) => (
              <div key={item._id || item.productId || index} className="cart-item">
                <div className="cart-item-image">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                    />
                  ) : (
                    <div className="cart-item-placeholder">3D</div>
                  )}
                </div>

                <div className="cart-item-info">
                  <h3 className="cart-item-name">{item.name}</h3>
                  <div className="cart-item-variants">
                    {item.color && (
                      <span className="variant-tag">
                        <span
                          className="variant-color-dot"
                          style={{ background: item.color }}
                        />
                        {item.color}
                      </span>
                    )}
                    {item.material && (
                      <span className="variant-tag">{item.material}</span>
                    )}
                  </div>
                  <span className="cart-item-unit-price">{item.price}₺ / adet</span>
                  {item.stock > 0 && item.quantity >= item.stock && (
                    <span className="cart-item-stock-warn">⚠️ Maksimum stok adedına ulaşıldı ({item.stock} adet)</span>
                  )}
                  {item.stock > 0 && item.stock <= 3 && item.quantity < item.stock && (
                    <span className="cart-item-stock-warn">⚠️ Son {item.stock} ürün!</span>
                  )}
                </div>

                <div className="cart-item-controls">
                  <div className="qty-wrap">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1, item.material, item.color)}
                      disabled={item.quantity <= 1}
                    >
                      <FiMinus size={13} />
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.material, item.color)}
                    >
                      <FiPlus size={13} />
                    </button>
                  </div>
                  <div className="cart-item-price">
                    <span className="price-current">
                      {(item.price * item.quantity).toFixed(0)}₺
                    </span>
                  </div>
                  <button
                    className="cart-remove-btn"
                    onClick={() => removeFromCart(item.productId, item.material, item.color)}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

          </div>

          {/* Sağ — Özet */}
          <div className="cart-summary">

            {/* Kupon */}
            <div className="cart-coupon">
              <h4 className="summary-section-title">
                <FiTag size={15} /> İndirim Kodu
              </h4>

              {couponData ? (
                <div className="coupon-applied">
                  <div className="coupon-applied-info">
                    <FiCheck size={14} />
                    <span>
                      <strong>{couponData.code}</strong> uygulandı
                      {couponData.discount > 0 && ` — ${couponData.discount.toFixed(0)}₺ indirim`}
                      {couponData.freeShipping && ' — Ücretsiz kargo'}
                    </span>
                  </div>
                  <button className="coupon-remove-btn" onClick={handleRemoveCoupon}>
                    <FiTrash2 size={13} />
                  </button>
                </div>
              ) : (
                <div className="coupon-form">
                  <input
                    type="text"
                    placeholder="Kupon kodunu girin"
                    className="coupon-input"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                  />
                  <button
                    className="coupon-btn"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading}
                  >
                    {couponLoading ? '...' : 'Uygula'}
                  </button>
                </div>
              )}

              {couponError && (
                <p className="coupon-error">{couponError}</p>
              )}
            </div>

            {/* Özet */}
            <div className="cart-summary-box">
              <h3 className="summary-title">Sipariş Özeti</h3>

              <div className="summary-rows">
                <div className="summary-row">
                  <span>Ara Toplam</span>
                  <span>{totalPrice.toFixed(0)}₺</span>
                </div>
                {discount > 0 && (
                  <div className="summary-row summary-discount">
                    <span>İndirim</span>
                    <span>-{discount.toFixed(0)}₺</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>Kargo</span>
                  <span className={shippingCost === 0 ? 'summary-free' : ''}>
                    {shippingCost === 0 ? 'Ücretsiz' : 'Adrese göre hesaplanır'}
                  </span>
                </div>
                <div className="summary-divider" />
                <div className="summary-row summary-total">
                  <span>{shippingCost === null ? 'Kargo Hariç Toplam' : 'Toplam'}</span>
                  <span>{grandTotal.toFixed(0)}₺</span>
                </div>
              </div>

              <button
                className="btn-checkout"
                onClick={() => navigate('/checkout', {
                  state: {
                    couponCode: couponData?.code,
                    discount,
                    shippingCost: shippingCost ?? undefined,
                    grandTotal,
                  }
                })}
              >
                Ödemeye Geç
              </button>

              <Link to="/shop" className="btn-continue">
                <FiArrowLeft size={15} />
                Alışverişe Devam Et
              </Link>

              <div className="summary-secure">
                <FiShield size={14} />
                <span>Güvenli ödeme — PayTR altyapısı</span>
              </div>

              <div className="summary-payments">
                <div className="payment-badge payment-paytr"><span>PayTR</span></div>
                <div className="payment-badge payment-visa"><span>VISA</span></div>
                <div className="payment-badge payment-mc">
                  <span className="mc-circle mc-red" />
                  <span className="mc-circle mc-orange" />
                </div>
                <div className="payment-badge payment-troy"><span>TROY</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
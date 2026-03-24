import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  FiChevronRight, FiLock, FiTruck, FiCreditCard,
  FiCheck, FiShield, FiMapPin
} from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { createOrderApi } from '../api/orderApi'
import './CheckoutPage.css'

const steps = ['Adres', 'Kargo', 'Ödeme']

const CheckoutPage = () => {
  const { items: cartItems, totalPrice, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // CartPage'den gelen kupon verisi
  const { couponCode, discount = 0, shippingCost: cartShippingCost } = location.state || {}

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [address, setAddress] = useState({
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    phone: user?.phone || '',
    city: '', district: '', neighborhood: '',
    address: '', addressTitle: 'Ev',
  })

  const [shipping, setShipping] = useState('standard')
  const [payment, setPayment] = useState('card')
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '', installment: '1' })
  const [saveAddress, setSaveAddress] = useState(false)
  const [customerNote, setCustomerNote] = useState('')

  // Kayıtlı adresler
  const savedAddresses = user?.addresses || []
  const [selectedSavedAddress, setSelectedSavedAddress] = useState(null)

  const shippingCost = totalPrice >= 500 ? 0 : shipping === 'express' ? 79 : 49
  const grandTotal = totalPrice - discount + shippingCost

  const shippingOptions = [
    { id: 'standard', label: 'Standart Kargo', desc: '3-5 iş günü', price: totalPrice >= 500 ? 'Ücretsiz' : '49₺', icon: '🚚' },
    { id: 'express', label: 'Hızlı Kargo', desc: '1-2 iş günü', price: '79₺', icon: '⚡' },
  ]

  const handleAddressChange = e => setAddress(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleCardChange = e => {
    const { name, value } = e.target
    if (name === 'number') {
      const v = value.replace(/\D/g, '').slice(0, 16)
      setCard(p => ({ ...p, number: v.replace(/(.{4})/g, '$1 ').trim() }))
    } else if (name === 'expiry') {
      const v = value.replace(/\D/g, '').slice(0, 4)
      setCard(p => ({ ...p, expiry: v.length > 2 ? `${v.slice(0,2)}/${v.slice(2)}` : v }))
    } else if (name === 'cvv') {
      setCard(p => ({ ...p, cvv: value.replace(/\D/g, '').slice(0, 3) }))
    } else {
      setCard(p => ({ ...p, [name]: value }))
    }
  }

  const handleSelectSavedAddress = (addr) => {
    setSelectedSavedAddress(addr._id)
    setAddress({
      fullName: addr.fullName,
      phone: addr.phone,
      city: addr.city,
      district: addr.district,
      neighborhood: addr.neighborhood || '',
      address: addr.address,
      addressTitle: addr.title || 'Ev',
    })
  }

  const validateStep = () => {
    setError('')
    if (step === 0) {
      if (!address.fullName || !address.phone || !address.city || !address.district || !address.address) {
        setError('Lütfen tüm zorunlu alanları doldurun.')
        return false
      }
    }
    if (step === 2 && payment === 'card') {
      if (!card.number || !card.name || !card.expiry || !card.cvv) {
        setError('Lütfen kart bilgilerini eksiksiz doldurun.')
        return false
      }
    }
    return true
  }

  const nextStep = () => {
    if (!validateStep()) return
    if (step === 2) {
      handleOrder()
      return
    }
    setStep(p => p + 1)
  }

  const handleOrder = async () => {
    setLoading(true)
    setError('')
    try {
      const orderData = {
        items: cartItems.map(item => ({
          product: item.productId,
          name: item.name,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
          material: item.material,
          color: item.color,
        })),
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          city: address.city,
          district: address.district,
          neighborhood: address.neighborhood,
          address: address.address,
          title: address.addressTitle,
        },
        paymentMethod: payment,
        shippingMethod: shipping,
        shippingCost,
        subtotal: totalPrice,
        discount,
        totalPrice: grandTotal,
        couponCode: couponCode || undefined,
        customerNote: customerNote || undefined,
        // Kart bilgileri (iyzico'ya gönderilecek)
        ...(payment === 'card' && {
          cardDetails: {
            cardNumber: card.number.replace(/\s/g, ''),
            cardHolderName: card.name,
            expireMonth: card.expiry.split('/')[0],
            expireYear: `20${card.expiry.split('/')[1]}`,
            cvc: card.cvv,
            installment: Number(card.installment),
          }
        })
      }

      const res = await createOrderApi(orderData)
      const order = res.data

      // Sepeti temizle
      await clearCart()

      // Başarı sayfasına yönlendir
      navigate('/order-success', {
        state: {
          orderId: order._id,
          orderNo: order.orderNo,
          totalPrice: order.totalPrice,
          items: order.items,
          shippingAddress: order.shippingAddress,
        }
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Sipariş oluşturulamadı. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="checkout-page">
        <div className="checkout-empty">
          <h2>Giriş Yapın</h2>
          <p>Ödeme yapabilmek için giriş yapmalısınız.</p>
          <Link to="/login" state={{ from: { pathname: '/checkout' } }} className="btn-primary">
            Giriş Yap
          </Link>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-empty">
          <h2>Sepetiniz boş</h2>
          <p>Ödeme yapabilmek için sepetinize ürün ekleyin.</p>
          <Link to="/shop" className="btn-primary">Alışverişe Başla</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-page">

      {/* Breadcrumb */}
      <div className="checkout-breadcrumb">
        <div className="checkout-breadcrumb-inner">
          <Link to="/">Ana Sayfa</Link>
          <FiChevronRight size={13} />
          <Link to="/cart">Sepet</Link>
          <FiChevronRight size={13} />
          <span>Ödeme</span>
          <div className="checkout-secure">
            <FiLock size={13} />
            <span>Güvenli Ödeme</span>
          </div>
        </div>
      </div>

      <div className="checkout-inner">

        {/* Sol */}
        <div className="checkout-left">

          {/* Steps */}
          <div className="checkout-steps">
            {steps.map((s, i) => (
              <div key={i} className={`checkout-step ${i === step ? 'step-active' : ''} ${i < step ? 'step-done' : ''}`}>
                <div className="checkout-step-circle">
                  {i < step ? <FiCheck size={13} /> : <span>{i + 1}</span>}
                </div>
                <span>{s}</span>
                {i < steps.length - 1 && <div className="checkout-step-line" />}
              </div>
            ))}
          </div>

          {error && <div className="checkout-error">{error}</div>}

          {/* Step 0 — Adres */}
          {step === 0 && (
            <div className="checkout-card">
              <div className="checkout-card-header">
                <FiMapPin size={18} />
                <h3>Teslimat Adresi</h3>
              </div>

              {/* Kayıtlı adresler */}
              {savedAddresses.length > 0 && (
                <div className="saved-addresses">
                  <p className="saved-addr-title">Kayıtlı Adresleriniz</p>
                  <div className="saved-addr-list">
                    {savedAddresses.map(addr => (
                      <button
                        key={addr._id}
                        className={`saved-addr-item ${selectedSavedAddress === addr._id ? 'saved-addr-active' : ''}`}
                        onClick={() => handleSelectSavedAddress(addr)}
                      >
                        <FiMapPin size={14} />
                        <div>
                          <strong>{addr.title}</strong>
                          <span>{addr.address}, {addr.district}/{addr.city}</span>
                        </div>
                        {selectedSavedAddress === addr._id && <FiCheck size={14} className="addr-check" />}
                      </button>
                    ))}
                  </div>
                  <div className="saved-addr-divider">veya yeni adres girin</div>
                </div>
              )}

              <div className="address-title-tabs">
                {['Ev', 'İş', 'Diğer'].map(t => (
                  <button
                    key={t}
                    className={`address-title-tab ${address.addressTitle === t ? 'tab-active' : ''}`}
                    onClick={() => setAddress(p => ({ ...p, addressTitle: t }))}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="address-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ad Soyad *</label>
                    <input name="fullName" value={address.fullName} onChange={handleAddressChange} placeholder="Ad Soyad" className="form-input-plain" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefon *</label>
                    <input name="phone" value={address.phone} onChange={handleAddressChange} placeholder="0500 000 00 00" className="form-input-plain" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">İl *</label>
                    <input name="city" value={address.city} onChange={handleAddressChange} placeholder="İstanbul" className="form-input-plain" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">İlçe *</label>
                    <input name="district" value={address.district} onChange={handleAddressChange} placeholder="Kadıköy" className="form-input-plain" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mahalle</label>
                  <input name="neighborhood" value={address.neighborhood} onChange={handleAddressChange} placeholder="Mahalle adı" className="form-input-plain" />
                </div>

                <div className="form-group">
                  <label className="form-label">Açık Adres *</label>
                  <textarea name="address" value={address.address} onChange={handleAddressChange} placeholder="Sokak, bina no, daire no..." className="form-textarea" rows={3} />
                </div>

                <div className="form-group">
                  <label className="form-label">Sipariş Notu (isteğe bağlı)</label>
                  <textarea value={customerNote} onChange={e => setCustomerNote(e.target.value)} placeholder="Özel isteklerinizi belirtebilirsiniz..." className="form-textarea" rows={2} />
                </div>

                <label className="form-checkbox">
                  <input type="checkbox" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} />
                  <span className="checkbox-custom" />
                  <span className="checkbox-text">Bu adresi kaydet</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 1 — Kargo */}
          {step === 1 && (
            <div className="checkout-card">
              <div className="checkout-card-header">
                <FiTruck size={18} />
                <h3>Kargo Seçimi</h3>
              </div>
              <div className="shipping-options">
                {shippingOptions.map(opt => (
                  <button
                    key={opt.id}
                    className={`shipping-option ${shipping === opt.id ? 'shipping-active' : ''}`}
                    onClick={() => setShipping(opt.id)}
                  >
                    <span className="shipping-icon">{opt.icon}</span>
                    <div className="shipping-info">
                      <strong>{opt.label}</strong>
                      <span>{opt.desc}</span>
                    </div>
                    <span className="shipping-price">{opt.price}</span>
                    <div className={`shipping-radio ${shipping === opt.id ? 'radio-active' : ''}`}>
                      {shipping === opt.id && <div className="radio-dot" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="checkout-address-summary">
                <div className="address-summary-header">
                  <FiMapPin size={15} />
                  <span>Teslimat Adresi</span>
                  <button className="address-change-btn" onClick={() => setStep(0)}>Değiştir</button>
                </div>
                <p className="address-summary-text">
                  <strong>{address.fullName}</strong> — {address.address}, {address.district}/{address.city}
                </p>
              </div>
            </div>
          )}

          {/* Step 2 — Ödeme */}
          {step === 2 && (
            <div className="checkout-card">
              <div className="checkout-card-header">
                <FiCreditCard size={18} />
                <h3>Ödeme</h3>
                <div className="checkout-iyzico-badge">
                  <FiShield size={12} />
                  <span>iyzico güvencesi</span>
                </div>
              </div>

              <div className="payment-tabs">
                {[
                  { id: 'card', label: '💳 Kredi / Banka Kartı' },
                  { id: 'transfer', label: '🏦 Havale / EFT' },
                ].map(t => (
                  <button
                    key={t.id}
                    className={`payment-tab ${payment === t.id ? 'payment-tab-active' : ''}`}
                    onClick={() => setPayment(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {payment === 'card' && (
                <div className="card-form">
                  <div className="card-preview">
                    <div className="card-preview-inner">
                      <div className="card-chip" />
                      <div className="card-number-preview">
                        {(card.number || '•••• •••• •••• ••••')}
                      </div>
                      <div className="card-bottom">
                        <div>
                          <p className="card-label">Kart Sahibi</p>
                          <p className="card-value">{card.name || 'AD SOYAD'}</p>
                        </div>
                        <div>
                          <p className="card-label">Son Kullanma</p>
                          <p className="card-value">{card.expiry || 'AA/YY'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kart Numarası</label>
                    <input name="number" value={card.number} onChange={handleCardChange} placeholder="0000 0000 0000 0000" className="form-input-plain" maxLength={19} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kart Üzerindeki Ad</label>
                    <input name="name" value={card.name} onChange={handleCardChange} placeholder="AD SOYAD" className="form-input-plain" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Son Kullanma Tarihi</label>
                      <input name="expiry" value={card.expiry} onChange={handleCardChange} placeholder="AA/YY" className="form-input-plain" maxLength={5} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CVV</label>
                      <input name="cvv" value={card.cvv} onChange={handleCardChange} placeholder="•••" className="form-input-plain" maxLength={3} type="password" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Taksit Seçeneği</label>
                    <select
                      className="form-input-plain"
                      value={card.installment}
                      onChange={e => setCard(p => ({ ...p, installment: e.target.value }))}
                    >
                      <option value="1">Tek Çekim</option>
                      <option value="2">2 Taksit</option>
                      <option value="3">3 Taksit</option>
                      <option value="6">6 Taksit</option>
                      <option value="9">9 Taksit</option>
                      <option value="12">12 Taksit</option>
                    </select>
                  </div>
                </div>
              )}

              {payment === 'transfer' && (
                <div className="transfer-info">
                  <div className="transfer-bank">
                    <div className="transfer-bank-header">🏦 Banka Bilgileri</div>
                    <div className="transfer-rows">
                      <div className="transfer-row"><span>Banka</span><strong>Ziraat Bankası</strong></div>
                      <div className="transfer-row"><span>Hesap Adı</span><strong>Ozkan3D Tasarım</strong></div>
                      <div className="transfer-row"><span>IBAN</span><strong>TR00 0000 0000 0000 0000 0000 00</strong></div>
                      <div className="transfer-row"><span>Açıklama</span><strong>Ad Soyad + Telefon</strong></div>
                    </div>
                  </div>
                  <div className="transfer-note">
                    ⚠️ Havale yapıldıktan sonra siparişiniz onaylanacak ve üretim başlayacaktır.
                  </div>
                </div>
              )}

              {/* Sipariş özeti tekrarı */}
              <div className="checkout-address-summary" style={{ marginTop: '20px' }}>
                <div className="address-summary-header">
                  <FiTruck size={15} />
                  <span>Kargo</span>
                  <button className="address-change-btn" onClick={() => setStep(1)}>Değiştir</button>
                </div>
                <p className="address-summary-text">
                  {shipping === 'express' ? '⚡ Hızlı Kargo — 1-2 iş günü' : '🚚 Standart Kargo — 3-5 iş günü'} — {shippingCost === 0 ? 'Ücretsiz' : `${shippingCost}₺`}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="checkout-nav">
            {step > 0 && (
              <button className="btn-back" onClick={() => setStep(p => p - 1)}>
                ← Geri
              </button>
            )}
            <button
              className={`btn-next-checkout ${loading ? 'btn-loading' : ''}`}
              onClick={nextStep}
              disabled={loading}
            >
              {loading ? (
                <span className="checkout-spinner" />
              ) : step === 2 ? (
                <><FiLock size={16} /> Siparişi Tamamla — {grandTotal.toFixed(0)}₺</>
              ) : (
                <>Devam Et <FiChevronRight size={16} /></>
              )}
            </button>
          </div>
        </div>

        {/* Sağ — Özet */}
        <div className="checkout-right">
          <div className="checkout-summary">
            <h3 className="checkout-summary-title">Sipariş Özeti</h3>

            <div className="checkout-items">
              {cartItems.map((item, i) => (
                <div key={item._id || item.productId || i} className="checkout-item">
                  <div className="checkout-item-img">
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                    ) : (
                      <div className="checkout-item-placeholder">3D</div>
                    )}
                    <span className="checkout-item-qty">{item.quantity}</span>
                  </div>
                  <div className="checkout-item-info">
                    <p className="checkout-item-name">{item.name}</p>
                    <div className="checkout-item-variants">
                      {item.color && <span className="variant-dot" style={{ background: item.color }} />}
                      {item.material && <span>{item.material}</span>}
                    </div>
                  </div>
                  <span className="checkout-item-price">{(item.price * item.quantity).toFixed(0)}₺</span>
                </div>
              ))}
            </div>

            <div className="checkout-summary-rows">
              <div className="summary-row">
                <span>Ara Toplam</span>
                <span>{totalPrice.toFixed(0)}₺</span>
              </div>
              {discount > 0 && (
                <div className="summary-row" style={{ color: '#16a34a' }}>
                  <span>İndirim</span>
                  <span>-{discount.toFixed(0)}₺</span>
                </div>
              )}
              <div className="summary-row">
                <span>Kargo</span>
                <span className={shippingCost === 0 ? 'free-shipping' : ''}>
                  {shippingCost === 0 ? 'Ücretsiz' : `${shippingCost}₺`}
                </span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row summary-total">
                <span>Toplam</span>
                <span>{grandTotal.toFixed(0)}₺</span>
              </div>
            </div>

            <div className="checkout-summary-secure">
              <FiShield size={14} />
              <span>iyzico güvenli ödeme altyapısı</span>
            </div>

            <div className="checkout-payment-icons">
              <div className="payment-badge payment-iyzico"><span>iyzico</span></div>
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
  )
}

export default CheckoutPage
import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  FiChevronRight, FiLock, FiTruck, FiCreditCard,
  FiCheck, FiShield, FiMapPin
} from 'react-icons/fi'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { createOrderApi, cancelOrderApi, getShippingQuoteApi } from '../api/orderApi'
import { createPaymentApi } from '../api/paymentApi'
import { addAddressApi } from '../api/authApi'
import './CheckoutPage.css'

const steps = ['Adres', 'Kargo', 'Ödeme']

const CheckoutPage = () => {
  const { items: cartItems, totalPrice, clearCart } = useCart()
  const { user, isAuthenticated, setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // CartPage'den gelen kupon verisi
  const { couponCode, discount = 0 } = location.state || {}

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
  const [selectedBank, setSelectedBank] = useState('ziraat')
  const [saveAddress, setSaveAddress] = useState(false)
  const [customerNote, setCustomerNote] = useState('')
  const [shippingQuote, setShippingQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState('')

  // Kayıtlı adresler
  const savedAddresses = user?.addresses || []
  const [selectedSavedAddress, setSelectedSavedAddress] = useState(null)

  const shippingCost = shippingQuote?.totalCost || 0
  const grandTotal = totalPrice - discount + shippingCost

  const shippingOptions = [
    {
      id: 'standard',
      label: 'Standart Kargo',
      desc: shippingQuote?.zone === 'local' ? 'Bolu ici teslimat' : shippingQuote?.eta || '2-4 is gunu',
      price: shippingQuote ? (shippingQuote.costByMethod?.standard === 0 ? 'Ucretsiz' : `${shippingQuote.costByMethod?.standard}₺`) : 'Sehir secin',
      icon: '🚚',
    },
    {
      id: 'express',
      label: 'Hizli Kargo',
      desc: shippingQuote?.zone === 'local' ? 'Bolu ici ayni gun' : 'Standarttan daha oncelikli cikis',
      price: shippingQuote ? (shippingQuote.costByMethod?.express === 0 ? 'Ucretsiz' : `${shippingQuote.costByMethod?.express}₺`) : 'Sehir secin',
      icon: '⚡',
    },
  ]

  const transferBanks = [
    {
      id: 'garanti',
      label: 'Garanti Bankası',
      accountOwner: 'Özkan Şekerci',
      currency: 'TRY',
      iban: 'TR91 0006 2000 0300 0006 1823 92',
    },
  ]

  const activeTransferBank = transferBanks.find(bank => bank.id === selectedBank) || transferBanks[0]

  useEffect(() => {
    if (!address.city || cartItems.length === 0) {
      setShippingQuote(null)
      setQuoteError('')
      return
    }

    let isActive = true
    const timer = setTimeout(async () => {
      setQuoteLoading(true)
      try {
        const res = await getShippingQuoteApi({
          items: cartItems.map(item => ({
            product: item.productId,
            name: item.name,
            material: item.material,
            quantity: item.quantity,
          })),
          shippingAddress: {
            city: address.city,
            district: address.district,
          },
          shippingMethod: shipping,
        })

        if (!isActive) return
        setShippingQuote(res.data)
        setQuoteError('')
      } catch (err) {
        if (!isActive) return
        setShippingQuote(null)
        setQuoteError(err.response?.data?.message || 'Kargo ucreti hesaplanamadi.')
      } finally {
        if (isActive) setQuoteLoading(false)
      }
    }, 260)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [address.city, address.district, shipping, cartItems])

  const handleAddressChange = e => setAddress(p => ({ ...p, [e.target.name]: e.target.value }))

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('paytr') === 'failed') {
      setError('PayTR odemesi tamamlanamadi. Siparis iptal edildi veya odeme basarisiz oldu.')
    }
  }, [location.search])

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
    if ((step === 1 || step === 2) && !shippingQuote) {
      setError('Kargo ucreti henuz hesaplanamadi. Sehir bilgisini kontrol edin.')
      return false
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
        couponCode: couponCode || undefined,
        customerNote: customerNote || undefined,
      }

      const res = await createOrderApi(orderData)
      const order = res.data

      let paymentRes = null
      if (payment === 'card') {
        try {
          paymentRes = await createPaymentApi({
            orderId: order._id,
          })

          const paymentPageUrl = paymentRes?.data?.paymentPageUrl
          if (!paymentPageUrl) {
            throw new Error('PayTR odeme sayfasi olusturulamadi.')
          }

          window.location.href = paymentPageUrl
          return
        } catch (payErr) {
          // Ödeme başarısızsa stok ve sipariş akışı bozulmaması için siparişi iptal et.
          try {
            await cancelOrderApi(order._id)
          } catch (cancelErr) {
            console.log('Ödeme başarısız, sipariş iptali başarısız:', cancelErr.message)
          }

          setError(payErr.response?.data?.message || payErr.message || 'PayTR odeme oturumu olusturulamadi. Lutfen tekrar deneyin.')
          return
        }
      }

      if (saveAddress) {
        const normalizedAddress = {
          title: address.addressTitle || 'Ev',
          fullName: address.fullName,
          phone: address.phone,
          city: address.city,
          district: address.district,
          neighborhood: address.neighborhood || '',
          address: address.address,
          isDefault: !user?.addresses?.length,
        }

        const exists = (user?.addresses || []).some((addr) => (
          (addr.fullName || '').trim().toLowerCase() === normalizedAddress.fullName.trim().toLowerCase() &&
          (addr.phone || '').replace(/\s/g, '') === normalizedAddress.phone.replace(/\s/g, '') &&
          (addr.city || '').trim().toLowerCase() === normalizedAddress.city.trim().toLowerCase() &&
          (addr.district || '').trim().toLowerCase() === normalizedAddress.district.trim().toLowerCase() &&
          (addr.address || '').trim().toLowerCase() === normalizedAddress.address.trim().toLowerCase()
        ))

        if (!exists) {
          try {
            const addressRes = await addAddressApi(normalizedAddress)
            setUser(prev => ({ ...prev, addresses: addressRes.data || [] }))
          } catch (addressErr) {
            console.log('Adres kaydedilemedi:', addressErr.response?.data?.message || addressErr.message)
          }
        }
      }

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
          paymentId: paymentRes?.data?.paymentId,
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
          {quoteError && <div className="checkout-warning">{quoteError}</div>}

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
                {quoteLoading && (
                  <div className="checkout-note">Kargo ucreti hesaplanıyor...</div>
                )}

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

              {shippingQuote && (
                <div className="checkout-shipping-quote">
                  <div className="shipping-quote-row">
                    <span>Bolge</span>
                    <strong>{shippingQuote.zoneLabel}</strong>
                  </div>
                  <div className="shipping-quote-row">
                    <span>Taban ucret</span>
                    <span>{shippingQuote.baseCost}₺</span>
                  </div>
                  <div className="shipping-quote-row">
                    <span>Hacim etkisi (3D urun)</span>
                    <span>{shippingQuote.volumeSurcharge}₺</span>
                  </div>
                  <div className="shipping-quote-row">
                    <span>Koruyucu paketleme</span>
                    <span>{shippingQuote.protectiveSurcharge}₺</span>
                  </div>
                  {shippingQuote.methodSurcharge > 0 && (
                    <div className="shipping-quote-row">
                      <span>Hizli kargo farki</span>
                      <span>+{shippingQuote.methodSurcharge}₺</span>
                    </div>
                  )}
                  <div className="shipping-quote-row shipping-quote-total">
                    <span>Toplam kargo</span>
                    <strong>{shippingCost === 0 ? 'Ucretsiz' : `${shippingCost}₺`}</strong>
                  </div>
                  <p>{shippingQuote.policyNote}</p>
                </div>
              )}

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
                <div className="checkout-paytr-badge">
                  <FiShield size={12} />
                  <span>PayTR guvencesi</span>
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
                  <div className="checkout-note" style={{ marginTop: 0 }}>
                    Kart bilgilerinizi bu sayfada girmiyorsunuz. "Siparisi Tamamla" dedikten sonra PayTR guvenli odeme sayfasina yonlendirileceksiniz.
                  </div>
                  <div className="transfer-note" style={{ marginTop: '14px' }}>
                    <p>PayTR test modunda sadece test kartlari ile odeme alinabilir.</p>
                    <p>Basarili odeme sonrasinda otomatik olarak siparis sonuc sayfasina yonlendirilirsiniz.</p>
                  </div>
                </div>
              )}

              {payment === 'transfer' && (
                <div className="transfer-info">
                  <div className="transfer-bank">
                    <div className="transfer-bank-header">🏦 Banka Bilgileri</div>
                    <div className="transfer-select-wrap">
                      <label className="form-label">Banka Seçiniz</label>
                      <select
                        className="form-input-plain"
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                      >
                        {transferBanks.map((bank) => (
                          <option key={bank.id} value={bank.id}>{bank.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="transfer-rows">
                      <div className="transfer-row"><span>Hesap Adı</span><strong>{activeTransferBank.accountOwner}</strong></div>
                      <div className="transfer-row"><span>Banka</span><strong>{activeTransferBank.label}</strong></div>
                      <div className="transfer-row"><span>Para Birimi</span><strong>{activeTransferBank.currency}</strong></div>
                      <div className="transfer-row"><span>IBAN</span><strong>{activeTransferBank.iban}</strong></div>
                      <div className="transfer-row"><span>Açıklama</span><strong>Sipariş numaranız + ad soyad</strong></div>
                    </div>
                  </div>
                  <div className="transfer-note">
                    <p>Fatura adı ve gönderici adı farklı ise işleminiz onaylanmayacaktır.</p>
                    <p>Ücret iadesi gereken durumlarda iade süresi bankanıza bağlı olarak 1-3 iş günü sürebilir.</p>
                    <p>Havale/EFT yaptıktan sonra dekontu saklamanız önerilir.</p>
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
                  {shipping === 'express' ? '⚡ Hizli Kargo' : '🚚 Standart Kargo'} — {shippingCost === 0 ? 'Ucretsiz' : `${shippingCost}₺`}
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
                  {shippingCost === 0 ? 'Ucretsiz' : `${shippingCost}₺`}
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
              <span>PayTR guvenli odeme altyapisi</span>
            </div>

            <div className="checkout-payment-icons">
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
  )
}

export default CheckoutPage
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiLock, FiCreditCard, FiCopy, FiCheck, FiPlus } from 'react-icons/fi'
import { useCart, lineKey } from '../../context/CartContext'
import LineOptions from '../components/LineOptions'
import { useAuth } from '../../context/AuthContext'
import { createOrderApi, cancelOrderApi, getShippingQuoteApi } from '../../api/orderApi'
import { createPaymentApi } from '../../api/paymentApi'
import { addAddressApi } from '../../api/authApi'
import VoxelMark from '../components/VoxelMark'
import { formatPrice } from '../catalog'
import { TR_CITIES } from '../trCities'
import { BANK } from '../bank'
import '../storefront.css'
import './CartPage.css'
import './CheckoutPage.css'

const EMPTY_ADDRESS = { title: 'Ev', fullName: '', phone: '', city: '', district: '', neighborhood: '', address: '' }

const fromSaved = (a) => ({
  title: a.title || 'Ev',
  fullName: a.fullName || '',
  phone: a.phone || '',
  city: a.city || '',
  district: a.district || '',
  neighborhood: a.neighborhood || '',
  address: a.address || '',
})

const sameAddress = (a, b) =>
  ['fullName', 'phone', 'city', 'district', 'address'].every(
    (k) => String(a[k] || '').replace(/\s/g, '').toLowerCase() === String(b[k] || '').replace(/\s/g, '').toLowerCase()
  )

/* ------------------------------------------------------ Kargo ücreti */
const useShippingQuote = (items, city, district, method) => {
  const [result, setResult] = useState({ key: '', quote: null, error: '' })
  const key = city ? JSON.stringify([city, district, method, items.map((i) => [i.productId, i.quantity, i.material])]) : ''

  useEffect(() => {
    if (!key) return undefined
    let alive = true
    const t = setTimeout(async () => {
      try {
        const res = await getShippingQuoteApi({
          items: items.map((i) => ({ product: i.productId, name: i.name, material: i.material, quantity: i.quantity })),
          shippingAddress: { city, district },
          shippingMethod: method,
        })
        if (alive) setResult({ key, quote: res.data, error: '' })
      } catch (err) {
        if (alive) setResult({ key, quote: null, error: err.response?.data?.message || 'Kargo ücreti hesaplanamadı.' })
      }
    }, 250)
    return () => { alive = false; clearTimeout(t) }
    // key, diğer bağımlılıkların özeti
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const fresh = result.key === key
  return {
    quote: key && fresh ? result.quote : null,
    error: key && fresh ? result.error : '',
    loading: Boolean(key) && !fresh,
  }
}

/* ------------------------------------------------------------ Bileşenler */
const Field = ({ label, error, children, wide }) => (
  <label className={`sf-field ${wide ? 'is-wide' : ''} ${error ? 'has-error' : ''}`}>
    <span className="sf-field-label">{label}</span>
    {children}
    {error && <span className="sf-field-error">{error}</span>}
  </label>
)

const Copy = ({ text }) => {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="sf-copy"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text.replace(/\s/g, '')); setDone(true); setTimeout(() => setDone(false), 1800) } catch { /* yoksay */ }
      }}
      aria-label="IBAN'ı kopyala"
    >
      {done ? <FiCheck /> : <FiCopy />} {done ? 'Kopyalandı' : 'Kopyala'}
    </button>
  )
}

/* ------------------------------------------------------------------ Sayfa */
const CheckoutPage = () => {
  const { items, totalPrice, clearCart } = useCart()
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const { couponCode, discount = 0 } = location.state || {}
  const paytrFailed = new URLSearchParams(location.search).get('paytr') === 'failed'

  const saved = user?.addresses || []
  const defaultSaved = saved.find((a) => a.isDefault) || saved[0]

  const [savedId, setSavedId] = useState(defaultSaved?._id || 'new')
  const [address, setAddress] = useState(() =>
    defaultSaved
      ? fromSaved(defaultSaved)
      : { ...EMPTY_ADDRESS, fullName: user ? `${user.firstName} ${user.lastName}` : '', phone: user?.phone || '' }
  )
  const [saveAddress, setSaveAddress] = useState(saved.length === 0)
  const [shipping, setShipping] = useState('standard')
  const [payment, setPayment] = useState('card')
  const [note, setNote] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(paytrFailed ? 'Kart ödemesi tamamlanamadı, sipariş iptal edildi. Tekrar deneyebilirsin.' : '')
  const [submitting, setSubmitting] = useState(false)

  const { quote, error: quoteError, loading: quoteLoading } = useShippingQuote(items, address.city, address.district, shipping)
  const shippingCost = quote ? quote.totalCost : null
  const grandTotal = Math.max(0, totalPrice - discount) + (shippingCost || 0)

  const set = (field) => (e) => {
    setAddress((a) => ({ ...a, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
    if (savedId !== 'new') setSavedId('new')
  }

  const pickSaved = (a) => {
    setSavedId(a._id)
    setAddress(fromSaved(a))
    setErrors({})
  }

  const validate = () => {
    const er = {}
    if (!address.fullName.trim()) er.fullName = 'Ad soyad gerekli.'
    if (address.phone.replace(/\D/g, '').length < 10) er.phone = 'Geçerli bir telefon numarası gir.'
    if (!address.city) er.city = 'İl seç.'
    if (!address.district.trim()) er.district = 'İlçe gerekli.'
    if (address.address.trim().length < 10) er.address = 'Sokak, bina ve daire bilgisini yaz.'
    if (!accepted) er.accepted = 'Devam etmek için sözleşmeyi onayla.'
    // Kayıtlı adreste eksik alan varsa formu açıp hatayı göster
    if (savedId !== 'new' && Object.keys(er).some((k) => k !== 'accepted')) setSavedId('new')
    setErrors(er)
    return Object.keys(er).length === 0
  }

  const persistAddress = async () => {
    if (!saveAddress || savedId !== 'new') return
    if (saved.some((a) => sameAddress(a, address))) return
    try {
      const res = await addAddressApi({ ...address, isDefault: saved.length === 0 })
      setUser((prev) => ({ ...prev, addresses: res.data || [] }))
    } catch (err) {
      console.log('Adres kaydedilemedi:', err.response?.data?.message || err.message)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    if (!validate()) {
      document.querySelector('.has-error, .sf-accept.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!quote) {
      setSubmitError(quoteError || 'Kargo ücreti henüz hesaplanmadı. İl ve ilçeyi kontrol et.')
      return
    }

    setSubmitting(true)
    try {
      const res = await createOrderApi({
        items: items.map((i) => ({
          product: i.productId, name: i.name, image: i.image,
          quantity: i.quantity, material: i.material, color: i.color,
          // Fiyat sunucuda bu seçimlere göre hesaplanır
          options: (i.options || []).map((o) => ({ groupId: o.groupId, valueId: o.valueId })),
          personalization: i.personalization?.text || '',
        })),
        shippingAddress: { ...address },
        paymentMethod: payment,
        shippingMethod: shipping,
        couponCode: couponCode || undefined,
        customerNote: note.trim() || undefined,
      })
      const order = res.data

      // Adres, kart ödemesinde yönlendirmeden önce kaydedilmeli
      await persistAddress()

      if (payment === 'card') {
        try {
          const pay = await createPaymentApi({ orderId: order._id })
          const url = pay?.data?.paymentPageUrl
          if (!url) throw new Error('Ödeme sayfası oluşturulamadı.')
          window.location.href = url
          return
        } catch (payErr) {
          // Ödeme başlatılamazsa stok ve kupon geri alınsın diye sipariş iptal edilir
          await cancelOrderApi(order._id).catch(() => {})
          setSubmitError(payErr.response?.data?.message || payErr.message || 'Ödeme başlatılamadı. Tekrar dene.')
          setSubmitting(false)
          return
        }
      }

      await clearCart()
      navigate('/order-success', {
        state: {
          orderId: order._id,
          orderNo: order.orderNo,
          totalPrice: order.totalPrice,
          items: order.items,
          shippingAddress: order.shippingAddress,
        },
      })
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Sipariş oluşturulamadı. Tekrar dene.')
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="sf-root sf-page">
        <div className="sf-container sf-container--narrow sf-cart-empty">
          <VoxelMark size={44} />
          <h1>Sepetin boş.</h1>
          <p>Ödeme yapmak için önce sepete ürün ekle.</p>
          <Link to="/shop" className="sf-btn sf-btn--ink">Mağazaya göz at</Link>
        </div>
      </div>
    )
  }

  const shipOptions = [
    {
      id: 'standard',
      label: 'Standart kargo',
      desc: quote ? (quote.zone === 'local' ? 'Bolu içi teslimat' : quote.eta) : 'İl seçince hesaplanır',
      price: quote?.costByMethod?.standard,
    },
    {
      id: 'express',
      label: 'Hızlı kargo',
      desc: quote?.zone === 'local' ? 'Bolu içi aynı gün' : 'Öncelikli hazırlanır ve gönderilir',
      price: quote?.costByMethod?.express,
    },
  ]

  return (
    <div className="sf-root sf-page">
      <div className="sf-container sf-container--narrow">
        <header className="sf-co-head">
          <Link to="/cart" className="sf-link-btn">Sepete dön</Link>
          <h1>Siparişi onayla ve öde</h1>
        </header>

        <form className="sf-cart-layout" onSubmit={submit} noValidate>
          <div className="sf-co-main">
            {/* 1. Adres */}
            <section className="sf-co-step" aria-labelledby="sf-co-address">
              <h2 id="sf-co-address"><span className="sf-step-no">1</span> Teslimat adresi</h2>

              {saved.length > 0 && (
                <div className="sf-addr-list" role="radiogroup" aria-label="Kayıtlı adresler">
                  {saved.map((a) => (
                    <button
                      key={a._id}
                      type="button"
                      role="radio"
                      aria-checked={savedId === a._id}
                      className={`sf-option ${savedId === a._id ? 'is-active' : ''}`}
                      onClick={() => pickSaved(a)}
                    >
                      <strong>{a.title || 'Adres'}</strong>
                      <span>{a.fullName} · {a.phone}</span>
                      <span>{a.address}, {a.district}/{a.city}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={savedId === 'new'}
                    className={`sf-option sf-option--new ${savedId === 'new' ? 'is-active' : ''}`}
                    onClick={() => { setSavedId('new'); setAddress({ ...EMPTY_ADDRESS, fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(), phone: user?.phone || '' }) }}
                  >
                    <FiPlus aria-hidden="true" /> Yeni adres
                  </button>
                </div>
              )}

              {(savedId === 'new' || saved.length === 0) && (
                <div className="sf-form-grid">
                  <Field label="Ad soyad" error={errors.fullName}>
                    <input value={address.fullName} onChange={set('fullName')} autoComplete="name" />
                  </Field>
                  <Field label="Telefon" error={errors.phone}>
                    <input value={address.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" placeholder="05xx xxx xx xx" />
                  </Field>
                  <Field label="İl" error={errors.city}>
                    <select value={address.city} onChange={set('city')} autoComplete="address-level1">
                      <option value="">Seç</option>
                      {TR_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="İlçe" error={errors.district}>
                    <input value={address.district} onChange={set('district')} autoComplete="address-level2" />
                  </Field>
                  <Field label="Mahalle (isteğe bağlı)" wide>
                    <input value={address.neighborhood} onChange={set('neighborhood')} />
                  </Field>
                  <Field label="Adres" error={errors.address} wide>
                    <textarea value={address.address} onChange={set('address')} rows={3} autoComplete="street-address" placeholder="Sokak, bina no, daire" />
                  </Field>
                  <label className="sf-check is-wide">
                    <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                    <span>Bu adresi sonraki siparişler için kaydet</span>
                  </label>
                </div>
              )}
            </section>

            {/* 2. Kargo */}
            <section className="sf-co-step" aria-labelledby="sf-co-ship">
              <h2 id="sf-co-ship"><span className="sf-step-no">2</span> Kargo</h2>
              <div className="sf-option-row" role="radiogroup" aria-label="Kargo seçeneği">
                {shipOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={shipping === o.id}
                    className={`sf-option ${shipping === o.id ? 'is-active' : ''}`}
                    onClick={() => setShipping(o.id)}
                  >
                    <span className="sf-option-top">
                      <strong>{o.label}</strong>
                      <span className="sf-mono">
                        {quoteLoading ? '…' : o.price == null ? '—' : o.price === 0 ? 'Ücretsiz' : formatPrice(o.price)}
                      </span>
                    </span>
                    <span>{o.desc}</span>
                  </button>
                ))}
              </div>
              {quoteError && <p className="sf-field-error" role="alert">{quoteError}</p>}
            </section>

            {/* 3. Ödeme */}
            <section className="sf-co-step" aria-labelledby="sf-co-pay">
              <h2 id="sf-co-pay"><span className="sf-step-no">3</span> Ödeme</h2>
              <div className="sf-option-row" role="radiogroup" aria-label="Ödeme yöntemi">
                <button
                  type="button"
                  role="radio"
                  aria-checked={payment === 'card'}
                  className={`sf-option ${payment === 'card' ? 'is-active' : ''}`}
                  onClick={() => setPayment('card')}
                >
                  <span className="sf-option-top"><strong>Kart ile öde</strong><FiCreditCard aria-hidden="true" /></span>
                  <span>Kart bilgilerini PayTR'nin güvenli sayfasında gireceksin. Taksit seçenekleri orada görünür.</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={payment === 'transfer'}
                  className={`sf-option ${payment === 'transfer' ? 'is-active' : ''}`}
                  onClick={() => setPayment('transfer')}
                >
                  <span className="sf-option-top"><strong>Havale / EFT</strong></span>
                  <span>Siparişin ödeme gelince üretime alınır.</span>
                </button>
              </div>

              {payment === 'transfer' && (
                <div className="sf-bank">
                  <dl>
                    <div><dt>Banka</dt><dd>{BANK.label}</dd></div>
                    <div><dt>Alıcı</dt><dd>{BANK.owner}</dd></div>
                    <div>
                      <dt>IBAN</dt>
                      <dd className="sf-mono sf-iban">{BANK.iban} <Copy text={BANK.iban} /></dd>
                    </div>
                    <div><dt>Açıklama</dt><dd>Sipariş numaran ve adın soyadın</dd></div>
                  </dl>
                  <p>Gönderen adı fatura adıyla aynı olmalı. Sipariş numaran onay sayfasında ve e-postanda yazar.</p>
                </div>
              )}

              <Field label="Sipariş notu (isteğe bağlı)" wide>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="Örn. anahtarlıkta yazılacak isim" />
              </Field>
            </section>
          </div>

          {/* Özet */}
          <aside className="sf-summary" aria-label="Sipariş özeti">
            <ul className="sf-mini-list">
              {items.map((i, n) => (
                <li key={`${lineKey(i)}-${n}`}>
                  <span className="sf-mini-img">
                    {i.image && <img src={i.image} alt="" loading="lazy" />}
                    <em>{i.quantity}</em>
                  </span>
                  <span className="sf-mini-name">
                    {i.name}
                    <LineOptions item={i} />
                  </span>
                  <span>{formatPrice((i.price || 0) * i.quantity)}</span>
                </li>
              ))}
            </ul>

            <dl className="sf-summary-rows">
              <div><dt>Ara toplam</dt><dd>{formatPrice(totalPrice)}</dd></div>
              {discount > 0 && (
                <div className="is-discount"><dt>Kupon <span className="sf-mono">{couponCode}</span></dt><dd>−{formatPrice(discount)}</dd></div>
              )}
              <div>
                <dt>Kargo</dt>
                <dd className={shippingCost == null ? 'sf-summary-muted' : ''}>
                  {quoteLoading ? 'Hesaplanıyor…' : shippingCost == null ? 'İl seç' : shippingCost === 0 ? 'Ücretsiz' : formatPrice(shippingCost)}
                </dd>
              </div>
            </dl>

            <div className="sf-summary-total">
              <span>Toplam</span>
              <strong>{formatPrice(grandTotal)}</strong>
            </div>

            <label className={`sf-check sf-accept ${errors.accepted ? 'has-error' : ''}`}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => { setAccepted(e.target.checked); setErrors((er) => ({ ...er, accepted: undefined })) }}
              />
              <span>
                <Link to="/distance-selling" target="_blank">Mesafeli satış sözleşmesini</Link> ve{' '}
                <Link to="/kvkk" target="_blank">KVKK metnini</Link> okudum, onaylıyorum.
              </span>
            </label>
            {errors.accepted && <p className="sf-field-error">{errors.accepted}</p>}

            {submitError && <p className="sf-submit-error" role="alert">{submitError}</p>}

            <button type="submit" className="sf-btn sf-btn--accent sf-summary-cta" disabled={submitting}>
              {submitting
                ? 'İşleniyor…'
                : payment === 'card' ? `${formatPrice(grandTotal)} öde` : 'Siparişi oluştur'}
            </button>
            <p className="sf-summary-secure"><FiLock aria-hidden="true" /> Kart bilgilerin bize ulaşmaz, PayTR'de işlenir</p>
          </aside>
        </form>
      </div>
    </div>
  )
}

export default CheckoutPage

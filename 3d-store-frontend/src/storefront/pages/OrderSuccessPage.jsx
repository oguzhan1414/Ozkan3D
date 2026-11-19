import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiCheck, FiCopy, FiMail, FiMapPin, FiClock, FiRefreshCw } from 'react-icons/fi'
import { getOrderApi } from '../../api/orderApi'
import { useCart } from '../../context/CartContext'
import SEO from '../../components/SEO'
import LineOptions from '../components/LineOptions'
import VoxelMark from '../components/VoxelMark'
import { formatPrice } from '../catalog'
import { useBank } from '../bank'
import '../storefront.css'
import './OrderSuccessPage.css'

const STEPS = ['Sipariş alındı', 'Basımda', 'Paketleniyor', 'Kargoda', 'Teslim edildi']

const CopyText = ({ text, label }) => {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="sf-os-copy"
      onClick={() => {
        navigator.clipboard?.writeText(text.replace(/\s+/g, ''))
        setDone(true)
        setTimeout(() => setDone(false), 1800)
      }}
    >
      {done ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />} {done ? 'Kopyalandı' : label}
    </button>
  )
}

const OrderSuccessPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const bank = useBank()
  const [order, setOrder] = useState(location.state || null)
  const [loading, setLoading] = useState(!location.state)
  const [pageError, setPageError] = useState('')
  const cartClearedRef = useRef(false)

  const search = new URLSearchParams(location.search)
  const orderId = search.get('orderId')
  const paytrStatus = search.get('paytr')

  // Sipariş bilgisi yönlendirmeyle gelmediyse (PayTR dönüşü) orderId ile çekilir
  useEffect(() => {
    let mounted = true
    const fetchOrder = async () => {
      if (location.state?.orderNo) {
        setOrder(location.state)
        setLoading(false)
        return
      }
      if (!orderId) {
        navigate('/')
        return
      }
      setLoading(true)
      try {
        const res = await getOrderApi(orderId)
        if (!mounted) return
        setOrder(res.data)
        setPageError('')
      } catch (err) {
        if (!mounted) return
        setPageError(err.response?.data?.message || 'Sipariş bilgisi alınamadı.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchOrder()
    return () => { mounted = false }
  }, [location.state, orderId, navigate])

  // Havale siparişinde ya da ödeme onaylanınca sepet boşaltılır
  useEffect(() => {
    if (cartClearedRef.current || !order?.orderNo) return
    if (order.paymentMethod === 'transfer' || order.isPaid) {
      cartClearedRef.current = true
      clearCart().catch(() => {})
    }
  }, [order?.orderNo, order?.paymentMethod, order?.isPaid, clearCart])

  if (loading) {
    return (
      <div className="sf-root sf-page sf-os">
        <div className="sf-container sf-os-wrap">
          <div className="sf-os-state" role="status">
            <VoxelMark size={44} printing loop />
            <h1>Ödeme durumu kontrol ediliyor</h1>
            <p>Bankadan gelen sonucu doğruluyoruz, lütfen sayfayı kapatma.</p>
          </div>
        </div>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="sf-root sf-page sf-os">
        <div className="sf-container sf-os-wrap">
          <div className="sf-os-state">
            <h1>Sipariş bilgisine ulaşamadık</h1>
            <p>{pageError} Siparişin oluştuysa Hesabım &gt; Siparişlerim bölümünde görünür.</p>
            <div className="sf-os-actions">
              <Link to="/account?tab=orders" className="sf-btn sf-btn--ink">Siparişlerime git</Link>
              <Link to="/" className="sf-btn sf-btn--ghost">Ana sayfa</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!order?.orderNo) return null

  const transfer = order.paymentMethod === 'transfer' && !order.isPaid
  const cardPending = paytrStatus === 'success' && !order.isPaid && order.paymentMethod === 'card'
  const addr = order.shippingAddress

  return (
    <div className="sf-root sf-page sf-os">
      <SEO title="Siparişin alındı" description="Sipariş özeti" url="/order-success" />
      <div className="sf-container sf-os-wrap">
        <header className="sf-os-head">
          <span className="sf-os-badge" aria-hidden="true"><FiCheck /></span>
          <p className="sf-os-no">Sipariş no <strong className="sf-mono">{order.orderNo}</strong></p>
          <h1>{transfer ? 'Siparişin alındı, ödemeni bekliyoruz' : 'Teşekkürler, siparişin alındı'}</h1>
          <p className="sf-os-lead">
            {transfer
              ? 'Havaleyi yaptıktan sonra ödemeni onaylayıp baskıya alıyoruz. Aşağıdaki bilgileri kullanabilirsin.'
              : cardPending
                ? 'Ödemen alındı; bankadan kesin onay birkaç saniye içinde gelir. Sayfayı yenileyerek kontrol edebilirsin.'
                : 'Parçaların Bolu’daki atölyemizde sırayla basılacak. Her adımda e-postayla haber veriyoruz.'}
          </p>
        </header>

        {transfer && (
          <section className="sf-os-bank sf-cut" aria-labelledby="sf-os-bank-title">
            <h2 id="sf-os-bank-title">Havale / EFT bilgileri</h2>
            <dl>
              <div><dt>Tutar</dt><dd><strong>{formatPrice(order.totalPrice)}</strong></dd></div>
              <div><dt>Banka</dt><dd>{bank.label}</dd></div>
              <div><dt>Alıcı</dt><dd>{bank.owner}</dd></div>
              <div><dt>IBAN</dt><dd><span className="sf-mono">{bank.iban}</span> <CopyText text={bank.iban} label="Kopyala" /></dd></div>
              <div><dt>Açıklama</dt><dd><span className="sf-mono">{order.orderNo}</span> <CopyText text={order.orderNo} label="Kopyala" /></dd></div>
            </dl>
            <p className="sf-os-note"><FiClock aria-hidden="true" /> Açıklamaya sipariş numaranı yazman ödemeyi hızlı eşleştirmemizi sağlar.</p>
          </section>
        )}

        <ol className="sf-os-steps" aria-label="Sipariş adımları">
          {STEPS.map((s, i) => (
            <li key={s} className={i === 0 ? 'is-done' : ''}>
              <span>{i === 0 ? <FiCheck aria-hidden="true" /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        <div className="sf-os-grid">
          <section className="sf-os-card" aria-labelledby="sf-os-items-title">
            <h2 id="sf-os-items-title">Sipariş özeti</h2>
            <ul className="sf-os-items">
              {(order.items || []).map((item, i) => (
                <li key={item._id || i}>
                  <span className="sf-os-thumb">{item.image && <img src={item.image} alt="" loading="lazy" />}<em>{item.quantity}</em></span>
                  <span className="sf-os-item">
                    <strong>{item.name}</strong>
                    <LineOptions item={item} />
                  </span>
                  <span className="sf-os-price">{formatPrice((item.price || 0) * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="sf-os-totals">
              {order.subtotal != null && <div><dt>Ara toplam</dt><dd>{formatPrice(order.subtotal)}</dd></div>}
              {order.discount > 0 && <div><dt>İndirim</dt><dd>−{formatPrice(order.discount)}</dd></div>}
              {order.shippingCost != null && <div><dt>Kargo</dt><dd>{order.shippingCost ? formatPrice(order.shippingCost) : 'Ücretsiz'}</dd></div>}
              <div className="is-total"><dt>Toplam</dt><dd>{formatPrice(order.totalPrice)}</dd></div>
            </dl>
          </section>

          <aside className="sf-os-side">
            {addr && (
              <section className="sf-os-card">
                <h2><FiMapPin aria-hidden="true" /> Teslimat adresi</h2>
                <p className="sf-os-addr">
                  <strong>{addr.fullName}</strong><br />
                  {addr.address}<br />
                  {[addr.district, addr.city].filter(Boolean).join(' / ')}<br />
                  {addr.phone}
                </p>
              </section>
            )}
            <section className="sf-os-card sf-os-mail">
              <FiMail aria-hidden="true" />
              <p>Sipariş özeti e-posta adresine gönderildi. Kargoya verildiğinde takip numarasıyla tekrar yazacağız.</p>
            </section>
          </aside>
        </div>

        <div className="sf-os-actions">
          <Link to="/account?tab=orders" className="sf-btn sf-btn--ink">Siparişlerimi görüntüle</Link>
          <Link to="/shop" className="sf-btn sf-btn--ghost">Alışverişe devam et</Link>
          {cardPending && (
            <button type="button" className="sf-btn sf-btn--ghost" onClick={() => window.location.reload()}>
              <FiRefreshCw aria-hidden="true" /> Durumu yenile
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderSuccessPage

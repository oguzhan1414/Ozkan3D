import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiChevronDown, FiCopy, FiCheck, FiTruck, FiPackage } from 'react-icons/fi'
import { getMyOrdersApi, cancelOrderApi } from '../../../api/orderApi'
import VoxelMark from '../../components/VoxelMark'
import { formatPrice } from '../../catalog'
import { useBank } from '../../bank'
import { ORDER_STEPS, statusInfo, formatDateTime, itemHref, itemImage } from './accountUtils'
import LineOptions from '../../components/LineOptions'

const CopyButton = ({ text, label }) => {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="ac-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text.replace(/\s/g, ''))
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        } catch { /* panoya erişim yok */ }
      }}
      aria-label={label}
    >
      {done ? <FiCheck /> : <FiCopy />} {done ? 'Kopyalandı' : 'Kopyala'}
    </button>
  )
}

/** 5 katmanlı üretim çubuğu: tamamlanan adımlar dolu, sıradaki yarı tonda */
const LayerProgress = ({ status }) => {
  if (status === 'İptal') return <div className="ac-progress is-cancelled" aria-hidden="true"><i /><i /><i /><i /><i /></div>
  const current = ORDER_STEPS.indexOf(status)
  return (
    <div className="ac-progress" role="img" aria-label={`Üretim durumu: ${current + 1}. adım, ${ORDER_STEPS.length} adımdan`}>
      {ORDER_STEPS.map((step, i) => (
        <i key={step} className={i < current ? 'is-done' : i === current ? 'is-now' : ''} title={step} />
      ))}
    </div>
  )
}

const OrderCard = ({ order }) => {
  const BANK = useBank()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelState, setCancelState] = useState({ loading: false, error: '' })

  const info = statusInfo(order.status)
  // Ödenmiş sipariş müşteri tarafından iptal edilemez (iade elle yapılıyor)
  const canCancel = order.status === 'Bekliyor' && !order.isPaid
  const askToCancel = order.status === 'Bekliyor' && order.isPaid
  const awaitingTransfer = order.paymentMethod === 'transfer' && !order.isPaid && order.status !== 'İptal'
  const history = [...(order.statusHistory || [])].reverse()

  const cancel = async () => {
    setCancelState({ loading: true, error: '' })
    try {
      await cancelOrderApi(order._id)
      await queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      setConfirmCancel(false)
    } catch (err) {
      setCancelState({ loading: false, error: err.response?.data?.message || 'Sipariş iptal edilemedi.' })
      return
    }
    setCancelState({ loading: false, error: '' })
  }

  return (
    <article className={`ac-order ${order.status === 'İptal' ? 'is-cancelled' : ''}`}>
      <header className="ac-order-head">
        <div>
          <p className="ac-order-no sf-mono">{order.orderNo}</p>
          <p className="ac-order-date">{formatDateTime(order.createdAt)}</p>
        </div>
        <p className="ac-order-total">{formatPrice(order.totalPrice)}</p>
      </header>

      <div className="ac-order-status">
        <div className="ac-order-status-text">
          <strong>{info.label}</strong>
          <span>{info.text}</span>
        </div>
        <LayerProgress status={order.status} />
      </div>

      {awaitingTransfer && (
        <div className="ac-notice">
          <strong>Ödemen bekleniyor.</strong> Havaleyi {BANK.label} <span className="sf-mono">{BANK.iban}</span> hesabına
          ({BANK.owner}) yap; açıklamaya <span className="sf-mono">{order.orderNo}</span> yaz.
          <CopyButton text={BANK.iban} label="IBAN'ı kopyala" />
        </div>
      )}

      {order.trackingNo && (
        <div className="ac-tracking">
          <FiTruck aria-hidden="true" />
          <span>{order.carrier || 'Kargo'}</span>
          <span className="sf-mono">{order.trackingNo}</span>
          <CopyButton text={order.trackingNo} label="Takip numarasını kopyala" />
        </div>
      )}

      <div className="ac-order-thumbs">
        {(order.items || []).slice(0, 5).map((item) => (
          <Link key={item._id || item.name} to={itemHref(item)} className="ac-thumb" title={item.name}>
            {itemImage(item) ? <img src={itemImage(item)} alt={item.name} loading="lazy" /> : <FiPackage aria-hidden="true" />}
            {item.quantity > 1 && <em>{item.quantity}</em>}
          </Link>
        ))}
        {order.items?.length > 5 && <span className="ac-thumb-more">+{order.items.length - 5}</span>}
      </div>

      <div className="ac-order-actions">
        <button type="button" className="sf-link-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'Detayı gizle' : 'Sipariş detayı'} <FiChevronDown className={open ? 'is-up' : ''} aria-hidden="true" />
        </button>
        {order.status === 'Teslim Edildi' && order.items?.[0] && (
          <Link to={`${itemHref(order.items[0])}#sf-reviews-title`} className="sf-link-btn">Ürünü değerlendir</Link>
        )}
        {canCancel && !confirmCancel && (
          <button type="button" className="sf-link-btn ac-danger" onClick={() => setConfirmCancel(true)}>Siparişi iptal et</button>
        )}
        {askToCancel && (
          <Link to="/account?tab=support" className="sf-link-btn">İptal için bize yaz</Link>
        )}
      </div>

      {confirmCancel && (
        <div className="ac-confirm" role="alertdialog" aria-label="Sipariş iptali">
          <p>Siparişi iptal etmek istediğine emin misin? Bu işlem geri alınamaz.</p>
          <div>
            <button type="button" className="sf-btn sf-btn--ink" onClick={cancel} disabled={cancelState.loading}>
              {cancelState.loading ? 'İptal ediliyor…' : 'Evet, iptal et'}
            </button>
            <button type="button" className="sf-link-btn" onClick={() => setConfirmCancel(false)}>Vazgeç</button>
          </div>
          {cancelState.error && <p className="sf-field-error">{cancelState.error}</p>}
        </div>
      )}

      {open && (
        <div className="ac-order-detail">
          <ul className="ac-lines">
            {(order.items || []).map((item) => (
              <li key={item._id || item.name}>
                <Link to={itemHref(item)} className="ac-line-img" tabIndex={-1} aria-hidden="true">
                  {itemImage(item) && <img src={itemImage(item)} alt="" loading="lazy" />}
                </Link>
                <div>
                  <Link to={itemHref(item)} className="ac-line-name">{item.name}</Link>
                  <LineOptions item={item} />
                  <p className="ac-line-meta">
                    <span>{item.quantity} × {formatPrice(item.price)}</span>
                  </p>
                </div>
                <span className="ac-line-total">{formatPrice((item.price || 0) * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="ac-detail-grid">
            <section>
              <h4>Teslimat adresi</h4>
              <p>
                {order.shippingAddress?.fullName}<br />
                {order.shippingAddress?.address}<br />
                {order.shippingAddress?.district} / {order.shippingAddress?.city}<br />
                <span className="sf-mono">{order.shippingAddress?.phone}</span>
              </p>
            </section>
            <section>
              <h4>Ödeme</h4>
              <p>
                {order.paymentMethod === 'card' ? 'Kart (PayTR)' : 'Havale / EFT'}<br />
                {order.isPaid ? `Ödendi · ${formatDateTime(order.paidAt)}` : order.status === 'İptal' ? 'Ödenmedi' : 'Ödeme bekleniyor'}
              </p>
            </section>
            <section>
              <h4>Tutar</h4>
              <dl className="ac-sum">
                <div><dt>Ara toplam</dt><dd>{formatPrice(order.subtotal)}</dd></div>
                {order.discount > 0 && <div><dt>İndirim{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>−{formatPrice(order.discount)}</dd></div>}
                <div><dt>Kargo</dt><dd>{order.shippingCost ? formatPrice(order.shippingCost) : 'Ücretsiz'}</dd></div>
                <div className="is-total"><dt>Toplam</dt><dd>{formatPrice(order.totalPrice)}</dd></div>
              </dl>
            </section>
          </div>

          {history.length > 0 && (
            <section className="ac-timeline">
              <h4>Sipariş geçmişi</h4>
              <ol>
                {history.map((h, i) => (
                  <li key={h._id || i}>
                    <strong>{statusInfo(h.status).label}</strong>
                    {h.note && <span>{h.note}</span>}
                    <time className="sf-mono">{formatDateTime(h.date)}</time>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </article>
  )
}

const OrdersTab = () => {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['my-orders'], queryFn: getMyOrdersApi })
  const orders = data?.data || []

  if (isLoading) {
    return <div className="ac-loading" role="status" aria-label="Siparişler yükleniyor"><VoxelMark size={40} loop /></div>
  }

  if (isError) {
    return (
      <div className="ac-empty" role="alert">
        <p>Siparişler yüklenemedi.</p>
        <button type="button" className="sf-btn sf-btn--ink" onClick={() => refetch()}>Tekrar dene</button>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="ac-empty">
        <VoxelMark size={40} />
        <h3>Henüz siparişin yok.</h3>
        <p>Verdiğin siparişler ve üretim durumları burada görünecek.</p>
        <Link to="/shop" className="sf-btn sf-btn--ink">Mağazaya göz at</Link>
      </div>
    )
  }

  return <div className="ac-orders">{orders.map((o) => <OrderCard key={o._id} order={o} />)}</div>
}

export default OrdersTab

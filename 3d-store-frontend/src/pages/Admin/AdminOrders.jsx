import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  FiSearch, FiDownload, FiCheckCircle, FiTruck, FiPhone, FiMapPin, FiMail, FiCopy, FiShoppingBag,
  FiRefreshCw, FiArrowRight, FiXCircle, FiCreditCard,
} from 'react-icons/fi'
import {
  getOrdersApi, updateOrderStatusApi, updateTrackingApi, getInvoicePDFApi, markOrderPaidApi,
} from '../../api/orderApi'
import { getSettingsApi } from '../../api/settingsApi'
import LineOptions from '../../storefront/components/LineOptions'
import {
  PageHeader, Segment, Drawer, Pager, Empty, StatusPill, useToast, useConfirm, useDebounced,
  ORDER_STATUS, tl, dateTime,
} from './ui/AdminUI'
import '../../storefront/storefront.css'
import './AdminOrders.css'

const STATUS_TABS = [{ id: '', label: 'Tümü' }, ...ORDER_STATUS.map((s) => ({ id: s.key, label: s.key }))]
const PAYMENT_FILTERS = [
  { id: '', label: 'Tüm ödemeler' },
  { id: 'transfer', label: 'Havale onayı bekleyen' },
  { id: 'unpaid', label: 'Ödenmemiş' },
  { id: 'paid', label: 'Ödenmiş' },
]
// Normal akış: her durumdan bir sonrakine tek tıkla geçilir
const NEXT = {
  Bekliyor: { to: 'Basımda', label: 'Basıma al' },
  Basımda: { to: 'Hazırlanıyor', label: 'Paketlemeye al' },
  Kargoda: { to: 'Teslim Edildi', label: 'Teslim edildi' },
}

const customerName = (o) =>
  o.shippingAddress?.fullName || [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ') || 'Misafir'

const PaymentCell = ({ o }) => {
  if (o.isPaid) return <span className="ak-tag ak-tag--ok">{o.paymentMethod === 'card' ? 'Kart · ödendi' : 'Havale · ödendi'}</span>
  if (o.status === 'İptal') return <span className="ak-tag">{o.paymentMethod === 'card' ? 'Kart' : 'Havale'}</span>
  return o.paymentMethod === 'transfer'
    ? <span className="ak-tag ak-tag--warn">Havale bekleniyor</span>
    : <span className="ak-tag ak-tag--danger">Kart · ödenmedi</span>
}

/* ================================================================ Sipariş detayı */
const OrderDetail = ({ order, carriers, onChanged, onClose }) => {
  const toast = useToast()
  const confirm = useConfirm()
  const [busy, setBusy] = useState('')
  const [carrier, setCarrier] = useState(order.carrier || carriers[0] || '')
  const [trackingNo, setTrackingNo] = useState(order.trackingNo || '')
  const [note, setNote] = useState('')

  const run = async (key, fn, okText) => {
    setBusy(key)
    try {
      const res = await fn()
      toast.ok(okText)
      onChanged(res.data)
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy('')
    }
  }

  const setStatus = async (status) => {
    if (status === 'İptal') {
      const ok = await confirm({
        title: `${order.orderNo} iptal edilsin mi?`,
        message: order.isPaid
          ? 'Bu siparişin ödemesi alınmış. İptalden sonra iadeyi PayTR panelinden ya da havale ile ayrıca yapmanız gerekir.\nStoklar ve kupon kullanımı geri alınır.'
          : 'Stoklar ve kupon kullanımı geri alınır.',
        confirmLabel: 'Siparişi iptal et',
        danger: true,
      })
      if (!ok) return
    } else if (status === 'Basımda' && !order.isPaid) {
      const ok = await confirm({
        title: 'Ödeme henüz alınmadı',
        message: 'Bu siparişin ödemesi onaylanmamış. Yine de basıma alınsın mı?',
        confirmLabel: 'Yine de basıma al',
      })
      if (!ok) return
    }
    run(`status-${status}`, () => updateOrderStatusApi(order._id, status, note.trim() || undefined), `Durum: ${status}`)
    setNote('')
  }

  const markPaid = async () => {
    const ok = await confirm({
      title: 'Havale ödemesi alındı mı?',
      message: `${tl(order.totalPrice)} tutarındaki ödemenin hesaba geçtiğini kontrol ettiyseniz onaylayın.`,
      confirmLabel: 'Ödemeyi onayla',
    })
    if (ok) run('pay', () => markOrderPaidApi(order._id), 'Ödeme onaylandı.')
  }

  const ship = () => {
    if (!carrier.trim() || !trackingNo.trim()) {
      toast.error('Kargo firması ve takip numarası girin.')
      return
    }
    run('ship', () => updateTrackingApi(order._id, { carrier: carrier.trim(), trackingNo: trackingNo.trim() }), 'Kargo bilgisi kaydedildi, müşteriye e-posta gönderildi.')
  }

  const downloadPdf = async () => {
    try {
      const blob = await getInvoicePDFApi(order._id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fatura-${order.orderNo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err, 'PDF indirilemedi.')
    }
  }

  const copy = (text) => {
    navigator.clipboard?.writeText(text)
    toast.info('Kopyalandı')
  }

  const addr = order.shippingAddress || {}
  const addressText = [addr.fullName, addr.phone, addr.address, [addr.neighborhood, addr.district, addr.city].filter(Boolean).join(' / ')].filter(Boolean).join('\n')
  const next = NEXT[order.status]
  const cancelled = order.status === 'İptal'

  return (
    <Drawer
      open
      wide
      onClose={onClose}
      title={order.orderNo}
      sub={`${dateTime(order.createdAt)} · ${customerName(order)}`}
      footer={(
        <>
          <button type="button" className="ak-btn" onClick={downloadPdf}><FiDownload size={14} /> Fatura PDF</button>
          {!cancelled && (
            <button type="button" className="ak-btn ak-btn--ghost-danger" onClick={() => setStatus('İptal')} disabled={Boolean(busy)}>
              <FiXCircle size={14} /> İptal et
            </button>
          )}
        </>
      )}
    >
      {/* Durum akışı */}
      <section className="ao-flow">
        <ol className="ao-steps">
          {ORDER_STATUS.filter((s) => s.key !== 'İptal').map((s, i, arr) => {
            const idx = arr.findIndex((x) => x.key === order.status)
            const state = cancelled ? '' : i < idx ? 'is-done' : i === idx ? 'is-current' : ''
            return <li key={s.key} className={state}>{s.key}</li>
          })}
        </ol>
        {cancelled && <p className="ao-cancelled"><FiXCircle /> Bu sipariş iptal edildi.</p>}

        <div className="ao-actions">
          {!order.isPaid && !cancelled && order.paymentMethod === 'transfer' && (
            <button type="button" className="ak-btn ak-btn--success" onClick={markPaid} disabled={Boolean(busy)}>
              <FiCheckCircle size={15} /> Havale ödemesini onayla
            </button>
          )}
          {next && (
            <button type="button" className="ak-btn ak-btn--primary" onClick={() => setStatus(next.to)} disabled={Boolean(busy)}>
              {busy === `status-${next.to}` ? 'Kaydediliyor…' : next.label} <FiArrowRight size={14} />
            </button>
          )}
          <select
            className="ak-select"
            value=""
            onChange={(e) => e.target.value && setStatus(e.target.value)}
            disabled={Boolean(busy)}
            aria-label="Durumu değiştir"
          >
            <option value="">Durumu değiştir…</option>
            {ORDER_STATUS.filter((s) => s.key !== order.status && s.key !== 'İptal').map((s) => (
              <option key={s.key} value={s.key}>{s.key}</option>
            ))}
          </select>
        </div>
        {!cancelled && (
          <input
            className="ak-input ao-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Durum notu (isteğe bağlı, geçmişte görünür)"
            maxLength={200}
          />
        )}
      </section>

      {/* Kargo */}
      {!cancelled && (order.status === 'Hazırlanıyor' || order.status === 'Kargoda' || order.trackingNo) && (
        <section className="ak-section">
          <h4><FiTruck /> Kargo</h4>
          <div className="ao-ship">
            <select className="ak-select" value={carrier} onChange={(e) => setCarrier(e.target.value)} aria-label="Kargo firması">
              {[...new Set([...carriers, order.carrier].filter(Boolean))].map((c) => <option key={c}>{c}</option>)}
            </select>
            <input className="ak-input" value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="Takip numarası" />
            <button type="button" className="ak-btn ak-btn--primary" onClick={ship} disabled={Boolean(busy)}>
              {order.trackingNo ? 'Güncelle' : 'Kargoya ver'}
            </button>
          </div>
          <p className="ak-hint">Kaydedince sipariş “Kargoda” olur ve müşteriye takip numarasıyla e-posta gider.</p>
        </section>
      )}

      {/* Ürünler */}
      <section className="ak-section">
        <h4>Ürünler</h4>
        <ul className="ao-items">
          {(order.items || []).map((it, i) => (
            <li key={it._id || i}>
              {it.image ? <img src={it.image} alt="" /> : <span className="ao-thumb" />}
              <div>
                <strong>{it.name}</strong>
                <LineOptions item={it} />
              </div>
              <span className="ao-qty">{it.quantity} ×</span>
              <span className="ak-num">{tl(it.price * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="ao-totals">
          <div><dt>Ara toplam</dt><dd>{tl(order.subtotal)}</dd></div>
          {order.discount > 0 && <div><dt>İndirim {order.couponCode && <span className="ak-tag">{order.couponCode}</span>}</dt><dd>−{tl(order.discount)}</dd></div>}
          <div><dt>Kargo {order.shippingMethod === 'express' && <span className="ak-tag ak-tag--info">Ekspres</span>}</dt><dd>{order.shippingCost ? tl(order.shippingCost) : 'Ücretsiz'}</dd></div>
          <div className="is-total"><dt>Toplam</dt><dd>{tl(order.totalPrice)}</dd></div>
        </dl>
      </section>

      {/* Müşteri, adres, ödeme */}
      <div className="ak-grid-2">
        <section className="ak-section">
          <h4>Teslimat adresi</h4>
          <div className="ao-address">
            <strong>{addr.fullName}</strong>
            {addr.phone && <a href={`tel:${addr.phone}`}><FiPhone size={13} /> {addr.phone}</a>}
            {order.user?.email && <a href={`mailto:${order.user.email}`}><FiMail size={13} /> {order.user.email}</a>}
            <span><FiMapPin size={13} /> {addr.address}<br />{[addr.neighborhood, addr.district, addr.city].filter(Boolean).join(' / ')}</span>
            <button type="button" className="ak-link" onClick={() => copy(addressText)}><FiCopy size={12} /> Adresi kopyala</button>
          </div>
        </section>
        <section className="ak-section">
          <h4><FiCreditCard /> Ödeme</h4>
          <dl className="ak-dl ao-dl">
            <dt>Yöntem</dt><dd>{order.paymentMethod === 'card' ? 'Kredi kartı (PayTR)' : 'Havale / EFT'}</dd>
            <dt>Durum</dt><dd><PaymentCell o={order} /></dd>
            {order.paidAt && <><dt>Ödeme tarihi</dt><dd>{dateTime(order.paidAt)}</dd></>}
          </dl>
        </section>
      </div>

      {order.customerNote && (
        <section className="ak-section">
          <h4>Müşteri notu</h4>
          <p className="ao-customer-note">{order.customerNote}</p>
        </section>
      )}

      <section className="ak-section">
        <h4>Geçmiş</h4>
        <ol className="ao-history">
          {[...(order.statusHistory || [])].reverse().map((h, i) => (
            <li key={h._id || i}>
              <StatusPill status={h.status} />
              <span>{h.note}</span>
              <time>{dateTime(h.date)}</time>
            </li>
          ))}
        </ol>
      </section>
    </Drawer>
  )
}

/* ================================================================ Liste */
const AdminOrders = () => {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const payment = params.get('payment') || ''
  const page = Number(params.get('page')) || 1
  const [search, setSearch] = useState(params.get('q') || '')
  const keyword = useDebounced(search.trim())
  const [openOrder, setOpenOrder] = useState(null)

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const listQuery = useQuery({
    queryKey: ['admin', 'orders', { status, payment, page, keyword }],
    queryFn: () => getOrdersApi({
      status: status || undefined,
      payment: payment || undefined,
      keyword: keyword || undefined,
      page,
      limit: 20,
      sort: 'createdAt',
      order: 'desc',
    }),
    placeholderData: keepPreviousData,
  })
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettingsApi, staleTime: 5 * 60 * 1000 })
  const carriers = settingsQuery.data?.data?.carriers || ['Yurtiçi Kargo', 'MNG Kargo', 'Aras Kargo']

  const orders = listQuery.data?.data || []

  const onChanged = (updated) => {
    // Açık panel güncel kalsın (filtre dışına düşse bile); liste ve genel bakış yenilensin
    setOpenOrder((prev) => (prev ? { ...prev, ...updated, user: prev.user } : prev))
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  return (
    <div className="ak-page">
      <PageHeader title="Siparişler" sub={`${(listQuery.data?.total || 0).toLocaleString('tr-TR')} sipariş`}>
        <button type="button" className="ak-btn" onClick={() => listQuery.refetch()} aria-label="Yenile">
          <FiRefreshCw size={14} className={listQuery.isFetching ? 'spin' : ''} /> Yenile
        </button>
      </PageHeader>

      <Segment items={STATUS_TABS} value={status} onChange={(v) => setParam('status', v)} label="Durum" />

      <div className="ak-toolbar">
        <label className="ak-search">
          <FiSearch size={15} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (page !== 1) setParam('page', '') }}
            placeholder="Sipariş no, alıcı adı veya telefon"
            aria-label="Sipariş ara"
          />
        </label>
        <select className="ak-select" value={payment} onChange={(e) => setParam('payment', e.target.value)} aria-label="Ödeme">
          {PAYMENT_FILTERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      <div className="ak-card">
        {listQuery.isPending ? (
          <div className="ak-loading"><FiRefreshCw className="spin" /> Yükleniyor…</div>
        ) : listQuery.isError ? (
          <Empty title="Siparişler alınamadı"><button type="button" className="ak-link" onClick={() => listQuery.refetch()}>Tekrar dene</button></Empty>
        ) : orders.length === 0 ? (
          <Empty icon={FiShoppingBag} title={keyword || status || payment ? 'Bu filtreye uyan sipariş yok' : 'Henüz sipariş yok'} />
        ) : (
          <div className="ak-table-wrap">
            <table className="ak-table">
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Müşteri</th>
                  <th>Ürünler</th>
                  <th>Ödeme</th>
                  <th>Durum</th>
                  <th className="ak-num">Tutar</th>
                </tr>
              </thead>
              <tbody className={listQuery.isFetching ? 'is-fetching' : ''}>
                {orders.map((o) => (
                  <tr
                    key={o._id}
                    className="is-clickable"
                    onClick={() => setOpenOrder(o)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setOpenOrder(o) }}
                  >
                    <td>
                      <span className="ak-strong">{o.orderNo}</span>
                      <span className="ak-sub">{dateTime(o.createdAt)}</span>
                    </td>
                    <td>
                      {customerName(o)}
                      <span className="ak-sub">{o.shippingAddress?.city}</span>
                    </td>
                    <td className="ao-items-cell">
                      {o.items?.[0]?.name}
                      {o.items?.length > 1 && <span className="ak-sub">+{o.items.length - 1} ürün daha</span>}
                    </td>
                    <td><PaymentCell o={o} /></td>
                    <td><StatusPill status={o.status} /></td>
                    <td className="ak-num ak-strong">{tl(o.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} pages={listQuery.data?.pages || 1} onChange={(p) => setParam('page', String(p))} />
      </div>

      {openOrder && (
        <OrderDetail
          key={openOrder._id}
          order={openOrder}
          carriers={carriers}
          onChanged={onChanged}
          onClose={() => setOpenOrder(null)}
        />
      )}
    </div>
  )
}

export default AdminOrders

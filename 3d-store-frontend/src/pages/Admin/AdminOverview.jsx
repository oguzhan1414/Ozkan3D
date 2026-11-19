import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  FiPrinter, FiCreditCard, FiTruck, FiStar, FiAlertTriangle, FiLayers,
  FiArrowUpRight, FiArrowDownRight, FiRefreshCw, FiTrendingUp, FiPackage, FiCheckCircle,
} from 'react-icons/fi'
import { getDashboardStatsApi } from '../../api/userApi'
import { getOrdersApi } from '../../api/orderApi'
import { formatPrice } from '../../storefront/catalog'
import './AdminOverview.css'

const PERIODS = [
  { id: 'today', label: 'Bugün' },
  { id: 'week', label: '7 gün' },
  { id: 'month', label: '30 gün' },
  { id: 'quarter', label: '3 ay' },
  { id: 'year', label: '12 ay' },
]

const STATUS = [
  { key: 'Bekliyor', color: '#f59e0b' },
  { key: 'Basımda', color: '#8b5cf6' },
  { key: 'Hazırlanıyor', color: '#2563eb' },
  { key: 'Kargoda', color: '#06b6d4' },
  { key: 'Teslim Edildi', color: '#16a34a' },
  { key: 'İptal', color: '#e53e3e' },
]
const statusColor = Object.fromEntries(STATUS.map((s) => [s.key, s.color]))

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
/** Grafik etiketleri: 2026-11-15 → 15 Kas, 2026-11 → Kas 26, 14:00 aynen */
const formatBucket = (b = '') => {
  const day = b.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (day) return `${Number(day[3])} ${MONTHS[Number(day[2]) - 1]}`
  const month = b.match(/^(\d{4})-(\d{2})$/)
  if (month) return `${MONTHS[Number(month[2]) - 1]} ${month[1].slice(2)}`
  return b
}

const compact = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 })
const dateTime = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="ov-tooltip">
      <span className="ov-tooltip-label">{label}</span>
      <strong>{formatPrice(row.revenue)}</strong>
      <span>{row.orders} sipariş</span>
    </div>
  )
}

const Change = ({ value }) => {
  if (value === null || value === undefined) return <span className="ov-change ov-change--flat">yeni</span>
  if (value === 0) return <span className="ov-change ov-change--flat">%0</span>
  const up = value > 0
  return (
    <span className={`ov-change ${up ? 'ov-change--up' : 'ov-change--down'}`}>
      {up ? <FiArrowUpRight size={12} /> : <FiArrowDownRight size={12} />}%{Math.abs(value)}
    </span>
  )
}

const AdminOverview = () => {
  const [period, setPeriod] = useState('month')

  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard', period],
    queryFn: () => getDashboardStatsApi({ period }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })
  const ordersQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'recent-orders'],
    queryFn: () => getOrdersApi({ limit: 6, sort: 'createdAt', order: 'desc' }).then((r) => r.data || []),
  })

  const stats = statsQuery.data
  const recentOrders = ordersQuery.data || []
  const refresh = () => { statsQuery.refetch(); ordersQuery.refetch() }

  if (statsQuery.isPending) {
    return (
      <div className="admin-overview">
        <div className="ov-loading"><FiRefreshCw size={22} className="spin" /> Veriler yükleniyor...</div>
      </div>
    )
  }

  if (statsQuery.isError || !stats) {
    return (
      <div className="admin-overview">
        <div className="ov-loading">
          İstatistikler alınamadı.
          <button type="button" className="ov-btn" onClick={refresh}>Tekrar dene</button>
        </div>
      </div>
    )
  }

  const todo = stats.todo || {}
  const todoItems = [
    { key: 'toPrint', label: 'Basıma alınacak', hint: 'Ödemesi alınmış, bekleyen', icon: FiPrinter, to: '/admin/orders?status=Bekliyor' },
    { key: 'awaitingTransfer', label: 'Havale bekleniyor', hint: 'Ödeme onayı gerekiyor', icon: FiCreditCard, to: '/admin/orders?payment=transfer' },
    { key: 'printing', label: 'Basımda', hint: 'Yazıcıda olan siparişler', icon: FiLayers, to: '/admin/orders?status=Basımda' },
    { key: 'toShip', label: 'Kargoya verilecek', hint: 'Hazırlanıyor durumunda', icon: FiTruck, to: '/admin/orders?status=Hazırlanıyor' },
    { key: 'pendingReviews', label: 'Onay bekleyen yorum', hint: 'Yayına alınmayı bekliyor', icon: FiStar, to: '/admin/reviews' },
    { key: 'lowStock', label: 'Stoğu azalan ürün', hint: `${stats.lowStockThreshold ?? 10} adet ve altı`, icon: FiAlertTriangle, to: '/admin/products' },
  ]
  // "Basımda" devam eden iş; bekleyen iş sayısına katılmaz
  const openTasks = todoItems.reduce((sum, t) => sum + (t.key === 'printing' ? 0 : todo[t.key] || 0), 0)

  const kpis = stats.kpis || {}
  const kpiCards = [
    { key: 'revenue', label: 'Ciro', value: formatPrice(kpis.revenue?.value), note: 'Ödenmiş siparişler' },
    { key: 'orders', label: 'Sipariş', value: (kpis.orders?.value || 0).toLocaleString('tr-TR'), note: 'İptaller hariç' },
    { key: 'avgOrder', label: 'Ortalama sepet', value: formatPrice(kpis.avgOrder?.value), note: 'Sipariş başına' },
    { key: 'newCustomers', label: 'Yeni müşteri', value: (kpis.newCustomers?.value || 0).toLocaleString('tr-TR'), note: `Toplam ${(stats.totalUsers || 0).toLocaleString('tr-TR')}` },
  ]

  const chartData = (stats.recentSales || []).map((s) => ({ ...s, label: formatBucket(s._id) }))
  const hasSales = chartData.some((s) => s.revenue > 0 || s.orders > 0)

  const statusCounts = stats.statusCounts || {}
  const statusTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  const topProducts = stats.topProducts || []
  const maxQty = Math.max(1, ...topProducts.map((p) => p.quantity))
  const lowStock = stats.lowStock || []

  return (
    <div className="admin-overview">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Genel Bakış</h1>
          <p className="admin-page-sub">
            {openTasks > 0 ? `Bekleyen ${openTasks} iş var. Önce aşağıdakilerle başlayın.` : 'Bekleyen iş yok, her şey yolunda.'}
          </p>
        </div>
        <div className="ov-head-actions">
          <div className="ov-segment" role="tablist" aria-label="Dönem">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={period === p.id}
                className={period === p.id ? 'is-active' : ''}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ov-icon-btn"
            onClick={refresh}
            aria-label="Yenile"
            title="Yenile"
          >
            <FiRefreshCw size={15} className={statsQuery.isFetching ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Yapılacaklar: döneme bağlı değil, şu anki durum */}
      <section aria-labelledby="ov-todo-title">
        <h2 id="ov-todo-title" className="ov-section-title">Yapılacaklar</h2>
        <div className="ov-todo-grid">
          {todoItems.map((t) => {
            const count = todo[t.key] || 0
            return (
              <Link key={t.key} to={t.to} className={`ov-todo ${count > 0 ? 'is-open' : ''} ${t.key === 'lowStock' && count > 0 ? 'is-warn' : ''}`}>
                <span className="ov-todo-icon"><t.icon size={16} /></span>
                <span className="ov-todo-count">{count}</span>
                <span className="ov-todo-label">{t.label}</span>
                <span className="ov-todo-hint">{count > 0 ? t.hint : 'Bekleyen yok'}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Dönem göstergeleri */}
      <section aria-label={`${stats.periodLabel} göstergeleri`}>
        <h2 className="ov-section-title">
          {stats.periodLabel} <span>önceki dönemle karşılaştırma</span>
        </h2>
        <div className="ov-kpi-grid">
          {kpiCards.map((k) => (
            <div key={k.key} className="ov-kpi">
              <div className="ov-kpi-top">
                <span className="ov-kpi-label">{k.label}</span>
                <Change value={kpis[k.key]?.change} />
              </div>
              <strong className="ov-kpi-value">{k.value}</strong>
              <span className="ov-kpi-note">{k.note}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="ov-row ov-row--chart">
        <div className="admin-card ov-card">
          <div className="admin-card-header">
            <h3><FiTrendingUp size={15} /> {stats.salesTitle}</h3>
            <span className="ov-muted">Ödenmiş siparişlerin cirosu</span>
          </div>
          <div className="ov-chart">
            {hasSales ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ovRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f1f1" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9a9a9a' }} axisLine={false} tickLine={false} minTickGap={16} />
                  <YAxis tick={{ fontSize: 11, fill: '#9a9a9a' }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => compact.format(v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#d4d4d4' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#ovRevenue)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="ov-empty"><FiTrendingUp size={26} /><p>Bu dönemde satış yok</p></div>
            )}
          </div>
        </div>

        <div className="admin-card ov-card">
          <div className="admin-card-header">
            <h3>Sipariş durumları</h3>
            <span className="ov-muted">{statusTotal} sipariş</span>
          </div>
          <ul className="ov-status-list">
            {STATUS.map((s) => {
              const count = statusCounts[s.key] || 0
              const pct = statusTotal ? Math.round((count / statusTotal) * 100) : 0
              return (
                <li key={s.key}>
                  <Link to={`/admin/orders?status=${encodeURIComponent(s.key)}`}>
                    <span className="ov-status-name"><i style={{ background: s.color }} />{s.key}</span>
                    <span className="ov-status-count">{count}</span>
                    <span className="ov-status-bar"><span style={{ width: `${pct}%`, background: s.color }} /></span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="ov-row">
        <div className="admin-card ov-card">
          <div className="admin-card-header">
            <h3>En çok satanlar</h3>
            <span className="ov-muted">{stats.periodLabel}</span>
          </div>
          {topProducts.length > 0 ? (
            <ol className="ov-top-list">
              {topProducts.map((p, i) => (
                <li key={p.product || p.name}>
                  <span className="ov-rank">{i + 1}</span>
                  {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span className="ov-thumb"><FiPackage size={14} /></span>}
                  <div className="ov-top-info">
                    <span className="ov-top-name">{p.name}</span>
                    <span className="ov-top-bar"><span style={{ width: `${(p.quantity / maxQty) * 100}%` }} /></span>
                  </div>
                  <div className="ov-top-nums">
                    <strong>{p.quantity} adet</strong>
                    <span>{formatPrice(p.revenue)}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="ov-empty ov-empty--sm"><FiPackage size={22} /><p>Bu dönemde satılan ürün yok</p></div>
          )}
        </div>

        <div className="admin-card ov-card">
          <div className="admin-card-header">
            <h3>Stoğu azalanlar</h3>
            <Link to="/admin/products" className="admin-card-link">Ürünler →</Link>
          </div>
          {lowStock.length > 0 ? (
            <ul className="ov-stock-list">
              {lowStock.map((p) => (
                <li key={p._id}>
                  {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span className="ov-thumb"><FiPackage size={14} /></span>}
                  <span className="ov-stock-name">{p.name}</span>
                  <span className={`ov-stock-badge ${p.stock === 0 ? 'is-out' : ''}`}>
                    {p.stock === 0 ? 'Tükendi' : `${p.stock} adet`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ov-empty ov-empty--sm"><FiCheckCircle size={22} /><p>Stoklar yeterli</p></div>
          )}
        </div>
      </div>

      <div className="admin-card ov-card">
        <div className="admin-card-header">
          <h3>Son siparişler</h3>
          <Link to="/admin/orders" className="admin-card-link">Tümü →</Link>
        </div>
        {recentOrders.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table ov-orders">
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Müşteri</th>
                  <th>Ürünler</th>
                  <th>Ödeme</th>
                  <th>Durum</th>
                  <th className="ov-num">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <span className="ov-order-no">{o.orderNo || '—'}</span>
                      <span className="ov-sub">{o.createdAt ? dateTime.format(new Date(o.createdAt)) : ''}</span>
                    </td>
                    <td>{[o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ') || o.shippingAddress?.fullName || 'Misafir'}</td>
                    <td className="ov-items">
                      {o.items?.[0]?.name}
                      {o.items?.length > 1 && <span className="ov-sub"> +{o.items.length - 1} ürün</span>}
                    </td>
                    <td>
                      <span className={`ov-pay ${o.isPaid ? 'is-paid' : ''}`}>
                        {o.isPaid ? 'Ödendi' : o.paymentMethod === 'transfer' ? 'Havale bekleniyor' : 'Ödenmedi'}
                      </span>
                    </td>
                    <td>
                      <span className="ov-status-pill" style={{ '--c': statusColor[o.status] || '#888' }}>{o.status}</span>
                    </td>
                    <td className="ov-num"><strong>{formatPrice(o.totalPrice)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ov-empty ov-empty--sm"><p>Henüz sipariş yok</p></div>
        )}
      </div>
    </div>
  )
}

export default AdminOverview

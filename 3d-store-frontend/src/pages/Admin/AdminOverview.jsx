import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area
} from 'recharts'
import {
  FiShoppingBag, FiDollarSign, FiUsers, FiPackage,
  FiStar, FiArrowUp, FiArrowDown, FiAlertTriangle,
  FiClock, FiMessageSquare, FiTrendingUp, FiRefreshCw
} from 'react-icons/fi'
import { getDashboardStatsApi } from '../../api/userApi'
import { getOrdersApi } from '../../api/orderApi'
import { getProductsApi } from '../../api/productApi'
import './AdminOverview.css'

const categoryData = [
  { name: 'Figürler', value: 35, color: '#2563eb' },
  { name: 'Dekorasyon', value: 28, color: '#16a34a' },
  { name: 'Aksesuar', value: 22, color: '#f59e0b' },
  { name: 'Diğer', value: 15, color: '#8b5cf6' },
]

const statusColors = {
  'Bekliyor': '#f59e0b',
  'Basımda': '#8b5cf6',
  'Hazırlanıyor': '#2563eb',
  'Kargoda': '#06b6d4',
  'Teslim Edildi': '#16a34a',
  'İptal': '#e53e3e',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' ? `${p.value.toLocaleString('tr-TR')}${p.name?.includes('Ciro') ? '₺' : ''}` : p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const AdminOverview = () => {
  const [period, setPeriod] = useState('month')
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (selectedPeriod = period) => {
    setLoading(true)
    try {
      const [statsRes, ordersRes, productsRes] = await Promise.all([
        getDashboardStatsApi({ period: selectedPeriod }),
        getOrdersApi({ limit: 8, sort: 'createdAt', order: 'desc' }),
        getProductsApi({ limit: 50 }),
      ])

      setStats(statsRes.data)
      setRecentOrders(ordersRes.data || [])

      // Düşük stoklu ürünler
      const lowStock = (productsRes.data || []).filter(p => p.stock < 10)
      setLowStockProducts(lowStock)
    } catch (err) {
      console.log('Dashboard veri hatası:', err.message)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData(period)
  }, [period, fetchData])

  // Satış grafiği verisi
  const salesChartData = stats?.recentSales?.map(s => ({
    label: s._id,
    Ciro: s.revenue,
    Sipariş: s.orders,
  })) || []

  const periodLabel = stats?.periodLabel || 'Bu Ay'

  // Sipariş durumu bar chart
  const orderStatusData = [
    { name: 'Bekliyor', value: stats?.pendingOrders || 0, color: '#f59e0b' },
    { name: 'Hazırlanıyor', value: stats?.processingOrders || 0, color: '#2563eb' },
    { name: 'Teslim', value: (stats?.totalOrders || 0) - (stats?.pendingOrders || 0) - (stats?.processingOrders || 0), color: '#16a34a' },
  ]

  const kpis = [
    {
      label: `${periodLabel} Sipariş`,
      value: stats?.totalOrders?.toLocaleString('tr-TR') || '0',
      change: '+12%', up: true,
      icon: FiShoppingBag, color: '#2563eb', bg: '#eff6ff'
    },
    {
      label: `${periodLabel} Ciro`,
      value: `${(stats?.totalRevenue || 0).toLocaleString('tr-TR')}₺`,
      change: '+18%', up: true,
      icon: FiDollarSign, color: '#16a34a', bg: '#f0fdf4'
    },
    {
      label: 'Toplam Müşteri',
      value: stats?.totalUsers?.toLocaleString('tr-TR') || '0',
      change: '+8%', up: true,
      icon: FiUsers, color: '#8b5cf6', bg: '#f5f3ff'
    },
    {
      label: 'Bekleyen Sipariş',
      value: stats?.pendingOrders?.toString() || '0',
      change: `${stats?.processingOrders || 0} işlemde`,
      warn: true,
      icon: FiPackage, color: '#f59e0b', bg: '#fffbeb'
    },
    {
      label: 'Düşük Stok',
      value: lowStockProducts.length.toString(),
      change: 'ürün kritik',
      warn: lowStockProducts.length > 0,
      icon: FiAlertTriangle,
      color: lowStockProducts.length > 0 ? '#e53e3e' : '#16a34a',
      bg: lowStockProducts.length > 0 ? '#fff0f0' : '#f0fdf4'
    },
  ]

  if (loading) return (
    <div className="admin-overview">
      <div className="overview-loading">
        <FiRefreshCw size={24} className="spin" />
        <span>Veriler yükleniyor...</span>
      </div>
    </div>
  )

  return (
    <div className="admin-overview">

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Genel Bakış</h1>
          <p className="admin-page-sub">Mağazanın genel durumunu buradan takip edin.</p>
        </div>
        <div className="admin-header-actions">
          <div className="admin-period-tabs">
            {[
              { id: 'today', label: 'Bugün' },
              { id: 'week', label: 'Bu Hafta' },
              { id: 'month', label: 'Bu Ay' },
              { id: 'year', label: 'Bu Yıl' },
            ].map(p => (
              <button
                key={p.id}
                className={`admin-period-tab ${period === p.id ? 'admin-period-active' : ''}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button className="admin-refresh-btn" onClick={() => fetchData(period)}>
            <FiRefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="overview-kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className="overview-kpi-card">
            <div className="overview-kpi-top">
              <div className="overview-kpi-icon" style={{ background: k.bg, color: k.color }}>
                <k.icon size={20} />
              </div>
              <span className={`overview-kpi-change ${k.warn ? 'kpi-warn' : k.neutral ? 'kpi-neutral' : k.up ? 'kpi-up' : 'kpi-down'}`}>
                {!k.neutral && !k.warn && (k.up ? <FiArrowUp size={11} /> : <FiArrowDown size={11} />)}
                {k.change}
              </span>
            </div>
            <div className="overview-kpi-value">{k.value}</div>
            <div className="overview-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="overview-charts-row">

        {/* Sales Area Chart */}
        <div className="admin-card overview-chart-main">
          <div className="admin-card-header">
            <div className="overview-chart-title">
              <FiTrendingUp size={16} />
              <h3>{stats?.salesTitle || `${periodLabel} Satış`}</h3>
            </div>
          </div>
          <div className="overview-chart-body">
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={salesChartData}>
                  <defs>
                    <linearGradient id="ciroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#aaaaaa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#aaaaaa' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Ciro" stroke="#2563eb" strokeWidth={2.5} fill="url(#ciroGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <FiTrendingUp size={32} />
                <p>Henüz satış verisi yok</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Pie */}
        <div className="admin-card overview-chart-side">
          <div className="admin-card-header">
            <h3>Kategori Dağılımı</h3>
          </div>
          <div className="overview-chart-body">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `%${value}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {categoryData.map((c, i) => (
                <div key={i} className="pie-legend-item">
                  <span className="legend-dot" style={{ background: c.color }} />
                  <span className="pie-legend-name">{c.name}</span>
                  <span className="pie-legend-value">%{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="overview-bottom-row">

        {/* Sipariş Durumları */}
        <div className="admin-card overview-bar-card">
          <div className="admin-card-header">
            <h3>Sipariş Durumları</h3>
          </div>
          <div className="overview-chart-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orderStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#aaaaaa' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#aaaaaa' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" name="Sipariş" radius={[6, 6, 0, 0]}>
                  {orderStatusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aktiviteler */}
        <div className="admin-card overview-activity-card">
          <div className="admin-card-header">
            <h3>Son Aktiviteler</h3>
            <Link to="/admin/orders" className="admin-card-link">Tümü →</Link>
          </div>

          {/* Son Siparişler */}
          <div className="activity-section">
            <div className="activity-section-title">
              <FiClock size={13} />
              <span>Son Siparişler</span>
            </div>
            <div className="activity-list">
              {recentOrders.length > 0 ? recentOrders.map((o, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-avatar">
                    {o.user?.firstName?.[0]}{o.user?.lastName?.[0]}
                  </div>
                  <div className="activity-info">
                    <span className="activity-name">
                      {o.user?.firstName} {o.user?.lastName}
                    </span>
                    <span className="activity-product">
                      {o.items?.[0]?.name}
                      {o.items?.length > 1 && ` +${o.items.length - 1}`}
                    </span>
                  </div>
                  <div className="activity-right">
                    <span className="activity-price">{o.totalPrice?.toLocaleString('tr-TR')}₺</span>
                    <span
                      className="activity-status"
                      style={{ color: statusColors[o.status] }}
                    >
                      {o.status}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="activity-empty">Henüz sipariş yok</div>
              )}
            </div>
          </div>

          {/* Düşük Stok */}
          {lowStockProducts.length > 0 && (
            <div className="activity-section">
              <div className="activity-section-title">
                <FiAlertTriangle size={13} />
                <span>Düşük Stok Uyarısı</span>
              </div>
              <div className="activity-list">
                {lowStockProducts.slice(0, 4).map((p, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-avatar" style={{ background: p.stock === 0 ? '#ef4444' : '#f59e0b' }}>
                      {p.stock}
                    </div>
                    <div className="activity-info">
                      <span className="activity-name">{p.name}</span>
                      <span className="activity-product">{p.category}</span>
                    </div>
                    <div className="activity-right">
                      <span className={`stock-warn-badge ${p.stock === 0 ? 'stock-out' : 'stock-low'}`}>
                        {p.stock === 0 ? 'Tükendi' : 'Kritik'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminOverview
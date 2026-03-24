import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import {
  FiTrendingUp, FiDollarSign, FiShoppingBag, FiUsers,
  FiPackage, FiRefreshCw
} from 'react-icons/fi'
import { getDashboardStatsApi, getUsersApi } from '../../api/userApi'
import { getOrdersApi } from '../../api/orderApi'
import { getProductsApi } from '../../api/productApi'
import './AdminReports.css'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number'
              ? p.name?.includes('Ciro')
                ? `${p.value.toLocaleString('tr-TR')}₺`
                : p.value.toLocaleString('tr-TR')
              : p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const AdminReports = () => {
  const [period, setPeriod] = useState('year')
  const [activeReport, setActiveReport] = useState('sales')
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState(null)
  const [allOrders, setAllOrders] = useState([])
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsRes, ordersRes, productsRes, usersRes] = await Promise.all([
        getDashboardStatsApi(),
        getOrdersApi({ limit: 100, sort: 'createdAt', order: 'asc' }),
        getProductsApi({ limit: 50 }),
        getUsersApi({ limit: 100 }),
      ])

      setStats(statsRes.data)
      setAllOrders(ordersRes.data || [])
      setProducts(productsRes.data || [])
      // Admin kullanıcıları filtrele
      const normalUsers = (usersRes.data || []).filter(u => u.role !== 'admin')
      setUsers(normalUsers)
    } catch (err) {
      console.log('Rapor verisi yüklenemedi:', err.message)
    } finally {
      setLoading(false)
    }
  }

  // Satış grafiği
  const salesChartData = stats?.recentSales?.map(s => ({
    day: s._id,
    Ciro: s.revenue,
    Sipariş: s.orders,
  })) || []

  // Sipariş durumu dağılımı
  const statusCounts = allOrders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  const orderStatusData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
    color: {
      'Bekliyor': '#f59e0b',
      'Basımda': '#8b5cf6',
      'Hazırlanıyor': '#2563eb',
      'Kargoda': '#06b6d4',
      'Teslim Edildi': '#16a34a',
      'İptal': '#e53e3e',
    }[name] || '#888888'
  }))

  // Top ürünler
  const productSales = {}
  allOrders.forEach(order => {
    order.items?.forEach(item => {
      if (!productSales[item.name]) {
        productSales[item.name] = { name: item.name, sales: 0, revenue: 0 }
      }
      productSales[item.name].sales += item.quantity
      productSales[item.name].revenue += item.price * item.quantity
    })
  })
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10)

  // Stok durumu
  const stockData = products.map(p => ({
    name: p.name,
    category: p.category,
    stock: p.stock,
    status: p.stock === 0 ? 'critical' : p.stock < 5 ? 'critical' : p.stock < 10 ? 'low' : p.stock > 50 ? 'high' : 'normal'
  }))

  // Ödeme yöntemi dağılımı — gerçek veri
  const paymentData = [
    {
      name: 'Kredi Kartı',
      value: allOrders.filter(o => o.paymentMethod === 'card').length,
      color: '#2563eb'
    },
    {
      name: 'Havale/EFT',
      value: allOrders.filter(o => o.paymentMethod === 'transfer').length,
      color: '#16a34a'
    },
  ]

  // Aylık yeni üye
  const monthlyUsers = (() => {
    const months = {}
    users.forEach(u => {
      const d = new Date(u.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months[key] = (months[key] || 0) + 1
    })
    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, count]) => ({ month, Üye: count }))
  })()

  const now = new Date()
  const newUsersThisMonth = users.filter(u => {
    const d = new Date(u.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const totalRevenue = stats?.totalRevenue || 0
  const totalOrders = stats?.totalOrders || 0
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  const kpis = [
    { label: 'Toplam Ciro', value: `${totalRevenue.toLocaleString('tr-TR')}₺`, icon: FiDollarSign, color: '#2563eb', bg: '#eff6ff', trend: '+18%' },
    { label: 'Toplam Sipariş', value: totalOrders.toLocaleString('tr-TR'), icon: FiShoppingBag, color: '#16a34a', bg: '#f0fdf4', trend: '+12%' },
    { label: 'Toplam Müşteri', value: users.length.toString(), icon: FiUsers, color: '#8b5cf6', bg: '#f5f3ff', trend: '+8%' },
    { label: 'Ortalama Sipariş', value: `${avgOrder.toLocaleString('tr-TR')}₺`, icon: FiTrendingUp, color: '#f59e0b', bg: '#fffbeb', trend: '+5%' },
  ]

  const reportTabs = [
    { id: 'sales', label: '📈 Satış Raporu' },
    { id: 'products', label: '📦 Ürün Raporu' },
    { id: 'stock', label: '🏭 Stok Raporu' },
    { id: 'customers', label: '👥 Müşteri Analizi' },
  ]

  if (loading) return (
    <div className="admin-reports">
      <div className="overview-loading">
        <FiRefreshCw size={24} className="spin" />
        <span>Raporlar yükleniyor...</span>
      </div>
    </div>
  )

  return (
    <div className="admin-reports">

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Raporlar & Analizler</h1>
          <p className="admin-page-sub">Mağaza performansını detaylı inceleyin</p>
        </div>
        <div className="reports-header-actions">
          <div className="admin-period-tabs">
            {[
              { id: 'month', label: 'Bu Ay' },
              { id: 'quarter', label: 'Çeyrek' },
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
          <button className="export-btn" onClick={fetchData}>
            <FiRefreshCw size={15} /> Yenile
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="reports-kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className="report-kpi-card">
            <div className="report-kpi-icon" style={{ background: k.bg, color: k.color }}>
              <k.icon size={20} />
            </div>
            <div>
              <strong>{k.value}</strong>
              <span>{k.label}</span>
            </div>
            <span className="kpi-trend kpi-up">{k.trend}</span>
          </div>
        ))}
      </div>

      {/* Report Tabs */}
      <div className="report-tabs">
        {reportTabs.map(t => (
          <button
            key={t.id}
            className={`report-tab ${activeReport === t.id ? 'report-tab-active' : ''}`}
            onClick={() => setActiveReport(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sales Report */}
      {activeReport === 'sales' && (
        <div className="report-content">
          <div className="report-charts-row">

            <div className="admin-card report-chart-main">
              <div className="admin-card-header">
                <div className="report-chart-title">
                  <FiTrendingUp size={16} />
                  <h3>Son 30 Gün Satış</h3>
                </div>
              </div>
              <div className="report-chart-body">
                {salesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={salesChartData}>
                      <defs>
                        <linearGradient id="ciroGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#aaaaaa' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#aaaaaa' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
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

            <div className="admin-card report-chart-side">
              <div className="admin-card-header">
                <h3>Sipariş Durumları</h3>
              </div>
              <div className="report-chart-body">
                {orderStatusData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                          {orderStatusData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="city-legend">
                      {orderStatusData.map((s, i) => (
                        <div key={i} className="city-legend-item">
                          <span className="legend-dot" style={{ background: s.color }} />
                          <span className="city-name">{s.name}</span>
                          <span className="city-value">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="chart-empty"><p>Sipariş verisi yok</p></div>
                )}
              </div>
            </div>
          </div>

          {/* Son Siparişler */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3>Son Siparişler</h3>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sipariş No</th>
                    <th>Müşteri</th>
                    <th>Tutar</th>
                    <th>Durum</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.slice(-10).reverse().map((o, i) => (
                    <tr key={i}>
                      <td><span className="order-id-badge">{o.orderNo}</span></td>
                      <td className="td-name">{o.user?.firstName} {o.user?.lastName}</td>
                      <td className="td-price">{o.totalPrice?.toLocaleString('tr-TR')}₺</td>
                      <td>
                        <span style={{
                          fontSize: '0.78rem', fontWeight: 700,
                          color: {
                            'Bekliyor': '#f59e0b', 'Teslim Edildi': '#16a34a',
                            'Kargoda': '#06b6d4', 'İptal': '#e53e3e',
                            'Basımda': '#8b5cf6', 'Hazırlanıyor': '#2563eb',
                          }[o.status] || '#888'
                        }}>
                          {o.status}
                        </span>
                      </td>
                      <td className="td-date">
                        {new Date(o.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Products Report */}
      {activeReport === 'products' && (
        <div className="report-content">
          <div className="admin-card">
            <div className="admin-card-header">
              <h3>En Çok Satan Ürünler</h3>
            </div>
            {topProducts.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ürün</th>
                      <th>Satış</th>
                      <th>Gelir</th>
                      <th>Performans</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={i}>
                        <td>
                          <span className={`rank-num ${i < 3 ? `rank-${i + 1}` : ''}`}>{i + 1}</span>
                        </td>
                        <td className="td-name">{p.name}</td>
                        <td><strong>{p.sales}</strong> adet</td>
                        <td className="td-price">{p.revenue.toLocaleString('tr-TR')}₺</td>
                        <td>
                          <div className="performance-bar-wrap">
                            <div className="performance-bar">
                              <div
                                className="performance-fill"
                                style={{ width: `${(p.sales / (topProducts[0]?.sales || 1)) * 100}%` }}
                              />
                            </div>
                            <span>{Math.round((p.sales / (topProducts[0]?.sales || 1)) * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="chart-empty" style={{ padding: '40px' }}>
                <FiPackage size={32} />
                <p>Henüz satış verisi yok</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Report */}
      {activeReport === 'stock' && (
        <div className="report-content">
          <div className="stock-report-stats">
            {[
              { label: 'Kritik (0-5)', count: stockData.filter(s => s.status === 'critical').length, cls: 'stock-critical-card' },
              { label: 'Düşük (6-10)', count: stockData.filter(s => s.status === 'low').length, cls: 'stock-low-card' },
              { label: 'Normal', count: stockData.filter(s => s.status === 'normal').length, cls: 'stock-normal-card' },
              { label: 'Fazla (50+)', count: stockData.filter(s => s.status === 'high').length, cls: 'stock-high-card' },
            ].map((s, i) => (
              <div key={i} className={`stock-stat-card ${s.cls}`}>
                <FiPackage size={20} />
                <strong>{s.count}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h3>Stok Durumu</h3>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Kategori</th>
                    <th>Stok</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.length > 0 ? stockData.map((s, i) => (
                    <tr key={i}>
                      <td className="td-name">{s.name}</td>
                      <td><span className="category-badge">{s.category}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="stock-level-bar">
                            <div
                              className="stock-level-fill"
                              style={{
                                width: `${Math.min((s.stock / 70) * 100, 100)}%`,
                                background: s.status === 'critical' ? '#e53e3e' :
                                  s.status === 'low' ? '#f59e0b' :
                                  s.status === 'high' ? '#8b5cf6' : '#16a34a'
                              }}
                            />
                          </div>
                          <span className="stock-number">{s.stock}</span>
                        </div>
                      </td>
                      <td>
                        <span className="stock-status-badge">
                          {s.status === 'critical' ? '🔴 Kritik' :
                           s.status === 'low' ? '🟡 Düşük' :
                           s.status === 'high' ? '🟣 Fazla' : '🟢 Normal'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                        Ürün bulunamadı
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customers Report */}
      {activeReport === 'customers' && (
        <div className="report-content">
          <div className="report-charts-row">

            {/* Aylık Yeni Üye */}
            <div className="admin-card report-chart-main">
              <div className="admin-card-header">
                <h3>Aylık Yeni Üye</h3>
              </div>
              <div className="report-chart-body">
                {monthlyUsers.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyUsers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#aaaaaa' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#aaaaaa' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="Üye" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">
                    <FiUsers size={32} />
                    <p>Kullanıcı verisi yok</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ödeme Yöntemi */}
            <div className="admin-card report-chart-side">
              <div className="admin-card-header">
                <h3>Ödeme Yöntemi</h3>
              </div>
              <div className="report-chart-body">
                {paymentData.some(p => p.value > 0) ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={paymentData.filter(p => p.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {paymentData.filter(p => p.value > 0).map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="city-legend">
                      {paymentData.filter(p => p.value > 0).map((p, i) => (
                        <div key={i} className="city-legend-item">
                          <span className="legend-dot" style={{ background: p.color }} />
                          <span className="city-name">{p.name}</span>
                          <span className="city-value">{p.value} sipariş</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="chart-empty">
                    <p>Ödeme verisi yok</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analiz Kartları */}
          <div className="customer-analysis-cards">
            {[
              { icon: '👥', label: 'Toplam Müşteri', value: users.length },
              { icon: '🆕', label: 'Bu Ay Yeni', value: newUsersThisMonth },
              { icon: '💳', label: 'Ort. Sipariş', value: `${avgOrder.toLocaleString('tr-TR')}₺` },
              { icon: '📦', label: 'Toplam Sipariş', value: totalOrders },
            ].map((c, i) => (
              <div key={i} className="analysis-card">
                <span className="analysis-icon">{c.icon}</span>
                <div>
                  <strong>{c.value}</strong>
                  <span>{c.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReports
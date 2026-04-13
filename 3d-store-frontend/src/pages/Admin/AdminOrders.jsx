import { useState, useEffect, useCallback } from 'react'
import {
  FiSearch, FiEye, FiTruck, FiX,
  FiCheck, FiFilter, FiRefreshCw
} from 'react-icons/fi'
import {
  getOrdersApi, updateOrderStatusApi,
  updateTrackingApi, getInvoicePDFApi
} from '../../api/orderApi'
import './AdminOrders.css'

const statusOptions = ['Tümü', 'Bekliyor', 'Basımda', 'Hazırlanıyor', 'Kargoda', 'Teslim Edildi', 'İptal']
const carrierOptions = ['Yurtiçi Kargo', 'MNG Kargo', 'Aras Kargo', 'PTT Kargo', 'Sürat Kargo']

const statusColors = {
  'Bekliyor': '#f59e0b',
  'Basımda': '#8b5cf6',
  'Hazırlanıyor': '#2563eb',
  'Kargoda': '#06b6d4',
  'Teslim Edildi': '#16a34a',
  'İptal': '#e53e3e',
}

const AdminOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tümü')
  const [showFilters, setShowFilters] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const [selectedOrder, setSelectedOrder] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [trackingData, setTrackingData] = useState({ trackingNo: '', carrier: '' })
  const [adminNote, setAdminNote] = useState('')
  const [updating, setUpdating] = useState(false)
  const [statusUpdatingOrderId, setStatusUpdatingOrderId] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        limit: 15,
        sort: 'createdAt',
        order: 'desc',
      }
      if (statusFilter !== 'Tümü') params.status = statusFilter

      const res = await getOrdersApi(params)
      setOrders(res.data || [])
      setTotal(res.total || 0)
      setPages(res.pages || 1)
    } catch (err) {
      console.log('Siparişler yüklenemedi:', err.message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, currentPage])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleStatusUpdate = async (orderId, newStatus) => {
    const order = orders.find((item) => item._id === orderId)
    const currentStatus = order?.status

    if (!currentStatus || currentStatus === newStatus) return

    const confirmed = window.confirm(
      `${order?.orderNo || 'Sipariş'} durumu "${currentStatus}" -> "${newStatus}" olarak güncellensin mi?`
    )
    if (!confirmed) return

    setStatusUpdatingOrderId(orderId)
    try {
      await updateOrderStatusApi(orderId, newStatus)
      setOrders(prev => prev.map(o =>
        o._id === orderId ? { ...o, status: newStatus } : o
      ))
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      console.log('Durum güncellenemedi:', err.message)
      alert('Sipariş durumu güncellenemedi.')
    } finally {
      setStatusUpdatingOrderId(null)
    }
  }

  const handleSaveTracking = async () => {
    if (!trackingData.trackingNo || !trackingData.carrier) return
    setUpdating(true)
    try {
      await updateTrackingApi(editingOrder._id, trackingData)
      setOrders(prev => prev.map(o =>
        o._id === editingOrder._id
          ? { ...o, trackingNo: trackingData.trackingNo, carrier: trackingData.carrier, status: 'Kargoda' }
          : o
      ))
      setEditingOrder(null)
    } catch (err) {
      console.log('Kargo güncellenemedi:', err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleDownloadPDF = async (orderId) => {
    try {
      const blob = await getInvoicePDFApi(orderId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fatura-${orderId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.log('PDF indirilemedi:', err.message)
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchSearch = search === '' ||
      o.orderNo?.toLowerCase().includes(search.toLowerCase()) ||
      `${o.user?.firstName} ${o.user?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      o.items?.[0]?.name?.toLowerCase().includes(search.toLowerCase())
    const matchMin = minPrice === '' || o.totalPrice >= Number(minPrice)
    const matchMax = maxPrice === '' || o.totalPrice <= Number(maxPrice)
    return matchSearch && matchMin && matchMax
  })

  return (
    <div className="admin-orders">

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Siparişler</h1>
          <p className="admin-page-sub">{total} sipariş listeleniyor</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`orders-filter-toggle ${showFilters ? 'filter-toggle-active' : ''}`}
            onClick={() => setShowFilters(p => !p)}
          >
            <FiFilter size={15} /> Gelişmiş Filtre
          </button>
          <button className="admin-add-btn" onClick={fetchOrders}>
            <FiRefreshCw size={15} /> Yenile
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="orders-status-tabs">
        {statusOptions.map(s => (
          <button
            key={s}
            className={`admin-filter-tab ${statusFilter === s ? 'admin-filter-active' : ''}`}
            onClick={() => { setStatusFilter(s); setCurrentPage(1) }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="orders-advanced-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Müşteri / Sipariş Ara</label>
              <div className="admin-search-wrap">
                <FiSearch size={15} className="admin-search-icon" />
                <input
                  type="text"
                  placeholder="Sipariş no, müşteri adı..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="admin-search-input"
                />
              </div>
            </div>
            <div className="filter-group">
              <label>Fiyat Aralığı</label>
              <div className="price-filter-row">
                <input
                  type="number"
                  placeholder="Min ₺"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  className="admin-input price-filter-input"
                />
                <span>—</span>
                <input
                  type="number"
                  placeholder="Max ₺"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  className="admin-input price-filter-input"
                />
              </div>
            </div>
            <button className="filter-clear-btn" onClick={() => {
              setSearch('')
              setMinPrice('')
              setMaxPrice('')
              setStatusFilter('Tümü')
            }}>
              <FiX size={14} /> Temizle
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="admin-card">
        {loading ? (
          <div className="admin-table-loading">
            <FiRefreshCw size={20} className="spin" />
            <span>Yükleniyor...</span>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sipariş No</th>
                  <th>Müşteri</th>
                  <th>Ürün(ler)</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th>Kargo</th>
                  <th>Tarih</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                  <tr key={order._id}>
                    <td><span className="order-id-badge">{order.orderNo}</span></td>
                    <td>
                      <div className="td-customer">
                        <div className="orders-customer-avatar">
                          {order.user?.firstName?.[0]}{order.user?.lastName?.[0]}
                        </div>
                        <div>
                          <strong>{order.user?.firstName} {order.user?.lastName}</strong>
                          <span>{order.user?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="td-product">
                      {order.items?.[0]?.name}
                      {order.items?.length > 1 && (
                        <span className="items-more"> +{order.items.length - 1}</span>
                      )}
                    </td>
                    <td className="td-price">{order.totalPrice?.toLocaleString('tr-TR')}₺</td>
                    <td>
                      <select
                        className="status-select-inline"
                        value={order.status}
                        onChange={e => handleStatusUpdate(order._id, e.target.value)}
                        disabled={statusUpdatingOrderId === order._id}
                        style={{ color: statusColors[order.status] }}
                      >
                        {statusOptions.filter(s => s !== 'Tümü').map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {order.trackingNo ? (
                        <span className="tracking-badge">
                          <FiTruck size={11} /> {order.trackingNo}
                        </span>
                      ) : (
                        <button
                          className="add-tracking-btn"
                          onClick={() => {
                            setEditingOrder(order)
                            setTrackingData({ trackingNo: '', carrier: '' })
                          }}
                        >
                          + Takip No
                        </button>
                      )}
                    </td>
                    <td className="td-date">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td>
                      <div className="td-actions">
                        <button
                          className="td-action-btn"
                          onClick={() => {
                            setSelectedOrder(order)
                            setAdminNote(order.adminNote || '')
                          }}
                        >
                          <FiEye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#aaaaaa' }}>
                      Sipariş bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="admin-pagination">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                className={`pagination-btn ${currentPage === i + 1 ? 'pagination-active' : ''}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="admin-modal admin-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Sipariş — {selectedOrder.orderNo}</h3>
              <button className="admin-modal-close" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="order-detail-grid">

                <div className="order-detail-section">
                  <h4 className="order-detail-section-title">👤 Müşteri</h4>
                  <div className="modal-rows">
                    <div className="modal-row">
                      <span>Ad Soyad</span>
                      <strong>{selectedOrder.user?.firstName} {selectedOrder.user?.lastName}</strong>
                    </div>
                    <div className="modal-row">
                      <span>E-posta</span>
                      <strong>{selectedOrder.user?.email}</strong>
                    </div>
                    <div className="modal-row">
                      <span>Telefon</span>
                      <strong>{selectedOrder.shippingAddress?.phone}</strong>
                    </div>
                    <div className="modal-row">
                      <span>Adres</span>
                      <strong>
                        {selectedOrder.shippingAddress?.address}, {selectedOrder.shippingAddress?.district} / {selectedOrder.shippingAddress?.city}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="order-detail-section">
                  <h4 className="order-detail-section-title">📦 Ürünler</h4>
                  <div className="modal-rows">
                    {selectedOrder.items?.map((item, i) => (
                      <div key={i} className="modal-row">
                        <span>{item.name} x{item.quantity}</span>
                        <strong>{(item.price * item.quantity).toLocaleString('tr-TR')}₺</strong>
                      </div>
                    ))}
                    <div className="modal-row">
                      <span>Kargo</span>
                      <strong>{selectedOrder.shippingCost === 0 ? 'Ücretsiz' : `${selectedOrder.shippingCost}₺`}</strong>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="modal-row">
                        <span>İndirim</span>
                        <strong style={{ color: '#16a34a' }}>-{selectedOrder.discount}₺</strong>
                      </div>
                    )}
                    <div className="modal-row" style={{ fontWeight: 700 }}>
                      <span>Toplam</span>
                      <strong>{selectedOrder.totalPrice?.toLocaleString('tr-TR')}₺</strong>
                    </div>
                  </div>
                </div>

                <div className="order-detail-section">
                  <h4 className="order-detail-section-title">🚚 Kargo</h4>
                  <div className="modal-rows">
                    <div className="modal-row">
                      <span>Firma</span>
                      <strong>{selectedOrder.carrier || '—'}</strong>
                    </div>
                    <div className="modal-row">
                      <span>Takip No</span>
                      <strong>{selectedOrder.trackingNo || '—'}</strong>
                    </div>
                    <div className="modal-row">
                      <span>Durum</span>
                      <span
                        className="order-status-badge"
                        style={{
                          color: statusColors[selectedOrder.status],
                          background: `${statusColors[selectedOrder.status]}15`
                        }}
                      >
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>
                  <button
                    className="add-tracking-btn-lg"
                    onClick={() => {
                      setSelectedOrder(null)
                      setEditingOrder(selectedOrder)
                      setTrackingData({
                        trackingNo: selectedOrder.trackingNo || '',
                        carrier: selectedOrder.carrier || ''
                      })
                    }}
                  >
                    <FiTruck size={14} />
                    {selectedOrder.trackingNo ? 'Kargoyu Güncelle' : 'Kargo Ekle'}
                  </button>
                </div>

                <div className="order-detail-section">
                  <h4 className="order-detail-section-title">💬 Notlar</h4>
                  {selectedOrder.customerNote && (
                    <div className="customer-note-box">
                      <span>Müşteri Notu:</span>
                      <p>{selectedOrder.customerNote}</p>
                    </div>
                  )}
                  <div className="admin-form-group" style={{ marginTop: '12px' }}>
                    <label>Yönetici Notu</label>
                    <textarea
                      className="admin-textarea"
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      placeholder="İç not..."
                      rows={3}
                    />
                  </div>
                </div>

              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setSelectedOrder(null)}>Kapat</button>
              <button className="invoice-btn" onClick={() => handleDownloadPDF(selectedOrder._id)}>
                📄 Fatura İndir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {editingOrder && (
        <div className="admin-modal-overlay" onClick={() => setEditingOrder(null)}>
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Kargo — {editingOrder.orderNo}</h3>
              <button className="admin-modal-close" onClick={() => setEditingOrder(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form">
                <div className="admin-form-group">
                  <label>Kargo Firması</label>
                  <select
                    className="admin-input"
                    value={trackingData.carrier}
                    onChange={e => setTrackingData(p => ({ ...p, carrier: e.target.value }))}
                  >
                    <option value="">Seçin</option>
                    {carrierOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Takip Numarası</label>
                  <input
                    className="admin-input"
                    value={trackingData.trackingNo}
                    onChange={e => setTrackingData(p => ({ ...p, trackingNo: e.target.value }))}
                    placeholder="YK123456789TR"
                  />
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setEditingOrder(null)}>İptal</button>
              <button className="admin-save-btn" onClick={handleSaveTracking} disabled={updating}>
                <FiTruck size={14} /> {updating ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminOrders
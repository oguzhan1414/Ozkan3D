import { useState, useEffect, useCallback } from 'react'
import {
  FiSearch, FiEye, FiMail, FiShoppingBag,
  FiUser, FiMapPin, FiMessageSquare,
  FiTrendingUp, FiRefreshCw, FiTrash2
} from 'react-icons/fi'
import { getUsersApi, getUserApi, deleteUserApi, sendUserEmailApi } from '../../api/userApi'
import { getOrdersApi } from '../../api/orderApi'
import './AdminCustomers.css'

const segmentColors = {
  'VIP':    { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  'Sadık':  { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  'Normal': { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  'Yeni':   { color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
}

const statusColors = {
  'Kargoda':      '#06b6d4',
  'Teslim Edildi': '#16a34a',
  'Bekliyor':     '#f59e0b',
  'İptal':        '#e53e3e',
}

const getSegment = (orderCount, totalSpent) => {
  if (totalSpent >= 5000 || orderCount >= 10) return 'VIP'
  if (totalSpent >= 1500 || orderCount >= 5) return 'Sadık'
  if (orderCount >= 2) return 'Normal'
  return 'Yeni'
}

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerDetail, setCustomerDetail] = useState(null)
  const [customerOrders, setCustomerOrders] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState('profile')
  const [emailModal, setEmailModal] = useState(false)
  const [emailTarget, setEmailTarget] = useState(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')
  const [note, setNote] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  const fetchCustomers = useCallback(async ({ page = 1, searchTerm = '' } = {}) => {
    setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (searchTerm) params.search = searchTerm

      const res = await getUsersApi(params)
      // Admin kullanıcıları filtrele
      const normalUsers = (res.data || []).filter(u => u.role !== 'admin')
      setCustomers(normalUsers)
      setTotal(res.total || 0)
      setPages(res.pages || 1)
    } catch (err) {
      console.log('Müşteriler yüklenemedi:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers({ page: currentPage, searchTerm: debouncedSearch })
  }, [currentPage, debouncedSearch, fetchCustomers])

  const openEmailModal = (customer) => {
    if (!customer?.email) return

    setEmailTarget(customer)
    setEmailSubject('Ozkan3D Bilgilendirme')
    setEmailMessage('Merhaba,')
    setEmailError('')
    setEmailSuccess('')
    setEmailModal(true)
  }

  const closeEmailModal = () => {
    setEmailModal(false)
    setEmailTarget(null)
    setEmailSubject('')
    setEmailMessage('')
    setEmailError('')
    setEmailSuccess('')
  }

  const handleSendEmail = async () => {
    if (!emailTarget?._id) return

    const subject = emailSubject.trim()
    const message = emailMessage.trim()

    if (!subject) {
      setEmailError('Konu zorunludur.')
      return
    }

    if (!message) {
      setEmailError('Mesaj zorunludur.')
      return
    }

    setEmailSending(true)
    setEmailError('')
    setEmailSuccess('')

    try {
      const res = await sendUserEmailApi(emailTarget._id, { subject, message })
      setEmailSuccess(res.message || 'E-posta gönderildi.')
      setTimeout(() => closeEmailModal(), 900)
    } catch (err) {
      setEmailError(err.response?.data?.message || 'E-posta gönderilemedi.')
    } finally {
      setEmailSending(false)
    }
  }

  const handleViewCustomer = async (customer) => {
    setSelectedCustomer(customer)
    setDetailTab('profile')
    setDetailLoading(true)
    try {
      const [detailRes, ordersRes] = await Promise.all([
        getUserApi(customer._id),
        getOrdersApi({ userId: customer._id, limit: 10 }),
      ])
      setCustomerDetail(detailRes.data)
      setCustomerOrders(ordersRes.data || [])
    } catch (err) {
      console.log('Müşteri detayı yüklenemedi:', err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDeleteCustomer = async (id) => {
    try {
      await deleteUserApi(id)
      setCustomers(prev => prev.filter(c => c._id !== id))
      setDeleteConfirm(null)
    } catch (err) {
      console.log('Silme hatası:', err.message)
    }
  }

  const stats = [
    { label: 'Toplam Müşteri', value: total },
    { label: 'Aktif', value: customers.filter(c => c.isActive !== false).length },
    { label: 'Bu Ay Yeni', value: customers.filter(c => {
      const date = new Date(c.createdAt)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length },
    { label: 'Admin', value: customers.filter(c => c.role === 'admin').length },
  ]

  return (
    <div className="admin-customers">

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Müşteriler</h1>
          <p className="admin-page-sub">{total} kayıtlı kullanıcı</p>
        </div>
        <button
          className="admin-add-btn"
          onClick={() => fetchCustomers({ page: currentPage, searchTerm: debouncedSearch })}
        >
          <FiRefreshCw size={15} /> Yenile
        </button>
      </div>

      {/* Stats */}
      <div className="customers-stats-row">
        {stats.map((s, i) => (
          <div key={i} className="customers-stat-card">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <FiSearch size={15} className="admin-search-icon" />
          <input
            type="text"
            placeholder="İsim veya e-posta ara..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            className="admin-search-input"
          />
        </div>
      </div>

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
                  <th>Müşteri</th>
                  <th>Telefon</th>
                  <th>Üyelik</th>
                  <th>Rol</th>
                  <th>Segment</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {customers.length > 0 ? customers.map((c) => {
                  const segment = getSegment(
                    customerDetail?.stats?.orderCount || 0,
                    customerDetail?.stats?.totalSpent || 0
                  )
                  return (
                    <tr key={c._id}>
                      <td>
                        <div className="td-customer">
                          <div className="customer-tbl-avatar">
                            {c.firstName?.[0]}{c.lastName?.[0]}
                          </div>
                          <div>
                            <strong>{c.firstName} {c.lastName}</strong>
                            <span>{c.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="td-date">{c.phone || '—'}</td>
                      <td className="td-date">
                        {new Date(c.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td>
                        <span className={`active-badge ${c.role === 'admin' ? 'badge-admin' : 'badge-active'}`}>
                          {c.role === 'admin' ? '👑 Admin' : 'Kullanıcı'}
                        </span>
                      </td>
                      <td>
                        <span className="segment-badge" style={{
                          color: segmentColors[segment]?.color,
                          background: segmentColors[segment]?.bg,
                          border: `1px solid ${segmentColors[segment]?.border}`
                        }}>
                          {segment}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${c.isActive !== false ? 'status-active' : 'status-passive'}`}>
                          {c.isActive !== false ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button className="td-action-btn" onClick={() => handleViewCustomer(c)}>
                            <FiEye size={14} />
                          </button>
                          <button className="td-action-btn" onClick={() => openEmailModal(c)}>
                            <FiMail size={14} />
                          </button>
                          {c.role !== 'admin' && (
                            <button className="td-action-btn td-delete-btn" onClick={() => setDeleteConfirm(c._id)}>
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#aaaaaa' }}>
                      Müşteri bulunamadı
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

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="admin-modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="admin-modal admin-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="customer-modal-title">
                <div className="customer-modal-avatar">
                  {selectedCustomer.firstName?.[0]}{selectedCustomer.lastName?.[0]}
                </div>
                <div>
                  <h3>{selectedCustomer.firstName} {selectedCustomer.lastName}</h3>
                  <span className="segment-badge" style={{
                    color: segmentColors['Yeni']?.color,
                    background: segmentColors['Yeni']?.bg,
                    border: `1px solid ${segmentColors['Yeni']?.border}`
                  }}>
                    Yeni
                  </span>
                </div>
              </div>
              <button className="admin-modal-close" onClick={() => setSelectedCustomer(null)}>✕</button>
            </div>

            <div className="customer-detail-tabs">
              {[
                { id: 'profile', label: '👤 Profil' },
                { id: 'orders', label: '📦 Siparişler' },
                { id: 'addresses', label: '📍 Adresler' },
                { id: 'notes', label: '💬 Notlar' },
              ].map(t => (
                <button
                  key={t.id}
                  className={`customer-detail-tab ${detailTab === t.id ? 'customer-tab-active' : ''}`}
                  onClick={() => setDetailTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="admin-modal-body">
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  <FiRefreshCw size={20} className="spin" /> Yükleniyor...
                </div>
              ) : (
                <>
                  {/* Profil */}
                  {detailTab === 'profile' && (
                    <div className="customer-profile-grid">
                      <div className="customer-profile-section">
                        <h4 className="profile-section-title"><FiUser size={14} /> Kişisel Bilgiler</h4>
                        <div className="modal-rows">
                          <div className="modal-row"><span>Ad</span><strong>{selectedCustomer.firstName}</strong></div>
                          <div className="modal-row"><span>Soyad</span><strong>{selectedCustomer.lastName}</strong></div>
                          <div className="modal-row"><span>E-posta</span><strong>{selectedCustomer.email}</strong></div>
                          <div className="modal-row"><span>Telefon</span><strong>{selectedCustomer.phone || '—'}</strong></div>
                          <div className="modal-row">
                            <span>Doğum Tarihi</span>
                            <strong>
                              {selectedCustomer.birthDate
                                ? new Date(selectedCustomer.birthDate).toLocaleDateString('tr-TR')
                                : '—'}
                            </strong>
                          </div>
                          <div className="modal-row">
                            <span>Üyelik</span>
                            <strong>{new Date(selectedCustomer.createdAt).toLocaleDateString('tr-TR')}</strong>
                          </div>
                          <div className="modal-row"><span>Rol</span><strong>{selectedCustomer.role}</strong></div>
                        </div>
                      </div>

                      <div className="customer-profile-section">
                        <h4 className="profile-section-title"><FiTrendingUp size={14} /> Alışveriş Özeti</h4>
                        <div className="customer-shopping-stats">
                          <div className="shopping-stat">
                            <strong>{customerDetail?.stats?.orderCount || 0}</strong>
                            <span>Sipariş</span>
                          </div>
                          <div className="shopping-stat">
                            <strong>{(customerDetail?.stats?.totalSpent || 0).toLocaleString('tr-TR')}₺</strong>
                            <span>Toplam</span>
                          </div>
                          <div className="shopping-stat">
                            <strong>{customerDetail?.stats?.avgOrder || 0}₺</strong>
                            <span>Ortalama</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Siparişler */}
                  {detailTab === 'orders' && (
                    <div className="customer-orders-list">
                      {customerOrders.length > 0 ? customerOrders.map((o, i) => (
                        <div key={i} className="customer-order-item">
                          <div className="customer-order-img">3D</div>
                          <div className="customer-order-info">
                            <span className="order-id-badge">{o.orderNo}</span>
                            <strong>{o.items?.[0]?.name}{o.items?.length > 1 && ` +${o.items.length - 1}`}</strong>
                            <span>{new Date(o.createdAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <div className="customer-order-right">
                            <strong>{o.totalPrice?.toLocaleString('tr-TR')}₺</strong>
                            <span
                              className="order-status-badge"
                              style={{
                                color: statusColors[o.status],
                                background: `${statusColors[o.status]}15`
                              }}
                            >
                              {o.status}
                            </span>
                          </div>
                        </div>
                      )) : (
                        <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                          Henüz sipariş yok
                        </p>
                      )}
                    </div>
                  )}

                  {/* Adresler */}
                  {detailTab === 'addresses' && (
                    <div className="customer-addresses">
                      {selectedCustomer.addresses?.length > 0 ? selectedCustomer.addresses.map((addr, i) => (
                        <div key={i} className="address-item">
                          <FiMapPin size={16} className="address-icon" />
                          <div>
                            <strong>{addr.title} — {addr.fullName}</strong>
                            <p>{addr.address}, {addr.district} / {addr.city}</p>
                            <p>{addr.phone}</p>
                          </div>
                        </div>
                      )) : (
                        <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                          Kayıtlı adres yok
                        </p>
                      )}
                    </div>
                  )}

                  {/* Notlar */}
                  {detailTab === 'notes' && (
                    <div className="customer-notes">
                      <div className="admin-form-group">
                        <label>Yönetici Notu</label>
                        <textarea
                          className="admin-textarea"
                          value={note}
                          onChange={e => setNote(e.target.value)}
                          placeholder="Bu müşteri hakkında not ekleyin..."
                          rows={4}
                        />
                      </div>
                      <button className="admin-save-btn" style={{ marginTop: '8px' }}>
                        Kaydet
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setSelectedCustomer(null)}>Kapat</button>
              <button className="send-email-btn" onClick={() => openEmailModal(selectedCustomer)}>
                <FiMail size={14} /> E-posta Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {emailModal && emailTarget && (
        <div className="admin-modal-overlay" onClick={closeEmailModal}>
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>E-posta Gönder</h3>
              <button className="admin-modal-close" onClick={closeEmailModal}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>Alıcı</label>
                <input className="admin-input" value={`${emailTarget.firstName || ''} ${emailTarget.lastName || ''} <${emailTarget.email}>`} readOnly />
              </div>
              <div className="admin-form-group">
                <label>Konu</label>
                <input
                  className="admin-input"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="E-posta konusu"
                />
              </div>
              <div className="admin-form-group">
                <label>Mesaj</label>
                <textarea
                  className="admin-textarea"
                  rows={6}
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  placeholder="Müşteriye iletmek istediğiniz mesaj"
                />
              </div>
              {emailError && <p className="customer-mail-error">{emailError}</p>}
              {emailSuccess && <p className="customer-mail-success">{emailSuccess}</p>}
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={closeEmailModal} disabled={emailSending}>İptal</button>
              <button className="admin-save-btn" onClick={handleSendEmail} disabled={emailSending}>
                <FiMail size={14} /> {emailSending ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Müşteriyi Sil</h3>
              <button className="admin-modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <p className="delete-confirm-text">Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setDeleteConfirm(null)}>İptal</button>
              <button className="admin-delete-btn" onClick={() => handleDeleteCustomer(deleteConfirm)}>
                <FiTrash2 size={15} /> Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCustomers
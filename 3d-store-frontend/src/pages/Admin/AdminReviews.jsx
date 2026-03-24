import { useState, useEffect } from 'react'
import {
  FiStar, FiCheck, FiX, FiTrash2,
  FiSearch, FiRefreshCw, FiEye
} from 'react-icons/fi'
import { getReviewsApi, updateReviewStatusApi, deleteReviewApi } from '../../api/reviweApi'
import './AdminReviews.css'

const statusColors = {
  'pending':  { color: '#f59e0b', bg: '#fffbeb', label: 'Bekliyor' },
  'approved': { color: '#16a34a', bg: '#f0fdf4', label: 'Onaylı' },
  'rejected': { color: '#e53e3e', bg: '#fff0f0', label: 'Reddedildi' },
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [selectedReview, setSelectedReview] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    fetchReviews()
  }, [statusFilter, currentPage])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const params = { page: currentPage, limit: 15, status: statusFilter }
      const res = await getReviewsApi(params)
      setReviews(res.data || [])
      setTotal(res.total || 0)
      setPages(res.pages || 1)
    } catch (err) {
      console.log('Yorumlar yüklenemedi:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateReviewStatusApi(id, status)
      setReviews(prev => prev.map(r =>
        r._id === id ? { ...r, status } : r
      ))
      if (selectedReview?._id === id) {
        setSelectedReview(prev => ({ ...prev, status }))
      }
    } catch (err) {
      console.log('Durum güncellenemedi:', err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteReviewApi(id)
      setReviews(prev => prev.filter(r => r._id !== id))
      setDeleteConfirm(null)
      if (selectedReview?._id === id) setSelectedReview(null)
    } catch (err) {
      console.log('Silme hatası:', err.message)
    }
  }

  const filtered = reviews.filter(r =>
    search === '' ||
    r.user?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    r.user?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    r.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.comment?.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = reviews.filter(r => r.status === 'pending').length

  return (
    <div className="admin-reviews">

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Yorumlar</h1>
          <p className="admin-page-sub">
            {total} yorum
            {statusFilter === 'pending' && pendingCount > 0 && (
              <span className="pending-badge">⚠️ {pendingCount} onay bekliyor</span>
            )}
          </p>
        </div>
        <button className="admin-add-btn" onClick={fetchReviews}>
          <FiRefreshCw size={15} /> Yenile
        </button>
      </div>

      {/* Status Tabs */}
      <div className="orders-status-tabs">
        {[
          { id: 'pending',  label: 'Bekleyenler' },
          { id: 'approved', label: 'Onaylılar' },
          { id: 'rejected', label: 'Reddedilenler' },
        ].map(s => (
          <button
            key={s.id}
            className={`admin-filter-tab ${statusFilter === s.id ? 'admin-filter-active' : ''}`}
            onClick={() => { setStatusFilter(s.id); setCurrentPage(1) }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <FiSearch size={15} className="admin-search-icon" />
          <input
            type="text"
            placeholder="Kullanıcı, ürün veya yorum ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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
                  <th>Kullanıcı</th>
                  <th>Ürün</th>
                  <th>Puan</th>
                  <th>Yorum</th>
                  <th>Tarih</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(r => {
                  const sc = statusColors[r.status] || statusColors['pending']
                  return (
                    <tr key={r._id}>
                      <td>
                        <div className="td-customer">
                          <div className="orders-customer-avatar">
                            {r.user?.firstName?.[0]}{r.user?.lastName?.[0]}
                          </div>
                          <div>
                            <strong>{r.user?.firstName} {r.user?.lastName}</strong>
                            <span>{r.user?.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="td-product">
                        {r.product?.name || '—'}
                      </td>
                      <td>
                        <div className="review-stars-mini">
                          {[1,2,3,4,5].map(s => (
                            <FiStar key={s} size={12}
                              fill={s <= r.rating ? 'currentColor' : 'none'}
                              className={s <= r.rating ? 'star-filled' : 'star-empty'}
                            />
                          ))}
                          <span>{r.rating}</span>
                        </div>
                      </td>
                      <td className="td-comment">
                        <p className="comment-preview">{r.comment}</p>
                      </td>
                      <td className="td-date">
                        {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td>
                        <span className="review-status-badge" style={{
                          color: sc.color, background: sc.bg
                        }}>
                          {sc.label}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button
                            className="td-action-btn"
                            onClick={() => setSelectedReview(r)}
                            title="Detay"
                          >
                            <FiEye size={14} />
                          </button>
                          {r.status !== 'approved' && (
                            <button
                              className="td-action-btn td-approve-btn"
                              onClick={() => handleStatusUpdate(r._id, 'approved')}
                              title="Onayla"
                            >
                              <FiCheck size={14} />
                            </button>
                          )}
                          {r.status !== 'rejected' && (
                            <button
                              className="td-action-btn td-reject-btn"
                              onClick={() => handleStatusUpdate(r._id, 'rejected')}
                              title="Reddet"
                            >
                              <FiX size={14} />
                            </button>
                          )}
                          <button
                            className="td-action-btn td-delete-btn"
                            onClick={() => setDeleteConfirm(r._id)}
                            title="Sil"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                      {statusFilter === 'pending' ? 'Onay bekleyen yorum yok 🎉' : 'Yorum bulunamadı'}
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

      {/* Detail Modal */}
      {selectedReview && (
        <div className="admin-modal-overlay" onClick={() => setSelectedReview(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Yorum Detayı</h3>
              <button className="admin-modal-close" onClick={() => setSelectedReview(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="review-detail">

                <div className="review-detail-user">
                  <div className="review-detail-avatar">
                    {selectedReview.user?.firstName?.[0]}{selectedReview.user?.lastName?.[0]}
                  </div>
                  <div>
                    <strong>{selectedReview.user?.firstName} {selectedReview.user?.lastName}</strong>
                    <span>{selectedReview.user?.email}</span>
                    <span>{new Date(selectedReview.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>

                <div className="review-detail-product">
                  <span>📦 Ürün:</span>
                  <strong>{selectedReview.product?.name || '—'}</strong>
                </div>

                <div className="review-detail-rating">
                  <span>Puan:</span>
                  <div className="review-stars-mini">
                    {[1,2,3,4,5].map(s => (
                      <FiStar key={s} size={16}
                        fill={s <= selectedReview.rating ? 'currentColor' : 'none'}
                        className={s <= selectedReview.rating ? 'star-filled' : 'star-empty'}
                      />
                    ))}
                    <strong>{selectedReview.rating}/5</strong>
                  </div>
                </div>

                <div className="review-detail-comment">
                  <span>Yorum:</span>
                  <p>"{selectedReview.comment}"</p>
                </div>

                {selectedReview.isVerified && (
                  <div className="review-verified-info">
                    ✓ Bu kullanıcı bu ürünü satın almıştır
                  </div>
                )}

              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setSelectedReview(null)}>Kapat</button>
              {selectedReview.status !== 'approved' && (
                <button className="admin-approve-btn"
                  onClick={() => { handleStatusUpdate(selectedReview._id, 'approved'); setSelectedReview(null) }}>
                  <FiCheck size={15} /> Onayla
                </button>
              )}
              {selectedReview.status !== 'rejected' && (
                <button className="admin-reject-btn"
                  onClick={() => { handleStatusUpdate(selectedReview._id, 'rejected'); setSelectedReview(null) }}>
                  <FiX size={15} /> Reddet
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Yorumu Sil</h3>
              <button className="admin-modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <p className="delete-confirm-text">Bu yorumu silmek istediğinizden emin misiniz?</p>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setDeleteConfirm(null)}>İptal</button>
              <button className="admin-delete-btn" onClick={() => handleDelete(deleteConfirm)}>
                <FiTrash2 size={15} /> Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReviews
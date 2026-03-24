import { useState, useEffect } from 'react'
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch,
  FiCheck, FiX, FiCopy, FiTag, FiPercent,
  FiDollarSign, FiCalendar, FiUsers, FiRefreshCw
} from 'react-icons/fi'
import {
  getCouponsApi, createCouponApi,
  updateCouponApi, deleteCouponApi
} from '../../api/couponApi'
import './AdminCoupons.css'

const emptyForm = {
  code: '', type: 'percent', value: '', minOrder: '',
  maxUse: '', startDate: '', endDate: '',
  description: '', status: 'Aktif'
}

const typeLabels = { percent: '% İndirim', fixed: '₺ İndirim', shipping: 'Ücretsiz Kargo' }
const typeIcons = { percent: FiPercent, fixed: FiDollarSign, shipping: FiTag }

const statusColors = {
  'Aktif':        { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  'Pasif':        { color: '#888888', bg: '#f5f5f5', border: '#e0e0e0' },
  'Bitti':        { color: '#e53e3e', bg: '#fff0f0', border: '#fecaca' },
  'Süresi Doldu': { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
}

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tümü')
  const [showForm, setShowForm] = useState(false)
  const [editCoupon, setEditCoupon] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [copied, setCopied] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await getCouponsApi()
      setCoupons(res.data || [])
    } catch (err) {
      console.log('Kuponlar yüklenemedi:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = coupons.filter(c => {
    const matchSearch = c.code?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'Tümü' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleEdit = (coupon) => {
    setEditCoupon(coupon)
    setForm({
      code: coupon.code || '',
      type: coupon.type || 'percent',
      value: coupon.value || '',
      minOrder: coupon.minOrder || '',
      maxUse: coupon.maxUse || '',
      startDate: coupon.startDate ? coupon.startDate.split('T')[0] : '',
      endDate: coupon.endDate ? coupon.endDate.split('T')[0] : '',
      description: coupon.description || '',
      status: coupon.status || 'Aktif',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    try {
      await deleteCouponApi(id)
      setCoupons(prev => prev.filter(c => c._id !== id))
      setDeleteConfirm(null)
    } catch (err) {
      console.log('Silme hatası:', err.message)
    }
  }

  const handleToggleStatus = async (coupon) => {
    const newStatus = coupon.status === 'Aktif' ? 'Pasif' : 'Aktif'
    try {
      const res = await updateCouponApi(coupon._id, { status: newStatus })
      setCoupons(prev => prev.map(c => c._id === coupon._id ? res.data : c))
    } catch (err) {
      console.log('Durum güncellenemedi:', err.message)
    }
  }

  const handleSubmit = async () => {
    if (!form.code) return
    setSaving(true)
    try {
      const data = {
        ...form,
        value: Number(form.value) || 0,
        minOrder: Number(form.minOrder) || 0,
        maxUse: Number(form.maxUse) || 0,
      }

      if (editCoupon) {
        const res = await updateCouponApi(editCoupon._id, data)
        setCoupons(prev => prev.map(c => c._id === editCoupon._id ? res.data : c))
      } else {
        const res = await createCouponApi(data)
        setCoupons(prev => [res.data, ...prev])
      }

      setShowForm(false)
      setEditCoupon(null)
      setForm(emptyForm)
    } catch (err) {
      console.log('Kaydetme hatası:', err.response?.data?.message || err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const code = Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    setForm(p => ({ ...p, code }))
  }

  const stats = [
    { label: 'Toplam Kupon', value: coupons.length, icon: FiTag, color: '#2563eb', bg: '#eff6ff' },
    { label: 'Aktif', value: coupons.filter(c => c.status === 'Aktif').length, icon: FiCheck, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Toplam Kullanım', value: coupons.reduce((s, c) => s + (c.used || 0), 0), icon: FiUsers, color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Pasif', value: coupons.filter(c => c.status === 'Pasif').length, icon: FiX, color: '#f59e0b', bg: '#fffbeb' },
  ]

  return (
    <div className="admin-coupons">

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Kupon Yönetimi</h1>
          <p className="admin-page-sub">{coupons.length} kupon tanımlı</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="admin-add-btn" style={{ background: '#f0f0f0', color: '#555' }} onClick={fetchCoupons}>
            <FiRefreshCw size={15} />
          </button>
          <button className="admin-add-btn" onClick={() => { setShowForm(true); setEditCoupon(null); setForm(emptyForm) }}>
            <FiPlus size={16} /> Kupon Oluştur
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="coupons-stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="coupon-stat-card">
            <div className="coupon-stat-icon" style={{ background: s.bg, color: s.color }}>
              <s.icon size={18} />
            </div>
            <div>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <FiSearch size={15} className="admin-search-icon" />
          <input
            type="text"
            placeholder="Kupon kodu ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="admin-search-input"
          />
        </div>
        <div className="coupon-status-tabs">
          {['Tümü', 'Aktif', 'Pasif', 'Bitti', 'Süresi Doldu'].map(s => (
            <button
              key={s}
              className={`admin-filter-tab ${statusFilter === s ? 'admin-filter-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="admin-table-loading">
          <FiRefreshCw size={20} className="spin" />
          <span>Yükleniyor...</span>
        </div>
      ) : (
        <div className="coupons-grid">
          {filtered.length > 0 ? filtered.map((coupon) => {
            const TypeIcon = typeIcons[coupon.type] || FiTag
            const usePercent = coupon.maxUse > 0 ? ((coupon.used || 0) / coupon.maxUse) * 100 : 0
            const sc = statusColors[coupon.status] || statusColors['Pasif']

            return (
              <div key={coupon._id} className={`coupon-card ${coupon.status !== 'Aktif' ? 'coupon-inactive' : ''}`}>
                <div className="coupon-card-top">
                  <div className="coupon-type-badge">
                    <TypeIcon size={14} />
                    <span>{typeLabels[coupon.type]}</span>
                  </div>
                  <span className="coupon-status-badge" style={{
                    color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`
                  }}>
                    {coupon.status}
                  </span>
                </div>

                <div className="coupon-code-row">
                  <div className="coupon-code-display">
                    <span className="coupon-code">{coupon.code}</span>
                    <button className="coupon-copy-btn" onClick={() => handleCopy(coupon.code)}>
                      {copied === coupon.code ? <FiCheck size={13} /> : <FiCopy size={13} />}
                    </button>
                  </div>
                  <div className="coupon-value">
                    {coupon.type === 'percent' && <span>%{coupon.value} İndirim</span>}
                    {coupon.type === 'fixed' && <span>{coupon.value}₺ İndirim</span>}
                    {coupon.type === 'shipping' && <span>Ücretsiz Kargo</span>}
                  </div>
                </div>

                {coupon.description && (
                  <p className="coupon-desc">{coupon.description}</p>
                )}

                <div className="coupon-meta">
                  {coupon.minOrder > 0 && (
                    <span className="coupon-meta-item">Min: {coupon.minOrder}₺</span>
                  )}
                  {(coupon.startDate || coupon.endDate) && (
                    <span className="coupon-meta-item">
                      <FiCalendar size={11} />
                      {coupon.startDate ? new Date(coupon.startDate).toLocaleDateString('tr-TR') : '—'}
                      {' — '}
                      {coupon.endDate ? new Date(coupon.endDate).toLocaleDateString('tr-TR') : '—'}
                    </span>
                  )}
                </div>

                {coupon.maxUse > 0 && (
                  <div className="coupon-usage">
                    <div className="coupon-usage-header">
                      <span>Kullanım</span>
                      <span>{coupon.used || 0} / {coupon.maxUse}</span>
                    </div>
                    <div className="coupon-usage-bar">
                      <div
                        className="coupon-usage-fill"
                        style={{
                          width: `${Math.min(usePercent, 100)}%`,
                          background: usePercent >= 100 ? '#e53e3e' : usePercent >= 80 ? '#f59e0b' : '#16a34a'
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="coupon-actions">
                  <button className="coupon-action-btn" onClick={() => handleEdit(coupon)}>
                    <FiEdit2 size={13} /> Düzenle
                  </button>
                  <button
                    className="coupon-action-btn coupon-toggle-btn"
                    onClick={() => handleToggleStatus(coupon)}
                  >
                    {coupon.status === 'Aktif'
                      ? <><FiX size={13} /> Durdur</>
                      : <><FiCheck size={13} /> Aktif Et</>
                    }
                  </button>
                  <button
                    className="coupon-action-btn coupon-delete-btn"
                    onClick={() => setDeleteConfirm(coupon._id)}
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            )
          }) : (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#888' }}>
              Kupon bulunamadı
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="admin-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editCoupon ? 'Kuponu Düzenle' : 'Yeni Kupon'}</h3>
              <button className="admin-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form">

                <div className="admin-form-group">
                  <label>Kupon Kodu *</label>
                  <div className="coupon-code-input-row">
                    <input
                      value={form.code}
                      onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      placeholder="KUPON2024"
                      className="admin-input"
                      style={{ flex: 1 }}
                    />
                    <button className="generate-code-btn" onClick={generateCode}>
                      Otomatik
                    </button>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>İndirim Tipi</label>
                  <div className="coupon-type-options">
                    {Object.entries(typeLabels).map(([key, label]) => {
                      const Icon = typeIcons[key]
                      return (
                        <button
                          key={key}
                          className={`coupon-type-option ${form.type === key ? 'coupon-type-selected' : ''}`}
                          onClick={() => setForm(p => ({ ...p, type: key }))}
                        >
                          <Icon size={16} />
                          <span>{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {form.type !== 'shipping' && (
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>{form.type === 'percent' ? 'İndirim Oranı (%)' : 'İndirim Tutarı (₺)'}</label>
                      <input
                        type="number"
                        value={form.value}
                        onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                        className="admin-input"
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Min. Sipariş (₺)</label>
                      <input
                        type="number"
                        value={form.minOrder}
                        onChange={e => setForm(p => ({ ...p, minOrder: e.target.value }))}
                        className="admin-input"
                      />
                    </div>
                  </div>
                )}

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Maks. Kullanım (0=sınırsız)</label>
                    <input
                      type="number"
                      value={form.maxUse}
                      onChange={e => setForm(p => ({ ...p, maxUse: e.target.value }))}
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Durum</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                      className="admin-input"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Pasif">Pasif</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Başlangıç</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Bitiş</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Açıklama</label>
                  <input
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className="admin-input"
                  />
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setShowForm(false)}>İptal</button>
              <button className="admin-save-btn" onClick={handleSubmit} disabled={saving}>
                <FiCheck size={15} />
                {saving ? 'Kaydediliyor...' : editCoupon ? 'Güncelle' : 'Oluştur'}
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
              <h3>Kuponu Sil</h3>
              <button className="admin-modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <p className="delete-confirm-text">Bu kuponu silmek istediğinizden emin misiniz?</p>
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

export default AdminCoupons
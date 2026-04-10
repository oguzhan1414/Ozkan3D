import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  FiUser, FiShoppingBag, FiHeart, FiMessageSquare,
  FiLogOut, FiChevronRight, FiEdit2, FiMapPin,
  FiLock, FiCheck, FiX, FiShield, FiTruck,
  FiPackage, FiStar, FiRefreshCw, FiEye, FiHelpCircle, FiUploadCloud, FiClock
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useFavorite } from '../context/FavoriteContext'
import {
  updateProfileApi, changePasswordApi,
  addAddressApi, updateAddressApi, deleteAddressApi
} from '../api/authApi'
import { getMyOrdersApi } from '../api/orderApi'
import { getProductReviewsApi } from '../api/reviweApi'
import { createSupportRequestApi, getMySupportRequestsApi } from '../api/supportApi'
import './AccountPage.css'

const menuItems = [
  { id: 'orders',   label: 'Siparişlerim',    icon: FiShoppingBag },
  { id: 'addresses',label: 'Adres Defterim',  icon: FiMapPin },
  { id: 'support',  label: 'Destek Taleplerim', icon: FiHelpCircle },
  { id: 'profile',  label: 'Hesap Ayarlarım', icon: FiUser },
  { id: 'favorites',label: 'Favorilerim',     icon: FiHeart },
  { id: 'reviews',  label: 'Yorumlarım',      icon: FiMessageSquare },
]

const statusColors = {
  'Bekliyor':       { color: '#f59e0b', bg: '#fffbeb' },
  'Basımda':        { color: '#8b5cf6', bg: '#f5f3ff' },
  'Hazırlanıyor':   { color: '#2563eb', bg: '#eff6ff' },
  'Kargoda':        { color: '#06b6d4', bg: '#ecfeff' },
  'Teslim Edildi':  { color: '#16a34a', bg: '#f0fdf4' },
  'İptal':          { color: '#e53e3e', bg: '#fff0f0' },
}

const statusMessages = {
  'Bekliyor': {
    title: 'Ödeme alındı, basım için hazırlanıyor',
    description: 'Siparişiniz sıraya alındı. Üretim planına göre kısa süre içinde basım aşamasına geçecektir.',
  },
  'Basımda': {
    title: 'Ürününüz basım aşamasında',
    description: '3D basım işlemi devam ediyor. Basım tamamlandıktan sonra kalite kontrol ve paketleme yapılacaktır.',
  },
  'Hazırlanıyor': {
    title: 'Kalite kontrol ve paketleme yapılıyor',
    description: 'Basım tamamlandı. Ürününüz güvenli paketleme sürecinde, kargoya hazırlanıyor.',
  },
  'Kargoda': {
    title: 'Siparişiniz yolda',
    description: 'Paketiniz kargoya teslim edildi. Takip numarası ile anlık durumunu takip edebilirsiniz.',
  },
  'Teslim Edildi': {
    title: 'Siparişiniz teslim edildi',
    description: 'Teslimat tamamlandı. Deneyiminizle ilgili geri bildiriminizi her zaman paylaşabilirsiniz.',
  },
  'İptal': {
    title: 'Sipariş iptal edildi',
    description: 'Siparişiniz iptal edildi. İade süreci varsa ödeme yönteminize göre başlatılacaktır.',
  },
}

const AccountPage = () => {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'orders'

  const [activeTab, setActiveTab] = useState(initialTab)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editingPassword, setEditingPassword] = useState(false)
  const [addingAddress, setAddingAddress] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressLoading, setAddressLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Siparişler
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Yorumlar
  const [myReviews, setMyReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [supportRequests, setSupportRequests] = useState([])
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportSubmitting, setSupportSubmitting] = useState(false)
  const [supportFile, setSupportFile] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState({
    profile: true,
    password: false,
    announcements: false,
  })

  const { user, setUser, logout, isAdmin } = useAuth()
  const { favorites, toggleFavorite } = useFavorite()
  const navigate = useNavigate()

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    birthDate: user?.birthDate ? user.birthDate.split('T')[0] : '',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  })

  const [addressForm, setAddressForm] = useState({
    title: 'Ev', fullName: '', phone: '',
    city: '', district: '', neighborhood: '', address: '', isDefault: false,
  })

  const [supportForm, setSupportForm] = useState({
    email: user?.email || '',
    subject: '',
    message: '',
  })

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders()
    if (activeTab === 'reviews') fetchReviews()
    if (activeTab === 'support') fetchSupportRequests()
  }, [activeTab])

  useEffect(() => {
    setSupportForm(prev => ({ ...prev, email: user?.email || '' }))
  }, [user?.email])

  const fetchOrders = async () => {
    setOrdersLoading(true)
    try {
      const res = await getMyOrdersApi()
      setOrders(res.data || [])
    } catch (err) {
      console.log('Siparişler yüklenemedi:', err.message)
    } finally {
      setOrdersLoading(false)
    }
  }

  const fetchReviews = async () => {
    setReviewsLoading(true)
    try {
      // Kullanıcının kendi yorumlarını çek
      const res = await getProductReviewsApi('my')
      setMyReviews(res.data || [])
    } catch {
      setMyReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchSupportRequests = async () => {
    setSupportLoading(true)
    try {
      const res = await getMySupportRequestsApi()
      setSupportRequests(res.data || [])
    } catch {
      setSupportRequests([])
    } finally {
      setSupportLoading(false)
    }
  }

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }
  const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 3000) }

  const handleProfileSave = async () => {
    setProfileLoading(true)
    try {
      const res = await updateProfileApi(profileForm)
      setUser(res.data)
      setEditingProfile(false)
      showSuccess('Profil bilgileri güncellendi!')
    } catch (err) {
      showError(err.response?.data?.message || 'Güncelleme başarısız.')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSave = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('Şifreler eşleşmiyor.')
      return
    }
    setPasswordLoading(true)
    try {
      await changePasswordApi({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setEditingPassword(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showSuccess('Şifre başarıyla değiştirildi!')
    } catch (err) {
      showError(err.response?.data?.message || 'Şifre değiştirilemedi.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const resetAddressForm = () => {
    setAddressForm({
      title: 'Ev',
      fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      phone: user?.phone || '',
      city: '',
      district: '',
      neighborhood: '',
      address: '',
      isDefault: !(user?.addresses?.length > 0),
    })
  }

  const handleAddressSave = async () => {
    if (!addressForm.fullName || !addressForm.phone || !addressForm.city || !addressForm.district || !addressForm.address) {
      showError('Adres için zorunlu alanları doldurun.')
      return
    }

    setAddressLoading(true)
    try {
      const payload = {
        ...addressForm,
        fullName: addressForm.fullName.trim(),
        phone: addressForm.phone.trim(),
        city: addressForm.city.trim(),
        district: addressForm.district.trim(),
        neighborhood: (addressForm.neighborhood || '').trim(),
        address: addressForm.address.trim(),
      }

      const res = editingAddressId
        ? await updateAddressApi(editingAddressId, payload)
        : await addAddressApi(payload)

      setUser(prev => ({ ...prev, addresses: res.data }))
      setAddingAddress(false)
      setEditingAddressId(null)
      resetAddressForm()
      showSuccess(editingAddressId ? 'Adres güncellendi!' : 'Adres eklendi!')
    } catch (err) {
      showError(err.response?.data?.message || 'Adres kaydedilemedi.')
    } finally {
      setAddressLoading(false)
    }
  }

  const handleStartEditAddress = (addr) => {
    setEditingAddressId(addr._id)
    setAddingAddress(true)
    setAddressForm({
      title: addr.title || 'Ev',
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      city: addr.city || '',
      district: addr.district || '',
      neighborhood: addr.neighborhood || '',
      address: addr.address || '',
      isDefault: !!addr.isDefault,
    })
  }

  const handleCancelAddressForm = () => {
    setAddingAddress(false)
    setEditingAddressId(null)
    resetAddressForm()
  }

  const handleDeleteAddress = async (addressId) => {
    try {
      const res = await deleteAddressApi(addressId)
      setUser(prev => ({ ...prev, addresses: res.data }))
      if (editingAddressId === addressId) {
        handleCancelAddressForm()
      }
      showSuccess('Adres silindi.')
    } catch {
      showError('Adres silinemedi.')
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleToggleSetting = (section) => {
    setSettingsOpen(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleSupportSubmit = async (e) => {
    e.preventDefault()

    if (!supportForm.email || !supportForm.subject.trim() || !supportForm.message.trim()) {
      showError('Destek talebi için e-posta, konu ve detay zorunludur.')
      return
    }

    setSupportSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('email', supportForm.email.trim())
      formData.append('subject', supportForm.subject.trim())
      formData.append('message', supportForm.message.trim())
      if (supportFile) formData.append('attachment', supportFile)

      const res = await createSupportRequestApi(formData)
      if (res?.data) {
        setSupportRequests(prev => [{ ...res.data, createdAtDisplay: formatDateTime(res.data.createdAt) }, ...prev])
      }

      setSupportForm(prev => ({ ...prev, subject: '', message: '' }))
      setSupportFile(null)
      showSuccess('Destek talebiniz bize ulaştı.')
    } catch (err) {
      showError(err.response?.data?.message || 'Destek talebi gönderilemedi.')
    } finally {
      setSupportSubmitting(false)
    }
  }

  const getInitials = () => `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`

  const formatDateTime = (dateValue) => {
    if (!dateValue) return '—'
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateValue))
  }

  const getSupportStatusLabel = (status) => {
    if (status === 'resolved') return 'Çözüldü'
    if (status === 'in-progress') return 'İşlemde'
    return 'Yeni'
  }

  const getSupportStatusClass = (status) => {
    if (status === 'resolved') return 'support-status-resolved'
    if (status === 'in-progress') return 'support-status-progress'
    return 'support-status-new'
  }

  const getStatusMessage = (status) => {
    return statusMessages[status] || {
      title: 'Siparişiniz işleme alındı',
      description: 'Durum güncellemeleri burada otomatik olarak gösterilecektir.',
    }
  }

  const formatOrderDate = (order) => {
    if (order?.createdAtDisplay) return order.createdAtDisplay
    return formatDateTime(order?.createdAt)
  }

  // Admin yönlendirme
  if (isAdmin) {
    return (
      <div className="account-page">
        <div className="admin-redirect-card">
          <div className="admin-redirect-icon">🛡️</div>
          <h2>Admin Hesabı</h2>
          <p>Admin hesabıyla giriş yaptınız. Hesap yönetimi için admin panelini kullanabilirsiniz.</p>
          <div className="admin-redirect-info">
            <div className="admin-redirect-avatar">{getInitials()}</div>
            <div>
              <strong>{user?.firstName} {user?.lastName}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <div className="admin-redirect-btns">
            <Link to="/admin" className="admin-redirect-btn-primary">
              <FiShield size={16} /> Admin Paneline Git
            </Link>
            <button className="admin-redirect-btn-logout" onClick={handleLogout}>
              <FiLogOut size={15} /> Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="account-page">
      <div className="account-inner">

        {/* Sidebar */}
        <aside className="account-sidebar">
          <div className="account-user-card">
            <div className="account-avatar">{getInitials()}</div>
            <div className="account-user-info">
              <strong>{user?.firstName} {user?.lastName}</strong>
              <span>{user?.email}</span>
            </div>
          </div>

          <nav className="account-menu">
            {menuItems.map(item => (
              <button
                key={item.id}
                className={`account-menu-item ${activeTab === item.id ? 'account-menu-active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon size={16} className="account-menu-icon" />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="account-menu-divider" />
            <button className="account-menu-item account-menu-logout" onClick={handleLogout}>
              <FiLogOut size={16} className="account-menu-icon" />
              <span>Güvenli Çıkış</span>
            </button>
          </nav>
        </aside>

        {/* İçerik */}
        <main className="account-content">

          {/* Bildirimler */}
          {successMsg && (
            <div className="account-alert account-alert-success">
              <FiCheck size={16} /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="account-alert account-alert-error">
              <FiX size={16} /> {errorMsg}
            </div>
          )}

          {/* ── Siparişlerim ── */}
          {activeTab === 'orders' && (
            <div className="account-section">
              <div className="account-section-header">
                <h2>Siparişlerim</h2>
                <button className="account-refresh-btn" onClick={fetchOrders}>
                  <FiRefreshCw size={14} />
                </button>
              </div>

              {ordersLoading ? (
                <div className="account-loading">
                  <FiRefreshCw size={20} className="spin" />
                  <span>Yükleniyor...</span>
                </div>
              ) : orders.length > 0 ? (
                <div className="orders-list">
                  {orders.map(order => {
                    const sc = statusColors[order.status] || statusColors['Bekliyor']
                    return (
                      <div key={order._id} className="order-card">
                        <div className="order-card-header">
                          <div className="order-card-left">
                            <span className="order-card-no">{order.orderNo}</span>
                            <span className="order-card-date">{formatOrderDate(order)}</span>
                          </div>
                          <div className="order-card-right">
                            <span className="order-status-badge" style={{ color: sc.color, background: sc.bg }}>
                              {order.status}
                            </span>
                            <strong className="order-card-price">{order.totalPrice?.toLocaleString('tr-TR')}₺</strong>
                          </div>
                        </div>

                        <div className="order-card-items">
                          {order.items?.slice(0, 2).map((item, i) => (
                            <div key={i} className="order-card-item">
                              <div className="order-card-item-img">
                                {item.image ? (
                                  <img src={item.image} alt={item.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                                ) : (
                                  <div className="order-item-placeholder">3D</div>
                                )}
                              </div>
                              <div className="order-card-item-info">
                                <strong>{item.name}</strong>
                                <span>{item.quantity} adet · {item.price}₺</span>
                              </div>
                            </div>
                          ))}
                          {order.items?.length > 2 && (
                            <span className="order-more-items">+{order.items.length - 2} ürün daha</span>
                          )}
                        </div>

                        {order.trackingNo && (
                          <div className="order-tracking-row">
                            <FiTruck size={13} />
                            <span>{order.carrier} — {order.trackingNo}</span>
                          </div>
                        )}

                        <div className="order-card-footer">
                          <button
                            className="order-detail-btn"
                            onClick={() => setSelectedOrder(selectedOrder?._id === order._id ? null : order)}
                          >
                            <FiEye size={14} />
                            {selectedOrder?._id === order._id ? 'Gizle' : 'Detay'}
                          </button>
                          {order.status === 'Teslim Edildi' && (
                            <Link to={`/product/${order.items?.[0]?.product}`} className="order-review-btn">
                              <FiStar size={14} /> Yorum Yap
                            </Link>
                          )}
                        </div>

                        {/* Detay Açılır */}
                        {selectedOrder?._id === order._id && (
                          <div className="order-detail-expand">
                            <div className="order-status-explain">
                              <span className="order-status-explain-label">Durum Bilgisi</span>
                              <strong>{getStatusMessage(order.status).title}</strong>
                              <p>{getStatusMessage(order.status).description}</p>
                            </div>
                            <div className="order-detail-section">
                              <strong>Teslimat Adresi</strong>
                              <p>
                                {order.shippingAddress?.fullName} — {order.shippingAddress?.address},
                                {order.shippingAddress?.district} / {order.shippingAddress?.city}
                              </p>
                            </div>
                            <div className="order-detail-section">
                              <strong>Ödeme</strong>
                              <p>{order.paymentMethod === 'card' ? '💳 Kredi Kartı' : '🏦 Havale/EFT'}</p>
                            </div>
                            {order.customerNote && (
                              <div className="order-detail-section">
                                <strong>Notunuz</strong>
                                <p>{order.customerNote}</p>
                              </div>
                            )}
                            <div className="order-detail-rows">
                              <div className="order-detail-row">
                                <span>Ara Toplam</span>
                                <span>{order.subtotal?.toLocaleString('tr-TR')}₺</span>
                              </div>
                              {order.discount > 0 && (
                                <div className="order-detail-row" style={{ color: '#16a34a' }}>
                                  <span>İndirim</span>
                                  <span>-{order.discount}₺</span>
                                </div>
                              )}
                              <div className="order-detail-row">
                                <span>Kargo</span>
                                <span>{order.shippingCost === 0 ? 'Ücretsiz' : `${order.shippingCost}₺`}</span>
                              </div>
                              <div className="order-detail-row order-detail-total">
                                <span>Toplam</span>
                                <strong>{order.totalPrice?.toLocaleString('tr-TR')}₺</strong>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="account-empty">
                  <div className="account-empty-icon">📦</div>
                  <h3>Henüz sipariş yok</h3>
                  <p>Sipariş geçmişiniz burada görünecek.</p>
                  <Link to="/shop" className="btn-primary">Alışverişe Başla</Link>
                </div>
              )}
            </div>
          )}

          {/* ── Profil ── */}
          {activeTab === 'profile' && (
            <div className="account-section">
              <div className="account-section-header">
                <h2>Hesap Ayarlarım</h2>
              </div>
              <div className="profile-cards">
                <div className={`profile-card profile-card-accordion ${settingsOpen.profile ? 'is-open' : ''}`}>
                  <button className="profile-accordion-head" onClick={() => handleToggleSetting('profile')}>
                    <div className="profile-card-icon"><FiUser size={18} /></div>
                    <h4>Üyelik Bilgilerim</h4>
                    <FiChevronRight size={16} className="profile-accordion-arrow" />
                  </button>

                  {settingsOpen.profile && (
                    <div className="profile-accordion-body">
                      <div className="profile-card-header profile-card-header-inner">
                        <p>İletişim ve temel hesap bilgilerini bu bölümden düzenleyebilirsiniz.</p>
                        <button className="profile-edit-btn" onClick={() => {
                          setEditingProfile(p => !p)
                          setProfileForm({
                            firstName: user?.firstName || '',
                            lastName: user?.lastName || '',
                            phone: user?.phone || '',
                            birthDate: user?.birthDate ? user.birthDate.split('T')[0] : '',
                          })
                        }}>
                          <FiEdit2 size={14} /> {editingProfile ? 'İptal' : 'Düzenle'}
                        </button>
                      </div>

                      {editingProfile ? (
                        <div className="profile-edit-form">
                          <div className="profile-form-row">
                            <div className="profile-form-group">
                              <label>Ad</label>
                              <input className="profile-input" value={profileForm.firstName}
                                onChange={e => setProfileForm(p => ({ ...p, firstName: e.target.value }))} />
                            </div>
                            <div className="profile-form-group">
                              <label>Soyad</label>
                              <input className="profile-input" value={profileForm.lastName}
                                onChange={e => setProfileForm(p => ({ ...p, lastName: e.target.value }))} />
                            </div>
                          </div>
                          <div className="profile-form-row">
                            <div className="profile-form-group">
                              <label>Telefon</label>
                              <input className="profile-input" value={profileForm.phone}
                                onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                            </div>
                            <div className="profile-form-group">
                              <label>Doğum Tarihi</label>
                              <input type="date" className="profile-input" value={profileForm.birthDate}
                                onChange={e => setProfileForm(p => ({ ...p, birthDate: e.target.value }))} />
                            </div>
                          </div>
                          <button className="profile-save-btn" onClick={handleProfileSave} disabled={profileLoading}>
                            {profileLoading ? 'Kaydediliyor...' : <><FiCheck size={14} /> Kaydet</>}
                          </button>
                        </div>
                      ) : (
                        <div className="profile-rows">
                          <div className="profile-row"><span>Ad Soyad</span><strong>{user?.firstName} {user?.lastName}</strong></div>
                          <div className="profile-row"><span>E-posta</span><strong>{user?.email}</strong></div>
                          <div className="profile-row"><span>Telefon</span><strong>{user?.phone || '—'}</strong></div>
                          <div className="profile-row">
                            <span>Doğum Tarihi</span>
                            <strong>{user?.birthDate ? new Date(user.birthDate).toLocaleDateString('tr-TR') : '—'}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={`profile-card profile-card-accordion ${settingsOpen.password ? 'is-open' : ''}`}>
                  <button className="profile-accordion-head" onClick={() => handleToggleSetting('password')}>
                    <div className="profile-card-icon"><FiLock size={18} /></div>
                    <h4>Şifre Değiştir</h4>
                    <FiChevronRight size={16} className="profile-accordion-arrow" />
                  </button>

                  {settingsOpen.password && (
                    <div className="profile-accordion-body">
                      <div className="profile-card-header profile-card-header-inner">
                        <p>Hesap güvenliğiniz için şifrenizi düzenli aralıklarla güncelleyin.</p>
                        <button className="profile-edit-btn" onClick={() => setEditingPassword(p => !p)}>
                          <FiEdit2 size={14} /> {editingPassword ? 'İptal' : 'Değiştir'}
                        </button>
                      </div>

                      {editingPassword ? (
                        <div className="profile-edit-form">
                          <div className="profile-form-group">
                            <label>Mevcut Şifre</label>
                            <input type="password" className="profile-input"
                              value={passwordForm.currentPassword}
                              onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                              placeholder="••••••••" />
                          </div>
                          <div className="profile-form-row">
                            <div className="profile-form-group">
                              <label>Yeni Şifre</label>
                              <input type="password" className="profile-input"
                                value={passwordForm.newPassword}
                                onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                                placeholder="En az 8 karakter" />
                            </div>
                            <div className="profile-form-group">
                              <label>Şifre Tekrar</label>
                              <input type="password" className="profile-input"
                                value={passwordForm.confirmPassword}
                                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                placeholder="••••••••" />
                            </div>
                          </div>
                          <button className="profile-save-btn" onClick={handlePasswordSave} disabled={passwordLoading}>
                            {passwordLoading ? 'Değiştiriliyor...' : <><FiCheck size={14} /> Şifreyi Değiştir</>}
                          </button>
                        </div>
                      ) : (
                        <div className="profile-rows">
                          <div className="profile-row"><span>Şifre</span><strong>••••••••</strong></div>
                          <div className="profile-row"><span>Üyelik Tarihi</span><strong>{formatDateTime(user?.createdAt)}</strong></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={`profile-card profile-card-accordion ${settingsOpen.announcements ? 'is-open' : ''}`}>
                  <button className="profile-accordion-head" onClick={() => handleToggleSetting('announcements')}>
                    <div className="profile-card-icon"><FiMessageSquare size={18} /></div>
                    <h4>Duyuru Tercihlerim</h4>
                    <FiChevronRight size={16} className="profile-accordion-arrow" />
                  </button>
                  {settingsOpen.announcements && (
                    <div className="profile-accordion-body">
                      <div className="profile-rows">
                        <div className="profile-row"><span>Durum</span><strong>Yakında aktif olacak</strong></div>
                        <div className="profile-row"><span>Bilgilendirme e-postası</span><strong>{user?.email}</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Adres Defterim ── */}
          {activeTab === 'addresses' && (
            <div className="account-section">
              <div className="account-section-header">
                <h2>Adres Defterim</h2>
                <button className="profile-edit-btn" onClick={() => {
                  if (addingAddress) {
                    handleCancelAddressForm()
                  } else {
                    resetAddressForm()
                    setAddingAddress(true)
                  }
                }}>
                  <FiEdit2 size={14} /> {addingAddress ? 'İptal' : 'Yeni Adres'}
                </button>
              </div>

              <div className="address-book-layout">
                <div className="address-book-stats">
                  <div className="address-stat-card">
                    <strong>{user?.addresses?.length || 0}</strong>
                    <span>Kayıtlı Adres</span>
                  </div>
                  <div className="address-stat-card">
                    <strong>{user?.addresses?.find(a => a.isDefault)?.title || '—'}</strong>
                    <span>Varsayılan</span>
                  </div>
                </div>

                {addingAddress && (
                  <div className="profile-edit-form address-book-form">
                    <div className="profile-form-row">
                      <div className="profile-form-group">
                        <label>Başlık</label>
                        <select className="profile-input" value={addressForm.title}
                          onChange={e => setAddressForm(p => ({ ...p, title: e.target.value }))}>
                          <option>Ev</option>
                          <option>İş</option>
                          <option>Diğer</option>
                        </select>
                      </div>
                      <div className="profile-form-group">
                        <label>Ad Soyad</label>
                        <input className="profile-input" value={addressForm.fullName}
                          onChange={e => setAddressForm(p => ({ ...p, fullName: e.target.value }))} />
                      </div>
                    </div>
                    <div className="profile-form-row">
                      <div className="profile-form-group">
                        <label>Telefon</label>
                        <input className="profile-input" value={addressForm.phone}
                          onChange={e => setAddressForm(p => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div className="profile-form-group">
                        <label>Şehir</label>
                        <input className="profile-input" value={addressForm.city}
                          onChange={e => setAddressForm(p => ({ ...p, city: e.target.value }))} />
                      </div>
                    </div>
                    <div className="profile-form-row">
                      <div className="profile-form-group">
                        <label>İlçe</label>
                        <input className="profile-input" value={addressForm.district}
                          onChange={e => setAddressForm(p => ({ ...p, district: e.target.value }))} />
                      </div>
                      <div className="profile-form-group">
                        <label>Mahalle</label>
                        <input className="profile-input" value={addressForm.neighborhood}
                          onChange={e => setAddressForm(p => ({ ...p, neighborhood: e.target.value }))} />
                      </div>
                    </div>
                    <div className="profile-form-group">
                      <label>Açık Adres</label>
                      <textarea className="profile-textarea" value={addressForm.address}
                        onChange={e => setAddressForm(p => ({ ...p, address: e.target.value }))} rows={4} />
                    </div>
                    <label className="form-checkbox">
                      <input
                        type="checkbox"
                        checked={addressForm.isDefault}
                        onChange={e => setAddressForm(p => ({ ...p, isDefault: e.target.checked }))}
                      />
                      <span className="checkbox-custom" />
                      <span className="checkbox-text">Varsayılan adres yap</span>
                    </label>
                    <button className="profile-save-btn" onClick={handleAddressSave} disabled={addressLoading}>
                      {addressLoading
                        ? 'Kaydediliyor...'
                        : <><FiCheck size={14} /> {editingAddressId ? 'Adresi Güncelle' : 'Adresi Kaydet'}</>}
                    </button>
                  </div>
                )}

                <div className="address-book-list">
                  {user?.addresses?.length > 0 ? user.addresses.map((addr, i) => (
                    <div key={i} className="address-item-row">
                      <div className="address-item-info">
                        <strong>
                          {addr.title} — {addr.fullName}
                          {addr.isDefault && <span className="address-default-badge">Varsayılan</span>}
                        </strong>
                        <span>{addr.phone}</span>
                        <span>{addr.address}, {addr.district} / {addr.city}</span>
                      </div>
                      <div className="address-actions">
                        <button className="address-edit-btn" onClick={() => handleStartEditAddress(addr)}>
                          <FiEdit2 size={13} />
                        </button>
                        <button className="address-delete-btn" onClick={() => handleDeleteAddress(addr._id)}>
                          <FiX size={14} />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="account-empty">
                      <div className="account-empty-icon">📍</div>
                      <h3>Henüz adres yok</h3>
                      <p>Siparişte hızlı seçim için ilk adresinizi ekleyin.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Destek Taleplerim ── */}
          {activeTab === 'support' && (
            <div className="account-section">
              <div className="account-section-header">
                <h2>Destek Taleplerim</h2>
              </div>

              <div className="support-layout">
                <form className="support-form" onSubmit={handleSupportSubmit}>
                  <h4>Yeni Talep Oluştur</h4>
                  <p>Konu, detay ve varsa ekran görüntüsü ekleyerek bize hızlıca ulaşabilirsiniz.</p>

                  <div className="profile-form-group">
                    <label>E-posta</label>
                    <input
                      className="profile-input"
                      value={supportForm.email}
                      onChange={e => setSupportForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="ornek@mail.com"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label>Konu</label>
                    <input
                      className="profile-input"
                      value={supportForm.subject}
                      onChange={e => setSupportForm(prev => ({ ...prev, subject: e.target.value }))}
                      maxLength={140}
                      placeholder="Örn: Siparişimde tarih hatalı görünüyor"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label>Detay</label>
                    <textarea
                      className="profile-textarea"
                      rows={5}
                      value={supportForm.message}
                      onChange={e => setSupportForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Sorunu adım adım yazabilirsiniz."
                    />
                  </div>

                  <label className="support-file-label">
                    <FiUploadCloud size={16} />
                    <span>{supportFile ? supportFile.name : 'Dosya ekle (opsiyonel)'}</span>
                    <input
                      type="file"
                      onChange={e => setSupportFile(e.target.files?.[0] || null)}
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx"
                    />
                  </label>

                  <button className="profile-save-btn" type="submit" disabled={supportSubmitting}>
                    {supportSubmitting ? 'Gönderiliyor...' : <><FiCheck size={14} /> Talebi Gönder</>}
                  </button>
                </form>

                <div className="support-list-wrap">
                  <div className="support-list-head">
                    <h4>Önceki Talepler</h4>
                    <button className="account-refresh-btn" onClick={fetchSupportRequests}>
                      <FiRefreshCw size={14} />
                    </button>
                  </div>

                  {supportLoading ? (
                    <div className="account-loading">
                      <FiRefreshCw size={20} className="spin" />
                      <span>Yükleniyor...</span>
                    </div>
                  ) : supportRequests.length > 0 ? (
                    <div className="support-list">
                      {supportRequests.map((ticket) => (
                        <div className="support-item" key={ticket._id}>
                          <div className="support-item-top">
                            <strong>{ticket.subject}</strong>
                            <span className={`support-status ${getSupportStatusClass(ticket.status)}`}>
                              {getSupportStatusLabel(ticket.status)}
                            </span>
                          </div>
                          <p>{ticket.message}</p>
                          <div className="support-item-meta">
                            <span><FiClock size={13} /> {ticket.createdAtDisplay || formatDateTime(ticket.createdAt)}</span>
                            {ticket.attachmentName && <span><FiUploadCloud size={13} /> {ticket.attachmentName}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="account-empty">
                      <div className="account-empty-icon">🛟</div>
                      <h3>Henüz destek talebi yok</h3>
                      <p>Bir sorun yaşarsanız bu alandan hızlıca bize yazabilirsiniz.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Favorilerim ── */}
          {activeTab === 'favorites' && (
            <div className="account-section">
              <div className="account-section-header">
                <h2>Favorilerim</h2>
                <span className="account-section-count">{favorites.length} ürün</span>
              </div>

              {favorites.length > 0 ? (
                <div className="favorites-grid">
                  {favorites.map((product) => (
                    <div key={product._id} className="favorite-card">
                      <Link to={`/product/${product.slug || product._id}`} className="favorite-card-img">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div className="favorite-placeholder">3D</div>
                        )}
                      </Link>
                      <div className="favorite-card-body">
                        <p className="favorite-cat">{product.category}</p>
                        <Link to={`/product/${product.slug || product._id}`}>
                          <h4 className="favorite-name">{product.name}</h4>
                        </Link>
                        <div className="favorite-rating">
                          <FiStar size={11} fill="currentColor" />
                          <span>{product.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div className="favorite-footer">
                          <strong className="favorite-price">{product.price}₺</strong>
                          <button
                            className="favorite-remove-btn"
                            onClick={() => toggleFavorite(product._id)}
                            title="Favorilerden çıkar"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="account-empty">
                  <div className="account-empty-icon">❤️</div>
                  <h3>Favori ürün yok</h3>
                  <p>Beğendiğiniz ürünleri favorilere ekleyin.</p>
                  <Link to="/shop" className="btn-primary">Ürünleri Keşfet</Link>
                </div>
              )}
            </div>
          )}

          {/* ── Yorumlarım ── */}
          {activeTab === 'reviews' && (
            <div className="account-section">
              <div className="account-section-header">
                <h2>Yorumlarım</h2>
              </div>

              {reviewsLoading ? (
                <div className="account-loading">
                  <FiRefreshCw size={20} className="spin" />
                  <span>Yükleniyor...</span>
                </div>
              ) : myReviews.length > 0 ? (
                <div className="reviews-list-account">
                  {myReviews.map((r, i) => (
                    <div key={i} className="account-review-card">
                      <div className="account-review-header">
                        <div className="account-review-product">
                          <FiPackage size={14} />
                          <Link to={`/product/${r.product?.slug || r.product?._id}`}>
                            {r.product?.name || '—'}
                          </Link>
                        </div>
                        <div className="account-review-rating">
                          {[1,2,3,4,5].map(s => (
                            <FiStar key={s} size={13}
                              fill={s <= r.rating ? 'currentColor' : 'none'}
                              className={s <= r.rating ? 'star-filled' : 'star-empty'} />
                          ))}
                        </div>
                        <span className="account-review-date">{formatDateTime(r.createdAt)}</span>
                      </div>
                      <p className="account-review-comment">"{r.comment}"</p>
                      <div className="account-review-status">
                        {r.status === 'approved' && <span className="review-approved">✓ Onaylandı</span>}
                        {r.status === 'pending' && <span className="review-pending">⏳ Onay Bekliyor</span>}
                        {r.status === 'rejected' && <span className="review-rejected">✗ Reddedildi</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="account-empty">
                  <div className="account-empty-icon">💬</div>
                  <h3>Henüz yorum yok</h3>
                  <p>Satın aldığınız ürünlere yorum yapabilirsiniz.</p>
                  <Link to="/shop" className="btn-primary">Alışverişe Başla</Link>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default AccountPage
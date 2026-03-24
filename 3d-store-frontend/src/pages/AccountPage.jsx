import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  FiUser, FiShoppingBag, FiHeart, FiMessageSquare,
  FiLogOut, FiChevronRight, FiEdit2, FiMapPin,
  FiLock, FiCheck, FiX, FiShield, FiTruck,
  FiPackage, FiStar, FiRefreshCw, FiEye
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useFavorite } from '../context/FavoriteContext'
import {
  updateProfileApi, changePasswordApi,
  addAddressApi, deleteAddressApi
} from '../api/authApi'
import { getMyOrdersApi, cancelOrderApi } from '../api/orderApi'
import { getProductReviewsApi } from '../api/reviweApi'
import './AccountPage.css'

const menuItems = [
  { id: 'orders',   label: 'Siparişlerim',    icon: FiShoppingBag },
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

const AccountPage = () => {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'orders'

  const [activeTab, setActiveTab] = useState(initialTab)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editingPassword, setEditingPassword] = useState(false)
  const [addingAddress, setAddingAddress] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Siparişler
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)

  // Yorumlar
  const [myReviews, setMyReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

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
    city: '', district: '', address: '', isDefault: false,
  })

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders()
    if (activeTab === 'reviews') fetchReviews()
  }, [activeTab])

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

  const handleAddAddress = async () => {
    try {
      const res = await addAddressApi(addressForm)
      setUser(prev => ({ ...prev, addresses: res.data }))
      setAddingAddress(false)
      setAddressForm({ title: 'Ev', fullName: '', phone: '', city: '', district: '', address: '', isDefault: false })
      showSuccess('Adres eklendi!')
    } catch (err) {
      showError(err.response?.data?.message || 'Adres eklenemedi.')
    }
  }

  const handleDeleteAddress = async (addressId) => {
    try {
      const res = await deleteAddressApi(addressId)
      setUser(prev => ({ ...prev, addresses: res.data }))
      showSuccess('Adres silindi.')
    } catch {
      showError('Adres silinemedi.')
    }
  }

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) return
    setCancellingId(orderId)
    try {
      await cancelOrderApi(orderId)
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'İptal' } : o))
      showSuccess('Sipariş iptal edildi.')
    } catch (err) {
      showError(err.response?.data?.message || 'Sipariş iptal edilemedi.')
    } finally {
      setCancellingId(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getInitials = () => `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`

  const getTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Bugün'
    if (days === 1) return 'Dün'
    if (days < 30) return `${days} gün önce`
    return new Date(date).toLocaleDateString('tr-TR')
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
                            <span className="order-card-date">{getTimeAgo(order.createdAt)}</span>
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
                          {['Bekliyor', 'Onaylandı'].includes(order.status) && (
                            <button
                              className="order-cancel-btn"
                              onClick={() => handleCancelOrder(order._id)}
                              disabled={cancellingId === order._id}
                            >
                              <FiX size={14} />
                              {cancellingId === order._id ? 'İptal ediliyor...' : 'İptal Et'}
                            </button>
                          )}
                        </div>

                        {/* Detay Açılır */}
                        {selectedOrder?._id === order._id && (
                          <div className="order-detail-expand">
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

                {/* Kişisel Bilgiler */}
                <div className="profile-card">
                  <div className="profile-card-header">
                    <div className="profile-card-icon"><FiUser size={18} /></div>
                    <h4>Kişisel Bilgiler</h4>
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

                {/* Şifre */}
                <div className="profile-card">
                  <div className="profile-card-header">
                    <div className="profile-card-icon"><FiLock size={18} /></div>
                    <h4>Şifre & Güvenlik</h4>
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
                      <div className="profile-row">
                        <span>Üyelik Tarihi</span>
                        <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '—'}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Adresler */}
                <div className="profile-card">
                  <div className="profile-card-header">
                    <div className="profile-card-icon"><FiMapPin size={18} /></div>
                    <h4>Adreslerim</h4>
                    <button className="profile-edit-btn" onClick={() => setAddingAddress(p => !p)}>
                      <FiEdit2 size={14} /> {addingAddress ? 'İptal' : 'Ekle'}
                    </button>
                  </div>

                  {addingAddress && (
                    <div className="profile-edit-form">
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
                      <div className="profile-form-group">
                        <label>İlçe</label>
                        <input className="profile-input" value={addressForm.district}
                          onChange={e => setAddressForm(p => ({ ...p, district: e.target.value }))} />
                      </div>
                      <div className="profile-form-group">
                        <label>Açık Adres</label>
                        <textarea className="profile-textarea" value={addressForm.address}
                          onChange={e => setAddressForm(p => ({ ...p, address: e.target.value }))} rows={3} />
                      </div>
                      <button className="profile-save-btn" onClick={handleAddAddress}>
                        <FiCheck size={14} /> Adresi Kaydet
                      </button>
                    </div>
                  )}

                  <div className="profile-rows">
                    {user?.addresses?.length > 0 ? user.addresses.map((addr, i) => (
                      <div key={i} className="address-item-row">
                        <div className="address-item-info">
                          <strong>{addr.title} — {addr.fullName}</strong>
                          <span>{addr.address}, {addr.district} / {addr.city}</span>
                        </div>
                        <button className="address-delete-btn" onClick={() => handleDeleteAddress(addr._id)}>
                          <FiX size={14} />
                        </button>
                      </div>
                    )) : (
                      <div className="profile-row">
                        <span>Henüz adres eklenmedi</span>
                      </div>
                    )}
                  </div>
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
                        <span className="account-review-date">{getTimeAgo(r.createdAt)}</span>
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
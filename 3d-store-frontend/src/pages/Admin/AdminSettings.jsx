import { useState, useEffect } from 'react'
import {
  FiGlobe, FiTruck, FiCreditCard, FiMail,
  FiUsers, FiShield, FiBell, FiSave, FiCheck,
  FiUpload, FiEye, FiEyeOff, FiPlus, FiTrash2,
  FiRefreshCw
} from 'react-icons/fi'
import { getSettingsApi, updateSettingsApi } from '../../api/settingsApi'
import { getUsersApi, updateUserApi, deleteUserApi } from '../../api/userApi'
import './AdminSettings.css'

const settingsTabs = [
  { id: 'general',       label: 'Genel',        icon: FiGlobe },
  { id: 'shipping',      label: 'Kargo',         icon: FiTruck },
  { id: 'payment',       label: 'Ödeme',         icon: FiCreditCard },
  { id: 'email',         label: 'E-posta',       icon: FiMail },
  { id: 'users',         label: 'Kullanıcılar',  icon: FiUsers },
  { id: 'security',      label: 'Güvenlik',      icon: FiShield },
  { id: 'notifications', label: 'Bildirimler',   icon: FiBell },
]

const roleColors = {
  'admin':     { color: '#e53e3e', bg: '#fff0f0' },
  'user':      { color: '#2563eb', bg: '#eff6ff' },
}

const AdminSettings = () => {
  const [activeTab, setActiveTab]     = useState('general')
  const [settings, setSettings]       = useState(null)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [showPass, setShowPass]       = useState(false)

  // Users
  const [users, setUsers]             = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm]       = useState({ firstName: '', lastName: '', email: '', role: 'user', password: '' })

  useEffect(() => { fetchSettings() }, [])
  useEffect(() => { if (activeTab === 'users') fetchUsers() }, [activeTab])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await getSettingsApi()
      setSettings(res.data)
    } catch (err) {
      console.log('Ayarlar yüklenemedi:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      // Tüm kullanıcılar (admin dahil)
      const res = await getUsersApi({ limit: 50 })
      setUsers(res.data || [])
    } catch (err) {
      console.log('Kullanıcılar yüklenemedi:', err.message)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updateSettingsApi(settings)
      setSettings(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.log('Kaydetme hatası:', err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const addCarrier = () => {
    const name = prompt('Kargo firması adı:')
    if (name) updateField('carriers', [...(settings.carriers || []), name])
  }

  const removeCarrier = (i) => {
    updateField('carriers', settings.carriers.filter((_, ci) => ci !== i))
  }

  const handleDeleteUser = async (id) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return
    try {
      await deleteUserApi(id)
      setUsers(prev => prev.filter(u => u._id !== id))
    } catch (err) {
      console.log('Silme hatası:', err.message)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await updateUserApi(userId, { role: newRole })
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u))
    } catch (err) {
      console.log('Rol güncellenemedi:', err.message)
    }
  }

  if (loading) return (
    <div className="admin-settings">
      <div className="overview-loading">
        <FiRefreshCw size={24} className="spin" />
        <span>Ayarlar yükleniyor...</span>
      </div>
    </div>
  )

  return (
    <div className="admin-settings">

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Ayarlar</h1>
          <p className="admin-page-sub">Mağaza yapılandırmasını buradan yönetin</p>
        </div>
        {activeTab !== 'users' && activeTab !== 'security' && (
          <button
            className={`settings-save-btn ${saved ? 'settings-saved' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saved
              ? <><FiCheck size={15} /> Kaydedildi!</>
              : saving
              ? <><FiRefreshCw size={15} className="spin" /> Kaydediliyor...</>
              : <><FiSave size={15} /> Değişiklikleri Kaydet</>
            }
          </button>
        )}
      </div>

      <div className="settings-layout">

        {/* Sidebar */}
        <aside className="settings-sidebar">
          {settingsTabs.map(t => (
            <button
              key={t.id}
              className={`settings-tab ${activeTab === t.id ? 'settings-tab-active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <t.icon size={16} />
              <span>{t.label}</span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className="settings-content">

          {/* ── Genel ── */}
          {activeTab === 'general' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <FiGlobe size={18} />
                <h3>Genel Ayarlar</h3>
              </div>
              <div className="settings-form">

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>Site Başlığı</label>
                    <input
                      className="admin-input"
                      value={settings?.siteName || ''}
                      onChange={e => updateField('siteName', e.target.value)}
                    />
                  </div>
                  <div className="settings-form-group">
                    <label>Para Birimi</label>
                    <select
                      className="admin-input"
                      value={settings?.currency || 'TRY'}
                      onChange={e => updateField('currency', e.target.value)}
                    >
                      <option value="TRY">₺ Türk Lirası (TRY)</option>
                      <option value="USD">$ Dolar (USD)</option>
                      <option value="EUR">€ Euro (EUR)</option>
                    </select>
                  </div>
                </div>

                <div className="settings-form-group">
                  <label>Site Açıklaması</label>
                  <textarea
                    className="admin-textarea"
                    value={settings?.siteDesc || ''}
                    onChange={e => updateField('siteDesc', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>Dil</label>
                    <select
                      className="admin-input"
                      value={settings?.language || 'tr'}
                      onChange={e => updateField('language', e.target.value)}
                    >
                      <option value="tr">Türkçe</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="settings-form-group">
                    <label>Saat Dilimi</label>
                    <select
                      className="admin-input"
                      value={settings?.timezone || 'Europe/Istanbul'}
                      onChange={e => updateField('timezone', e.target.value)}
                    >
                      <option value="Europe/Istanbul">Europe/Istanbul (UTC+3)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── Kargo ── */}
          {activeTab === 'shipping' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <FiTruck size={18} />
                <h3>Kargo Ayarları</h3>
              </div>
              <div className="settings-form">

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>Ücretsiz Kargo Eşiği (₺)</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={settings?.freeShippingThreshold || 500}
                      onChange={e => updateField('freeShippingThreshold', Number(e.target.value))}
                    />
                    <small className="input-hint">Bu tutarın üzerinde kargo ücretsiz</small>
                  </div>
                  <div className="settings-form-group">
                    <label>Standart Kargo Ücreti (₺)</label>
                    <input
                      type="number"
                      className="admin-input"
                      value={settings?.standardShippingCost || 49}
                      onChange={e => updateField('standardShippingCost', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="settings-form-group">
                  <label>Ekspres Kargo Ücreti (₺)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={settings?.expressShippingCost || 79}
                    onChange={e => updateField('expressShippingCost', Number(e.target.value))}
                    style={{ maxWidth: '200px' }}
                  />
                </div>

                <div className="settings-form-group">
                  <label>Kargo Firmaları</label>
                  <div className="carriers-list">
                    {(settings?.carriers || []).map((c, i) => (
                      <div key={i} className="carrier-item">
                        <span>{c}</span>
                        <button className="carrier-remove" onClick={() => removeCarrier(i)}>
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button className="add-carrier-btn" onClick={addCarrier}>
                      <FiPlus size={14} /> Kargo Firması Ekle
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── Ödeme ── */}
          {activeTab === 'payment' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <FiCreditCard size={18} />
                <h3>Ödeme Ayarları</h3>
              </div>
              <div className="settings-form">

                {/* TODO: İleride backend'e bağlanacak */}
                <div className="settings-todo-notice">
                  <span>ℹ️</span>
                  <div>
                    <strong>Ödeme Entegrasyonu</strong>
                    <p>iyzico API anahtarları ve ödeme yöntemleri ileride backend'e bağlanacak. Şu an `.env` dosyasından yönetilmektedir.</p>
                  </div>
                </div>

                <div className="settings-form-group">
                  <label>iyzico Ortamı</label>
                  <select className="admin-input" defaultValue="sandbox">
                    <option value="sandbox">Sandbox (Test)</option>
                    <option value="production">Production (Canlı)</option>
                  </select>
                </div>

                <div className="settings-form-group">
                  <label>iyzico API Key</label>
                  <input
                    className="admin-input"
                    defaultValue="sandbox-****"
                    readOnly
                    style={{ opacity: 0.6 }}
                  />
                  <small className="input-hint">API anahtarları .env dosyasından yönetilir</small>
                </div>

                <div className="settings-form-group">
                  <label>Taksit Seçenekleri</label>
                  <div className="installment-options">
                    {['1', '2', '3', '6', '9', '12'].map(n => (
                      <button key={n} className="installment-btn installment-active">
                        {n === '1' ? 'Tek Çekim' : `${n} Taksit`}
                      </button>
                    ))}
                  </div>
                  <small className="input-hint">Taksit yönetimi ileride backend'e bağlanacak</small>
                </div>

              </div>
            </div>
          )}

          {/* ── E-posta ── */}
          {activeTab === 'email' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <FiMail size={18} />
                <h3>E-posta Ayarları</h3>
              </div>
              <div className="settings-form">

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label>Gönderici Adı</label>
                    <input
                      className="admin-input"
                      value={settings?.siteName || 'Ozkan3D.design'}
                      onChange={e => updateField('siteName', e.target.value)}
                    />
                  </div>
                  <div className="settings-form-group">
                    <label>Gönderici E-posta</label>
                    <input
                      className="admin-input"
                      value={settings?.emailSender || ''}
                      onChange={e => updateField('emailSender', e.target.value)}
                      placeholder="noreply@ozkan3d.design"
                    />
                  </div>
                </div>

                {/* TODO: İleride mail şablonları düzenlenebilir hale gelecek */}
                <div className="settings-todo-notice">
                  <span>ℹ️</span>
                  <div>
                    <strong>E-posta Şablonları</strong>
                    <p>Sipariş onayı, kargo bildirimi ve şifre sıfırlama şablonları ileride düzenlenebilir hale getirilecek. Şu an `templates/` klasöründen yönetilmektedir.</p>
                  </div>
                </div>

                <div className="email-templates-list">
                  {[
                    { label: 'Sipariş Onayı', desc: 'Sipariş alındığında gönderilir', status: '✅ Aktif' },
                    { label: 'Kargo Bildirimi', desc: 'Kargo takip no eklendiğinde', status: '✅ Aktif' },
                    { label: 'Şifre Sıfırlama', desc: 'Müşteri şifre sıfırladığında', status: '✅ Aktif' },
                    { label: 'Hoş Geldin', desc: 'Yeni üye kaydında gönderilir', status: '✅ Aktif' },
                  ].map((t, i) => (
                    <div key={i} className="email-template-item">
                      <div className="email-template-icon">📧</div>
                      <div className="email-template-info">
                        <strong>{t.label}</strong>
                        <span>{t.desc}</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* ── Kullanıcılar ── */}
          {activeTab === 'users' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <FiUsers size={18} />
                <h3>Kullanıcı Yönetimi</h3>
              </div>

              <div className="users-list">
                {usersLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                    <FiRefreshCw size={20} className="spin" /> Yükleniyor...
                  </div>
                ) : users.map((u) => (
                  <div key={u._id} className="user-item">
                    <div className="user-avatar">
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <div className="user-info">
                      <strong>{u.firstName} {u.lastName}</strong>
                      <span>{u.email}</span>
                      <span className="user-last-login">
                        Üyelik: {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    {/* Rol değiştirme */}
                    <select
                      className="admin-input"
                      value={u.role}
                      onChange={e => handleRoleChange(u._id, e.target.value)}
                      style={{
                        width: '120px',
                        color: roleColors[u.role]?.color,
                        background: roleColors[u.role]?.bg,
                        fontWeight: 700,
                        fontSize: '0.78rem',
                      }}
                    >
                      <option value="user">Kullanıcı</option>
                      <option value="admin">Admin</option>
                    </select>

                    <span className={`user-status ${u.isActive !== false ? 'status-active' : 'status-passive'}`}>
                      {u.isActive !== false ? 'Aktif' : 'Pasif'}
                    </span>

                    <button
                      className="user-delete-btn"
                      onClick={() => handleDeleteUser(u._id)}
                      disabled={u.role === 'admin'}
                      title={u.role === 'admin' ? 'Admin silinemez' : 'Sil'}
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Rol açıklamaları */}
              <div className="role-descriptions">
                <h4>Rol Yetkileri</h4>
                <div className="roles-grid">
                  {[
                    { role: 'Admin', desc: 'Tüm yetkiler', color: '#e53e3e' },
                    { role: 'Kullanıcı', desc: 'Sadece alışveriş', color: '#2563eb' },
                  ].map((r, i) => (
                    <div key={i} className="role-item" style={{ borderLeftColor: r.color }}>
                      <strong style={{ color: r.color }}>{r.role}</strong>
                      <span>{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Güvenlik ── */}
          {activeTab === 'security' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <FiShield size={18} />
                <h3>Güvenlik Ayarları</h3>
              </div>
              <div className="settings-form">

                {/* TODO: İleride backend'e bağlanacak */}
                <div className="settings-todo-notice">
                  <span>ℹ️</span>
                  <div>
                    <strong>Güvenlik Ayarları</strong>
                    <p>2FA, IP kısıtlama ve oturum yönetimi ileride backend'e bağlanacak.</p>
                  </div>
                </div>

                <div className="security-items">
                  {[
                    { label: 'SSL Zorunlu', desc: 'HTTP\'yi HTTPS\'e yönlendir', enabled: true },
                    { label: 'Başarısız Giriş Kilidi', desc: '5 başarısız denemede hesap kilitle', enabled: true },
                    { label: 'Rate Limiting', desc: 'API isteklerini sınırla (100/15dk)', enabled: true },
                    { label: 'İki Faktörlü Doğrulama', desc: 'Admin girişlerinde 2FA — yakında', enabled: false },
                    { label: 'IP Kısıtlama', desc: 'Belirtilen IP\'lerden erişim — yakında', enabled: false },
                  ].map((item, i) => (
                    <div key={i} className="security-item">
                      <div className="security-item-info">
                        <strong>{item.label}</strong>
                        <span>{item.desc}</span>
                      </div>
                      <label className="toggle-switch">
                        <input type="checkbox" defaultChecked={item.enabled} disabled={!item.enabled} />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* ── Bildirimler ── */}
          {activeTab === 'notifications' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <FiBell size={18} />
                <h3>Bildirim Ayarları</h3>
              </div>
              <div className="settings-form">

                <div className="notif-channel-section">
                  <label className="settings-label">Bildirim Kanalları</label>
                  <div className="notif-channels">
                    <div className="notif-channel-item">
                      <div>
                        <strong>📧 E-posta Bildirimleri</strong>
                        <span>Önemli olaylar için e-posta gönder</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings?.emailNotif || false}
                          onChange={e => updateField('emailNotif', e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="notif-channel-item">
                      <div>
                        <strong>🔔 Tarayıcı Bildirimleri</strong>
                        <span>Panel açıkken anlık bildirim (Socket.io)</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings?.browserNotif || false}
                          onChange={e => updateField('browserNotif', e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="notif-events-section">
                  <label className="settings-label">Bildirim Olayları</label>
                  <div className="notif-events">
                    {[
                      { key: 'notifyNewOrder',      label: '🛒 Yeni Sipariş',    desc: 'Her yeni siparişte bildir' },
                      { key: 'notifyLowStock',      label: '⚠️ Düşük Stok',      desc: 'Stok eşiğin altına düştüğünde' },
                      { key: 'notifyNewReview',     label: '⭐ Yeni Yorum',       desc: 'Müşteri yorum yaptığında' },
                      { key: 'notifyReturnRequest', label: '↩️ İade Talebi',      desc: 'İade talebi geldiğinde' },
                      { key: 'notifyNewCustomer',   label: '👤 Yeni Üye',         desc: 'Yeni müşteri kaydında' },
                    ].map(event => (
                      <div key={event.key} className="notif-event-item">
                        <div className="notif-event-info">
                          <strong>{event.label}</strong>
                          <span>{event.desc}</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings?.[event.key] || false}
                            onChange={e => updateField(event.key, e.target.checked)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="settings-form-group">
                  <label>Düşük Stok Uyarı Eşiği</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={settings?.lowStockThreshold || 10}
                    onChange={e => updateField('lowStockThreshold', Number(e.target.value))}
                    style={{ maxWidth: '120px' }}
                  />
                  <small className="input-hint">Bu adet ve altına düşünce uyarı gönder</small>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default AdminSettings
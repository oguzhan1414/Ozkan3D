import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { updateProfileApi, changePasswordApi } from '../../../api/authApi'
import { PasswordInput } from '../auth/AuthShell'

const today = new Date().toISOString().slice(0, 10)

const ProfileForm = ({ notify }) => {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    birthDate: user?.birthDate ? String(user.birthDate).slice(0, 10) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Ad ve soyad boş olamaz.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const res = await updateProfileApi({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        birthDate: form.birthDate || null,
      })
      setUser(res.data)
      localStorage.setItem('user', JSON.stringify(res.data))
      notify('Bilgilerin güncellendi.')
    } catch (err) {
      setError(err.response?.data?.message || 'Bilgiler kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="ac-panel" onSubmit={submit} noValidate>
      <h3>Kişisel bilgiler</h3>
      <div className="sf-form-grid">
        <label className="sf-field">
          <span className="sf-field-label">Ad</span>
          <input value={form.firstName} onChange={set('firstName')} maxLength={30} autoComplete="given-name" />
        </label>
        <label className="sf-field">
          <span className="sf-field-label">Soyad</span>
          <input value={form.lastName} onChange={set('lastName')} maxLength={30} autoComplete="family-name" />
        </label>
        <label className="sf-field">
          <span className="sf-field-label">Telefon</span>
          <input value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" />
        </label>
        <label className="sf-field">
          <span className="sf-field-label">Doğum tarihi</span>
          <input type="date" value={form.birthDate} onChange={set('birthDate')} max={today} />
        </label>
        <label className="sf-field is-wide">
          <span className="sf-field-label">E-posta</span>
          <input value={user?.email || ''} readOnly disabled />
          <span className="ac-field-hint">E-posta adresini değiştirmek için <Link to="/account?tab=support">bize yaz</Link>.</span>
        </label>
      </div>
      {error && <p className="sf-submit-error" role="alert">{error}</p>}
      <div className="ac-panel-actions">
        <button type="submit" className="sf-btn sf-btn--ink" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </div>
    </form>
  )
}

const PasswordForm = ({ notify }) => {
  const { user } = useAuth()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.next.length < 8) return setError('Yeni şifre en az 8 karakter olmalı.')
    if (form.next !== form.confirm) return setError('Yeni şifreler eşleşmiyor.')
    setError('')
    setSaving(true)
    try {
      const res = await changePasswordApi({ currentPassword: form.current, newPassword: form.next })
      // Backend yeni bir oturum anahtarı döner
      if (res?.token) localStorage.setItem('token', res.token)
      setForm({ current: '', next: '', confirm: '' })
      notify('Şifren değiştirildi.')
    } catch (err) {
      setError(err.response?.data?.message || 'Şifre değiştirilemedi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="ac-panel" onSubmit={submit} noValidate>
      <h3>Şifre</h3>
      {user?.googleId && (
        <p className="ac-panel-lead">Google ile giriş yapıyorsan şifreye ihtiyacın yok. Şifre belirlemek için <Link to="/forgot-password">sıfırlama bağlantısı</Link> iste.</p>
      )}
      <div className="sf-form-grid">
        <label className="sf-field is-wide">
          <span className="sf-field-label">Mevcut şifre</span>
          <PasswordInput value={form.current} onChange={set('current')} autoComplete="current-password" name="current" />
        </label>
        <label className="sf-field">
          <span className="sf-field-label">Yeni şifre</span>
          <PasswordInput value={form.next} onChange={set('next')} autoComplete="new-password" name="next" />
        </label>
        <label className="sf-field">
          <span className="sf-field-label">Yeni şifre tekrar</span>
          <PasswordInput value={form.confirm} onChange={set('confirm')} autoComplete="new-password" name="confirm" />
        </label>
      </div>
      {error && <p className="sf-submit-error" role="alert">{error}</p>}
      <div className="ac-panel-actions">
        <button type="submit" className="sf-btn sf-btn--ink" disabled={saving}>{saving ? 'Değiştiriliyor…' : 'Şifreyi değiştir'}</button>
        <Link to="/forgot-password" className="sf-link-btn">Mevcut şifremi hatırlamıyorum</Link>
      </div>
    </form>
  )
}

const SettingsTab = ({ notify }) => (
  <div className="ac-settings">
    <ProfileForm notify={notify} />
    <PasswordForm notify={notify} />
  </div>
)

export default SettingsTab

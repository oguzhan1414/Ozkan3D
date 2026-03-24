import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiMail, FiLock, FiEye, FiEyeOff,
  FiArrowRight, FiUser, FiPhone
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import './AuthPages.css'

const RegisterPage = () => {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    phone: '', password: '', confirmPassword: '',
    birthDate: '', agree: false,
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const getPasswordStrength = (pass) => {
    if (!pass) return { strength: 0, label: '', color: '' }
    let score = 0
    if (pass.length >= 8) score++
    if (/[A-Z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++
    const levels = [
      { strength: 1, label: 'Çok Zayıf', color: '#ef4444' },
      { strength: 2, label: 'Zayıf', color: '#f59e0b' },
      { strength: 3, label: 'İyi', color: '#3b82f6' },
      { strength: 4, label: 'Güçlü', color: '#16a34a' },
    ]
    return levels[score - 1] || { strength: 0, label: '', color: '' }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('Lütfen zorunlu alanları doldurun.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    if (form.password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.')
      return
    }
    if (!form.agree) {
      setError('Kullanım koşullarını kabul etmelisiniz.')
      return
    }

    setLoading(true)
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        birthDate: form.birthDate || undefined,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt olunamadı, tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const passStrength = getPasswordStrength(form.password)

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon"><span>O</span></div>
          <div className="auth-logo-text">
            <span className="auth-logo-brand">Ozkan3D</span>
            <span className="auth-logo-domain">.design</span>
          </div>
        </Link>

        <div className="auth-form-header">
          <h1>Hesap Oluştur</h1>
          <p>Zaten hesabın var mı? <Link to="/login" className="auth-link">Giriş Yap</Link></p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ad *</label>
              <div className="form-input-wrap">
                <FiUser className="form-icon" size={17} />
                <input
                  type="text"
                  name="firstName"
                  placeholder="Adınız"
                  value={form.firstName}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Soyad *</label>
              <div className="form-input-wrap">
                <FiUser className="form-icon" size={17} />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Soyadınız"
                  value={form.lastName}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">E-posta Adresi *</label>
            <div className="form-input-wrap">
              <FiMail className="form-icon" size={17} />
              <input
                type="email"
                name="email"
                placeholder="ornek@email.com"
                value={form.email}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telefon</label>
              <div className="form-input-wrap">
                <FiPhone className="form-icon" size={17} />
                <input
                  type="tel"
                  name="phone"
                  placeholder="05XX XXX XX XX"
                  value={form.phone}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Doğum Tarihi</label>
              <div className="form-input-wrap">
                <input
                  type="date"
                  name="birthDate"
                  value={form.birthDate}
                  onChange={handleChange}
                  className="form-input"
                  style={{ paddingLeft: '12px' }}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Şifre *</label>
            <div className="form-input-wrap">
              <FiLock className="form-icon" size={17} />
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                placeholder="En az 8 karakter"
                value={form.password}
                onChange={handleChange}
                className="form-input"
              />
              <button type="button" className="form-eye-btn" onClick={() => setShowPass(p => !p)}>
                {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {form.password && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="strength-bar"
                      style={{ background: i <= passStrength.strength ? passStrength.color : '#e0e0e0' }}
                    />
                  ))}
                </div>
                <span style={{ color: passStrength.color }}>{passStrength.label}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Şifre Tekrar *</label>
            <div className="form-input-wrap">
              <FiLock className="form-icon" size={17} />
              <input
                type={showPass ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Şifrenizi tekrar girin"
                value={form.confirmPassword}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="form-error-text">Şifreler eşleşmiyor</p>
            )}
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="agree"
              checked={form.agree}
              onChange={handleChange}
            />
            <span>
              <Link to="/terms" className="auth-link">Kullanım Koşulları</Link>'nı ve{' '}
              <Link to="/privacy" className="auth-link">Gizlilik Politikası</Link>'nı okudum, kabul ediyorum.
            </span>
          </label>

          <button
            type="submit"
            className={`auth-submit-btn ${loading ? 'auth-submit-loading' : ''}`}
            disabled={loading}
          >
            {loading ? <span className="auth-spinner" /> : <>Hesap Oluştur <FiArrowRight size={16} /></>}
          </button>

        </form>

        <p className="auth-bottom-text">
          Kayıt olarak{' '}
          <Link to="/terms" className="auth-link">Kullanım Koşulları</Link>'nı kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiMail, FiLock, FiEye, FiEyeOff,
  FiArrowRight, FiUser
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import siteLogo from '../images/logo-wordmark.png'
import './AuthPages.css'

const RegisterPage = () => {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    phone: '', password: '', confirmPassword: '',
    birthDate: '', agree: false,
  })
  const [legalModal, setLegalModal] = useState({ open: false, type: 'terms' })
  const [legalRead, setLegalRead] = useState({ terms: false, privacy: false })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()
  const emailRegex = /^\S+@\S+\.\S+$/

  const legalDocs = {
    terms: {
      title: 'Mesafeli Satış Sözleşmesi',
      path: '/distance-selling',
      intro: 'Sipariş, ödeme, üretim ve teslimat süreçlerinde tarafların hak ve sorumluluklarını açıklar.',
      points: [
        'Siparişinizin nasıl onaylandığı ve işlendiği',
        'Teslimat süresi ve kargo sürecine dair çerçeve',
        'İptal, iade ve uyuşmazlık süreçlerinin kapsamı',
      ],
    },
    privacy: {
      title: 'KVKK Politikası',
      path: '/kvkk',
      intro: 'Kişisel verilerinizin hangi amaçlarla işlendiğini, saklandığını ve hangi haklara sahip olduğunuzu belirtir.',
      points: [
        'Toplanan veriler ve kullanım amacı',
        'Veri saklama süresi ve güvenlik önlemleri',
        'Düzeltme, silme ve itiraz hakları',
      ],
    },
  }

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const openLegalModal = (type) => {
    setLegalModal({ open: true, type })
  }

  const closeLegalModal = () => {
    setLegalModal(prev => ({ ...prev, open: false }))
  }

  const approveCurrentLegal = () => {
    setLegalRead(prev => ({ ...prev, [legalModal.type]: true }))
    closeLegalModal()
  }

  const normalizePhoneDigits = (rawValue = '') => {
    let digits = rawValue.replace(/\D/g, '')
    if (digits.startsWith('90')) digits = digits.slice(2)
    if (digits.startsWith('0')) digits = digits.slice(1)
    return digits.slice(0, 10)
  }

  const handlePhoneChange = e => {
    const digits = normalizePhoneDigits(e.target.value)
    setForm(prev => ({ ...prev, phone: digits }))
  }

  const formatPhoneDisplay = (digits = '') => {
    const p1 = digits.slice(0, 3)
    const p2 = digits.slice(3, 6)
    const p3 = digits.slice(6, 8)
    const p4 = digits.slice(8, 10)
    return [p1, p2, p3, p4].filter(Boolean).join(' ')
  }

  useEffect(() => {
    if (!legalModal.open) return

    const handleEsc = (e) => {
      if (e.key === 'Escape') closeLegalModal()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEsc)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }
  }, [legalModal.open])

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

    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.phone || !form.birthDate) {
      setError('Lütfen zorunlu alanları doldurun.')
      return
    }
    if (!emailRegex.test(form.email.trim())) {
      setError('Geçerli bir e-posta adresi giriniz.')
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
    if (form.phone.length !== 10) {
      setError('Telefon numarası +90 sonrası 10 hane olmalıdır.')
      return
    }
    if (!form.birthDate) {
      setError('Doğum tarihi zorunludur.')
      return
    }
    if (!legalRead.terms || !legalRead.privacy) {
      setError('Devam etmeden önce Mesafeli Satış ve KVKK metinlerini okuyup onaylayın.')
      return
    }
    if (!form.agree) {
      setError('Kullanım koşullarını kabul etmelisiniz.')
      return
    }

    setLoading(true)
    try {
      const res = await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: `+90${form.phone}`,
        birthDate: form.birthDate,
      })
      navigate('/verify-pending', {
        replace: true,
        state: {
          email: form.email,
          verifyExpiresInSeconds: res.verifyExpiresInSeconds || 180,
          verificationNotice: res.message || 'Kayıt başarılı. E-posta doğrulamasını tamamlayın.',
        },
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt olunamadı, tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const passStrength = getPasswordStrength(form.password)
  const formattedPhone = formatPhoneDisplay(form.phone)
  const today = new Date().toISOString().split('T')[0]
  const allLegalReviewed = legalRead.terms && legalRead.privacy
  const activeLegal = legalDocs[legalModal.type]

  return (
    <div className="auth-page">
      <div className="auth-card register-card">
        <Link to="/" className="auth-logo">
          <img src={siteLogo} alt="Ozkan3D logo" className="auth-logo-image" />
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
                  required
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
                  required
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
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telefon *</label>
              <div className="form-input-wrap phone-input-wrap">
                <span className="phone-prefix">+90</span>
                <input
                  type="tel"
                  name="phone"
                  placeholder="5XX XXX XX XX"
                  value={formattedPhone}
                  onChange={handlePhoneChange}
                  className="form-input phone-input"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={13}
                  pattern="[0-9 ]{0,13}"
                  required
                />
              </div>
              
            </div>
            <div className="form-group">
              <label className="form-label">Doğum Tarihi *</label>
              <div className="form-input-wrap">
                <input
                  type="date"
                  name="birthDate"
                  value={form.birthDate}
                  onChange={handleChange}
                  className="form-input"
                  style={{ paddingLeft: '12px' }}
                  max={today}
                  required
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
                required
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
                required
              />
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="form-error-text">Şifreler eşleşmiyor</p>
            )}
          </div>

          <div className="legal-consent-block">
            <div className="legal-doc-actions">
              <button
                type="button"
                className={`legal-doc-btn ${legalRead.terms ? 'is-read' : ''}`}
                onClick={() => openLegalModal('terms')}
              >
                {legalRead.terms ? 'Mesafeli Satış: Onaylandı' : 'Mesafeli Satış Sözleşmesi Oku'}
              </button>
              <button
                type="button"
                className={`legal-doc-btn ${legalRead.privacy ? 'is-read' : ''}`}
                onClick={() => openLegalModal('privacy')}
              >
                {legalRead.privacy ? 'KVKK: Onaylandı' : 'KVKK Politikası Oku'}
              </button>
            </div>

            <label className={`checkbox-label ${!allLegalReviewed ? 'checkbox-label-disabled' : ''}`}>
              <input
                type="checkbox"
                name="agree"
                checked={form.agree}
                onChange={handleChange}
                disabled={!allLegalReviewed}
              />
              <span>Yasal metinleri okudum, anladım ve kabul ediyorum.</span>
            </label>

            {!allLegalReviewed && (
              <p className="form-info-text">Devam etmek için iki metni de açıp onaylayın.</p>
            )}
          </div>

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
          <Link to="/distance-selling" className="auth-link">Mesafeli Satış Sözleşmesi</Link>'ni kabul etmiş olursunuz.
        </p>
      </div>

      {legalModal.open && (
        <div className="legal-modal-backdrop" onClick={closeLegalModal}>
          <div
            className="legal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="legal-modal-head">
              <h3 id="legal-modal-title">{activeLegal.title}</h3>
              <button type="button" className="legal-modal-close" onClick={closeLegalModal} aria-label="Kapat">
                ×
              </button>
            </div>

            <p className="legal-modal-intro">{activeLegal.intro}</p>

            <ul className="legal-points">
              {activeLegal.points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>

            <div className="legal-modal-actions">
              <a href={activeLegal.path} target="_blank" rel="noreferrer" className="btn-outline legal-open-link">
                Tam Metni Yeni Sekmede Aç
              </a>
              <button type="button" className="auth-submit-btn legal-approve-btn" onClick={approveCurrentLegal}>
                Okudum, Onaylıyorum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegisterPage
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import './AuthPages.css'

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Nereden yönlendirildiyse oraya gönder, yoksa anasayfa
  const from = location.state?.from?.pathname || '/'

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    if (!form.email || !form.password) {
      setError('Lütfen tüm alanları doldurun.')
      return
    }

    setLoading(true)
    try {
      const res = await login(form.email, form.password)
      // Admin ise admin paneline, değilse geldiği sayfaya yönlendir
      if (res.user.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş yapılamadı, tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

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
          <h1>Giriş Yap</h1>
          <p>Hesabın yok mu? <Link to="/register" className="auth-link">Kayıt Ol</Link></p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-posta Adresi</label>
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

          <div className="form-group">
            <label className="form-label">
              Şifre
              <Link to="/forgot-password" className="form-label-link">Şifremi Unuttum</Link>
            </label>
            <div className="form-input-wrap">
              <FiLock className="form-icon" size={17} />
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="form-input"
              />
              <button type="button" className="form-eye-btn" onClick={() => setShowPass(p => !p)}>
                {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`auth-submit-btn ${loading ? 'auth-submit-loading' : ''}`}
            disabled={loading}
          >
            {loading ? <span className="auth-spinner" /> : <>Giriş Yap <FiArrowRight size={16} /></>}
          </button>
        </form>

        <div className="auth-divider"><span>veya</span></div>

        <div className="auth-social">
          <button className="auth-social-btn">
            <img src="https://www.google.com/favicon.ico" alt="Google" width={18} />
            Google ile Giriş
          </button>
        </div>

        <p className="auth-bottom-text">
          Devam ederek <Link to="/terms" className="auth-link">Kullanım Koşulları</Link>'nı
          ve <Link to="/privacy" className="auth-link">Gizlilik Politikası</Link>'nı kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  )
}

export default LoginPage
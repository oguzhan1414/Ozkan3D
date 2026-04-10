import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import siteLogo from '../images/logo-wordmark.png'
import './AuthPages.css'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: location.state?.email || '', password: '' })
  const [info, setInfo] = useState(location.state?.verificationNotice || '')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, googleLoginUser } = useAuth()

  useEffect(() => {
    if (location.state?.verificationNotice) {
      setInfo(location.state.verificationNotice)
    }
    if (location.state?.email) {
      setForm(prev => ({ ...prev, email: location.state.email }))
    }
  }, [location.state])

  // Nereden yönlendirildiyse oraya gönder, yoksa anasayfa
  const from = location.state?.from?.pathname || '/'

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setInfo('')

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

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true)
      const res = await googleLoginUser(credentialResponse.credential)
      if (res.user.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google ile giriş başarısız.')
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError('Google hesabı ile giriş yapılamadı.')
  }

  return (
    <div className="auth-page">
      <div className="auth-card login-card">
        <Link to="/" className="auth-logo">
          <img src={siteLogo} alt="Ozkan3D logo" className="auth-logo-image" />
        </Link>

        <div className="auth-form-header">
          <h1>Giriş Yap</h1>
          <p>Hesabın yok mu? <Link to="/register" className="auth-link">Kayıt Ol</Link></p>
        </div>

        {info && <div className="auth-success">{info}</div>}
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
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            shape="rectangular"
            theme="outline"
            text="continue_with"
            width="100%"
          />
        </div>

        <p className="auth-bottom-text auth-bottom-text-login">
          Devam ederek <Link to="/distance-selling" className="auth-link">Mesafeli Satış Sözleşmesi</Link>'ni
          ve <Link to="/kvkk" className="auth-link">KVKK Politikası</Link>'nı kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  )
}

export default LoginPage
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiArrowRight, FiClock, FiMail, FiRefreshCw } from 'react-icons/fi'
import { resendVerificationEmailApi } from '../api/authApi'
import siteLogo from '../images/logo-wordmark.png'
import './AuthPages.css'

const STORAGE_KEY = 'ozkan3d_verify_pending'

const formatTimer = (totalSeconds) => {
  const safe = Math.max(0, totalSeconds)
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0')
  const seconds = String(safe % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

const VerifyPendingPage = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [expiresAt, setExpiresAt] = useState(null)
  const [nowTs, setNowTs] = useState(Date.now())
  const [notice, setNotice] = useState('Doğrulama bağlantısını e-posta kutunuza gönderdik.')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    const stateEmail = location.state?.email
    const stateExpiresIn = Number(location.state?.verifyExpiresInSeconds || 0)
    const stateNotice = location.state?.verificationNotice

    if (stateEmail && stateExpiresIn > 0) {
      const nextExpiresAt = Date.now() + stateExpiresIn * 1000
      const payload = {
        email: String(stateEmail).trim().toLowerCase(),
        expiresAt: nextExpiresAt,
      }

      setEmail(payload.email)
      setExpiresAt(payload.expiresAt)
      if (stateNotice) setNotice(stateNotice)
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      return
    }

    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored)
      if (parsed?.email) setEmail(String(parsed.email))
      if (parsed?.expiresAt) setExpiresAt(Number(parsed.expiresAt))
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [location.state])

  const remainingSeconds = useMemo(() => {
    if (!expiresAt) return 0
    return Math.max(0, Math.ceil((expiresAt - nowTs) / 1000))
  }, [expiresAt, nowTs])

  useEffect(() => {
    if (!expiresAt) return

    const timer = window.setInterval(() => {
      setNowTs(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [expiresAt])

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = window.setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendCooldown])

  const handleResend = async (e) => {
    e.preventDefault()
    setResendError('')
    setResendMessage('')

    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail) {
      setResendError('Lütfen e-posta adresinizi girin.')
      return
    }

    if (resendCooldown > 0) return

    setResendLoading(true)
    try {
      const res = await resendVerificationEmailApi(normalizedEmail)
      const nextExpiresIn = Number(res.verifyExpiresInSeconds || 180)
      const nextExpiresAt = Date.now() + nextExpiresIn * 1000

      setEmail(normalizedEmail)
      setExpiresAt(nextExpiresAt)
      setResendCooldown(30)
      setResendMessage(res.message || 'Doğrulama e-postası yeniden gönderildi.')
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ email: normalizedEmail, expiresAt: nextExpiresAt })
      )
    } catch (err) {
      const message = err.response?.data?.message || 'Doğrulama e-postası gönderilemedi.'
      setResendError(message)
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoLogin = () => {
    navigate('/login', { state: { email } })
  }

  const isExpired = remainingSeconds <= 0

  return (
    <div className="auth-page">
      <div className="auth-card login-card">
        <Link to="/" className="auth-logo">
          <img src={siteLogo} alt="Ozkan3D logo" className="auth-logo-image" />
        </Link>

        <div className="auth-form-header">
          <h1>E-posta Onayı Bekleniyor</h1>
          <p>Hesabınızı aktifleştirmek için e-postadaki doğrulama bağlantısını açın.</p>
        </div>

        <div className={isExpired ? 'auth-error' : 'auth-success'}>
          <div className="verify-timer-row">
            <FiClock size={16} />
            <strong>{isExpired ? 'Süre doldu' : `Kalan süre: ${formatTimer(remainingSeconds)}`}</strong>
          </div>
          <p>{notice}</p>
        </div>

        <div className="verify-actions">
          <button type="button" className="auth-submit-btn" onClick={handleGoLogin}>
            Mailimi Doğruladım, Girişe Geç <FiArrowRight size={16} />
          </button>
        </div>

        <form className="auth-form" onSubmit={handleResend}>
          <div className="form-group">
            <label className="form-label">Doğrulama Mailini Tekrar Gönder</label>
            <div className="form-input-wrap">
              <FiMail className="form-icon" size={17} />
              <input
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>

          {resendMessage && <div className="auth-success">{resendMessage}</div>}
          {resendError && <div className="auth-error">{resendError}</div>}

          <button
            type="submit"
            className={`auth-submit-btn ${resendLoading ? 'auth-submit-loading' : ''}`}
            disabled={resendLoading || resendCooldown > 0}
          >
            {resendLoading ? (
              <span className="auth-spinner" />
            ) : resendCooldown > 0 ? (
              <>Tekrar Gönder ({resendCooldown}s)</>
            ) : (
              <><FiRefreshCw size={15} /> Maili Yeniden Gönder</>
            )}
          </button>
        </form>

        <p className="auth-bottom-text auth-bottom-text-login">
          {isExpired
            ? 'Süre dolduysa güvenlik nedeniyle kayıt iptal edilir. Tekrar kayıt olabilirsiniz.'
            : 'Süre dolmadan doğrulama tamamlanmazsa kayıt güvenlik nedeniyle iptal edilir.'}
        </p>

        <p className="auth-bottom-text auth-bottom-text-login">
          <Link to="/register" className="auth-link">Kayıt ekranına dön</Link>
        </p>
      </div>
    </div>
  )
}

export default VerifyPendingPage

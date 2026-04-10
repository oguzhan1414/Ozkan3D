import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowRight, FiCheckCircle, FiMail } from 'react-icons/fi'
import { resendVerificationEmailApi, verifyEmailApi } from '../api/authApi'
import siteLogo from '../images/logo-wordmark.png'
import './AuthPages.css'

const VerifyEmailPage = () => {
  const { token } = useParams()
  const [status, setStatus] = useState('pending')
  const [message, setMessage] = useState('Doğrulamayı tamamlamak için aşağıdaki butona tıklayın.')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = window.setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [resendCooldown])

  const handleVerify = async () => {
    if (verifyLoading) return

    if (!token) {
      setStatus('error')
      setMessage('Doğrulama token bilgisi eksik. Lütfen e-postadaki bağlantıyı tekrar açın.')
      return
    }

    setVerifyLoading(true)
    setResendError('')
    setResendMessage('')

    try {
      const res = await verifyEmailApi(token)
      setStatus('success')
      setMessage(res.message || 'E-posta adresiniz doğrulandı. Artık giriş yapabilirsiniz.')
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.message || 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.')
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleResend = async (e) => {
    e.preventDefault()
    setResendError('')
    setResendMessage('')

    if (!email) {
      setResendError('Lütfen e-posta adresinizi girin.')
      return
    }

    if (resendCooldown > 0) return

    setResendLoading(true)
    try {
      const res = await resendVerificationEmailApi(email)
      setResendMessage(res.message || 'Doğrulama e-postası yeniden gönderildi.')
      setResendCooldown(60)
    } catch (err) {
      setResendError(err.response?.data?.message || 'Doğrulama e-postası gönderilemedi.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card login-card">
        <Link to="/" className="auth-logo">
          <img src={siteLogo} alt="Ozkan3D logo" className="auth-logo-image" />
        </Link>

        <div className="auth-form-header">
          <h1>E-posta Doğrulama</h1>
          <p>Hesap güvenliği için doğrulamayı kayıt sonrası 3 dakika içinde tamamlamalısınız.</p>
        </div>

        {status === 'pending' && (
          <>
            <div className="auth-success" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{message}</span>
            </div>
            <button
              type="button"
              className={`auth-submit-btn ${verifyLoading ? 'auth-submit-loading' : ''}`}
              onClick={handleVerify}
              disabled={verifyLoading}
            >
              {verifyLoading ? <span className="auth-spinner" /> : <>E-postamı Doğrula <FiArrowRight size={16} /></>}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="auth-error">{message}</div>

            <form className="auth-form" onSubmit={handleResend}>
              <div className="form-group">
                <label className="form-label">Doğrulama Mailini Tekrar Gönder</label>
                <div className="form-input-wrap">
                  <FiMail className="form-icon" size={17} />
                  <input
                    type="email"
                    name="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
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
                  <>Maili Yeniden Gönder <FiArrowRight size={16} /></>
                )}
              </button>
            </form>

            <p className="auth-bottom-text auth-bottom-text-login">
              3 dakika içinde doğrulanmayan kayıtlar güvenlik amacıyla otomatik iptal edilir.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="auth-success" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiCheckCircle size={18} />
              <span>{message}</span>
            </div>
            <Link to="/login" className="auth-submit-btn" style={{ textDecoration: 'none' }}>
              Giriş Sayfasına Git <FiArrowRight size={16} />
            </Link>
          </>
        )}

        <p className="auth-bottom-text auth-bottom-text-login">
          Doğrulama sonrası <Link to="/login" className="auth-link">giriş sayfasından</Link> devam edebilirsiniz.
        </p>
      </div>
    </div>
  )
}

export default VerifyEmailPage

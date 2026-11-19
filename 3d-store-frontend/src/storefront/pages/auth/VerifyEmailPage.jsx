import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { resendVerificationEmailApi, verifyEmailApi } from '../../../api/authApi'
import { AuthShell, AuthField, AuthAlert } from './AuthShell'

const VerifyEmailPage = () => {
  const { token } = useParams()
  const [status, setStatus] = useState('pending')
  const [message, setMessage] = useState('Doğrulamayı tamamlamak için aşağıdaki butona tıkla.')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const verify = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await verifyEmailApi(token)
      setStatus('success')
      setMessage(res.message || 'E-posta adresin doğrulandı. Artık giriş yapabilirsin.')
      sessionStorage.removeItem('ozkan3d_verify_pending')
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.message || 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.')
    } finally {
      setLoading(false)
    }
  }

  const resend = async (event) => {
    event.preventDefault()
    if (resendLoading || cooldown > 0) return
    setError('')
    setResendMessage('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Geçerli bir e-posta adresi gir.')
      return
    }
    setResendLoading(true)
    try {
      const res = await resendVerificationEmailApi(normalizedEmail)
      setResendMessage(res.message || 'Doğrulama e-postası yeniden gönderildi.')
      setCooldown(60)
    } catch (err) {
      setError(err.response?.data?.message || 'Doğrulama e-postası gönderilemedi.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <AuthShell
      title={status === 'success' ? 'E-postan doğrulandı' : 'E-postanı doğrula'}
      lead="Hesabını güvenle kullanabilmek için e-posta doğrulamasını tamamla."
      footer={<>Zaten doğruladın mı? <Link to="/login">Giriş yap</Link></>}
    >
      <AuthAlert tone={status === 'success' ? 'success' : status === 'error' ? 'error' : 'info'}>{message}</AuthAlert>
      {status === 'pending' && (
        <button type="button" className="sf-btn sf-btn--accent sf-auth-submit sf-auth-action" onClick={verify} disabled={loading}>
          {loading ? 'Doğrulanıyor…' : 'E-postamı doğrula'}
        </button>
      )}
      {status === 'success' && (
        <Link to="/login" className="sf-btn sf-btn--accent sf-auth-submit sf-auth-action">Giriş yap</Link>
      )}
      {status === 'error' && (
        <form className="sf-auth-form" onSubmit={resend} noValidate>
          <AuthField label="E-posta" hint="Yeni bir doğrulama bağlantısı gönderelim.">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
          </AuthField>
          <AuthAlert tone="success">{resendMessage}</AuthAlert>
          <AuthAlert>{error}</AuthAlert>
          <button type="submit" className="sf-btn sf-btn--accent sf-auth-submit" disabled={resendLoading || cooldown > 0}>
            {resendLoading ? 'Gönderiliyor…' : cooldown > 0 ? `Tekrar gönder (${cooldown} sn)` : 'Doğrulama bağlantısını yeniden gönder'}
          </button>
          <p className="sf-auth-note">Kaydının süresi dolduysa <Link to="/register">tekrar hesap oluşturabilirsin.</Link></p>
        </form>
      )}
    </AuthShell>
  )
}

export default VerifyEmailPage

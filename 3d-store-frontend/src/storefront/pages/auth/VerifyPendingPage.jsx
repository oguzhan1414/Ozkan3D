import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { resendVerificationEmailApi } from '../../../api/authApi'
import { AuthShell, AuthField, AuthAlert } from './AuthShell'

const STORAGE_KEY = 'ozkan3d_verify_pending'

const readPending = (state) => {
  let stored
  try {
    stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
  } catch { /* Ignore an invalid saved verification request. */ }
  const email = String(state?.email || stored?.email || '').trim().toLowerCase()
  // Reuse the original deadline on refresh instead of restarting the countdown.
  const expiresAt = stored?.email === email && Number.isFinite(stored?.expiresAt)
    ? stored.expiresAt
    : state?.email && Number(state.verifyExpiresInSeconds) > 0
      ? Date.now() + Number(state.verifyExpiresInSeconds) * 1000
      : null
  return { email, expiresAt }
}

const VerifyPendingPage = () => {
  const location = useLocation()
  const [pending, setPending] = useState(() => readPending(location.state))
  const [email, setEmail] = useState(pending.email)
  const [now, setNow] = useState(() => Date.now())
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (pending.email && pending.expiresAt) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
    }
  }, [pending])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const remaining = Math.max(0, Math.ceil(((pending.expiresAt || now) - now) / 1000))
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const timerText = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`

  const resend = async (event) => {
    event.preventDefault()
    if (loading || cooldown > 0) return
    setError('')
    setMessage('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Geçerli bir e-posta adresi gir.')
      return
    }
    setLoading(true)
    try {
      const res = await resendVerificationEmailApi(normalizedEmail)
      const timestamp = Date.now()
      setNow(timestamp)
      setPending({ email: normalizedEmail, expiresAt: timestamp + (Number(res.verifyExpiresInSeconds) || 180) * 1000 })
      setEmail(normalizedEmail)
      setCooldownUntil(timestamp + 30000)
      setMessage(res.message || 'Doğrulama e-postası yeniden gönderildi.')
    } catch (err) {
      setError(err.response?.data?.message || 'Doğrulama e-postası gönderilemedi. Tekrar dene.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="E-postanı kontrol et"
      lead="Hesabını aktifleştirmek için e-postadaki doğrulama bağlantısını aç. Gelen kutunu ve gereksiz klasörünü kontrol et."
      footer={<Link to="/register" state={location.state}>Kayıt ekranına dön</Link>}
    >
      <AuthAlert tone={pending.expiresAt && !remaining ? 'error' : 'info'}>
        {pending.expiresAt
          ? remaining > 0 ? `Bağlantının geçerlilik süresi: ${timerText}` : 'Bağlantının süresi doldu. Yeni bir bağlantı isteyebilir veya tekrar kayıt olabilirsin.'
          : 'Doğrulama bağlantısı almak için kayıt olduğun e-posta adresini gir.'}
      </AuthAlert>
      {pending.email && <p className="sf-auth-note">{pending.email}</p>}
      <Link to="/login" state={{ ...location.state, email: pending.email }} className="sf-btn sf-btn--accent sf-auth-submit sf-auth-action">
        E-postamı doğruladım, giriş yap
      </Link>
      <form className="sf-auth-form" onSubmit={resend} noValidate>
        <AuthField label="E-posta" hint="Bağlantı ulaşmadıysa tekrar gönderebilirsin.">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
        </AuthField>
        <AuthAlert tone="success">{message}</AuthAlert>
        <AuthAlert>{error}</AuthAlert>
        <button type="submit" className="sf-btn sf-btn--ghost sf-auth-submit" disabled={loading || cooldown > 0}>
          {loading ? 'Gönderiliyor…' : cooldown > 0 ? `Tekrar gönder (${cooldown} sn)` : 'Doğrulama bağlantısını yeniden gönder'}
        </button>
      </form>
    </AuthShell>
  )
}

export default VerifyPendingPage

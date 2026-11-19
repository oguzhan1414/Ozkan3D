import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { AuthShell, AuthField, PasswordInput, AuthAlert, AuthGoogleButton } from './AuthShell'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, googleLoginUser } = useAuth()

  const [email, setEmail] = useState(location.state?.email || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const notice = location.state?.verificationNotice || location.state?.notice || ''

  const destination = location.state?.from
  const from = destination ? `${destination.pathname}${destination.search || ''}${destination.hash || ''}` : '/'

  const goAfterLogin = (user) => {
    navigate(user?.role === 'admin' && from === '/' ? '/admin' : from, { replace: true })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    if (!email.trim() || !password) {
      setError('E-posta ve şifreni gir.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Geçerli bir e-posta adresi gir.')
      return
    }
    setLoading(true)
    try {
      const res = await login(email.trim().toLowerCase(), password)
      goAfterLogin(res.user)
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş yapılamadı. Bilgilerini kontrol edip tekrar dene.')
      setLoading(false)
    }
  }

  const onGoogle = async ({ credential }) => {
    setError('')
    setLoading(true)
    try {
      const res = await googleLoginUser(credential)
      goAfterLogin(res.user)
    } catch (err) {
      setError(err.response?.data?.message || 'Google ile giriş yapılamadı.')
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Giriş yap"
      lead="Siparişlerini takip et, favorilerini kaydet."
      footer={<>Hesabın yok mu? <Link to="/register" state={location.state}>Üye ol</Link></>}
    >
      <AuthAlert tone="info">{notice}</AuthAlert>
      <AuthAlert>{error}</AuthAlert>

      <AuthGoogleButton
        onSuccess={onGoogle}
        onError={() => setError('Google ile giriş yapılamadı.')}
        text="continue_with"
      />

      <div className="sf-or">veya e-posta ile</div>

      <form className="sf-auth-form" onSubmit={submit} noValidate style={{ marginTop: 0 }}>
        <AuthField label="E-posta">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            autoFocus={!email}
          />
        </AuthField>

        <div>
          <AuthField label="Şifre">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoFocus={Boolean(email)} />
          </AuthField>
          <div className="sf-auth-inline" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
            <Link to="/forgot-password" state={{ email }}>Şifremi unuttum</Link>
          </div>
        </div>

        <button type="submit" className="sf-btn sf-btn--accent sf-auth-submit" disabled={loading}>
          {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
      </form>
    </AuthShell>
  )
}

export default LoginPage

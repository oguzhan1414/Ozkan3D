import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { forgotPasswordApi } from '../../../api/authApi'
import { AuthShell, AuthField, AuthAlert } from './AuthShell'

const ForgotPasswordPage = () => {
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [status, setStatus] = useState({ loading: false, error: '', sent: false })

  const submit = async (e) => {
    e.preventDefault()
    if (status.loading) return
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus({ loading: false, error: 'Geçerli bir e-posta adresi gir.', sent: false })
      return
    }
    setStatus({ loading: true, error: '', sent: false })
    try {
      await forgotPasswordApi(email.trim().toLowerCase())
      setStatus({ loading: false, error: '', sent: true })
    } catch (err) {
      setStatus({ loading: false, error: err.response?.data?.message || 'Bağlantı gönderilemedi. Tekrar dene.', sent: false })
    }
  }

  return (
    <AuthShell
      title="Şifreni sıfırla"
      lead="Hesabına bağlı e-posta adresini yaz, şifre sıfırlama bağlantısı gönderelim. Bağlantı 15 dakika geçerli."
      footer={<><Link to="/login">Giriş sayfasına dön</Link></>}
    >
      {status.sent ? (
        <AuthAlert tone="success">
          Bağlantıyı <strong>{email.trim()}</strong> adresine gönderdik. Gelen kutunu ve gereksiz klasörünü kontrol et.
        </AuthAlert>
      ) : (
        <>
          <AuthAlert>{status.error}</AuthAlert>
          <form className="sf-auth-form" onSubmit={submit} noValidate>
            <AuthField label="E-posta">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" autoFocus />
            </AuthField>
            <button type="submit" className="sf-btn sf-btn--accent sf-auth-submit" disabled={status.loading}>
              {status.loading ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  )
}

export default ForgotPasswordPage

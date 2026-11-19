import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { resetPasswordApi } from '../../../api/authApi'
import { AuthShell, AuthField, PasswordInput, AuthAlert } from './AuthShell'

const ResetPasswordPage = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState({ loading: false, error: '' })

  const submit = async (e) => {
    e.preventDefault()
    if (status.loading) return
    if (password.length < 8) {
      setStatus({ loading: false, error: 'Şifre en az 8 karakter olmalı.' })
      return
    }
    if (password !== confirm) {
      setStatus({ loading: false, error: 'Şifreler eşleşmiyor.' })
      return
    }
    setStatus({ loading: true, error: '' })
    try {
      const res = await resetPasswordApi(token, password)
      navigate('/login', {
        replace: true,
        state: { email: res.user?.email, notice: 'Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.' },
      })
    } catch (err) {
      setStatus({
        loading: false,
        error: err.response?.data?.message || 'Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir.',
      })
    }
  }

  return (
    <AuthShell
      title="Yeni şifre belirle"
      lead="En az 8 karakter kullan. Harf, rakam ve sembol karıştırmak şifreni güçlendirir."
      footer={<>Bağlantının süresi mi doldu? <Link to="/forgot-password">Yenisini iste</Link></>}
    >
      <AuthAlert>{status.error}</AuthAlert>
      <form className="sf-auth-form" onSubmit={submit} noValidate>
        <AuthField label="Yeni şifre">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
        </AuthField>
        <AuthField label="Yeni şifre tekrar">
          <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" name="confirm" />
        </AuthField>
        <button type="submit" className="sf-btn sf-btn--accent sf-auth-submit" disabled={status.loading}>
          {status.loading ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPasswordPage

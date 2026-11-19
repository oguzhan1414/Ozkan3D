import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { AuthShell, AuthField, PasswordInput, AuthAlert, AuthGoogleButton } from './AuthShell'

const EMAIL_RE = /^\S+@\S+\.\S+$/

const normalizePhone = (raw = '') => {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('90')) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}

const formatPhone = (d = '') =>
  [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(' ')

const STRENGTH = ['Çok zayıf', 'Zayıf', 'İyi', 'Güçlü']
const passwordScore = (p) =>
  !p ? 0 : [p.length >= 8, /[A-ZÇĞİÖŞÜ]/.test(p), /\d/.test(p), /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(p)].filter(Boolean).length

const today = new Date().toISOString().slice(0, 10)

const RegisterPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { register, googleLoginUser } = useAuth()

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', birthDate: '', password: '', confirm: '',
  })
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field, transform = (v) => v) => (e) => {
    setForm((f) => ({ ...f, [field]: transform(e.target.value) }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const validate = () => {
    const er = {}
    if (!form.firstName.trim()) er.firstName = 'Ad gerekli.'
    if (!form.lastName.trim()) er.lastName = 'Soyad gerekli.'
    if (!EMAIL_RE.test(form.email.trim())) er.email = 'Geçerli bir e-posta adresi gir.'
    if (!/^5\d{9}$/.test(form.phone)) er.phone = '10 haneli cep numaranı gir (5xx xxx xx xx).'
    if (!form.birthDate) er.birthDate = 'Doğum tarihi gerekli.'
    else if (form.birthDate > today) er.birthDate = 'Doğum tarihi ileri bir tarih olamaz.'
    if (form.password.length < 8) er.password = 'Şifre en az 8 karakter olmalı.'
    if (form.confirm !== form.password) er.confirm = 'Şifreler eşleşmiyor.'
    if (!agree) er.agree = 'Devam etmek için onay ver.'
    setErrors(er)
    return Object.keys(er).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    if (!validate()) return
    setLoading(true)
    try {
      const res = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: `+90${form.phone}`,
        birthDate: form.birthDate,
      })
      navigate('/verify-pending', {
        replace: true,
        state: {
          from: location.state?.from,
          email: form.email.trim().toLowerCase(),
          verifyExpiresInSeconds: res.verifyExpiresInSeconds || 180,
          verificationNotice: res.message,
        },
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt olunamadı. Tekrar dene.')
      setLoading(false)
    }
  }

  const onGoogle = async ({ credential }) => {
    setError('')
    setLoading(true)
    try {
      const res = await googleLoginUser(credential)
      const destination = location.state?.from
      const from = destination ? `${destination.pathname}${destination.search || ''}${destination.hash || ''}` : '/'
      navigate(res.user?.role === 'admin' && from === '/' ? '/admin' : from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Google ile kayıt olunamadı.')
      setLoading(false)
    }
  }

  const score = passwordScore(form.password)

  return (
    <AuthShell
      wide
      title="Üye ol"
      lead="Siparişlerini takip etmek ve favorilerini kaydetmek için hesap oluştur."
      footer={<>Zaten hesabın var mı? <Link to="/login" state={location.state}>Giriş yap</Link></>}
    >
      <AuthAlert>{error}</AuthAlert>

      <AuthGoogleButton
        onSuccess={onGoogle}
        onError={() => setError('Google ile kayıt olunamadı.')}
        text="signup_with"
      />

      <div className="sf-or">veya e-posta ile</div>

      <form className="sf-auth-form" onSubmit={submit} noValidate style={{ marginTop: 0 }}>
        <div className="sf-auth-row">
          <AuthField label="Ad" error={errors.firstName}>
            <input value={form.firstName} onChange={set('firstName')} autoComplete="given-name" maxLength={30} />
          </AuthField>
          <AuthField label="Soyad" error={errors.lastName}>
            <input value={form.lastName} onChange={set('lastName')} autoComplete="family-name" maxLength={30} />
          </AuthField>
        </div>

        <AuthField label="E-posta" error={errors.email} hint="Doğrulama bağlantısını bu adrese göndereceğiz.">
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" />
        </AuthField>

        <div className="sf-auth-row">
          <AuthField label="Cep telefonu" error={errors.phone}>
            <span className="sf-phone">
              <span>+90</span>
              <input
                value={formatPhone(form.phone)}
                onChange={set('phone', normalizePhone)}
                autoComplete="tel-national"
                inputMode="tel"
                placeholder="5xx xxx xx xx"
              />
            </span>
          </AuthField>
          <AuthField label="Doğum tarihi" error={errors.birthDate}>
            <input type="date" value={form.birthDate} onChange={set('birthDate')} max={today} autoComplete="bday" />
          </AuthField>
        </div>

        <AuthField label="Şifre" error={errors.password}>
          <PasswordInput value={form.password} onChange={set('password')} autoComplete="new-password" />
        </AuthField>
        {form.password && (
          <div className="sf-strength" aria-label={`Şifre gücü: ${STRENGTH[score - 1] || 'Çok zayıf'}`}>
            {[1, 2, 3, 4].map((n) => <i key={n} className={n <= score ? 'is-on' : ''} />)}
            <span>{STRENGTH[score - 1] || 'Çok zayıf'}</span>
          </div>
        )}

        <AuthField label="Şifre tekrar" error={errors.confirm}>
          <PasswordInput value={form.confirm} onChange={set('confirm')} autoComplete="new-password" name="confirm" />
        </AuthField>

        <label className={`sf-check ${errors.agree ? 'has-error' : ''}`}>
          <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErrors((er) => ({ ...er, agree: undefined })) }} />
          <span>
            <Link to="/distance-selling" target="_blank">Mesafeli satış sözleşmesini</Link> ve{' '}
            <Link to="/kvkk" target="_blank">KVKK aydınlatma metnini</Link> okudum, onaylıyorum.
          </span>
        </label>
        {errors.agree && <span className="sf-afield-msg is-error">{errors.agree}</span>}

        <button type="submit" className="sf-btn sf-btn--accent sf-auth-submit" disabled={loading}>
          {loading ? 'Hesap oluşturuluyor…' : 'Hesap oluştur'}
        </button>
      </form>
    </AuthShell>
  )
}

export default RegisterPage

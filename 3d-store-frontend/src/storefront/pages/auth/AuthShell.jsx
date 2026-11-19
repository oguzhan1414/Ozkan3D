import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import BrandLogo from '../../components/BrandLogo'
import '../../storefront.css'
import './AuthPages.css'

/** Giriş / kayıt / şifre sayfalarının ortak kartı */
export const AuthShell = ({ title, lead, children, footer, wide = false }) => (
  <div className="sf-root sf-page sf-auth">
    <div className={`sf-auth-card ${wide ? 'sf-auth-card--wide' : ''}`}>
      <Link to="/" className="sf-auth-mark" aria-label="Ozkan3D anasayfa">
        <BrandLogo />
      </Link>
      <h1>{title}</h1>
      {lead && <p className="sf-auth-lead">{lead}</p>}
      {children}
      {footer && <div className="sf-auth-foot">{footer}</div>}
    </div>
  </div>
)

export const AuthField = ({ label, error, hint, children }) => (
  <label className={`sf-afield ${error ? 'has-error' : ''}`}>
    <span className="sf-afield-label">{label}</span>
    {children}
    {error ? <span className="sf-afield-msg is-error">{error}</span> : hint ? <span className="sf-afield-msg">{hint}</span> : null}
  </label>
)

export const PasswordInput = ({ value, onChange, autoComplete = 'current-password', name = 'password', ...rest }) => {
  const [show, setShow] = useState(false)
  return (
    <span className="sf-pass">
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
        aria-pressed={show}
      >
        {show ? <FiEyeOff /> : <FiEye />}
      </button>
    </span>
  )
}

export const AuthAlert = ({ tone = 'error', children }) =>
  children ? (
    <p className={`sf-auth-alert is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>
  ) : null

export const AuthGoogleButton = (props) => {
  const container = useRef(null)
  const [width, setWidth] = useState(240)

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(200, Math.min(360, Math.floor(entry.contentRect.width))))
    })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="sf-google" ref={container}>
      <GoogleLogin {...props} shape="pill" width={String(width)} locale="tr" />
    </div>
  )
}

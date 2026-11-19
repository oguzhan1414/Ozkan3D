import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiArrowUpRight, FiCheck, FiChevronDown, FiMail } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { sendContactMessageApi } from '../../../api/contactApi'
import './ServiceKit.css'

/**
 * Hizmet sayfalarının (özel baskı, 3D tarama) ortak parçaları.
 * İki sayfa aynı iskeleti farklı içerikle kullanır:
 * Hero → Örnekler → Nasıl çalışır → Fiyatı ne belirler → Teklif formu → SSS → Çapraz bağlantı
 */

export const CONTACT = {
  email: 'ozkan3d.design@gmail.com',
  whatsapp: (text) => `https://wa.me/905411190626?text=${encodeURIComponent(text)}`,
}

export const scrollToId = (id) => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

/* ------------------------------------------------------------------ Hero */
export const ServiceHero = ({ title, lead, facts, media, onPrimary, primaryLabel, whatsappText }) => (
  <section className="sv-hero" aria-labelledby="sv-title">
    <div className="sv-hero-copy">
      <h1 id="sv-title">{title}</h1>
      <p className="sv-lead">{lead}</p>
      <div className="sv-actions">
        <button type="button" className="sf-btn sf-btn--accent" onClick={onPrimary}>
          {primaryLabel} <FiArrowRight aria-hidden="true" />
        </button>
        <a className="sf-btn sf-btn--ghost" href={CONTACT.whatsapp(whatsappText)} target="_blank" rel="noopener noreferrer">
          <FaWhatsapp aria-hidden="true" /> WhatsApp'tan yaz
        </a>
      </div>
      <dl className="sv-facts">
        {facts.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </div>
    <div className="sv-hero-media">{media}</div>
  </section>
)

/* --------------------------------------------------------------- Bölüm */
export const ServiceSection = ({ id, title, lead, children, tone }) => (
  <section className={`sv-section ${tone === 'canvas' ? 'sv-section--canvas' : ''}`} id={id} aria-labelledby={`${id}-title`}>
    <header className="sv-section-head">
      <h2 id={`${id}-title`}>{title}</h2>
      {lead && <p>{lead}</p>}
    </header>
    {children}
  </section>
)

/* ------------------------------------------------------------- Örnekler */
export const ExampleCards = ({ items, onPick, pickLabel }) => (
  <div className="sv-examples">
    {items.map((item) => (
      <article key={item.title} className="sv-example">
        <div className="sv-example-media">{item.media}</div>
        <h3>{item.title}</h3>
        <p>{item.text}</p>
        <button type="button" className="sf-link-btn" onClick={() => onPick(item.prefill)}>
          {pickLabel} <FiArrowRight aria-hidden="true" />
        </button>
      </article>
    ))}
  </div>
)

/* ------------------------------------------------------- Nasıl çalışır */
export const Steps = ({ items }) => (
  <ol className="sv-steps">
    {items.map((s, i) => (
      <li key={s.title}>
        <span className="sv-step-no" aria-hidden="true">{i + 1}</span>
        <h3>{s.title}</h3>
        <p>{s.text}</p>
      </li>
    ))}
  </ol>
)

/* --------------------------------------------------- Fiyatı ne belirler */
export const FactorTable = ({ rows, note }) => (
  <div className="sv-factors">
    <dl>
      {rows.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
    {note && <p className="sv-factors-note">{note}</p>}
  </div>
)

/* -------------------------------------------------------------- Form */
const Field = ({ label, optional, error, children, wide }) => (
  <label className={`sv-field ${wide ? 'is-wide' : ''} ${error ? 'has-error' : ''}`}>
    <span className="sv-field-label">
      {label} {optional && <em>İsteğe bağlı</em>}
    </span>
    {children}
    {error && <span className="sv-field-error">{error}</span>}
  </label>
)

/**
 * fields: [{ name, label, type: 'text'|'textarea'|'select'|'number'|'url', required, options, placeholder, wide, rows }]
 * buildMessage(values) → admin'e gidecek e-posta gövdesi
 */
export const RequestForm = ({
  id, title, lead, fields, values, onChange, subject, buildMessage, submitLabel, successTitle, whatsappText,
}) => {
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const setC = (k) => (e) => {
    setContact((c) => ({ ...c, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const validate = () => {
    const er = {}
    for (const f of fields) {
      if (f.required && !String(values[f.name] || '').trim()) er[f.name] = f.requiredMessage || 'Bu alan gerekli.'
    }
    if (!contact.name.trim()) er.name = 'Adını yaz.'
    if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) er.email = 'Geçerli bir e-posta adresi gir.'
    setErrors(er)
    return Object.keys(er).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    setError('')
    if (!validate()) return
    setStatus('sending')
    try {
      await sendContactMessageApi({
        name: contact.name.trim(),
        email: contact.email.trim(),
        subject,
        message: [
          buildMessage(values),
          contact.phone.trim() ? `Telefon: ${contact.phone.trim()}` : '',
        ].filter(Boolean).join('\n\n'),
      })
      setStatus('sent')
    } catch (err) {
      setError(err.response?.data?.message || 'Talebin gönderilemedi. Tekrar dene ya da WhatsApp\'tan yaz.')
      setStatus('idle')
    }
  }

  const renderInput = (f) => {
    const common = {
      name: f.name,
      value: values[f.name] ?? '',
      onChange: (e) => { onChange(f.name, e.target.value); setErrors((er) => ({ ...er, [f.name]: undefined })) },
      placeholder: f.placeholder,
      'aria-invalid': Boolean(errors[f.name]),
    }
    if (f.type === 'textarea') return <textarea rows={f.rows || 4} maxLength={4000} {...common} />
    if (f.type === 'select') {
      return (
        <select {...common}>
          {f.options.map((o) => <option key={o} value={o === f.options[0] ? '' : o}>{o}</option>)}
        </select>
      )
    }
    if (f.type === 'number') return <input type="number" min="1" max="10000" inputMode="numeric" {...common} />
    if (f.type === 'url') return <input type="url" inputMode="url" maxLength={2000} {...common} />
    return <input type="text" maxLength={200} {...common} />
  }

  return (
    <section className="sv-request" id={id} aria-labelledby={`${id}-title`}>
      <div className="sv-request-intro">
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{lead}</p>
        <ul className="sv-promise">
          <li><FiCheck aria-hidden="true" /> Teklif ücretsiz, sipariş veya ödeme oluşturmaz.</li>
          <li><FiCheck aria-hidden="true" /> Onayın olmadan işe başlamayız.</li>
          <li><FiCheck aria-hidden="true" /> Dosya ve fotoğrafları WhatsApp ya da e-postayla gönderebilirsin.</li>
        </ul>
        <div className="sv-direct">
          <a href={CONTACT.whatsapp(whatsappText)} target="_blank" rel="noopener noreferrer"><FaWhatsapp aria-hidden="true" /> WhatsApp <FiArrowUpRight aria-hidden="true" /></a>
          <a href={`mailto:${CONTACT.email}`}><FiMail aria-hidden="true" /> {CONTACT.email}</a>
        </div>
      </div>

      <div className="sv-form-card">
        {status === 'sent' ? (
          <div className="sv-success" role="status">
            <span className="sv-success-icon" aria-hidden="true"><FiCheck /></span>
            <h3>{successTitle}</h3>
            <p>Talebini inceleyip <strong>{contact.email}</strong> adresine yazacağız. Dosya ya da fotoğrafın varsa şimdi WhatsApp'tan gönderebilirsin.</p>
            <div className="sv-actions">
              <a className="sf-btn sf-btn--ink" href={CONTACT.whatsapp(whatsappText)} target="_blank" rel="noopener noreferrer">
                <FaWhatsapp aria-hidden="true" /> Dosyamı gönder
              </a>
              <button type="button" className="sf-link-btn" onClick={() => setStatus('idle')}>Yeni talep</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <fieldset disabled={status === 'sending'} className="sv-form-grid">
              <legend className="sf-visually-hidden">{title}</legend>
              {fields.map((f) => (
                <Field key={f.name} label={f.label} optional={!f.required} error={errors[f.name]} wide={f.wide}>
                  {renderInput(f)}
                </Field>
              ))}

              <p className="sv-form-divider is-wide">Sana nereden dönelim?</p>
              <Field label="Adın soyadın" error={errors.name}>
                <input value={contact.name} onChange={setC('name')} autoComplete="name" maxLength={100} />
              </Field>
              <Field label="E-posta" error={errors.email}>
                <input type="email" value={contact.email} onChange={setC('email')} autoComplete="email" inputMode="email" maxLength={254} />
              </Field>
              <Field label="Telefon" optional wide>
                <input value={contact.phone} onChange={setC('phone')} autoComplete="tel" inputMode="tel" placeholder="WhatsApp'tan dönmemizi istersen" maxLength={30} />
              </Field>

              {error && <p className="sv-form-error is-wide" role="alert">{error}</p>}

              <button type="submit" className="sf-btn sf-btn--accent sv-submit is-wide">
                {status === 'sending' ? 'Gönderiliyor…' : submitLabel}
              </button>
              <p className="sv-privacy is-wide">
                Bilgilerini sadece bu talep için kullanırız. <Link to="/kvkk" target="_blank">KVKK aydınlatma metni</Link>
              </p>
            </fieldset>
          </form>
        )}
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- SSS */
export const Faq = ({ items }) => (
  <div className="sv-faq">
    {items.map(([q, a]) => (
      <details key={q}>
        <summary>{q}<FiChevronDown aria-hidden="true" /></summary>
        <p>{a}</p>
      </details>
    ))}
  </div>
)

/* -------------------------------------------------------- Çapraz bağlantı */
export const CrossLink = ({ title, text, to, label }) => (
  <aside className="sv-cross">
    <div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
    <Link to={to} className="sf-btn sf-btn--light">{label} <FiArrowRight aria-hidden="true" /></Link>
  </aside>
)

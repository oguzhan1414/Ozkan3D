import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiArrowUpRight, FiCheck, FiChevronDown, FiMail } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { sendContactMessageApi } from '../../../api/contactApi'
import ProcessVideo from '../ProcessVideo'
import './ServiceKit.css'

/**
 * Hizmet sayfalarının (özel baskı, 3D tarama) ortak parçaları.
 * İki sayfa aynı iskeleti farklı içerikle kullanır:
 * Video vitrini → Teklif formu (hızlı başla + fiyat) → SSS → Çapraz bağlantı
 */

export const CONTACT = {
  email: 'ozkan3d.design@gmail.com',
  whatsapp: (text) => `https://wa.me/905411190626?text=${encodeURIComponent(text)}`,
}

export const scrollToId = (id) => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

/* Video vitrini: metin ve teklif seçeneklerinin yanında bölümlü oynatıcı. */
export const ServiceCinema = ({ kicker, title, lead, facts, film, primaryLabel, onPrimary, whatsappText }) => (
  <section className={`svc svc--${film}`} aria-labelledby="sv-title">
    <div className="svc-inner">
      <div className="svc-topline">
        <Link to="/">Ana sayfa</Link><span aria-hidden="true">/</span><span>{kicker}</span>
        <span className="svc-edition">OZKAN3D ATÖLYE / {film === 'scan' ? '02' : '01'}</span>
      </div>
      <div className="svc-layout">
        <header className="svc-head">
          <span className="svc-eyebrow"><i aria-hidden="true" />{kicker}</span>
          <h1 id="sv-title">{title}</h1>
          <p>{lead}</p>
          <div className="svc-actions">
            <button type="button" className="sf-btn sf-btn--accent" onClick={onPrimary}>
              {primaryLabel} <FiArrowRight aria-hidden="true" />
            </button>
            <a className="sf-btn svc-btn-line" href={CONTACT.whatsapp(whatsappText)} target="_blank" rel="noopener noreferrer">
              <FaWhatsapp aria-hidden="true" /> WhatsApp'tan yaz
            </a>
          </div>
          <span className="svc-note"><FiCheck aria-hidden="true" /> Önce teklif, sen onaylayınca başlarız.</span>
        </header>
        <div className="svc-screen">
          <ProcessVideo film={film} tone="dark" />
        </div>
      </div>
      <dl className="svc-facts">
        {facts.map(([k, v], i) => <div key={k}><span aria-hidden="true">0{i + 1}</span><div><dt>{k}</dt><dd>{v}</dd></div></div>)}
      </dl>
    </div>
  </section>
)

/* -------------------------------------------------------- Hızlı başla
   Örneğe tıklayınca form o örneğe göre dolar */
export const QuickPicks = ({ title = 'Hızlı başla', items, onPick }) => (
  <div className="sv-picks">
    <p className="sv-mini-title">{title}</p>
    <div className="sv-picks-list">
      {items.map((item) => (
        <button key={item.title} type="button" className="sv-pick" onClick={() => onPick(item.prefill)}>
          <span className="sv-pick-media">{item.media}</span>
          <span className="sv-pick-text"><strong>{item.title}</strong><span>{item.text}</span></span>
          <FiArrowRight className="sv-pick-arrow" aria-hidden="true" />
        </button>
      ))}
    </div>
  </div>
)

/* ------------------------------------------------- Fiyatı ne belirler (kısa) */
export const FactorList = ({ title = 'Fiyatı ne belirler?', rows, note }) => (
  <details className="sv-factor-list">
    <summary className="sv-mini-title">{title}<FiChevronDown aria-hidden="true" /></summary>
    <dl>
      {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
    {note && <p>{note}</p>}
  </details>
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

/* -------------------------------------------------------------- Form */
const Field = ({ label, optional, error, children, wide }) => (
  <label className={`sv-field ${wide ? 'is-wide' : ''} ${error ? 'has-error' : ''}`}>
    <span className="sv-field-label">
      {label} {optional ? <em>İsteğe bağlı</em> : <span aria-hidden="true">*</span>}
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
  id, title, lead, fields, values, onChange, subject, buildMessage, submitLabel, successTitle, whatsappText, aside,
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
        <p className="sv-mini-title">BİRLİKTE ÜRETELİM</p>
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{lead}</p>
        {aside}
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
            <div className="sv-form-heading"><span>Projenin detayları</span><span>* Zorunlu alanlar</span></div>
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

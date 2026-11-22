import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiArrowUpRight, FiCheck, FiPlus, FiMail } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { sendContactMessageApi } from '../../../api/contactApi'
import ProcessVideo from '../ProcessVideo'
import './ServiceKit.css'

/**
 * Hizmet sayfalarının (özel baskı, 3D tarama) ortak parçaları.
 * Akış: Hero (video) → Nasıl çalışır → Örnekler → Malzeme/yüzey → Fiyat → Form → SSS → Çapraz bağlantı
 */

export const CONTACT = {
  email: 'ozkan3d.design@gmail.com',
  whatsapp: (text) => `https://wa.me/905411190626?text=${encodeURIComponent(text)}`,
}

export const scrollToId = (id) => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

/* ---------------------------------------------------------- Sayfa kabı
   [data-reveal] öğeleri ekrana girince yumuşakça belirir. JS yoksa ya da
   hareket azaltılmışsa içerik doğrudan görünür. */
export const ServicePage = ({ children, variant }) => {
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (!root || !('IntersectionObserver' in window)) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    root.classList.add('sv-animate')
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return <div ref={ref} className={`sf-root sf-page sv-page sv-page--${variant}`}>{children}</div>
}

/* --------------------------------------------------------------- Hero */
export const ServiceHero = ({
  kicker, title, accent, lead, facts, film, primaryLabel, onPrimary, whatsappText,
}) => (
  <section className={`svh svh--${film}`} aria-labelledby="sv-title">
    <div className="svh-bg" aria-hidden="true" />
    <div className="svh-inner">
      <nav className="svh-crumbs" aria-label="Sayfa konumu">
        <Link to="/">Ana sayfa</Link><span aria-hidden="true">/</span><span>{kicker}</span>
      </nav>

      {/* Solda metin, sağda ekran kenarına taşan büyük video */}
      <div className="svh-layout">
        <header className="svh-head">
          <span className="svh-eyebrow"><i aria-hidden="true" />{kicker}</span>
          <h1 id="sv-title">{title} <em>{accent}</em></h1>
          <p className="svh-lead">{lead}</p>
          <div className="svh-actions">
            <button type="button" className="sv-btn sv-btn--accent" onClick={onPrimary}>
              {primaryLabel} <FiArrowRight aria-hidden="true" />
            </button>
            <a className="sv-btn sv-btn--line" href={CONTACT.whatsapp(whatsappText)} target="_blank" rel="noopener noreferrer">
              <FaWhatsapp aria-hidden="true" /> WhatsApp&apos;tan yaz
            </a>
          </div>
          <p className="svh-note"><FiCheck aria-hidden="true" /> Teklif ücretsiz. Sen onaylamadan işe başlamayız.</p>
        </header>

        <div className="svh-stage">
          <ProcessVideo film={film} />
        </div>
      </div>

      <dl className="svh-facts">
        {facts.map(([k, v, Icon]) => (
          <div key={k}>
            {Icon && <span className="svh-fact-icon" aria-hidden="true"><Icon /></span>}
            <div><dt>{k}</dt><dd>{v}</dd></div>
          </div>
        ))}
      </dl>
    </div>
  </section>
)

/* --------------------------------------------------------------- Bölüm */
export const ServiceSection = ({ id, eyebrow, title, lead, children, tone, action }) => (
  <section className={`sv-section ${tone ? `sv-section--${tone}` : ''}`} id={id} aria-labelledby={`${id}-title`}>
    <div className="sv-wrap">
      <header className="sv-section-head" data-reveal>
        <div>
          {eyebrow && <p className="sv-eyebrow">{eyebrow}</p>}
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
        {lead && <p className="sv-section-lead">{lead}</p>}
        {action}
      </header>
      {children}
    </div>
  </section>
)

/* ------------------------------------------------------- Nasıl çalışır */
export const Steps = ({ items }) => (
  <ol className="sv-steps">
    {items.map((step, i) => (
      <li key={step.title} className="sv-step" data-reveal style={{ '--d': `${i * 80}ms` }}>
        <div className="sv-step-top">
          <span className="sv-step-icon" aria-hidden="true"><step.icon /></span>
          <span className="sv-step-no">{String(i + 1).padStart(2, '0')}</span>
        </div>
        {step.who && <span className="sv-step-who">{step.who}</span>}
        <h3>{step.title}</h3>
        <p>{step.text}</p>
      </li>
    ))}
  </ol>
)

/* ------------------------------------------------------------ Örnekler
   Karta tıklayınca form o örneğe göre dolar. */
export const UseCases = ({ items, onPick }) => (
  <div className="sv-cases">
    {items.map((item, i) => (
      <button
        key={item.title}
        type="button"
        className={`sv-case ${i === 0 ? 'is-feature' : ''}`}
        onClick={() => onPick(item.prefill)}
        data-reveal
        style={{ '--d': `${i * 90}ms` }}
      >
        <span className="sv-case-media">{item.media}</span>
        <span className="sv-case-body">
          <span className="sv-case-tag">{item.tag}</span>
          <strong>{item.title}</strong>
          <span className="sv-case-text">{item.text}</span>
          <span className="sv-case-cta">Bu örnekle başla <FiArrowRight aria-hidden="true" /></span>
        </span>
      </button>
    ))}
  </div>
)

/* Taramada kullanılan dekoratif kart görseli: tel kafes ızgara + tarama çizgisi */
export const ScanTile = ({ icon }) => (
  <span className="sv-scan-tile">
    <span className="sv-scan-grid" />
    <span className="sv-scan-icon">{icon}</span>
    <span className="sv-scan-line" />
  </span>
)

/* ------------------------------------------------- Malzeme / yüzey kartları
   meters: [[etiket, 0-5]] */
export const SpecCards = ({ items }) => (
  <div className="sv-specs">
    {items.map((s, i) => (
      <article key={s.title} className={`sv-spec ${s.tone ? `is-${s.tone}` : ''}`} data-reveal style={{ '--d': `${i * 80}ms` }}>
        <header>
          <span className="sv-spec-swatch" style={{ background: s.color }} aria-hidden="true" />
          <div>
            <h3>{s.title}</h3>
            {s.subtitle && <p>{s.subtitle}</p>}
          </div>
          {s.badge && <span className="sv-spec-badge">{s.badge}</span>}
        </header>
        <p className="sv-spec-text">{s.text}</p>
        {s.meters && (
          <dl className="sv-meters">
            {s.meters.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <span className="sv-meter" role="img" aria-label={`5 üzerinden ${value}`}>
                    {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= value ? 'is-on' : ''} />)}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        )}
        {s.best && (
          <ul className="sv-spec-best">
            {s.best.map((b) => <li key={b}>{b}</li>)}
          </ul>
        )}
      </article>
    ))}
  </div>
)

/* ----------------------------------------------------- Fiyatı ne belirler */
export const Factors = ({ rows, note }) => (
  <>
    <div className="sv-factors">
      {rows.map(([k, v], i) => (
        <div key={k} className="sv-factor" data-reveal style={{ '--d': `${i * 60}ms` }}>
          <span className="sv-factor-no">{String(i + 1).padStart(2, '0')}</span>
          <h3>{k}</h3>
          <p>{v}</p>
        </div>
      ))}
    </div>
    {note && <p className="sv-factors-note"><FiCheck aria-hidden="true" /> {note}</p>}
  </>
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
      <div className="sv-wrap sv-request-grid">
        <div className="sv-request-intro" data-reveal>
          <p className="sv-eyebrow">Birlikte üretelim</p>
          <h2 id={`${id}-title`}>{title}</h2>
          <p className="sv-request-lead">{lead}</p>
          <ul className="sv-promise">
            <li><span aria-hidden="true"><FiCheck /></span> Teklif ücretsiz, sipariş veya ödeme oluşturmaz.</li>
            <li><span aria-hidden="true"><FiCheck /></span> Onayın olmadan işe başlamayız.</li>
            <li><span aria-hidden="true"><FiCheck /></span> Dosya ve fotoğrafları WhatsApp ya da e-postayla gönderebilirsin.</li>
          </ul>
          <div className="sv-direct">
            <p>Formla uğraşmak istemezsen</p>
            <a href={CONTACT.whatsapp(whatsappText)} target="_blank" rel="noopener noreferrer">
              <span className="sv-direct-icon is-wa" aria-hidden="true"><FaWhatsapp /></span>
              <span><strong>WhatsApp</strong><small>Hızlıca yaz, dosyanı ekle</small></span>
              <FiArrowUpRight aria-hidden="true" />
            </a>
            <a href={`mailto:${CONTACT.email}`}>
              <span className="sv-direct-icon" aria-hidden="true"><FiMail /></span>
              <span><strong>E-posta</strong><small>{CONTACT.email}</small></span>
              <FiArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="sv-form-card" data-reveal>
          {status === 'sent' ? (
            <div className="sv-success" role="status">
              <span className="sv-success-icon" aria-hidden="true"><FiCheck /></span>
              <h3>{successTitle}</h3>
              <p>Talebini inceleyip <strong>{contact.email}</strong> adresine yazacağız. Dosya ya da fotoğrafın varsa şimdi WhatsApp&apos;tan gönderebilirsin.</p>
              <div className="sv-success-actions">
                <a className="sv-btn sv-btn--ink" href={CONTACT.whatsapp(whatsappText)} target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp aria-hidden="true" /> Dosyamı gönder
                </a>
                <button type="button" className="sf-link-btn" onClick={() => setStatus('idle')}>Yeni talep</button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="sv-form-heading">
                <span><b>1</b> Projenin detayları</span>
                <small>* Zorunlu alanlar</small>
              </div>
              <fieldset disabled={status === 'sending'} className="sv-form-grid">
                <legend className="sf-visually-hidden">{title}</legend>
                {fields.map((f) => (
                  <Field key={f.name} label={f.label} optional={!f.required} error={errors[f.name]} wide={f.wide}>
                    {renderInput(f)}
                  </Field>
                ))}

                <div className="sv-form-heading is-wide is-second">
                  <span><b>2</b> Sana nereden dönelim?</span>
                </div>
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

                <button type="submit" className="sv-btn sv-btn--accent sv-submit is-wide">
                  {status === 'sending' ? 'Gönderiliyor…' : submitLabel}
                  {status !== 'sending' && <FiArrowRight aria-hidden="true" />}
                </button>
                <p className="sv-privacy is-wide">
                  Bilgilerini sadece bu talep için kullanırız. <Link to="/kvkk" target="_blank">KVKK aydınlatma metni</Link>
                </p>
              </fieldset>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- SSS */
export const Faq = ({ items }) => (
  <div className="sv-faq">
    {items.map(([q, a]) => (
      <details key={q} data-reveal>
        <summary>{q}<span className="sv-faq-icon" aria-hidden="true"><FiPlus /></span></summary>
        <p>{a}</p>
      </details>
    ))}
  </div>
)

/* -------------------------------------------------------- Çapraz bağlantı */
export const CrossLink = ({ eyebrow, title, text, to, label }) => (
  <div className="sv-wrap">
    <aside className="sv-cross" data-reveal>
      <div>
        {eyebrow && <p className="sv-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <Link to={to} className="sv-btn sv-btn--light">{label} <FiArrowRight aria-hidden="true" /></Link>
    </aside>
  </div>
)

import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiArrowRight, FiArrowUpRight, FiCheckCircle, FiInstagram, FiMail, FiMapPin, FiMessageCircle, FiPhone, FiSend } from 'react-icons/fi'
import { sendContactMessageApi } from '../../../api/contactApi'
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_TEL, SUPPORT_WHATSAPP } from './SupportLayout'
import '../ServicePage.css'
import './ContactPage.css'

const SUBJECTS = { siparis: 'Sipariş hakkında', ozel: 'Özel tasarım talebi', teknik: 'Teknik destek', iade: 'İade / değişim', diger: 'Diğer' }
const EMPTY_FORM = { name: '', email: '', phone: '', subject: '', message: '' }
const CHANNELS = [
  { icon: FiMessageCircle, title: 'WhatsApp', detail: SUPPORT_PHONE, href: SUPPORT_WHATSAPP, external: true },
  { icon: FiPhone, title: 'Telefon', detail: SUPPORT_PHONE, href: `tel:${SUPPORT_TEL}` },
  { icon: FiMail, title: 'E-posta', detail: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  { icon: FiInstagram, title: 'Instagram', detail: '@ozkan3d.design', href: 'https://www.instagram.com/ozkan3d.design/', external: true },
]

const ContactPage = () => {
  const [params] = useSearchParams()
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, subject: Object.hasOwn(SUBJECTS, params.get('subject')) ? params.get('subject') : '' }))
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const change = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }
  const submit = async (event) => {
    event.preventDefault()
    if (status === 'sending') return
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Adını, e-posta adresini ve mesajını doldur.')
      return
    }
    setStatus('sending')
    try {
      await sendContactMessageApi({
        name: form.name.trim(), email: form.email.trim(),
        subject: SUBJECTS[form.subject] || 'İletişim talebi',
        message: [form.phone.trim() ? `Telefon: ${form.phone.trim()}` : '', form.message.trim()].filter(Boolean).join('\n\n'),
      })
      setStatus('sent')
    } catch (err) {
      setError(err.response?.data?.message || 'Mesaj gönderilemedi. Tekrar deneyebilir veya WhatsApp üzerinden ulaşabilirsin.')
      setStatus('idle')
    }
  }

  return (
    <div className="sf-root sf-contact">
      <div className="sf-container sf-contact-container">
        <div className="sf-contact-grid">
          <section className="sf-contact-info" aria-labelledby="sf-contact-title">
            <p className="sf-contact-eyebrow"><span aria-hidden="true" /> İLETİŞİM</p>
            <h1 id="sf-contact-title">Bize <span>ulaş.</span></h1>
            <p className="sf-contact-intro">Siparişin hakkında bir soru, aklında bir tasarım ya da paylaşmak istediğin bir fikir. Bir mesajla başlayalım.</p>
            <div className="sf-contact-channels">{CHANNELS.map((channel) => <a key={channel.title} href={channel.href} target={channel.external ? '_blank' : undefined} rel={channel.external ? 'noopener noreferrer' : undefined} aria-label={channel.external ? `${channel.title}, yeni sekmede açılır` : undefined}><span className="sf-contact-channel-icon"><channel.icon aria-hidden="true" /></span><span className="sf-contact-channel-text"><small>{channel.title}</small><strong>{channel.detail}</strong></span><FiArrowUpRight className="sf-contact-channel-arrow" aria-hidden="true" /></a>)}</div>
            <p className="sf-contact-location"><FiMapPin aria-hidden="true" /><span>Bolu, Türkiye</span></p>
            <p className="sf-contact-shipping">Ürün gönderimi için önce bizimle iletişime geçebilirsin.</p>
          </section>
      <section className="sf-service-form-panel sf-contact-form" aria-labelledby="sf-contact-form-title">
        {status === 'sent' ? <div className="sf-service-success" role="status"><FiCheckCircle aria-hidden="true" /><h2 id="sf-contact-form-title">Mesajın bize ulaştı.</h2><p>Detayları inceleyip <strong>{form.email}</strong> adresinden sana dönüş yapacağız. Teşekkür ederiz.</p><button type="button" className="sf-btn sf-btn--ghost" onClick={() => { setForm(EMPTY_FORM); setStatus('idle') }}>Yeni mesaj gönder <FiArrowRight /></button></div> : <>
          <div className="sf-contact-form-heading"><h2 id="sf-contact-form-title">Birlikte bakalım.</h2><p>Siparişle ilgiliyse mesajına sipariş numaranı ekle.</p></div>
          <form onSubmit={submit}><fieldset className="sf-service-fields" disabled={status === 'sending'}><legend className="sf-visually-hidden">İletişim formu</legend>
            <div className="sf-service-field-row"><label>Adın soyadın <span aria-hidden="true">*</span><input name="name" autoComplete="name" placeholder="Adın ve soyadın" value={form.name} onChange={change} required maxLength={100} /></label><label>E-posta adresin <span aria-hidden="true">*</span><input type="email" name="email" autoComplete="email" placeholder="ornek@eposta.com" value={form.email} onChange={change} required maxLength={254} /></label></div>
            <div className="sf-service-field-row"><label>Telefon <small>İsteğe bağlı</small><input type="tel" name="phone" autoComplete="tel" placeholder="05xx xxx xx xx" value={form.phone} onChange={change} maxLength={30} /></label><label>Konu<select name="subject" value={form.subject} onChange={change}><option value="">Bir konu seç</option>{Object.entries(SUBJECTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
            <label>Mesajın <span aria-hidden="true">*</span><textarea name="message" rows={4} placeholder="Nasıl yardımcı olabiliriz?" value={form.message} onChange={change} required maxLength={10000} /></label>
            {error && <p className="sf-service-error" role="alert">{error}</p>}
            <button type="submit" className="sf-btn sf-btn--accent sf-service-submit">{status === 'sending' ? 'Gönderiliyor…' : <>Mesajını gönder <FiSend /></>}</button>
            <p className="sf-service-privacy">Bilgilerinin işlenmesi hakkında <Link to="/kvkk" target="_blank" rel="noopener noreferrer">KVKK aydınlatma metnini</Link> inceleyebilirsin.</p>
          </fieldset></form>
        </>}
      </section>
        </div>
      </div>
    </div>
  )
}

export default ContactPage

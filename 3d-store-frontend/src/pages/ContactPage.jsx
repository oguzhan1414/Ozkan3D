import { useState } from 'react'
import { FiMail, FiPhone, FiMapPin, FiSend, FiCheck, FiInstagram } from 'react-icons/fi'
import { sendContactMessageApi } from '../api/contactApi'
import './ContactPage.css'

const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.name || !form.email || !form.message) {
      setError('Lütfen zorunlu alanları doldurun.')
      return
    }
    setLoading(true)
    try {
      await sendContactMessageApi(form)
      setSent(true)
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      setError(err.response?.data?.message || 'Mesaj gönderilemedi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="contact-page">

      {/* Hero */}
      <div className="contact-hero">
        <div className="contact-hero-inner">
          <p className="contact-hero-sup">İletişim</p>
          <h1 className="contact-hero-title">Bize Ulaşın</h1>
          <p className="contact-hero-desc">
            Sorularınız, özel tasarım talepleriniz veya işbirliği için bize ulaşabilirsiniz.
            En kısa sürede geri dönüş yapacağız.
          </p>
        </div>
      </div>

      <div className="contact-inner">

        {/* Sol — Bilgiler */}
        <div className="contact-info">

          <div className="contact-info-card">
            <h3 className="contact-info-title">İletişim Bilgileri</h3>
            <div className="contact-info-items">
              <a href="tel:+905411190626" className="contact-info-item">
                <div className="contact-info-icon"><FiPhone size={18} /></div>
                <div>
                  <span className="contact-info-label">Telefon</span>
                  <span className="contact-info-value">+90 541 119 06 26</span>
                </div>
              </a>
              <a href="mailto:ozkan3d.design@gmail.com" className="contact-info-item">
                <div className="contact-info-icon"><FiMail size={18} /></div>
                <div>
                  <span className="contact-info-label">E-posta</span>
                  <span className="contact-info-value">ozkan3d.design@gmail.com</span>
                </div>
              </a>
              <div className="contact-info-item">
                <div className="contact-info-icon"><FiMapPin size={18} /></div>
                <div>
                  <span className="contact-info-label">Adres</span>
                  <span className="contact-info-value">Bolu, Türkiye</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="contact-info-card">
            <h3 className="contact-info-title">Sosyal Medya</h3>
            <div className="contact-social">
              <a href="https://www.instagram.com/ozkan3d.design/" target="_blank" rel="noreferrer" className="contact-social-btn">
                <FiInstagram size={18} />
                <span>Instagram</span>
              </a>
            </div>
          </div>

        </div>

        {/* Sağ — Form */}
        <div className="contact-form-wrap">
          {sent ? (
            <div className="contact-success">
              <div className="contact-success-icon"><FiCheck size={32} /></div>
              <h3>Mesajınız İletildi!</h3>
              <p>En kısa sürede size geri dönüş yapacağız. Teşekkürler!</p>
              <button className="btn-primary" onClick={() => setSent(false)}>
                Yeni Mesaj Gönder
              </button>
            </div>
          ) : (
            <>
              <div className="contact-form-header">
                <h2>Mesaj Gönder</h2>
                <p>Formu doldurun, size en kısa sürede ulaşalım.</p>
              </div>

              {error && <div className="contact-error">{error}</div>}

              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ad Soyad *</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Ad Soyad"
                      value={form.name}
                      onChange={handleChange}
                      className="form-input-plain"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefon</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="0500 000 00 00"
                      value={form.phone}
                      onChange={handleChange}
                      className="form-input-plain"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">E-posta *</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="ornek@email.com"
                    value={form.email}
                    onChange={handleChange}
                    className="form-input-plain"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Konu</label>
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="form-input-plain"
                  >
                    <option value="">Konu Seçin</option>
                    <option value="siparis">Sipariş Hakkında</option>
                    <option value="ozel">Özel Tasarım Talebi</option>
                    <option value="teknik">Teknik Destek</option>
                    <option value="iade">İade / Değişim</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mesaj *</label>
                  <textarea
                    name="message"
                    placeholder="Mesajınızı buraya yazın..."
                    value={form.message}
                    onChange={handleChange}
                    className="form-textarea"
                    rows={5}
                  />
                </div>

                <button
                  type="submit"
                  className={`contact-submit-btn ${loading ? 'loading' : ''}`}
                  disabled={loading}
                >
                  {loading
                    ? <span className="auth-spinner" />
                    : <><FiSend size={16} /> Mesaj Gönder</>
                  }
                </button>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default ContactPage
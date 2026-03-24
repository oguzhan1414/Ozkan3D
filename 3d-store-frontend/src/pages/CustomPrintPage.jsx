import { useState } from 'react'
import {
  FiMessageCircle, FiMail, FiCheckCircle, FiXCircle,
  FiExternalLink, FiChevronDown, FiChevronUp, FiSend, FiCheck
} from 'react-icons/fi'
import { sendContactMessageApi } from '../api/contactApi'
import './CustomPrintPage.css'

const faqs = [
  { q: 'Dosya nasıl gönderilir?', a: '.STL, .OBJ veya .3MF formatındaki dosyalar yeterlidir. WhatsApp veya e-posta üzerinden iletebilirsiniz.' },
  { q: 'Hangi malzemeleri kullanıyorsunuz?', a: 'PLA, ABS, PETG, TPU ve Reçine seçenekleri mevcuttur. Projenize en uygun malzemeyi birlikte belirleriz.' },
  { q: '3D baskı fiyatı nasıl hesaplanır?', a: 'Fiyatlar modelin hacmi, filament türü, baskı kalitesi ve süresine göre değişir. Dosyanızı gönderin, size özel teklif hazırlayalım.' },
  { q: 'Baskı süresi ne kadar sürer?', a: 'Modelin boyutuna göre birkaç saatten birkaç güne değişebilir. Siparişinizde tahmini süreyi bildiririz.' },
  { q: 'Minimum sipariş adedi nedir?', a: 'Tek parça da bastırabilirsiniz. Toplu siparişlerde fiyat avantajı sağlıyoruz.' },
  { q: 'Tasarımım yoksa ne yapabilirim?', a: 'yeggi.com veya makerworld.com üzerinden binlerce ücretsiz modele ulaşabilirsiniz. Beğendiğiniz modelin linkini bize iletmeniz yeterli.' },
]

const steps = [
  { icon: '📁', title: 'Dosyayı İlet', desc: 'STL, OBJ veya 3MF formatındaki tasarımını WhatsApp veya e-posta ile gönder.' },
  { icon: '💬', title: 'Teklif Al', desc: 'Malzeme, renk ve kalite seçimini birlikte belirleyerek fiyat teklifi al.' },
  { icon: '✅', title: 'Onayla', desc: 'Teklifi onayladıktan sonra üretim hemen başlar.' },
  { icon: '📦', title: 'Teslim Al', desc: 'Kalite kontrol sonrası kargoya verilir, kapına gelir.' },
]

const CustomPrintPage = () => {
  const [hasDesign, setHasDesign] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', subject: 'Özel Tasarım Talebi', message: '' })
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
      setTimeout(() => {
        setShowForm(false)
        setSent(false)
        setForm({ name: '', email: '', subject: 'Özel Tasarım Talebi', message: '' })
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Mesaj gönderilemedi.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenForm = (subjectText) => {
    setForm(prev => ({ ...prev, subject: subjectText }))
    setShowForm(true)
    // Scroll to form smoothly
    setTimeout(() => {
      document.getElementById('custom-form-section')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <div className="custom-page">

      {/* Hero */}
      <div className="custom-hero">
        <div className="custom-hero-inner">
          <p className="custom-hero-sup">Özel Üretim Hizmeti</p>
          <h1 className="custom-hero-title">3D Baskı Hizmeti</h1>
          <p className="custom-hero-desc">
            Aklındaki ürünü hayata geçirelim. Tasarımın olsun ya da olmasın —
            sana en hızlı ve ekonomik çözümü sunuyoruz.
          </p>
          <div className="custom-hero-badges">
            <span className="hero-badge">⚡ Hızlı Üretim</span>
            <span className="hero-badge">🎨 50+ Renk Seçeneği</span>
            <span className="hero-badge">📦 Türkiye Geneli Kargo</span>
          </div>
        </div>
      </div>

      <div className="custom-inner">

        {/* Tasarım Sorusu */}
        <div className="design-question-card">
          <h2 className="design-question-title">3D Tasarımınız var mı?</h2>
          <p className="design-question-desc">
            Başlamak için önce bize söyleyin — sizi en hızlı şekilde yönlendirelim.
          </p>
          <div className="design-question-btns">
            <button
              className={`design-btn ${hasDesign === true ? 'design-btn-active-yes' : ''}`}
              onClick={() => setHasDesign(true)}
            >
              <FiCheckCircle size={22} />
              <span>Evet, tasarımım var</span>
              <p>STL / OBJ / 3MF dosyam mevcut</p>
            </button>
            <button
              className={`design-btn ${hasDesign === false ? 'design-btn-active-no' : ''}`}
              onClick={() => setHasDesign(false)}
            >
              <FiXCircle size={22} />
              <span>Hayır, tasarımım yok</span>
              <p>Hazır model bulmam gerekiyor</p>
            </button>
          </div>
        </div>

        {/* Cevaba Göre İçerik */}
        {hasDesign === true && (
          <div className="answer-card answer-card-yes">
            <div className="answer-card-header">
              <span className="answer-badge answer-badge-yes">✅ Harika!</span>
              <h3>Tasarımını bize iletebilirsin</h3>
              <p>
                WhatsApp veya e-posta ile dosyanı gönder, malzeme ve renk tercihlerini belirt —
                24 saat içinde fiyat teklifini hazırlayalım.
              </p>
            </div>
            <div className="contact-btns">
              <a 
                href="https://wa.me/902165213840?text=Merhaba, 3D baskı hizmeti hakkında bilgi almak istiyorum."
                target="_blank"
                rel="noreferrer"
                className="contact-btn contact-btn-whatsapp"
              >
                <FiMessageCircle size={20} />
                <div>
                  <strong>WhatsApp ile İletişime Geç</strong>
                  <span>Hızlı yanıt garantisi</span>
                </div>
              </a>
              <button 
                onClick={() => handleOpenForm('3D Baskı Hizmeti Talebi (Tasarım Hazır)')}
                className="contact-btn contact-btn-email"
                style={{ border: 'none', background: '#f5f5f5', cursor: 'pointer' }}
              >
                <FiMail size={20} />
                <div style={{ textAlign: 'left' }}>
                  <strong>Site Üzerinden E-posta Gönder</strong>
                  <span>Hızlı form</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {hasDesign === false && (
          <div className="answer-card answer-card-no">
            <div className="answer-card-header">
              <span className="answer-badge answer-badge-no">💡 Sorun değil!</span>
              <h3>Ücretsiz model platformlarını kullanabilirsin</h3>
              <p>
                Aşağıdaki platformlarda binlerce ücretsiz 3D model bulunuyor.
                Beğendiğin modelin linkini bize iletmen yeterli — işlem çok daha
                ekonomik ve hızlı ilerleyecek.
              </p>
            </div>
            <div className="platform-cards">
              <a 
                href="https://www.yeggi.com"
                target="_blank"
                rel="noreferrer"
                className="platform-card"
              >
                <div className="platform-icon">🔍</div>
                <div className="platform-info">
                  <strong>yeggi.com</strong>
                  <span>3D model arama motoru</span>
                </div>
                <FiExternalLink size={16} className="platform-arrow" />
              </a>
              <a 
                href="https://makerworld.com"
                target="_blank"
                rel="noreferrer"
                className="platform-card"
              >
                <div className="platform-icon">🌍</div>
                <div className="platform-info">
                  <strong>makerworld.com</strong>
                  <span>Bambu Lab model platformu</span>
                </div>
                <FiExternalLink size={16} className="platform-arrow" />
              </a>
              <a 
                href="https://www.thingiverse.com"
                target="_blank"
                rel="noreferrer"
                className="platform-card"
              >
                <div className="platform-icon">🐙</div>
                <div className="platform-info">
                  <strong>thingiverse.com</strong>
                  <span>En büyük 3D model arşivi</span>
                </div>
                <FiExternalLink size={16} className="platform-arrow" />
              </a>
            </div>
            <p className="platform-note">
              💬 Model linkini bulduktan sonra bize iletebilirsin:
            </p>
            <div className="contact-btns">
              <a 
                href="https://wa.me/902165213840?text=Merhaba, şu modeli bastırmak istiyorum:"
                target="_blank"
                rel="noreferrer"
                className="contact-btn contact-btn-whatsapp"
              >
                <FiMessageCircle size={20} />
                <div>
                  <strong>WhatsApp ile İletişime Geç</strong>
                  <span>Hızlı yanıt garantisi</span>
                </div>
              </a>
              <button 
                onClick={() => handleOpenForm('3D Baskı Model Talebi (Tasarım Aranıyor)')}
                className="contact-btn contact-btn-email"
                style={{ border: 'none', background: '#f5f5f5', cursor: 'pointer' }}
              >
                <FiMail size={20} />
                <div style={{ textAlign: 'left' }}>
                  <strong>Site Üzerinden E-posta Gönder</strong>
                  <span>Hızlı form</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Nasıl Çalışır */}
        <div className="how-section">
          <div className="section-header-center">
            <p className="section-sup">Süreç</p>
            <h2 className="section-title-center">Nasıl Çalışır?</h2>
          </div>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-card-num">{i + 1}</div>
                <div className="step-card-icon">{s.icon}</div>
                <h4 className="step-card-title">{s.title}</h4>
                <p className="step-card-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hizmet Açıklaması */}
        <div className="info-section">
          <div className="info-section-inner">
            <div className="info-text">
              <p className="section-sup">Hakkımızda</p>
              <h2 className="info-title">3D Baskı Hizmeti Nedir?</h2>
              <p className="info-desc">
                3D yazıcı baskı hizmeti, dijital ortamda hazırlanmış bir modelin fiziksel hale
                getirilmesini sağlayan üretim sürecidir. CAD programlarında oluşturulan 3D model
                dosyaları, katman katman plastik filament kullanılarak yazıcı tarafından basılır.
              </p>
              <p className="info-desc">
                Kendi yazıcısı olmayanlar veya kısa sürede prototip üretmek isteyenler için
                bu hizmet profesyonel firmalar tarafından sağlanır.
              </p>
              <div className="info-tags">
                <span className="info-tag">🔬 Mühendisler</span>
                <span className="info-tag">🏢 Firmalar</span>
                <span className="info-tag">🎓 Öğrenciler</span>
                <span className="info-tag">🎨 Sanatçılar</span>
                <span className="info-tag">🧒 Eğitim Kurumları</span>
                <span className="info-tag">🎮 Hobiciler</span>
              </div>
            </div>
            <div className="info-features">
              {[
                { icon: '🖨️', title: 'Yüksek Kalite', desc: '0.1mm hassasiyete kadar baskı' },
                { icon: '🎨', title: 'Geniş Malzeme', desc: 'PLA, ABS, PETG, TPU, Reçine' },
                { icon: '⚡', title: 'Hızlı Üretim', desc: '2-5 iş günü teslimat' },
                { icon: '📦', title: 'Güvenli Kargo', desc: 'Türkiye geneli teslimat' },
              ].map((f, i) => (
                <div key={i} className="info-feature-card">
                  <span className="info-feature-icon">{f.icon}</span>
                  <div>
                    <strong>{f.title}</strong>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SSS */}
        <div className="faq-section">
          <div className="section-header-center">
            <p className="section-sup">SSS</p>
            <h2 className="section-title-center">Sıkça Sorulan Sorular</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'faq-open' : ''}`}>
                <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  {openFaq === i ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                </button>
                {openFaq === i && (
                  <div className="faq-answer">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* E-posta Formu Popup / Inline */}
        {showForm && (
          <div id="custom-form-section" className="custom-form-wrapper" style={{ marginTop: '20px', padding: '30px', background: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <FiCheckCircle size={40} color="#16a34a" style={{ marginBottom: '10px' }} />
                <h3>Talebiniz İletildi!</h3>
                <p>En kısa sürede e-posta veya telefon ile size geri dönüş yapacağız.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0 }}>E-posta ile Tasarım Talebi Oluştur</h3>
                  <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><FiXCircle size={24} /></button>
                </div>
                {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <input
                    type="text"
                    name="name"
                    placeholder="Adınız Soyadınız *"
                    value={form.name}
                    onChange={handleChange}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit' }}
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="E-posta Adresiniz *"
                    value={form.email}
                    onChange={handleChange}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit' }}
                  />
                  <input
                    type="text"
                    name="subject"
                    value={form.subject}
                    disabled
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', background: '#f5f5f5', color: '#666', fontFamily: 'inherit' }}
                  />
                  <textarea
                    name="message"
                    placeholder="Baskısını almak istediğiniz model hakkında detayları veya linki buraya yazın... *"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: '15px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  >
                    {loading ? 'Gönderiliyor...' : <><FiSend size={16} /> Talebi Gönder</>}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default CustomPrintPage
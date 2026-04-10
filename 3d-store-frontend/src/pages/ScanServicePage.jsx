import { useState } from 'react'
import {
  FiMessageCircle, FiMail, FiCheckCircle, FiXCircle,
  FiChevronDown, FiChevronUp,
  FiCamera, FiX, FiSend
} from 'react-icons/fi'
import { submitContactFormApi } from '../api/contactApi'
import './ScanServicePage.css'

const faqs = [
  { q: 'Tarama için hangi dosya formatları gerekiyor?', a: 'Herhangi bir dosya formatına ihtiyacınız yok! Fiziksel ürünü bize gönderin, biz tarayıp dijital modele çevirelim.' },
  { q: 'Hangi objeler taranabilir?', a: 'Maksimum 50x50x50cm boyutlarındaki objeler taranabilir. Küçük detaylar (5mm altı) için ek ücret gerekebilir.' },
  { q: 'Tarama süresi ne kadar?', a: 'Obje boyutuna göre 1-3 saat arası. Sonrasında model düzenleme ve teslimat için 2-3 iş günü.' },
  { q: 'Tarama fiyatı nasıl hesaplanır?', a: 'Fiyatlar obje boyutu, detay seviyesi ve istenilen çıktı formatına göre değişir. Dosyanızı gönderin, size özel teklif hazırlayalım.' },
  { q: 'Çıktı olarak hangi formatları alabilirim?', a: 'STL, OBJ, PLY, 3MF formatlarında teslimat yapıyoruz. Ayrıca düzenlenmiş model (.step) isteyebilirsiniz.' },
  { q: 'Kargo nasıl işliyor?', a: 'Objeyi kargo ile bize gönderiyorsunuz, tarama sonrası aynı ambalajda iade ediyoruz. Kargo ücreti karşılıklı.' },
]

const steps = [
  { icon: '📦', title: 'Objeyi Gönder', desc: 'Fiziksel ürününüzü kargo ile bize ulaştırın.' },
  { icon: '🔍', title: '3D Tarama', desc: 'Creality CR-Scan Raptor ile detaylı tarama yapılır.' },
  { icon: '🛠️', title: 'Model Düzenleme', desc: 'Tarama sonrası model temizlenir ve optimize edilir.' },
  { icon: '📁', title: 'Dijital Çıktı', desc: 'STL/OBJ formatında size teslim edilir.' },
]

const useCases = [
  { icon: '🏛️', title: 'Kültürel Miras', desc: 'Tarihi eserlerin dijital arşivi' },
  { icon: '🔧', title: 'Endüstriyel', desc: 'Mekanik parçaların kopyalanması' },
  { icon: '🎨', title: 'Sanat & Tasarım', desc: 'Sanat eserlerinin dijital kopyaları' },
  { icon: '🦷', title: 'Medikal', desc: 'Protez ve ortez üretimi' },
  { icon: '🎮', title: 'Oyun & Hobi', desc: 'Koleksiyon figürlerinin dijitalleştirilmesi' },
  { icon: '🏭', title: 'Tersine Mühendislik', desc: 'Var olan parçaların CAD modeli' },
]

const ScanServicePage = () => {
  const [hasObject, setHasObject] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)
  const [showMailModal, setShowMailModal] = useState(false)
  const [mailSubjectType, setMailSubjectType] = useState('')
  const [mailForm, setMailForm] = useState({ name: '', email: '', message: '' })
  const [mailLoading, setMailLoading] = useState(false)
  const [mailSuccess, setMailSuccess] = useState(false)
  const [mailError, setMailError] = useState('')

  const openMailModal = (type) => {
    setMailSubjectType(type)
    setMailForm({ name: '', email: '', message: '' })
    setMailSuccess(false)
    setMailError('')
    setShowMailModal(true)
  }

  const handleMailSend = async () => {
    if (!mailForm.name || !mailForm.email || !mailForm.message) {
      setMailError('Lütfen tüm alanları doldurun.')
      return
    }
    setMailLoading(true)
    setMailError('')
    try {
      await submitContactFormApi({
        name: mailForm.name,
        email: mailForm.email,
        subject: mailSubjectType,
        message: mailForm.message,
      })
      setMailSuccess(true)
    } catch (err) {
      setMailError(err.response?.data?.message || 'Mesaj gönderilemedi, lütfen tekrar deneyin.')
    } finally {
      setMailLoading(false)
    }
  }

  return (
    <div className="scan-page">

      {/* Hero */}
      <div className="scan-hero">
        <div className="scan-hero-inner">
          <p className="scan-hero-sup">3D Tarama Hizmeti</p>
          <h1 className="scan-hero-title">
            Fiziksel Objeyi<br />
            <span className="scan-accent">Dijital Modele</span> Dönüştür
          </h1>
          <p className="scan-hero-desc">
            Creality CR-Scan Raptor ile yüksek hassasiyetli 3D tarama hizmeti.
            Koleksiyonlarını, mekanik parçaları, sanat eserlerini dijital ortama taşıyın.
          </p>
          <div className="scan-hero-badges">
            <span className="hero-badge">📸 0.02mm Hassasiyet</span>
            <span className="hero-badge">⚡ Hızlı Tarama</span>
            <span className="hero-badge">📁 STL/OBJ Çıktı</span>
            <span className="hero-badge">🔄 Tersine Mühendislik</span>
          </div>
        </div>
      </div>

      <div className="scan-inner">

        {/* Cihaz Tanıtım */}
        <div className="device-showcase">
          <div className="device-content">
            <div className="device-icon">
              <FiCamera size={48} />
            </div>
            <h3>Creality CR-Scan Raptor</h3>
            <p>
              Profesyonel seviye 3D tarayıcı ile objelerinizi milimetrik hassasiyetle tarıyoruz.
              Tekstür yakalama, renkli tarama, otomatik döndürme desteği.
            </p>
            <div className="device-specs">
              <span>🔍 Hassasiyet: 0.02mm</span>
              <span>⚡ Tarama Hızı: 10 fps</span>
              <span>📐 Maks. Boyut: 50x50x50cm</span>
            </div>
          </div>
          <div className="device-visual">
            <div className="scanner-3d">
              <div className="scanner-ring"></div>
              <div className="scanner-core">
                <FiCamera size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Obje Sorusu */}
        <div className="object-question-card">
          <h2 className="object-question-title">Taranacak objeniz var mı?</h2>
          <p className="object-question-desc">
            Bize göndereceğiniz fiziksel objeyi dijital modele çevirelim.
          </p>
          <div className="object-question-btns">
            <button
              className={`object-btn ${hasObject === true ? 'object-btn-active-yes' : ''}`}
              onClick={() => setHasObject(true)}
            >
              <FiCheckCircle size={22} />
              <span>Evet, objem var</span>
              <p>Göndereceğim fiziksel ürün mevcut</p>
            </button>
            <button
              className={`object-btn ${hasObject === false ? 'object-btn-active-no' : ''}`}
              onClick={() => setHasObject(false)}
            >
              <FiXCircle size={22} />
              <span>Hayır, sadece fikir</span>
              <p>Bana yol gösterin, nasıl başlarım?</p>
            </button>
          </div>
        </div>

        {/* Cevaba Göre İçerik */}
        {hasObject === true && (
          <div className="answer-card answer-card-yes">
            <div className="answer-card-header">
              <span className="answer-badge answer-badge-yes">✅ Harika!</span>
              <h3>Objeyi bize gönderin</h3>
              <p>
                Fiziksel ürününüzü kargo ile bize ulaştırın. Tarama süreci tamamlandıktan sonra
                hem dijital modeli hem de orijinal objeyi size iade ediyoruz.
              </p>
              <div className="shipping-info">
                <div className="info-box">
                  <strong>📮 Gönderim Adresi:</strong>
                  <p>Bolu Kürkçüler Mah. Memursen Toki Blokları C5 -1</p>
                </div>
              </div>
            </div>
            <div className="contact-btns">
              <a 
                href="https://wa.me/905411190626?text=Merhaba, 3D tarama hizmeti hakkında bilgi almak istiyorum. Objem var."
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
                className="contact-btn contact-btn-email"
                onClick={() => openMailModal('3D Tarama Hizmeti Talebi — Fiziksel Obje Mevcut')}
              >
                <FiMail size={20} />
                <div>
                  <strong>E-posta ile Talep Gönder</strong>
                  <span>Formu doldur, sana ulaşalım</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {hasObject === false && (
          <div className="answer-card answer-card-no">
            <div className="answer-card-header">
              <span className="answer-badge answer-badge-no">💡 Sorun değil!</span>
              <h3>Tarama hizmeti hakkında bilgi alın</h3>
              <p>
                Hangi objeleri tarayabileceğimizi, süreci ve fiyatlandırmayı öğrenmek için bize ulaşın.
                Size en uygun çözümü birlikte belirleyelim.
              </p>
            </div>
            <div className="contact-btns">
              <a 
                href="https://wa.me/905411190626?text=Merhaba, 3D tarama hizmeti hakkında bilgi almak istiyorum."
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
                className="contact-btn contact-btn-email"
                onClick={() => openMailModal('3D Tarama Hizmeti Bilgi Talebi')}
              >
                <FiMail size={20} />
                <div>
                  <strong>E-posta ile Bilgi Al</strong>
                  <span>Formu doldur, sana ulaşalım</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Nasıl Çalışır */}
        <div className="scan-how-section">
          <div className="scan-section-header">
            <p className="scan-section-sup">Süreç</p>
            <h2 className="scan-section-title">Nasıl Çalışır?</h2>
          </div>
          <div className="scan-steps-grid">
            {steps.map((s, i) => (
              <div key={i} className="scan-step-card">
                <div className="scan-step-card-num">{i + 1}</div>
                <div className="scan-step-card-icon">{s.icon}</div>
                <h4 className="scan-step-card-title">{s.title}</h4>
                <p className="scan-step-card-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Kullanım Alanları */}
        <div className="scan-use-cases-section">
          <div className="scan-section-header">
            <p className="scan-section-sup">Kullanım Alanları</p>
            <h2 className="scan-section-title">Neler Taranabilir?</h2>
          </div>
          <div className="scan-use-cases-grid">
            {useCases.map((uc, i) => (
              <div key={i} className="scan-use-case-card">
                <div className="scan-use-case-icon">{uc.icon}</div>
                <h4>{uc.title}</h4>
                <p>{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hizmet Açıklaması */}
        <div className="scan-info-section">
          <div className="scan-info-section-inner">
            <div className="scan-info-text">
              <p className="scan-section-sup">Hakkımızda</p>
              <h2 className="scan-info-title">3D Tarama Hizmeti Nedir?</h2>
              <p className="scan-info-desc">
                3D tarama, fiziksel bir objenin lazer veya optik sensörler kullanılarak
                dijital ortama aktarılması işlemidir. Creality CR-Scan Raptor ile objenizin
                her detayını milimetrik hassasiyetle yakalıyoruz.
              </p>
              <p className="scan-info-desc">
                Tarama sonucu elde edilen dijital model, 3D baskı, tersine mühendislik,
                arşivleme, sanal gerçeklik uygulamaları ve daha birçok alanda kullanılabilir.
              </p>
              <div className="scan-info-tags">
                <span className="scan-info-tag">🏛️ Kültürel Miras</span>
                <span className="scan-info-tag">🔧 Endüstriyel Tasarım</span>
                <span className="scan-info-tag">🎨 Sanat & Koleksiyon</span>
                <span className="scan-info-tag">🦷 Medikal</span>
                <span className="scan-info-tag">🎮 Oyun & Hobi</span>
                <span className="scan-info-tag">🏭 Tersine Mühendislik</span>
              </div>
            </div>
            <div className="scan-info-features">
              {[
                { icon: '🔍', title: '0.02mm Hassasiyet', desc: 'Mikron seviyesinde detay yakalama' },
                { icon: '🎨', title: 'Renkli Tarama', desc: 'Gerçekçi tekstür ve renkler' },
                { icon: '⚡', title: 'Hızlı İşlem', desc: '2-3 iş günü teslimat' },
                { icon: '📁', title: 'Çoklu Format', desc: 'STL, OBJ, PLY, 3MF' },
              ].map((f, i) => (
                <div key={i} className="scan-info-feature-card">
                  <span className="scan-info-feature-icon">{f.icon}</span>
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
        <div className="scan-faq-section">
          <div className="scan-section-header">
            <p className="scan-section-sup">SSS</p>
            <h2 className="scan-section-title">Sıkça Sorulan Sorular</h2>
          </div>
          <div className="scan-faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`scan-faq-item ${openFaq === i ? 'faq-open' : ''}`}>
                <button className="scan-faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  {openFaq === i ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                </button>
                {openFaq === i && (
                  <div className="scan-faq-answer">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="scan-cta">
          <h2 className="scan-cta-title">Objelerini Dijitalleştir! 🚀</h2>
          <p className="scan-cta-desc">
            Fiziksel ürünlerini dijital dünyaya taşı, 3D modelle çalışmaya başla.
          </p>
          <div className="contact-btns">
            <a 
              href="https://wa.me/905411190626?text=Merhaba, 3D tarama hizmeti hakkında bilgi almak istiyorum."
              target="_blank"
              rel="noreferrer"
              className="contact-btn contact-btn-whatsapp"
            >
              <FiMessageCircle size={20} />
              <div>
                <strong>WhatsApp ile İletişime Geç</strong>
                <span>En hızlı yöntem</span>
              </div>
            </a>
            <button
              className="contact-btn contact-btn-email"
              onClick={() => openMailModal('3D Tarama Hizmeti Talebi')}
            >
              <FiMail size={20} />
              <div>
                <strong>E-posta Gönder</strong>
                <span>Formu doldur, sana ulaşalım</span>
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* Mail Modal */}
      {showMailModal && (
        <div className="scan-modal-overlay" onClick={() => !mailLoading && setShowMailModal(false)}>
          <div className="scan-modal" onClick={e => e.stopPropagation()}>
            <div className="scan-modal-header">
              <h3><FiMail size={18} /> 3D Tarama Talebi</h3>
              <button className="scan-modal-close" onClick={() => setShowMailModal(false)} disabled={mailLoading}>
                <FiX size={18} />
              </button>
            </div>

            {mailSuccess ? (
              <div className="scan-modal-success">
                <div className="scan-success-icon">✅</div>
                <h4>Talebiniz Alındı!</h4>
                <p>En kısa sürede sizinle iletişime geçeceğiz.</p>
                <button className="scan-modal-done-btn" onClick={() => setShowMailModal(false)}>
                  Kapat
                </button>
              </div>
            ) : (
              <div className="scan-modal-body">
                <p className="scan-modal-subject-label">Konu: <strong>{mailSubjectType}</strong></p>

                <div className="scan-form-group">
                  <label>Adınız Soyadınız *</label>
                  <input
                    className="scan-form-input"
                    type="text"
                    placeholder="Adınız Soyadınız"
                    value={mailForm.name}
                    onChange={e => setMailForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div className="scan-form-group">
                  <label>E-posta Adresiniz *</label>
                  <input
                    className="scan-form-input"
                    type="email"
                    placeholder="ornek@email.com"
                    value={mailForm.email}
                    onChange={e => setMailForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>

                <div className="scan-form-group">
                  <label>Mesajınız *</label>
                  <textarea
                    className="scan-form-textarea"
                    rows={4}
                    placeholder="Taramak istediğiniz obje hakkında bilgi verin (boyut, malzeme, amaç vb.)..."
                    value={mailForm.message}
                    onChange={e => setMailForm(p => ({ ...p, message: e.target.value }))}
                  />
                </div>

                {mailError && <p className="scan-form-error">{mailError}</p>}

                <button
                  className="scan-modal-send-btn"
                  onClick={handleMailSend}
                  disabled={mailLoading}
                >
                  <FiSend size={16} />
                  {mailLoading ? 'Gönderiliyor...' : 'Talebi Gönder'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ScanServicePage
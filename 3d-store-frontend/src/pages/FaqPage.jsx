import { useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import './PolicyPages.css'

const faqs = [
  { filter: 'siparis', q: 'Siparişim kaç günde ulaşır?', a: 'Siparişleriniz genelde 1-3 iş günü içerisinde kargoya teslim edilmektedir.' },
  { filter: 'kargo', q: 'Hangi kargo şirketleri ile çalışıyorsunuz?', a: 'Sürat ve Yurtiçi Kargo şirketleriyle çalışıyoruz.' },
  { filter: 'iade', q: 'İademi nasıl yapabilirim?', a: 'İade işlemleri için "İade İşlemleri" sayfamızdaki adımları takip ederek anlaşmalı kargo kodumuzla paketi bize iletebilirsiniz.' },
  { filter: 'ozel', q: '.STL dosyamı gönderip 3D baskı yaptırabilir miyim?', a: 'Evet. Özel Tasarım (Custom Print) sayfasına giderek form üzerinden model linkinizi veya dosyalarınızı bize gönderebilirsiniz.' },
  { filter: 'ozel', q: 'Baskılarda hangi malzemeler kullanılıyor?', a: 'PLA, ABS, PETG, TPU Esnek ve Reçine malzemeleri başta olmak üzere projelerin ihtiyacına göre malzeme seçimi gerçekleştiriyoruz.' },
  { filter: 'siparis', q: 'Siparişimde değişiklik/iptal yapabilir miyim?', a: 'Sipariş "Hazırlanıyor" aşamasına geçmeden önce panelden veya e-posta ile iptal edilebilir. Özel tasarım baskılarda baskıya başladıktan sonra iptal kabul edilmez.' }
]

const FaqPage = () => {
  const [activeFilter, setActiveFilter] = useState('all')
  const [openFaq, setOpenFaq] = useState(null)

  const filteredFaqs = activeFilter === 'all' ? faqs : faqs.filter(f => f.filter === activeFilter)

  return (
    <div className="policy-page">
      <div className="policy-header">
        <h1 className="policy-title">Sıkça Sorulan Sorular</h1>
        <p className="policy-updated">Merak ettiğiniz her şey bu sayfada toplandı.</p>
      </div>
      
      <div className="faq-filter">
        <button className={`faq-filter-btn ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>Tümü</button>
        <button className={`faq-filter-btn ${activeFilter === 'siparis' ? 'active' : ''}`} onClick={() => setActiveFilter('siparis')}>Sipariş Süreci</button>
        <button className={`faq-filter-btn ${activeFilter === 'kargo' ? 'active' : ''}`} onClick={() => setActiveFilter('kargo')}>Kargo ve Teslimat</button>
        <button className={`faq-filter-btn ${activeFilter === 'ozel' ? 'active' : ''}`} onClick={() => setActiveFilter('ozel')}>Özel 3D Baskı</button>
        <button className={`faq-filter-btn ${activeFilter === 'iade' ? 'active' : ''}`} onClick={() => setActiveFilter('iade')}>İade Süreçleri</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {filteredFaqs.map((faq, i) => (
          <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <button 
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: openFaq === i ? '#f8fafc' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '500', color: '#1e293b' }}
            >
              <span>{faq.q}</span>
              {openFaq === i ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {openFaq === i && (
              <div style={{ padding: '0 20px 20px', background: '#f8fafc', color: '#475569', lineHeight: '1.6' }}>
                <div style={{ marginTop: '10px' }}>{faq.a}</div>
              </div>
            )}
          </div>
        ))}
        {filteredFaqs.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            Bu kategoriye ait soru bulunamadı.
          </div>
        )}
      </div>
    </div>
  )
}

export default FaqPage

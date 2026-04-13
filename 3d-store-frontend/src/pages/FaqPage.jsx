import { useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import SEO from '../components/SEO'
import './PolicyPages.css'

const faqs = [
  {
    id: 'siparis-kargoya-ne-zaman-verilir',
    filter: 'siparis',
    q: 'Siparişim ne zaman kargoya verilir?',
    a: 'Stokta olan ürünler sipariş onayından sonra genellikle 1-2 iş günü içinde kargoya verilir. Özel üretim 3D baskı siparişlerde hazırlık süresi modele göre ortalama 3-7 iş günüdür.',
  },
  {
    id: 'siparis-iptal-degisiklik',
    filter: 'siparis',
    q: 'Siparişimde değişiklik veya iptal yapabilir miyim?',
    a: 'Siparişiniz üretime alınmadan önce değişiklik veya iptal talebi oluşturabilirsiniz. Özel üretim siparişlerde baskı başladıktan sonra iptal/değişiklik mümkün olmayabilir.',
  },
  {
    id: 'siparis-durumu-nereden-gorulur',
    filter: 'siparis',
    q: 'Sipariş durumumu nereden takip ederim?',
    a: 'Üye girişi yaptıysanız Hesabım sayfanızdaki sipariş detayından anlık durum görebilirsiniz. Üyeliksiz siparişlerde kargo bilgilendirmesi e-posta üzerinden paylaşılır.',
  },
  {
    id: 'kargo-hangi-firmalar',
    filter: 'kargo',
    q: 'Hangi kargo firmaları ile çalışıyorsunuz?',
    a: 'Teslimatlarda anlaşmalı kargo firmalarıyla çalışıyoruz. Operasyon yoğunluğuna göre en hızlı teslimat sağlayacak firma seçilerek gönderim yapılır.',
  },
  {
    id: 'kargo-ucreti-ve-ucretsiz-limit',
    filter: 'kargo',
    q: 'Kargo ücreti ne kadar, ücretsiz kargo limiti var mı?',
    a: 'Kargo ücreti ödeme adımında açıkça gösterilir. Güncel süreçte ücretsiz kargo kampanyası bulunmamaktadır.',
  },
  {
    id: 'kargo-takip-numarasi',
    filter: 'kargo',
    q: 'Kargomun takip numarası ne zaman paylaşılır?',
    a: 'Siparişiniz kargoya teslim edildiğinde takip numarası sistemde görüntülenir ve bilgilendirme e-postasıyla tarafınıza iletilir.',
  },
  {
    id: 'kargo-hasarli-teslimat',
    filter: 'kargo',
    q: 'Paketim hasarlı gelirse ne yapmalıyım?',
    a: 'Hasarlı paketi teslim almadan önce kargo görevlisiyle hasar tespit tutanağı düzenlemenizi rica ederiz. Tutanak ve sipariş bilgilerinizle bize ulaştığınızda yenileme veya iade süreci hızla başlatılır.',
  },
  {
    id: 'ozel-stl-dosya-gonderimi',
    filter: 'ozel',
    q: '.STL/.OBJ dosyamı gönderip üretim yaptırabilir miyim?',
    a: 'Evet. Özel Baskı sayfasından dosyanızı veya model linkinizi paylaşabilirsiniz. Uygun malzeme, baskı süresi ve fiyat bilgisi dosya kontrolü sonrası netleştirilir.',
  },
  {
    id: 'ozel-malzeme-secimi',
    filter: 'ozel',
    q: 'Özel baskıda hangi malzemeleri kullanıyorsunuz?',
    a: 'Şu an üretimlerimizde PLA malzeme ile çalışıyoruz. Sipariş öncesinde ürünün kullanım amacına göre PLA için uygun duvar kalınlığı ve doluluk ayarı öneriyoruz.',
  },
  {
    id: 'ozel-uretim-suresi',
    filter: 'ozel',
    q: 'Özel üretim siparişler ne kadar sürer?',
    a: 'Modelin boyutu, adet ve son işlem ihtiyaçlarına göre değişmekle birlikte özel üretimler çoğunlukla 3-7 iş günü içinde hazırlanır.',
  },
  {
    id: 'iade-kimler-yapabilir',
    filter: 'iade',
    q: 'Hangi siparişlerde iade hakkım var?',
    a: 'Standart ürünlerde teslim tarihinden itibaren 14 gün içinde iade hakkı vardır. Kişiye özel veya siparişe göre üretilen ürünler yasal kapsam gereği iade dışında kalabilir.',
  },
  {
    id: 'iade-nasil-baslatilir',
    filter: 'iade',
    q: 'İade sürecini nasıl başlatabilirim?',
    a: 'Üyeler Hesabım sayfasındaki sipariş detayından talep açabilir. Üyeliksiz siparişlerde iletişim formu veya e-posta üzerinden bizimle iletişime geçerek iade kodu talep edebilirsiniz.',
  },
  {
    id: 'iade-ucreti-ve-odeme',
    filter: 'iade',
    q: 'İade kargo ücreti ve para iadesi nasıl oluyor?',
    a: 'Onaylanan iade taleplerinde anlaşmalı iade kodu ile gönderim yapılır. Ürün kontrolü tamamlandıktan sonra ücret iadesi ödeme yöntemine bağlı olarak genelde 1-3 iş günü içinde bankanıza yansır.',
  },
]

const FaqPage = () => {
  const [activeFilter, setActiveFilter] = useState('all')
  const [openFaqId, setOpenFaqId] = useState(null)

  const filteredFaqs = activeFilter === 'all' ? faqs : faqs.filter(f => f.filter === activeFilter)

  const handleFilterChange = (filter) => {
    setActiveFilter(filter)
    setOpenFaqId(null)
  }

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }

  return (
    <div className="policy-page">
      <SEO
        title="3D Baski SSS"
        description="Siparis, kargo, iade ve ozel 3D baski hakkinda en cok sorulan sorularin yanitlari."
        keywords="3d baski sss, 3d baski kargo, 3d baski iade, ozel 3d baski sorular"
        url="/faq"
        structuredData={faqStructuredData}
      />
      <div className="policy-header">
        <h1 className="policy-title">Sıkça Sorulan Sorular</h1>
        <p className="policy-updated">Son Güncelleme: 9 Nisan 2026</p>
      </div>
      
      <div className="faq-filter">
        <button className={`faq-filter-btn ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => handleFilterChange('all')}>Tümü</button>
        <button className={`faq-filter-btn ${activeFilter === 'siparis' ? 'active' : ''}`} onClick={() => handleFilterChange('siparis')}>Sipariş Süreci</button>
        <button className={`faq-filter-btn ${activeFilter === 'kargo' ? 'active' : ''}`} onClick={() => handleFilterChange('kargo')}>Kargo ve Teslimat</button>
        <button className={`faq-filter-btn ${activeFilter === 'ozel' ? 'active' : ''}`} onClick={() => handleFilterChange('ozel')}>Özel 3D Baskı</button>
        <button className={`faq-filter-btn ${activeFilter === 'iade' ? 'active' : ''}`} onClick={() => handleFilterChange('iade')}>İade Süreçleri</button>
      </div>

      <div className="policy-faq-list">
        {filteredFaqs.map((faq) => (
          <div key={faq.id} className="policy-faq-item">
            <button 
              onClick={() => setOpenFaqId(openFaqId === faq.id ? null : faq.id)}
              className={`policy-faq-question ${openFaqId === faq.id ? 'is-open' : ''}`}
            >
              <span>{faq.q}</span>
              {openFaqId === faq.id ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {openFaqId === faq.id && (
              <div className="policy-faq-answer">
                <div className="policy-faq-answer-text">{faq.a}</div>
              </div>
            )}
          </div>
        ))}
        {filteredFaqs.length === 0 && (
          <div className="policy-faq-empty">
            Bu kategoriye ait soru bulunamadı.
          </div>
        )}
      </div>
    </div>
  )
}

export default FaqPage

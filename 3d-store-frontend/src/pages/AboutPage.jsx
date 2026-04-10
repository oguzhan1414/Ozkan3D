import { Link } from 'react-router-dom'
import {
  FiAward, FiUsers, FiPackage, FiTruck,
  FiArrowRight, FiInstagram,
  FiMail, FiPhone
} from 'react-icons/fi'
import './AboutPage.css'

const stats = [
  { value: 'Bolu', label: 'Merkez', icon: FiUsers },
  { value: 'Yeni', label: '3D Baskı Markası', icon: FiPackage },
  { value: 'Özenli', label: 'Üretim Süreci', icon: FiAward },
  { value: 'Türkiye', label: 'Geneli Teslimat', icon: FiTruck },
]

const values = [
  { icon: '🎯', title: 'Net İletişim', desc: 'Yapabildiğimiz ve süreyi baştan açık şekilde paylaşırız.' },
  { icon: '🛠️', title: 'İşlevsel Üretim', desc: 'Ürünün görüntüsü kadar kullanımını da önemseriz.' },
  { icon: '🤝', title: 'Takip', desc: 'Sipariş sürecinde sorulara düzenli dönüş yaparız.' },
  { icon: '🌱', title: 'Malzeme Seçimi', desc: 'İhtiyaca göre uygun filament veya reçine öneririz.' },
]

const AboutPage = () => (
  <div className="about-page">

    {/* Hero */}
    <section className="about-hero">
      <div className="about-hero-inner">
        <div className="about-hero-content">
          <p className="about-sup">Hakkımızda</p>
          <h1 className="about-title">
            Yeni Bir<br />
            <span className="about-accent">3D Baskı</span><br />
            Oluşumu
          </h1>
          <p className="about-desc">
            Bolu merkezli, yeni kurulan bir 3D baskı markasıyız.
            Şu an küçük ölçekli ve özenli üretim yapıyor;
            süreç oturdukça adım adım büyümeyi hedefliyoruz.
          </p>
          <div className="about-hero-actions">
            <Link to="/shop" className="btn-primary">
              Ürünleri Keşfet <FiArrowRight size={16} />
            </Link>
            <Link to="/contact" className="btn-outline">
              İletişime Geç
            </Link>
          </div>
        </div>
        <div className="about-hero-visual">
          <div className="about-visual-card about-visual-card-1">
            <span className="about-visual-emoji">🖨️</span>
            <strong>Yeni</strong>
            <span>Başlangıç</span>
          </div>
          <div className="about-visual-card about-visual-card-2">
            <span className="about-visual-emoji">🎨</span>
            <strong>Sınırlı</strong>
            <span>Ürün Gamı</span>
          </div>
          <div className="about-visual-card about-visual-card-3">
            <span className="about-visual-emoji">⭐</span>
            <strong>Adım Adım</strong>
            <span>Büyüme</span>
          </div>
          <div className="about-hero-placeholder">
            <div className="about-cube">
              <div className="ac-face ac-front">3D</div>
              <div className="ac-face ac-back">OK</div>
              <div className="ac-face ac-left">🖨</div>
              <div className="ac-face ac-right">✨</div>
              <div className="ac-face ac-top" />
              <div className="ac-face ac-bottom" />
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Stats */}
    <section className="about-stats">
      <div className="about-stats-inner">
        {stats.map((s, i) => (
          <div key={i} className="about-stat-card">
            <div className="about-stat-icon"><s.icon size={22} /></div>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </section>

    {/* Story */}
    <section className="about-section">
      <div className="about-section-inner">
        <div className="about-story">
          <div className="about-story-content">
            <p className="about-sup">Hikayemiz</p>
            <h2 className="about-section-title">Nasıl Başladık?</h2>
            <p>
              Bu oluşum yakın zamanda, küçük ölçekte başladı.
              İlk hedefimiz ürün kalitesini ve sipariş akışını düzgün şekilde oturtmaktı.
            </p>
            <p>
              Şu an katalog ürünleri ve kişiye özel taleplerde,
              kontrollü bir tempoda üretim yapıyoruz.
            </p>
            <p>
              Talep arttıkça ekipman, çeşit ve operasyon tarafını
              planlı şekilde geliştirmeyi amaçlıyoruz.
            </p>
          </div>
          <div className="about-story-visual">
            <div className="story-timeline">
              {[
                { year: 'Başlangıç', text: 'Küçük ölçekli deneme üretimleri' },
                { year: 'İlk Ürünler', text: 'Temel koleksiyonun oluşturulması' },
                { year: 'İlk Siparişler', text: 'Özel taleplerin alınması' },
                { year: 'Süreç', text: 'Üretim ve teslimat akışının netleşmesi' },
                { year: 'Hedef', text: 'Talebe göre kontrollü büyüme' },
              ].map((t, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <strong>{t.year}</strong>
                    <span>{t.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Values */}
    <section className="about-section about-section-gray">
      <div className="about-section-inner">
        <div className="about-section-header">
          <p className="about-sup">Değerlerimiz</p>
          <h2 className="about-section-title">Bizi Biz Yapan Şeyler</h2>
        </div>
        <div className="about-values-grid">
          {values.map((v, i) => (
            <div key={i} className="about-value-card">
              <span className="about-value-icon">{v.icon}</span>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Team */}
   
    {/* CTA */}
    <section className="about-section about-section-gray">
      <div className="about-section-inner">
        <div className="about-cta">
          <div className="about-cta-content">
            <h2>Yeni Başladık, İyi Yapalım İstiyoruz</h2>
            <p>İhtiyacınızı yazın, uygun üretim planını ve teslimat süresini birlikte netleştirelim.</p>
            <div className="about-cta-actions">
              <Link to="/custom" className="btn-primary">
                Özel Tasarım <FiArrowRight size={16} />
              </Link>
              <Link to="/contact" className="btn-outline">
                İletişime Geç
              </Link>
            </div>
          </div>
          <div className="about-cta-contact">
            <a href="tel:+905411190626" className="cta-contact-item">
              <FiPhone size={18} />
              <div>
                <span>Telefon</span>
                <strong>+90 541 119 06 26</strong>
              </div>
            </a>
            <a href="mailto:ozkan3d.design@gmail.com" className="cta-contact-item">
              <FiMail size={18} />
              <div>
                <span>E-posta</span>
                <strong>ozkan3d.design@gmail.com</strong>
              </div>
            </a>
            <div className="cta-social">
              <a href="https://www.instagram.com/ozkan3d.design/" target="_blank" rel="noreferrer" className="cta-social-btn cta-social-btn-handle">
                <FiInstagram size={18} />
                <span>ozkan3d.design</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
)

export default AboutPage
import { Link } from 'react-router-dom'
import {
  FiAward, FiUsers, FiPackage, FiTruck,
  FiArrowRight, FiInstagram, FiTwitter, FiYoutube,
  FiMail, FiPhone
} from 'react-icons/fi'
import './AboutPage.css'

const stats = [
  { value: '2.400+', label: 'Mutlu Müşteri', icon: FiUsers },
  { value: '150+', label: 'Ürün Çeşidi', icon: FiPackage },
  { value: '%99', label: 'Memnuniyet', icon: FiAward },
  { value: '3 Gün', label: 'Ort. Teslimat', icon: FiTruck },
]

const team = [
  { name: 'Oğuz Özkan', role: 'Kurucu & Tasarımcı', avatar: 'OÖ', desc: '5+ yıllık 3D baskı deneyimi ile hayallerinizi gerçeğe dönüştürüyor.' },
  { name: 'Üretim Ekibi', role: 'Baskı & Kalite Kontrol', avatar: 'ÜE', desc: 'Her ürünün en yüksek kalitede çıkması için titizlikle çalışıyor.' },
  { name: 'Destek Ekibi', role: 'Müşteri Hizmetleri', avatar: 'DE', desc: 'Sorularınızı hızla çözmek için 7/24 yanınızda.' },
]

const values = [
  { icon: '🎯', title: 'Kalite Önce', desc: 'Her ürünümüz çıkmadan önce sıkı kalite kontrolünden geçer.' },
  { icon: '💡', title: 'Yaratıcılık', desc: 'Standart kalıpların dışına çıkarak benzersiz tasarımlar üretiyoruz.' },
  { icon: '🤝', title: 'Güven', desc: 'Müşterilerimizle uzun vadeli ilişkiler kurmayı önemsiyoruz.' },
  { icon: '🌱', title: 'Sürdürülebilirlik', desc: 'Çevre dostu PLA filamentler kullanarak doğayı koruyoruz.' },
]

const AboutPage = () => (
  <div className="about-page">

    {/* Hero */}
    <section className="about-hero">
      <div className="about-hero-inner">
        <div className="about-hero-content">
          <p className="about-sup">Hakkımızda</p>
          <h1 className="about-title">
            Hayalleri<br />
            <span className="about-accent">Gerçeğe</span><br />
            Dönüştürüyoruz
          </h1>
          <p className="about-desc">
            2020 yılından bu yana Türkiye'nin en yaratıcı 3D baskı atölyesiyiz.
            Figürden dekorasyona, prototipten seri üretime kadar her projeye
            özel çözümler sunuyoruz.
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
            <strong>5+ Yıl</strong>
            <span>Deneyim</span>
          </div>
          <div className="about-visual-card about-visual-card-2">
            <span className="about-visual-emoji">🎨</span>
            <strong>1000+</strong>
            <span>Proje</span>
          </div>
          <div className="about-visual-card about-visual-card-3">
            <span className="about-visual-emoji">⭐</span>
            <strong>4.8/5</strong>
            <span>Puan</span>
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
              2020 yılında küçük bir garajda, tek bir 3D yazıcı ve büyük bir hayalle
              yola çıktık. Oğuz'un 3D tasarıma olan tutkusu, zamanla profesyonel bir
              atölyeye dönüştü.
            </p>
            <p>
              Bugün 5'ten fazla endüstriyel 3D yazıcımız, PLA'dan reçineye geniş
              malzeme yelpazemiz ve 2.400'den fazla mutlu müşterimizle Türkiye'nin
              önde gelen 3D baskı markalarından biri haline geldik.
            </p>
            <p>
              Her siparişe özel ilgi gösteriyor, her ürünü sanki kendi projemizmiş
              gibi özenle üretiyoruz.
            </p>
          </div>
          <div className="about-story-visual">
            <div className="story-timeline">
              {[
                { year: '2020', text: 'İlk 3D yazıcımızla yola çıktık' },
                { year: '2021', text: 'İlk 100 müşterimize ulaştık' },
                { year: '2022', text: 'Atölyemizi büyüttük, 5 yazıcıya çıktık' },
                { year: '2023', text: 'E-ticaret platformumuzu açtık' },
                { year: '2024', text: '2.400+ mutlu müşteri!' },
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
    <section className="about-section">
      <div className="about-section-inner">
        <div className="about-section-header">
          <p className="about-sup">Ekibimiz</p>
          <h2 className="about-section-title">Arkamızdaki İnsanlar</h2>
        </div>
        <div className="about-team-grid">
          {team.map((t, i) => (
            <div key={i} className="about-team-card">
              <div className="team-avatar">{t.avatar}</div>
              <h3 className="team-name">{t.name}</h3>
              <p className="team-role">{t.role}</p>
              <p className="team-desc">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="about-section about-section-gray">
      <div className="about-section-inner">
        <div className="about-cta">
          <div className="about-cta-content">
            <h2>Projenizi Hayata Geçirelim</h2>
            <p>Özel tasarım talepleriniz veya sorularınız için bize ulaşın.</p>
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
            <a href="tel:02165213840" className="cta-contact-item">
              <FiPhone size={18} />
              <div>
                <span>Telefon</span>
                <strong>0216 521 38 40</strong>
              </div>
            </a>
            <a href="mailto:bilgi@ozkan3d.design" className="cta-contact-item">
              <FiMail size={18} />
              <div>
                <span>E-posta</span>
                <strong>bilgi@ozkan3d.design</strong>
              </div>
            </a>
            <div className="cta-social">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="cta-social-btn"><FiInstagram size={18} /></a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="cta-social-btn"><FiTwitter size={18} /></a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="cta-social-btn"><FiYoutube size={18} /></a>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
)

export default AboutPage
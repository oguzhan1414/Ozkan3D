import { Link } from 'react-router-dom'
import { FiArrowRight, FiMessageCircle, FiTool, FiPackage, FiLayers, FiMail, FiPhone, FiInstagram } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import SEO from '../../components/SEO'
import unboxingImage from '../../images/footer-unboxing.webp'
import '../storefront.css'
import './AboutPage.css'

const PRINCIPLES = [
  {
    icon: FiMessageCircle,
    title: 'Baştan net konuşuruz',
    text: 'Neyi yapabileceğimizi, ne kadar süreceğini ve kaça mal olacağını sipariş öncesinde açıkça söyleriz.',
  },
  {
    icon: FiTool,
    title: 'Kullanılacak ürün basarız',
    text: 'Bir parçanın güzel görünmesi kadar işini görmesini de önemseriz; ölçüyü ve dayanımı buna göre ayarlarız.',
  },
  {
    icon: FiPackage,
    title: 'Siparişe özel üretiriz',
    text: 'Raflarda bekleyen stok yerine her ürünü sipariş geldiğinde, seçtiğin renkte basarız.',
  },
  {
    icon: FiLayers,
    title: 'Doğru malzemeyi seçeriz',
    text: 'Dekor için PLA, dayanım için PETG, esneklik için TPU. Parçanın nerede kullanılacağına göre öneririz.',
  },
]

// Gerçek sipariş akışı (Hesabım > Siparişlerim'deki adımlarla aynı)
const JOURNEY = [
  { title: 'Sipariş', text: 'Siparişin baskı sırasına alınır.' },
  { title: 'Baskı', text: 'Parça 3D yazıcıda katman katman basılır.' },
  { title: 'Kontrol', text: 'Baskı kontrol edilir, özenle paketlenir.' },
  { title: 'Kargo', text: 'Takip numarasıyla kargoya verilir.' },
  { title: 'Sende', text: 'Şehrine göre 1–6 iş gününde kapında.' },
]

const FACTS = [
  ['Atölye', 'Bolu, Türkiye'],
  ['Üretim', '3D baskı (filament)'],
  ['Malzemeler', 'PLA · PETG · TPU'],
  ['Teslimat', 'Türkiye geneli, 1–6 iş günü'],
  ['Ödeme', 'Kart (PayTR) · Havale / EFT'],
  ['Özel sipariş', 'Tek parçadan itibaren'],
]

const AboutPage = () => (
  <div className="sf-root sf-page">
    <SEO
      title="Hakkımızda"
      description="Özkan3D, Bolu'da küçük ölçekli ve özenli üretim yapan yeni bir 3D baskı atölyesi. Katalog ürünleri ve kişiye özel siparişler."
      url="/about"
    />
    <div className="sf-container sf-container--narrow">
      {/* Hero */}
      <section className="ab-hero" aria-labelledby="ab-title">
        <div className="ab-hero-copy">
          <p className="ab-kicker sf-mono">Hakkımızda</p>
          <h1 id="ab-title">Bolu'da küçük bir atölye, katman katman büyüyor.</h1>
          <p className="ab-lead">
            Özkan3D yeni kurulmuş bir 3D baskı markası. Bugün küçük ölçekte ve özenle üretiyoruz:
            mağazadaki ürünleri ve sana özel parçaları kendi atölyemizde basıyoruz. İşler oturdukça
            ekipmanı ve ürün yelpazesini adım adım büyütüyoruz.
          </p>
          <div className="ab-actions">
            <Link to="/shop" className="sf-btn sf-btn--ink">Ürünlere göz at <FiArrowRight aria-hidden="true" /></Link>
            <Link to="/custom" className="sf-btn sf-btn--ghost">Özel baskı iste</Link>
          </div>
        </div>
        <figure className="ab-hero-media">
          <img
            src={unboxingImage}
            width="1122"
            height="1402"
            alt="Açık bir kargo kutusunda mercan renkli saksı, ejderha figürü ve masa düzenleyici"
            fetchPriority="high"
          />
          <figcaption>Temsili ürün görseli</figcaption>
        </figure>
      </section>

      {/* İlkeler */}
      <section className="ab-section" aria-labelledby="ab-principles">
        <h2 id="ab-principles" className="ab-h2">Nasıl çalışıyoruz?</h2>
        <ul className="ab-principles">
          {PRINCIPLES.map((p) => (
            <li key={p.title}>
              <span className="ab-icon" aria-hidden="true"><p.icon /></span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Siparişin yolculuğu */}
      <section className="ab-section" aria-labelledby="ab-journey">
        <h2 id="ab-journey" className="ab-h2">Bir siparişin yolculuğu</h2>
        <p className="ab-sub">Siparişinin hangi adımda olduğunu Hesabım sayfasından aynı çubukla takip edebilirsin.</p>
        <ol className="ab-journey">
          {JOURNEY.map((s, i) => (
            <li key={s.title} style={{ '--i': i }}>
              <span className="ab-layer" aria-hidden="true" />
              <h3><span className="sf-mono">{i + 1}</span> {s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Künye */}
      <section className="ab-section ab-facts-wrap" aria-labelledby="ab-facts">
        <h2 id="ab-facts" className="ab-h2">Atölye künyesi</h2>
        <dl className="ab-facts">
          {FACTS.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </section>

      {/* Kapanış */}
      <section className="ab-closing" aria-labelledby="ab-closing-title">
        <div>
          <h2 id="ab-closing-title">Yeni başladık, iyi yapalım istiyoruz.</h2>
          <p>Bir sorun, bir fikrin ya da bir önerin varsa doğrudan bize yaz. Her mesaja kendimiz dönüyoruz.</p>
        </div>
        <div className="ab-contact">
          <a href="https://wa.me/905411190626" target="_blank" rel="noopener noreferrer"><FaWhatsapp aria-hidden="true" /> WhatsApp</a>
          <a href="tel:+905411190626"><FiPhone aria-hidden="true" /> <span className="sf-mono">+90 541 119 06 26</span></a>
          <a href="mailto:ozkan3d.design@gmail.com"><FiMail aria-hidden="true" /> ozkan3d.design@gmail.com</a>
          <a href="https://www.instagram.com/ozkan3d.design/" target="_blank" rel="noopener noreferrer"><FiInstagram aria-hidden="true" /> ozkan3d.design</a>
        </div>
      </section>
    </div>
  </div>
)

export default AboutPage

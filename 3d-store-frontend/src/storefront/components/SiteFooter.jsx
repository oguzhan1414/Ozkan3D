import { Link } from 'react-router-dom'
import { FaWhatsapp, FaInstagram } from 'react-icons/fa'
import { FiArrowUpRight, FiBox } from 'react-icons/fi'
import { categoryHref } from '../catalog'
import useCategories from '../useCategories'
import BrandLogo from './BrandLogo'
import unboxingImage from '../../images/footer-unboxing.webp'
import './SiteFooter.css'

const PHONE_DISPLAY = '+90 541 119 06 26'
const PHONE_WA = '905411190626'
const EMAIL = 'ozkan3d.design@gmail.com'

const STATIC_COLUMNS = [
  {
    title: 'Hizmetler',
    links: [
      { to: '/custom', label: 'Özel tasarım ve baskı' },
      { to: '/3d-baski', label: '3D baskı' },
      { to: '/scan', label: '3D tarama' },
      { to: '/blog', label: 'Blog' },
      { to: '/about', label: 'Hakkımızda' },
    ],
  },
  {
    title: 'Destek',
    links: [
      { to: '/contact', label: 'İletişim' },
      { to: '/faq', label: 'Sıkça sorulan sorular' },
      { to: '/delivery', label: 'Teslimat koşulları' },
      { to: '/returns', label: 'İade işlemleri' },
    ],
  },
]

const SiteFooter = () => {
  const { categories } = useCategories()
  const columns = [
    {
      title: 'Alışveriş',
      links: [
        { to: '/shop', label: 'Tüm ürünler' },
        ...categories.map((c) => ({ to: categoryHref(c), label: c.name })),
      ],
    },
    ...STATIC_COLUMNS,
  ]

  return (
  <footer className="sf-root sf-footer" aria-labelledby="sf-footer-title">
    <div className="sf-container">
      <div className="sf-footer-main">
        <div className="sf-footer-visual">
          <span className="sf-footer-visual-word" aria-hidden="true">katman.</span>
          <figure className="sf-footer-photo">
            <img
              src={unboxingImage}
              alt="Açık bir kargo kutusunda mercan renkli saksı, pembe ejderha figürü ve krem masa düzenleyici; temsili ürün görseli."
              width="1122"
              height="1402"
              loading="lazy"
              decoding="async"
            />
            <figcaption><FiBox aria-hidden="true" /> Küçük bir kutu. Bir sürü olasılık.</figcaption>
          </figure>
          <span className="sf-footer-visual-index" aria-hidden="true">FİKİR → KATMAN → SEN</span>
        </div>

        <div className="sf-footer-content">
          <p className="sf-footer-eyebrow"><span aria-hidden="true" /> Üç boyutlu fikirler, gerçek mutluluklar.</p>
          <h2 id="sf-footer-title">Katman katman.<br /><span>Sana kadar.</span></h2>
          <p className="sf-footer-intro">Masana bir detay, sevdiklerine bir hediye, aklındaki fikre bir şekil. 3D baskıyla üretiyor, özenle paketleyip sana gönderiyoruz.</p>

          <div className="sf-footer-links">
            {columns.map((col) => (
              <nav key={col.title} className="sf-footer-col" aria-label={`Alt menü: ${col.title}`}>
                <h3>{col.title}</h3>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="sf-footer-connect">
            <div className="sf-footer-social" aria-label="Sosyal medya ve mesajlaşma">
              <a href="https://www.instagram.com/ozkan3d.design/" target="_blank" rel="noopener noreferrer" aria-label="Instagram: ozkan3d.design, yeni sekmede açılır">
                <FaInstagram aria-hidden="true" /><span>Instagram</span><FiArrowUpRight aria-hidden="true" />
              </a>
              <a href={`https://wa.me/${PHONE_WA}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp ile yaz, yeni sekmede açılır">
                <FaWhatsapp aria-hidden="true" /><span>Bir fikrin mi var?</span><FiArrowUpRight aria-hidden="true" />
              </a>
            </div>
            <div className="sf-footer-contact">
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
              <a href={`tel:+${PHONE_WA}`}>{PHONE_DISPLAY}</a>
            </div>
          </div>
        </div>
      </div>

      <div className="sf-footer-bottom">
        <Link to="/" className="sf-footer-brand" aria-label="Özkan3D anasayfa"><BrandLogo /></Link>
        <span className="sf-footer-copyright">© {new Date().getFullYear()} Özkan3D. Tüm hakları saklıdır.</span>
        <nav className="sf-footer-legal" aria-label="Yasal bilgiler">
          <Link to="/kvkk">Gizlilik ve KVKK</Link>
          <Link to="/distance-selling">Mesafeli satış sözleşmesi</Link>
        </nav>
      </div>
    </div>
  </footer>
  )
}

export default SiteFooter

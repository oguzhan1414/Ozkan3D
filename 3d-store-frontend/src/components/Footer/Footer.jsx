import { Link } from 'react-router-dom'
import {
  FiPhone, FiMail, FiMapPin, FiInstagram,
  FiArrowRight
} from 'react-icons/fi'
import siteLogo from '../../images/logo-wordmark.png'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">

      {/* ── Üst Bant ── */}
      <div className="footer-top-banner">
        <div className="footer-banner-inner">
          <div className="footer-banner-item">
            <span className="footer-banner-icon">📦</span>
            <div>
              <strong>Hızlı Üretim</strong>
              <span>2-3 iş günü içinde hazırlanır</span>
            </div>
          </div>
          <div className="footer-banner-sep" />
          <div className="footer-banner-item">
            <span className="footer-banner-icon">🎨</span>
            <div>
              <strong>50+ Renk Seçeneği</strong>
              <span>Zevkine uygun filament seçenekleri</span>
            </div>
          </div>
          <div className="footer-banner-sep" />
          <div className="footer-banner-item">
            <span className="footer-banner-icon">📍</span>
            <div>
              <strong>Türkiye Geneli Teslimat</strong>
              <span>Bolu'dan tüm şehirlere gönderim</span>
            </div>
          </div>
          <div className="footer-banner-sep" />
          <div className="footer-banner-item">
            <span className="footer-banner-icon">💬</span>
            <div>
              <strong>WhatsApp Destek</strong>
              <span>Sorun mu var? Hemen yazın</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ana Footer ── */}
      <div className="footer-main">
        <div className="footer-inner">

          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <img src={siteLogo} alt="Ozkan3D logo" className="footer-logo-image" />
            </Link>
            <p className="footer-tagline">
              Türkiye'nin en yenilikçi 3D baskı mağazası.
              Hayalini tasarla, biz gerçeğe dönüştürelim.
            </p>
            <div className="footer-contact">
              <a href="tel:02165213840" className="footer-contact-item">
                <FiPhone size={14} />
                <span>+90 541 119 06 26</span>
              </a>
              <a href="mailto:ozkan3d.design@gmail.com" className="footer-contact-item">
                <FiMail size={14} />
                <span>ozkan3d.design@gmail.com</span>
              </a>
              <div className="footer-contact-item">
                <FiMapPin size={14} />
                <span>Bolu, Türkiye</span>
              </div>
            </div>
            <div className="footer-social">
              <a href="https://www.instagram.com/ozkan3d.design/" target="_blank" rel="noreferrer" className="footer-instagram-btn" aria-label="Instagram">
                <FiInstagram size={17} />
                <span>Instagram'da Takip Et</span>
              </a>
            </div>
          </div>

          {/* Hızlı Erişim */}
          <div className="footer-col">
            <h4 className="footer-col-title">Hızlı Erişim</h4>
            <div className="footer-links">
              <Link to="/" className="footer-link"><FiArrowRight size={12} />Anasayfa</Link>
              <Link to="/contact" className="footer-link"><FiArrowRight size={12} />İletişim</Link>
              <Link to="/faq" className="footer-link"><FiArrowRight size={12} />Sıkça Sorulan Sorular</Link>
              <Link to="/blog" className="footer-link"><FiArrowRight size={12} />Blog</Link>
            </div>
          </div>

          {/* Kurumsal */}
          <div className="footer-col">
            <h4 className="footer-col-title">Kurumsal</h4>
            <div className="footer-links">
              <Link to="/about" className="footer-link"><FiArrowRight size={12} />Hakkımızda</Link>
              <Link to="/distance-selling" className="footer-link"><FiArrowRight size={12} />Mesafeli Satış Sözleşmesi</Link>
              <Link to="/kvkk" className="footer-link"><FiArrowRight size={12} />KVKK Politikası</Link>
              <Link to="/delivery" className="footer-link"><FiArrowRight size={12} />Teslimat ve Sipariş Koşulları</Link>
            </div>
          </div>

          {/* Üyelik */}
          <div className="footer-col">
            <h4 className="footer-col-title">Üyelik & İşlemler</h4>
            <div className="footer-links">
              <Link to="/register" className="footer-link"><FiArrowRight size={12} />Yeni Üyelik</Link>
              <Link to="/login" className="footer-link"><FiArrowRight size={12} />Üye Girişi</Link>
              <Link to="/cart" className="footer-link"><FiArrowRight size={12} />Sepetim</Link>
              <Link to="/returns" className="footer-link"><FiArrowRight size={12} />İade İşlemleri</Link>
              <Link to="/account" className="footer-link"><FiArrowRight size={12} />Sipariş Takibi</Link>
            </div>
          </div>

        </div>
      </div>

      {/* ── Alt Bant ── */}
      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p className="footer-copyright">
            © {new Date().getFullYear()} Ozkan3D.design — Tüm hakları saklıdır. 🖨️ Bolu'dan sevgiyle
          </p>

          {/* Ödeme Yöntemleri */}
          <div className="footer-payments">
            <span className="payment-label">Güvenli Ödeme:</span>
            <div className="payment-icons">

              {/* iyzico */}
              <div className="payment-badge payment-iyzico">
                <span>iyzico</span>
              </div>

              {/* Visa */}
              <div className="payment-badge payment-visa">
                <span>VISA</span>
              </div>

              {/* Mastercard */}
              <div className="payment-badge payment-mc">
                <span className="mc-circle mc-red" />
                <span className="mc-circle mc-orange" />
              </div>

              {/* Troy */}
              <div className="payment-badge payment-troy">
                <span>TROY</span>
              </div>

              {/* SSL */}
              <div className="payment-badge payment-ssl">
                <span>🔒 SSL</span>
              </div>

            </div>
          </div>
        </div>
      </div>

    </footer>
  )
}

export default Footer
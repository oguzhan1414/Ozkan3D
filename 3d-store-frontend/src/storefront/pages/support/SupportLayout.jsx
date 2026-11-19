import { Link } from 'react-router-dom'
import '../../storefront.css'
import './SupportPages.css'

export const SUPPORT_EMAIL = 'ozkan3d.design@gmail.com'
export const SUPPORT_PHONE = '+90 541 119 06 26'
export const SUPPORT_TEL = '+905411190626'
export const SUPPORT_WHATSAPP = 'https://wa.me/905411190626'

const SupportLayout = ({ title, intro, current, children }) => (
  <div className="sf-root sf-support">
    <div className="sf-container sf-support-container">
      <nav className="sf-support-breadcrumb" aria-label="İçerik yolu"><Link to="/">Anasayfa</Link><span aria-hidden="true">/</span><span aria-current="page">{current}</span></nav>
      <header className="sf-support-header"><h1>{title}</h1><p className="sf-support-intro">{intro}</p></header>
      <div className="sf-support-content">{children}</div>
    </div>
  </div>
)

export const SupportArticle = ({ children }) => <div className="sf-support-article">{children}</div>

export default SupportLayout

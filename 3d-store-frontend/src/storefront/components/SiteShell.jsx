import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  FiSearch, FiHeart, FiShoppingBag, FiHome, FiGrid, FiPenTool, FiUser, FiChevronDown,
} from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { initials } from '../catalog'
import BrandLogo from './BrandLogo'
import './SiteShell.css'

/**
 * Mağaza iskeleti:
 *  - masaüstü: ince atölye şeridi + yapışkan üst header (logo, menü, arama, ikonlar)
 *  - mobil: üstte logo + arama, altta sekme çubuğu
 * Favoriler yalnızca giriş yapmış kullanıcıya gösterilir.
 */

const MAIN_NAV = [
  { to: '/shop', label: 'Mağaza' },
  { to: '/custom', label: 'Özel baskı' },
  { to: '/scan', label: '3D tarama' },
]

const WHATSAPP = `https://wa.me/905411190626?text=${encodeURIComponent('Merhaba, bir sorum var.')}`

/* ------------------------------------------------------------ Hesap menüsü */
const AccountMenu = ({ placement = 'down' }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <div className="sf-account" ref={ref}>
      <button
        type="button"
        className="sf-account-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={`sf-avatar ${isAuthenticated ? 'is-user' : ''}`} aria-hidden="true">
          {isAuthenticated ? initials(user) : <FiUser />}
        </span>
        <span className="sf-account-label">
          {isAuthenticated ? (user?.firstName || 'Hesabım') : 'Giriş yap'}
        </span>
        <FiChevronDown className="sf-account-caret" aria-hidden="true" />
      </button>

      {open && (
        <div
          className={`sf-menu sf-menu--${placement}`}
          role="menu"
          onClick={(e) => { if (e.target.closest('a')) setOpen(false) }}
        >
          {isAuthenticated ? (
            <>
              <p className="sf-menu-hello">Merhaba, {user?.firstName}</p>
              <Link role="menuitem" to="/account?tab=orders">Siparişlerim</Link>
              <Link role="menuitem" to="/account?tab=favorites">Favorilerim</Link>
              <Link role="menuitem" to="/account?tab=profile">Hesap bilgileri</Link>
              {isAdmin && <Link role="menuitem" to="/admin">Yönetim paneli</Link>}
              <hr />
              <Link role="menuitem" to="/contact">Yardım ve iletişim</Link>
              <button type="button" role="menuitem" onClick={onLogout}>Çıkış yap</button>
            </>
          ) : (
            <>
              <Link role="menuitem" to="/login" className="is-strong">Giriş yap</Link>
              <Link role="menuitem" to="/register">Üye ol</Link>
              <hr />
              <Link role="menuitem" to="/contact">Yardım ve iletişim</Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- Arama */
export const SearchPill = ({ id = 'sf-search' }) => {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/shop?search=${encodeURIComponent(term)}` : '/shop')
  }

  return (
    <form className="sf-search-pill" role="search" onSubmit={submit}>
      <FiSearch aria-hidden="true" className="sf-search-icon" />
      <label className="sf-visually-hidden" htmlFor={id}>Ürün ara</label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ne bastıralım? Figür, stand, saksı…"
        autoComplete="off"
        enterKeyHint="search"
      />
      <button type="submit" aria-label="Ara">
        <FiSearch aria-hidden="true" />
      </button>
    </form>
  )
}

const CartBadge = () => {
  const { totalItems } = useCart()
  if (!totalItems) return null
  return <span className="sf-count">{totalItems > 99 ? '99+' : totalItems}</span>
}

// Aktif menü öğesinin altındaki üç katman çizgisi: 3D baskının katmanlarına gönderme
const LayerMark = () => (
  <span className="sf-layer-mark" aria-hidden="true"><i /><i /><i /></span>
)

/* ------------------------------------------------------- Atölye şeridi */
const STRIP_LINES = [
  'Odana bir abajur, ruhuna bir ışık',
  'Anahtarlığın cebinde, hikâyen elinde',
  'Sıradan değil, sana özel basılır',
  'Masana, rafına, hediye listene',
  'Bolu atölyesinden 1–6 iş gününde kargoda',
]

const WorkshopStrip = () => (
  <div className="sf-root sf-strip">
    <div className="sf-strip-inner">
      <div className="sf-strip-ticker" aria-label={STRIP_LINES.join('. ')}>
        <div className="sf-strip-track" aria-hidden="true">
          {[0, 1].map((copy) => (
            <ul key={copy}>
              {STRIP_LINES.map((line) => (
                <li key={line}>
                  <i className="sf-strip-dot" />
                  {line}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <div className="sf-strip-side">
        <Link to="/shop" className="sf-strip-cta">Alışverişe başla →</Link>
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="sf-strip-wa">
          <FaWhatsapp aria-hidden="true" /> Soru sor
        </a>
      </div>
    </div>
  </div>
)

/* --------------------------------------------------------------- Header */
const Header = () => {
  const { isAuthenticated } = useAuth()

  return (
    <header className="sf-root sf-header">
      <div className="sf-header-inner">
        <Link to="/" className="sf-header-logo" aria-label="Ozkan3d anasayfa">
          <BrandLogo responsive />
        </Link>

        <nav className="sf-nav" aria-label="Ana menü">
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sf-nav-link ${isActive ? 'is-active' : ''}`}
            >
              {item.label}
              <LayerMark />
            </NavLink>
          ))}
        </nav>

        <SearchPill />

        <div className="sf-actions">
          {isAuthenticated && (
            <Link to="/account?tab=favorites" className="sf-icon-btn" aria-label="Favoriler" title="Favoriler">
              <FiHeart aria-hidden="true" />
            </Link>
          )}
          <NavLink
            to="/cart"
            className={({ isActive }) => `sf-icon-btn ${isActive ? 'is-active' : ''}`}
            aria-label="Sepet"
            title="Sepet"
          >
            <FiShoppingBag aria-hidden="true" />
            <CartBadge />
          </NavLink>
          <AccountMenu placement="down" />
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------ Mobil alt çubuk */
const TabBar = () => {
  const { isAuthenticated } = useAuth()
  // Misafirde favoriler yerine özel baskı sekmesi
  const items = [
    { to: '/', label: 'Anasayfa', icon: FiHome, end: true },
    { to: '/shop', label: 'Mağaza', icon: FiGrid },
    isAuthenticated
      ? { to: '/account?tab=favorites', label: 'Favoriler', icon: FiHeart, query: true }
      : { to: '/custom', label: 'Özel baskı', icon: FiPenTool },
    { to: '/cart', label: 'Sepet', icon: FiShoppingBag, badge: true },
  ]

  return (
    <nav className="sf-root sf-tabbar" aria-label="Alt menü">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `sf-tab ${isActive && !item.query ? 'is-active' : ''}`}
        >
          <span className="sf-tab-icon">
            <item.icon aria-hidden="true" />
            {item.badge && <CartBadge />}
          </span>
          {item.label}
        </NavLink>
      ))}
      <div className="sf-tab sf-tab--account">
        <AccountMenu placement="up" />
      </div>
    </nav>
  )
}

const SiteShell = () => (
  <>
    <WorkshopStrip />
    <Header />
    <TabBar />
  </>
)

export default SiteShell

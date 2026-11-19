import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiSearch, FiHeart, FiShoppingBag, FiHome, FiGrid, FiPenTool, FiAperture, FiUser, FiChevronUp } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { initials } from '../catalog'
import BrandLogo from './BrandLogo'
import './SiteShell.css'

/**
 * Mağaza iskeleti:
 *  - masaüstü: solda ikon menüsü + üstte ortalanmış arama
 *  - mobil: üstte logo + arama, altta sekme çubuğu
 */

const NAV_GROUPS = [
  {
    title: 'Alışveriş',
    items: [
      { to: '/', label: 'Anasayfa', icon: FiHome, end: true },
      { to: '/shop', label: 'Mağaza', icon: FiGrid },
      { to: '/cart', label: 'Sepet', icon: FiShoppingBag, badge: true },
      { to: '/account?tab=favorites', label: 'Favoriler', icon: FiHeart },
    ],
  },
  {
    title: 'Hizmetler',
    items: [
      { to: '/custom', label: 'Özel baskı', icon: FiPenTool },
      { to: '/scan', label: '3D tarama', icon: FiAperture },
    ],
  },
]

const WHATSAPP = `https://wa.me/905411190626?text=${encodeURIComponent('Merhaba, bir sorum var.')}`

/* ------------------------------------------------------------ Hesap menüsü */
const AccountMenu = ({ placement = 'right' }) => {
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
        className="sf-rail-item sf-account-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={`sf-avatar ${isAuthenticated ? 'is-user' : ''}`} aria-hidden="true">
          {isAuthenticated ? initials(user) : <FiUser />}
        </span>
        <span className="sf-rail-label">
          {isAuthenticated ? (user?.firstName || 'Hesabım') : 'Giriş yap'}
          <small>{isAuthenticated ? 'Hesabım' : 'veya üye ol'}</small>
        </span>
        <FiChevronUp className="sf-account-caret" aria-hidden="true" />
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

/* ------------------------------------------------------------- Sol panel */
// Aktif öğenin solundaki üç katman çizgisi: 3D baskının katmanlarına gönderme
const LayerMark = () => (
  <span className="sf-layer-mark" aria-hidden="true"><i /><i /><i /></span>
)

const SideRail = () => (
  <aside className="sf-root sf-rail-nav" aria-label="Site menüsü">
    <Link to="/" className="sf-rail-brand" aria-label="Özkan3D anasayfa">
      <BrandLogo className="sf-rail-logo-full" />
      <BrandLogo compact className="sf-rail-logo-mini" />
    </Link>

    <nav className="sf-rail-groups" aria-label="Ana menü">
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="sf-rail-group">
          <p className="sf-rail-heading">{group.title}</p>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sf-rail-item ${isActive && !item.to.includes('?') ? 'is-active' : ''}`}
            >
              <LayerMark />
              <item.icon aria-hidden="true" className="sf-rail-icon" />
              <span className="sf-rail-label">{item.label}</span>
              {item.badge && <CartBadge />}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>

    <div className="sf-rail-bottom">
      <div className="sf-workshop">
        <p className="sf-workshop-title"><span className="sf-workshop-dot" aria-hidden="true" /> Bolu atölyesi</p>
        <p className="sf-workshop-text">Her ürün siparişe özel basılır, 1–6 iş gününde kargoda.</p>
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="sf-workshop-btn">
          <FaWhatsapp aria-hidden="true" /> Soru sor
        </a>
      </div>
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="sf-rail-item sf-rail-wa" aria-label="WhatsApp ile soru sor">
        <FaWhatsapp aria-hidden="true" className="sf-rail-icon" />
        <span className="sf-rail-label">Soru sor</span>
      </a>
      <AccountMenu placement="right" />
    </div>
  </aside>
)

/* ------------------------------------------------------------- Üst bar */
const TopBar = () => (
  <header className="sf-root sf-topbar">
    <Link to="/" className="sf-topbar-logo" aria-label="Ozkan3D anasayfa">
      <BrandLogo responsive />
    </Link>
    <SearchPill />
  </header>
)

/* ------------------------------------------------------ Mobil alt çubuk */
const MOBILE_NAV = [
  { to: '/', label: 'Anasayfa', icon: FiHome, end: true },
  { to: '/shop', label: 'Mağaza', icon: FiGrid },
  { to: '/cart', label: 'Sepet', icon: FiShoppingBag, badge: true },
  { to: '/account?tab=favorites', label: 'Favoriler', icon: FiHeart },
]

const TabBar = () => (
  <nav className="sf-root sf-tabbar" aria-label="Alt menü">
    {MOBILE_NAV.map((item) => (
      <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `sf-tab ${isActive ? 'is-active' : ''}`}>
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

const SiteShell = () => (
  <>
    <SideRail />
    <TopBar />
    <TabBar />
  </>
)

export default SiteShell

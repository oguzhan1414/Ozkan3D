import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useFavorite } from '../../context/FavoriteContext'
import {
  FiShoppingCart, FiUser, FiMenu, FiX,
  FiSearch, FiPhone, FiMail, FiChevronDown,
  FiSun, FiMoon, FiLogOut, FiSettings,
  FiPackage, FiShield, FiHeart
} from 'react-icons/fi'
import siteLogo from '../../images/logo-wordmark.png'
import './Header.css'

const navLinks = [
  {
    label: '3D Baskı Ürünleri', path: '/shop',
    dropdown: [
      { title: 'Figürler', items: ['Katana', 'Ejderha Koleksiyonu', 'Fantastik Yaratıklar', 'Diğer Figürler'] },
      { title: 'Hediyelik / Dekor', items: ['Masa Dekorasyonu', 'Ev Dekorasyon', 'Anahtarlıklar'] },
      { title: 'Konsol & Oyun', items: ['PS5 & Xbox Aksesuarları', 'Kulaklık Tutucular', 'Joystick Tutucular', 'Kablo Düzenleyici'] },
      { title: 'Ev Aletleri', items: ['Mutfak Yardımcıları', 'Temizlik Yardımcıları', 'Banyo Düzenleyiciler', 'Pratik Ev Aparatları'] },
    ]
  },
  { label: 'Tarama işlemi', path: '/scan', dropdown: null },
  { label: '3D Baskı Hizmeti', path: '/custom', dropdown: null },
  { label: 'Bize Ulaşın!', path: '/contact', dropdown: null },
]

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [hoverTimeout, setHoverTimeout] = useState(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navbarRef = useRef(null)
  const searchRef = useRef(null)
  const userMenuRef = useRef(null)
  const { theme, toggleTheme } = useTheme()
  const { totalItems } = useCart()
  const { favorites } = useFavorite()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navbarRef.current && !navbarRef.current.contains(e.target)) setActiveDropdown(null)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMouseEnter = (index) => {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    setActiveDropdown(index)
  }

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => setActiveDropdown(null), 150)
    setHoverTimeout(timeout)
  }

  const handleDropdownEnter = () => { if (hoverTimeout) clearTimeout(hoverTimeout) }
  const handleDropdownLeave = () => setActiveDropdown(null)

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      searchRef.current?.blur()
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <>

      {/* Mid Bar */}
      <div className="midbar">
        <div className="midbar-container">
          <Link to="/" className="header-logo">
            <img src={siteLogo} alt="Ozkan3D logo" className="header-logo-image" />
          </Link>

          <form className={`search-form ${searchFocused ? 'search-focused' : ''}`} onSubmit={handleSearch}>
            <FiSearch className="search-icon" size={18} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Ürün, Marka veya Kategori Ara"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="search-input"
            />
            {searchQuery && (
              <button type="button" className="search-clear" onClick={() => setSearchQuery('')}>
                <FiX size={14} />
              </button>
            )}
            <button type="submit" className="search-btn">Ara</button>
          </form>

          <div className="midbar-actions">
            {/* Tema Toggle */}
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button>

            {/* Kullanıcı Menüsü */}
            {isAuthenticated ? (
              <div className="user-menu-wrap" ref={userMenuRef}>
                <button
                  className="user-menu-trigger"
                  onClick={() => setUserMenuOpen(p => !p)}
                >
                  <div className="user-avatar-small">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <span className="user-menu-name">{user?.firstName}</span>
                  <FiChevronDown size={14} className={userMenuOpen ? 'rotate-180' : ''} />
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-header">
                      <div className="user-dropdown-avatar">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                      <div>
                        <strong>{user?.firstName} {user?.lastName}</strong>
                        <span>{user?.email}</span>
                      </div>
                    </div>
                    <div className="user-dropdown-divider" />
                    <Link to="/account" className="user-dropdown-item">
                      <FiUser size={15} /> Hesabım
                    </Link>
                    <Link to="/account?tab=orders" className="user-dropdown-item">
                      <FiPackage size={15} /> Siparişlerim
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="user-dropdown-item user-dropdown-admin">
                        <FiShield size={15} /> Admin Paneli
                      </Link>
                    )}
                    <div className="user-dropdown-divider" />
                    <button className="user-dropdown-item user-dropdown-logout" onClick={handleLogout}>
                      <FiLogOut size={15} /> Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="midbar-icon-btn">
                <FiUser size={24} />
                <span className="midbar-icon-label">Hesabım</span>
              </Link>
            )}

            {/* Favorilerim */}
            {isAuthenticated && (
              <Link to="/account?tab=favorites" className="midbar-icon-btn" title="Favorilerim">
                <div className="cart-icon-wrap">
                  <FiHeart size={24} />
                  {favorites?.length > 0 && <span className="cart-badge wishlist-badge">{favorites.length}</span>}
                </div>
                <span className="midbar-icon-label">Favorilerim</span>
              </Link>
            )}

            {/* Sepet */}
            <Link to="/cart" className="midbar-icon-btn cart-btn">
              <div className="cart-icon-wrap">
                <FiShoppingCart size={24} />
                {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
              </div>
              <span className="midbar-icon-label">Sepetim</span>
            </Link>

            {/* Mobile Menu */}
            <button className="midbar-icon-btn mobile-menu-trigger" onClick={() => setMenuOpen(p => !p)}>
              {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              <span className="midbar-icon-label">Menü</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <nav className="navbar" ref={navbarRef}>
        <div className="navbar-container">
          {navLinks.map((link, i) => (
            <div key={i} className="navbar-item"
              onMouseEnter={() => link.dropdown && handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
            >
              <Link
                to={link.path}
                state={link.path === '/shop' ? { reset: true } : {}}
                className={`navbar-link ${location.pathname === link.path.split('?')[0] ? 'navbar-link-active' : ''}`}
              >
                {link.label}
                {link.dropdown && (
                  <FiChevronDown size={14} className={`navbar-chevron ${activeDropdown === i ? 'navbar-chevron-open' : ''}`} />
                )}
              </Link>

              {link.dropdown && (
                <div
                  className={`dropdown ${activeDropdown === i ? 'dropdown-open' : ''}`}
                  onMouseEnter={handleDropdownEnter}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="dropdown-inner">
                    {link.dropdown.map((col, ci) => (
                      <div key={ci} className="dropdown-col">
                        <h4 className="dropdown-col-title">{col.title}</h4>
                        <ul className="dropdown-list">
                          {col.items.map((item, ii) => (
                            <li key={ii}>
                              <Link to={`/shop?sub=${encodeURIComponent(item)}`} className="dropdown-link">
                                {item}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Mobile Overlay */}
      <div className={`mobile-overlay ${menuOpen ? 'mobile-overlay-open' : ''}`} onClick={() => setMenuOpen(false)} />

      {/* Mobile Menu */}
      <div className={`mobile-menu ${menuOpen ? 'mobile-menu-open' : ''}`}>
        <div className="mobile-menu-header">
          <span className="mobile-menu-label">Menü</span>
          <div className="mobile-menu-header-actions">
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
            <button className="mobile-close-btn" onClick={() => setMenuOpen(false)}>
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Mobile User Info */}
        {isAuthenticated && (
          <div className="mobile-user-info">
            <div className="mobile-user-avatar">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <strong>{user?.firstName} {user?.lastName}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
        )}

        <form className="mobile-search" onSubmit={handleSearch}>
          <FiSearch size={16} />
          <input
            type="text"
            placeholder="Ürün ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>

        <nav className="mobile-nav">
          {navLinks.map((link, i) => (
            <Link key={i} to={link.path} className="mobile-nav-link" style={{ animationDelay: `${i * 0.05}s` }}>
              <span>{link.label}</span>
              <span className="mobile-nav-arrow">→</span>
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="mobile-nav-link mobile-admin-link">
              <span>🛡️ Admin Paneli</span>
              <span className="mobile-nav-arrow">→</span>
            </Link>
          )}
        </nav>

        <div className="mobile-menu-footer">
          {isAuthenticated ? (
            <button className="mobile-logout-btn" onClick={handleLogout}>
              <FiLogOut size={16} /> Çıkış Yap
            </button>
          ) : (
            <Link to="/login" className="mobile-cart-btn">
              <FiUser size={18} /> Giriş Yap
            </Link>
          )}
          <div className="mobile-contact">
              <a href="tel:+905411190626" className="topbar-link"><FiPhone size={13} /> +90 541 119 06 26</a>
            <a href="mailto:ozkan3d.design@gmail.com" className="topbar-link"><FiMail size={13} /> ozkan3d.design@gmail.com</a>
          </div>
        </div>
      </div>
    </>
  )
}

export default Header
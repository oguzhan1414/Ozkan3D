import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  FiGrid, FiShoppingBag, FiPackage, FiUsers, FiTag, FiBarChart2,
  FiSettings, FiMenu, FiX, FiLogOut, FiChevronRight, FiTrendingUp , FiMessageSquare
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import NotificationPanel from '../../components/NotificationPanel/NotificationPanel'
import siteLogo from '../../images/logo-cropped.png'
import './Admin.css'


const menuItems = [
  { path: '/admin',          label: 'Genel Bakış',  icon: FiGrid,         exact: true },
  { path: '/admin/orders',   label: 'Siparişler',   icon: FiShoppingBag },
  { path: '/admin/products', label: 'Ürünler',      icon: FiPackage },
  { path: '/admin/reviews',  label: 'Yorumlar',     icon: FiMessageSquare }, // ← ekle
  { path: '/admin/customers',label: 'Müşteriler',   icon: FiUsers },
  { path: '/admin/coupons',  label: 'Kuponlar',     icon: FiTag },
  { path: '/admin/reports',  label: 'Raporlar',     icon: FiBarChart2 },
  { path: '/admin/settings', label: 'Ayarlar',      icon: FiSettings },
]

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const getInitials = () => {
    return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`
  }

  const getCurrentPageLabel = () => {
    if (location.pathname === '/admin') return null
    return menuItems.find(m => location.pathname.startsWith(m.path) && !m.exact)?.label
  }

  return (
    <div className="admin-layout">

      {/* Mobile Overlay */}
      {mobileSidebar && (
        <div className="admin-overlay" onClick={() => setMobileSidebar(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${!sidebarOpen ? 'admin-sidebar-collapsed' : ''} ${mobileSidebar ? 'admin-sidebar-mobile-open' : ''}`}>

        {/* Logo */}
        <div className="admin-logo">
          <Link to="/" className="admin-logo-link">
            <img src={siteLogo} alt="Ozkan3D logo" className="admin-logo-image" />
            {sidebarOpen && (
              <div className="admin-logo-text">
                <span className="admin-logo-brand">Ozkan3D</span>
                <span className="admin-logo-sub">Admin Panel</span>
              </div>
            )}
          </Link>
          <button className="admin-collapse-btn" onClick={() => setSidebarOpen(p => !p)}>
            <FiChevronRight size={16} className={sidebarOpen ? 'rotate-180' : ''} />
          </button>
        </div>

        {/* Nav */}
        <nav className="admin-nav">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${isActive(item.path, item.exact) ? 'admin-nav-active' : ''}`}
              onClick={() => setMobileSidebar(false)}
            >
              <item.icon size={18} className="admin-nav-icon" />
              {sidebarOpen && (
                <span className="admin-nav-label">{item.label}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        {sidebarOpen && (
          <div className="admin-sidebar-bottom">
            <Link to="/admin/settings" className="admin-bottom-btn">
              <FiSettings size={16} />
              <span>Ayarlar</span>
            </Link>
            <button className="admin-bottom-btn admin-logout-btn" onClick={handleLogout}>
              <FiLogOut size={16} />
              <span>Çıkış Yap</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="admin-main">

        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-left">
            <button className="admin-mobile-menu-btn" onClick={() => setMobileSidebar(p => !p)}>
              {mobileSidebar ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
            <div className="admin-breadcrumb">
              <Link to="/admin">Panel</Link>
              {getCurrentPageLabel() && (
                <>
                  <FiChevronRight size={13} />
                  <span>{getCurrentPageLabel()}</span>
                </>
              )}
            </div>
          </div>

          <div className="admin-header-right">

            {/* Bildirim Paneli */}
            <NotificationPanel />

            {/* Mağazaya Git */}
            <Link to="/" className="admin-header-store-btn">
              <FiTrendingUp size={16} />
              <span>Mağazaya Git</span>
            </Link>

            {/* Kullanıcı Bilgisi */}
            <div className="admin-header-user">
              <div className="admin-header-avatar">{getInitials()}</div>
              <div className="admin-header-user-info">
                <strong>{user?.firstName} {user?.lastName}</strong>
                <span>Admin</span>
              </div>
            </div>

          </div>
        </header>

        {/* Content */}
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FiShoppingBag, FiHeart, FiMapPin, FiMessageSquare, FiHelpCircle, FiSettings, FiLogOut, FiCheck, FiAlertTriangle, FiShield,
} from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext'
import { useFavorite } from '../../../context/FavoriteContext'
import { getMyReviewsApi } from '../../../api/reviweApi'
import SEO from '../../../components/SEO'
import ProductCard from '../../components/ProductCard'
import Stars from '../../components/Stars'
import VoxelMark from '../../components/VoxelMark'
import { initials, productHref } from '../../catalog'
import OrdersTab from './OrdersTab'
import AddressesTab from './AddressesTab'
import SupportTab from './SupportTab'
import SettingsTab from './SettingsTab'
import { formatDate } from './accountUtils'
import '../../storefront.css'
import './AccountPage.css'

const TABS = [
  { id: 'orders', label: 'Siparişlerim', icon: FiShoppingBag },
  { id: 'favorites', label: 'Favorilerim', icon: FiHeart },
  { id: 'addresses', label: 'Adreslerim', icon: FiMapPin },
  { id: 'reviews', label: 'Yorumlarım', icon: FiMessageSquare },
  { id: 'support', label: 'Destek', icon: FiHelpCircle },
  { id: 'profile', label: 'Hesap ayarları', icon: FiSettings },
]

/* ------------------------------------------------------------- Favoriler */
const FavoritesTab = () => {
  const { favorites, loading } = useFavorite()
  if (loading && favorites.length === 0) {
    return <div className="ac-loading" role="status" aria-label="Favoriler yükleniyor"><VoxelMark size={40} loop /></div>
  }
  if (favorites.length === 0) {
    return (
      <div className="ac-empty">
        <FiHeart size={32} aria-hidden="true" />
        <h3>Favori listen boş.</h3>
        <p>Ürün kartlarındaki kalbe dokunarak beğendiklerini buraya kaydet.</p>
        <Link to="/shop" className="sf-btn sf-btn--ink">Mağazaya göz at</Link>
      </div>
    )
  }
  return <div className="ac-fav-grid">{favorites.map((p) => <ProductCard key={p._id} product={p} />)}</div>
}

/* ------------------------------------------------------------- Yorumlar */
const REVIEW_STATUS = {
  approved: { label: 'Yayında', cls: 'is-done' },
  pending: { label: 'Onay bekliyor', cls: 'is-progress' },
  rejected: { label: 'Yayınlanmadı', cls: 'is-off' },
}

const ReviewsTab = () => {
  const { data, isLoading } = useQuery({ queryKey: ['my-reviews'], queryFn: getMyReviewsApi })
  const reviews = data?.data || []

  if (isLoading) return <div className="ac-loading" role="status" aria-label="Yorumlar yükleniyor"><VoxelMark size={40} loop /></div>
  if (reviews.length === 0) {
    return (
      <div className="ac-empty">
        <FiMessageSquare size={32} aria-hidden="true" />
        <h3>Henüz yorum yazmadın.</h3>
        <p>Teslim aldığın ürünleri, ürün sayfasındaki "Yorum yaz" bölümünden değerlendirebilirsin.</p>
        <Link to="/account?tab=orders" className="sf-btn sf-btn--ink">Siparişlerime git</Link>
      </div>
    )
  }

  return (
    <ul className="ac-reviews">
      {reviews.map((r) => {
        const st = REVIEW_STATUS[r.status] || REVIEW_STATUS.pending
        const p = r.product && typeof r.product === 'object' ? r.product : null
        return (
          <li key={r._id}>
            {p?.images?.[0] && (
              <Link to={productHref(p)} className="ac-review-img" tabIndex={-1} aria-hidden="true">
                <img src={p.images[0]} alt="" loading="lazy" />
              </Link>
            )}
            <div>
              <div className="ac-review-top">
                {p ? <Link to={productHref(p)} className="ac-review-name">{p.name}</Link> : <strong>Ürün</strong>}
                <span className={`ac-status ${st.cls}`}>{st.label}</span>
              </div>
              <Stars value={r.rating} count={0} compact />
              <p>{r.comment}</p>
              <time className="sf-mono">{formatDate(r.createdAt)}</time>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ------------------------------------------------------------------ Sayfa */
const AccountPage = () => {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'orders'
  const current = TABS.find((t) => t.id === tab)

  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const notify = useCallback((message, tone = 'success') => {
    clearTimeout(timer.current)
    setToast({ message, tone })
    timer.current = setTimeout(() => setToast(null), 3500)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const onLogout = async () => {
    await logout()
    navigate('/')
  }

  const selectTab = (id) => setParams({ tab: id }, { replace: false })

  return (
    <div className="sf-root sf-page">
      <SEO title="Hesabım" description="Siparişlerin, adreslerin, favorilerin ve hesap ayarların." noIndex />
      <div className="sf-container sf-container--narrow">
        <header className="ac-head">
          <span className="ac-avatar" aria-hidden="true">{initials(user)}</span>
          <div className="ac-head-text">
            <h1>Merhaba, {user?.firstName}</h1>
            <p>{user?.email}</p>
          </div>
          <button type="button" className="sf-link-btn ac-logout" onClick={onLogout}>
            <FiLogOut aria-hidden="true" /> Çıkış yap
          </button>
        </header>

        {isAdmin && (
          <div className="ac-admin-note">
            <FiShield aria-hidden="true" />
            <span>Yönetici hesabıyla girdin. Siparişleri ve ürünleri yönetim panelinden takip edebilirsin.</span>
            <Link to="/admin" className="sf-btn sf-btn--ink">Yönetim paneli</Link>
          </div>
        )}

        <div className="ac-layout">
          <nav className="ac-nav" aria-label="Hesap bölümleri">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`ac-nav-item ${t.id === tab ? 'is-active' : ''}`}
                aria-current={t.id === tab ? 'page' : undefined}
                onClick={() => selectTab(t.id)}
              >
                <t.icon aria-hidden="true" />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          <section className="ac-content" aria-labelledby="ac-title">
            <h2 id="ac-title" className="ac-title">{current.label}</h2>

            {toast && (
              <p className={`ac-toast is-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
                {toast.tone === 'error' ? <FiAlertTriangle aria-hidden="true" /> : <FiCheck aria-hidden="true" />}
                {toast.message}
              </p>
            )}

            {tab === 'orders' && <OrdersTab />}
            {tab === 'favorites' && <FavoritesTab />}
            {tab === 'addresses' && <AddressesTab notify={notify} />}
            {tab === 'reviews' && <ReviewsTab />}
            {tab === 'support' && <SupportTab notify={notify} />}
            {tab === 'profile' && <SettingsTab notify={notify} />}
          </section>
        </div>
      </div>
    </div>
  )
}

export default AccountPage

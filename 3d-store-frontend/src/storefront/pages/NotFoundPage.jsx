import { Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiSearch } from 'react-icons/fi'
import SEO from '../../components/SEO'
import useCategories from '../useCategories'
import { categoryHref } from '../catalog'
import '../storefront.css'
import './NotFoundPage.css'

const NotFoundPage = () => {
  const navigate = useNavigate()
  const { categories } = useCategories()

  const onSearch = (e) => {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q')?.toString().trim()
    navigate(q ? `/shop?search=${encodeURIComponent(q)}` : '/shop')
  }

  return (
    <div className="sf-root sf-page sf-404">
      <SEO title="Sayfa bulunamadı" description="Aradığın sayfa bulunamadı." noIndex />
      <div className="sf-container sf-404-wrap">
        {/* Yarım kalmış bir baskı: katmanlar 404'ü yazarken durmuş */}
        <div className="sf-404-print" aria-hidden="true">
          <span>4</span><span>0</span><span className="is-half">4</span>
          <i className="sf-404-nozzle" />
        </div>

        <h1>Bu sayfanın baskısı yarıda kalmış</h1>
        <p>Aradığın sayfa taşınmış ya da hiç basılmamış olabilir. Aşağıdan aramayı deneyebilir ya da mağazaya dönebilirsin.</p>

        <form className="sf-404-search" role="search" onSubmit={onSearch}>
          <FiSearch aria-hidden="true" />
          <input name="q" placeholder="Ne arıyordun? Figür, stand, saksı…" aria-label="Mağazada ara" />
          <button type="submit" className="sf-btn sf-btn--accent">Ara</button>
        </form>

        {categories.length > 0 && (
          <nav className="sf-404-cats" aria-label="Kategoriler">
            {categories.map((c) => (
              <Link key={c._id} to={categoryHref(c)} className="sf-cut-tag sf-cut-tag--cream">{c.name}</Link>
            ))}
          </nav>
        )}

        <div className="sf-404-actions">
          <button type="button" className="sf-btn sf-btn--ghost" onClick={() => navigate(-1)}><FiArrowLeft aria-hidden="true" /> Geri dön</button>
          <Link to="/" className="sf-btn sf-btn--ink">Ana sayfa</Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage

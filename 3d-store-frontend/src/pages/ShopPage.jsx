import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { FiStar, FiFilter, FiX, FiChevronDown, FiGrid, FiList, FiLoader } from 'react-icons/fi'
import { getProductsApi } from '../api/productApi'
import { optimizeImage } from '../utils/imageUtils'
import './ShopPage.css'

const categoryData = [
  {
    title: 'Figürler',
    items: ['Katana', 'Ejderha Koleksiyonu', 'Anime Figürler', 'Fantastik Yaratıklar']
  },
  {
    title: 'Hediyelik / Dekor',
    items: ['Kulaklık Tutucular', 'Masa Dekorasyonu', 'Ev Dekorasyon', 'Anahtarlıklar']
  },
  {
    title: 'Konsol & Oyun',
    items: ['PS5 Aksesuarlar', 'Xbox Aksesuarlar', 'Joystick Tutucular', 'Kablo Düzenleyici']
  }
]

const sortOptions = [
  { value: 'default', label: 'Önerilen' },
  { value: 'price-asc', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price-desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'rating', label: 'En Çok Değerlendirilen' },
  { value: 'popular', label: 'En Popüler' },
  { value: 'name-asc', label: 'Ürün Adı: A - Z' },
  { value: 'name-desc', label: 'Ürün Adı: Z - A' },
]

/* ── Product Card ── */
const ProductCard = ({ product, view }) => (
  <Link
    to={`/product/${product.slug || product._id}`}
    className={`shop-card ${view === 'list' ? 'shop-card-list' : ''}`}
  >
    <div className="shop-card-image">
      {product.images?.[0] ? (
        <img src={optimizeImage(product.images[0])} alt={product.name} className="shop-product-image" />
      ) : (
        <div className="shop-card-placeholder">3D</div>
      )}
      {product.badge && (
        <span className={`product-badge badge-${
          product.badge === 'İndirim' ? 'sale' : product.badge === 'Yeni' ? 'new' : 'hot'
        }`}>
          {product.badge}
        </span>
      )}
    </div>

    <div className="shop-card-body">
      <p className="shop-card-cat">{product.category}</p>
      <h3 className="shop-card-name">{product.name}</h3>

      {product.material?.length > 0 && (
        <div className="shop-card-materials">
          {product.material.slice(0, 3).map((m, i) => (
            <span key={i} className="material-tag">{m}</span>
          ))}
        </div>
      )}

      <div className="shop-card-rating">
        <FiStar size={12} fill="currentColor" />
        <span>{product.rating?.toFixed(1) || '0.0'}</span>
        <span className="rating-count">({product.reviewCount || 0})</span>
      </div>

      <div className="shop-card-footer">
        <div className="shop-card-price">
          {product.oldPrice && <span className="price-old">{product.oldPrice}₺</span>}
          <span className="price-current">{product.price}₺</span>
        </div>
        {product.colors?.length > 0 && (
          <div className="product-colors">
            {product.colors.slice(0, 3).map((c, i) => (
              <span key={i} className="color-dot" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>
    </div>
  </Link>
)

/* ── Filter Section ── */
const FilterSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="filter-section">
      <button className="filter-section-header" onClick={() => setOpen(p => !p)}>
        <span>{title}</span>
        <FiChevronDown size={16} className={`filter-chevron ${open ? 'filter-chevron-open' : ''}`} />
      </button>
      {open && <div className="filter-section-body">{children}</div>}
    </div>
  )
}

/* ── Shop Page ── */
const ShopPage = () => {
  const [searchParams] = useSearchParams()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedCats, setSelectedCats] = useState([]) // Bu artık ana kategorileri tutacak (örn: Figürler)
  const [selectedSubs, setSelectedSubs] = useState(() => searchParams.get('sub') ? [searchParams.get('sub')] : []) // Bu alt kategorileri (örn: Katana)
  const [selectedBadges, setSelectedBadges] = useState([]) // Rozet (İndirim, Yeni, Çok Satan vb.)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('default')
  const [view, setView] = useState('grid')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const location = useLocation()
  const keyword = searchParams.get('search') || ''
  const subParam = searchParams.get('sub')

  // URL'den gelen sub parametresini işle
  useEffect(() => {
    if (subParam) {
      if (selectedSubs.length !== 1 || selectedSubs[0] !== subParam) {
        setSelectedSubs([subParam])
        setSelectedCats([]) // Auto-clear category when subcategory from URL is handled
        setSelectedBadges([]) 
      }
    }
  }, [subParam, selectedSubs])

  // "3D Baskı Ürünleri" tıklanıldığını yakala ve sıfırla
  useEffect(() => {
    if (location.state?.reset) {
      clearFilters()
    }
  }, [location.state])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        page: currentPage,
        limit: 12,
      }
      if (keyword) params.keyword = keyword
      
      // Kategori mantığı: Hem ana kategori hem alt kategori seçilebilir
      // Backend'in beklediği sorgu parametreleri ile eşleşecek şekilde gönderiyoruz
      if (selectedCats.length) params.category = selectedCats.join(',')
      if (selectedSubs.length) params.subcategory = selectedSubs.join(',')
      if (selectedBadges.length) params.badge = selectedBadges.join(',')

      if (minPrice) params.minPrice = minPrice
      if (maxPrice) params.maxPrice = maxPrice
      if (sort !== 'default') params.sort = sort

      const res = await getProductsApi(params)
      setProducts(res.data)
      setTotal(res.total)
      setPages(res.pages)
    } catch (err) {
      setError('Ürünler yüklenemedi.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, keyword, selectedCats, selectedSubs, selectedBadges, minPrice, maxPrice, sort])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const toggleItem = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSelectedCats([])
    setSelectedSubs([])
    setSelectedBadges([])
    setMinPrice('')
    setMaxPrice('')
    setSort('default')
    setCurrentPage(1)
  }

  const activeFilterCount =
    selectedCats.length +
    selectedSubs.length +
    selectedBadges.length +
    (minPrice || maxPrice ? 1 : 0)

  const hasCategorySelected = selectedCats.length > 0 || selectedSubs.length > 0;

  /* ── Sidebar ── */
  const Sidebar = () => (
    <aside className={`shop-sidebar ${sidebarOpen ? 'shop-sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <h3 className="sidebar-title">Filtreler</h3>
        {activeFilterCount > 0 && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            Temizle ({activeFilterCount})
          </button>
        )}
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
          <FiX size={18} />
        </button>
      </div>

      {!hasCategorySelected && categoryData.map((group, idx) => (
        <FilterSection key={idx} title={group.title} defaultOpen={true}>
          {/* Ana Kategori Checkbox */}
           <label className="filter-checkbox group-header-checkbox">
            <input
              type="checkbox"
              checked={selectedCats.includes(group.title)}
              onChange={() => toggleItem(selectedCats, setSelectedCats, group.title)}
            />
            <span className="checkbox-custom" />
            <span className="checkbox-label"><strong>Tümü ({group.title})</strong></span>
          </label>

          {/* Alt Kategoriler */}
          <div className="filter-sub-group">
            {group.items.map(item => (
              <label key={item} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSubs.includes(item)}
                  onChange={() => toggleItem(selectedSubs, setSelectedSubs, item)}
                />
                <span className="checkbox-custom" />
                <span className="checkbox-label">{item}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      ))}

      {hasCategorySelected && (
        <FilterSection title="Ürün Özellikleri" defaultOpen={true}>
          {['İndirim', 'Yeni', 'Çok Satan'].map(badge => (
            <label key={badge} className="filter-checkbox">
              <input
                type="checkbox"
                checked={selectedBadges.includes(badge)}
                onChange={() => toggleItem(selectedBadges, setSelectedBadges, badge)}
              />
              <span className="checkbox-custom" />
              <span className="checkbox-label">
                {badge === 'İndirim' ? 'İndirimli Ürünler' : badge === 'Yeni' ? 'Yeni Ürünler' : 'Fırsat Ürünleri'}
              </span>
            </label>
          ))}
        </FilterSection>
      )}

      <FilterSection title="Fiyat Aralığı">
        <div className="price-filter-inputs">
          <div className="price-input-wrap">
            <span>₺</span>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={e => { setMinPrice(e.target.value); setCurrentPage(1) }}
              className="price-input"
            />
          </div>
          <span className="price-sep">—</span>
          <div className="price-input-wrap">
            <span>₺</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={e => { setMaxPrice(e.target.value); setCurrentPage(1) }}
              className="price-input"
            />
          </div>
        </div>
      </FilterSection>
    </aside>
  )

  return (
    <div className="shop-page">
      <div className="shop-layout">

        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <Sidebar />

        <main className="shop-main">

          {/* Toolbar */}
          <div className="shop-toolbar">
            <div className="shop-toolbar-left">
              <button className="filter-toggle-btn" onClick={() => setSidebarOpen(p => !p)}>
                <FiFilter size={16} />
                Filtrele
                {activeFilterCount > 0 && (
                  <span className="filter-badge">{activeFilterCount}</span>
                )}
              </button>
              <p className="shop-result-count">
                {loading ? 'Yükleniyor...' : <><strong>{total}</strong> ürün bulundu</>}
              </p>
            </div>
            <div className="shop-toolbar-right">
              <select className="sort-select" value={sort} onChange={e => { setSort(e.target.value); setCurrentPage(1) }}>
                {sortOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="view-toggle">
                <button className={`view-btn ${view === 'grid' ? 'view-btn-active' : ''}`} onClick={() => setView('grid')}>
                  <FiGrid size={16} />
                </button>
                <button className={`view-btn ${view === 'list' ? 'view-btn-active' : ''}`} onClick={() => setView('list')}>
                  <FiList size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Aktif Filtre Tags */}
          {activeFilterCount > 0 && (
            <div className="active-filters">
              {selectedCats.map(c => (
                <span key={c} className="active-filter-tag">
                  {c}
                  <button onClick={() => toggleItem(selectedCats, setSelectedCats, c)}><FiX size={11} /></button>
                </span>
              ))}
              {selectedSubs.map(s => (
                <span key={s} className="active-filter-tag">
                  {s}
                  <button onClick={() => toggleItem(selectedSubs, setSelectedSubs, s)}><FiX size={11} /></button>
                </span>
              ))}
              {selectedBadges.map(b => (
                <span key={b} className="active-filter-tag">
                  {b}
                  <button onClick={() => toggleItem(selectedBadges, setSelectedBadges, b)}><FiX size={11} /></button>
                </span>
              ))}
              {(minPrice || maxPrice) && (
                <span className="active-filter-tag">
                  {minPrice || '0'}₺ — {maxPrice || '∞'}₺
                  <button onClick={() => { setMinPrice(''); setMaxPrice('') }}><FiX size={11} /></button>
                </span>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="shop-loading">
              <div className="shop-loading-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="shop-skeleton" />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="shop-empty">
              <span className="shop-empty-icon">⚠️</span>
              <h3>Bir hata oluştu</h3>
              <p>{error}</p>
              <button className="btn-primary" onClick={fetchProducts}>Tekrar Dene</button>
            </div>
          )}

          {/* Ürünler */}
          {!loading && !error && products.length > 0 && (
            <>
              <div className={`shop-grid ${view === 'list' ? 'shop-grid-list' : ''}`}>
                {products.map(p => (
                  <ProductCard key={p._id} product={p} view={view} />
                ))}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="shop-pagination">
                  <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    ‹ Önceki
                  </button>
                  {Array.from({ length: pages }).map((_, i) => (
                    <button
                      key={i}
                      className={`pagination-btn ${currentPage === i + 1 ? 'pagination-active' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    disabled={currentPage === pages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    Sonraki ›
                  </button>
                </div>
              )}
            </>
          )}

          {/* Boş */}
          {!loading && !error && products.length === 0 && (
            <div className="shop-empty">
              <span className="shop-empty-icon">🔍</span>
              <h3>Ürün bulunamadı</h3>
              <p>Filtrelerinizi değiştirmeyi deneyin</p>
              <button className="btn-primary" onClick={clearFilters}>Filtreleri Temizle</button>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default ShopPage
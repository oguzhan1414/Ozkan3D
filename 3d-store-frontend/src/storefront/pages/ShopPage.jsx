import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { FiSliders, FiX, FiChevronDown } from 'react-icons/fi'
import { getProductsApi } from '../../api/productApi'
import SEO from '../../components/SEO'
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard'
import VoxelMark from '../components/VoxelMark'
import useCategories from '../useCategories'
import { matchCategory } from '../catalog'
import '../storefront.css'
import './ShopPage.css'

const PAGE_SIZE = 24
const BADGES = ['Yeni', 'İndirim', 'Çok Satan']
const SORTS = [
  { value: '', label: 'Önerilen' },
  { value: 'price-asc', label: 'Fiyat: artan' },
  { value: 'price-desc', label: 'Fiyat: azalan' },
  { value: 'rating', label: 'En yüksek puan' },
  { value: 'popular', label: 'En çok değerlendirilen' },
  { value: 'name-asc', label: 'İsim: A–Z' },
]

const csv = (v) => (v ? v.split(',').filter(Boolean) : [])

/** Filtrelerin tek kaynağı URL: paylaşılabilir, geri tuşuyla çalışır */
const useShopFilters = (categories) => {
  const [params, setParams] = useSearchParams()

  // URL'de kısa ad (slug) durur: ?cat=hediyelik-dekor&sub=masa-dekorasyonu
  // Eski bağlantılar (?cat=Hediyelik / Dekor) da eşleşir
  const rawCat = params.get('cat') || ''
  const rawSub = params.get('sub') || ''
  const allSubs = categories.flatMap((c) => c.children.map((ch) => ({ ...ch, parentName: c.name })))
  const catMatch = matchCategory(rawCat, categories)
  const subMatch = matchCategory(rawSub, allSubs)

  const filters = {
    search: params.get('search') || '',
    cat: catMatch?.name || '',
    sub: subMatch?.name || '',
    // Kategoriler yüklenmeden URL'deki kategori çözülemez; o ana kadar ürün sorgusu bekler
    pending: Boolean((rawCat || rawSub) && categories.length === 0),
    badges: csv(params.get('badge')),
    min: params.get('min') || '',
    max: params.get('max') || '',
    sort: params.get('sort') || '',
  }

  // Alt kategori seçiliyse ana kategoriyi ondan çıkar
  if (subMatch && !filters.cat) filters.cat = subMatch.parentName

  const update = (patch) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      const value = Array.isArray(v) ? v.join(',') : v
      if (value) next.set(k, value)
      else next.delete(k)
    }
    setParams(next)
  }

  return [filters, update]
}

/* --------------------------------------------------------- Filtre penceresi */
const FilterSheet = ({ filters, onApply, onClose }) => {
  const [min, setMin] = useState(filters.min)
  const [max, setMax] = useState(filters.max)
  const [badges, setBadges] = useState(filters.badges)
  const dialogRef = useRef(null)

  useEffect(() => {
    const prev = document.activeElement
    dialogRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [onClose])

  const toggleBadge = (b) => setBadges((list) => (list.includes(b) ? list.filter((x) => x !== b) : [...list, b]))

  const apply = (e) => {
    e.preventDefault()
    const lo = min && Number(min) >= 0 ? String(Number(min)) : ''
    const hi = max && Number(max) > 0 ? String(Number(max)) : ''
    onApply({ min: lo, max: hi, badge: badges })
  }

  return (
    <div className="sf-sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form
        className="sf-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sf-sheet-title"
        ref={dialogRef}
        tabIndex={-1}
        onSubmit={apply}
      >
        <header className="sf-sheet-head">
          <button type="button" className="sf-icon-btn" onClick={onClose} aria-label="Kapat"><FiX /></button>
          <h2 id="sf-sheet-title">Filtreler</h2>
          <span aria-hidden="true" style={{ width: 40 }} />
        </header>

        <div className="sf-sheet-body">
          <fieldset className="sf-sheet-group">
            <legend>Fiyat aralığı</legend>
            <div className="sf-price">
              <label>
                <span>En az</span>
                <input type="number" inputMode="numeric" min="0" value={min} onChange={(e) => setMin(e.target.value)} placeholder="0" />
                <em>₺</em>
              </label>
              <span className="sf-price-dash" aria-hidden="true" />
              <label>
                <span>En çok</span>
                <input type="number" inputMode="numeric" min="0" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Sınırsız" />
                <em>₺</em>
              </label>
            </div>
          </fieldset>

          <fieldset className="sf-sheet-group">
            <legend>Öne çıkanlar</legend>
            <div className="sf-chips">
              {BADGES.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`sf-chip ${badges.includes(b) ? 'is-active' : ''}`}
                  aria-pressed={badges.includes(b)}
                  onClick={() => toggleBadge(b)}
                >
                  {b}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="sf-sheet-foot">
          <button type="button" className="sf-link-btn" onClick={() => { setMin(''); setMax(''); setBadges([]) }}>
            Temizle
          </button>
          <button type="submit" className="sf-btn sf-btn--ink">Sonuçları göster</button>
        </footer>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ Sayfa */
const ShopPage = () => {
  const { categories } = useCategories()
  const [filters, update] = useShopFilters(categories)
  const [sheetOpen, setSheetOpen] = useState(false)

  const queryParams = useMemo(() => {
    const p = { limit: PAGE_SIZE }
    if (filters.search) p.keyword = filters.search
    if (filters.sub) p.subcategory = filters.sub
    else if (filters.cat) p.category = filters.cat
    if (filters.badges.length) p.badge = filters.badges.join(',')
    if (filters.min) p.minPrice = filters.min
    if (filters.max) p.maxPrice = filters.max
    if (filters.sort) p.sort = filters.sort
    return p
  }, [filters.search, filters.sub, filters.cat, filters.badges, filters.min, filters.max, filters.sort])

  const query = useInfiniteQuery({
    queryKey: ['shop', queryParams],
    queryFn: ({ pageParam }) => getProductsApi({ ...queryParams, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.currentPage < last.pages ? last.currentPage + 1 : undefined),
    staleTime: 60 * 1000,
    enabled: !filters.pending,
  })

  const products = query.data?.pages.flatMap((pg) => pg.data) || []
  const total = query.data?.pages[0]?.total ?? 0
  const activeCat = categories.find((c) => c.name === filters.cat)
  const extraFilterCount = filters.badges.length + (filters.min || filters.max ? 1 : 0)
  const anyFilter = Boolean(filters.search || filters.cat || filters.sub || extraFilterCount)

  const title = filters.search
    ? `“${filters.search}” için sonuçlar`
    : filters.sub || filters.cat || 'Tüm ürünler'

  const clearAll = () => update({ search: '', cat: '', sub: '', badge: [], min: '', max: '' })

  return (
    <div className="sf-root sf-page">
      <SEO
        title={filters.search ? `${filters.search} - 3D baskı ürünleri` : `${filters.sub || filters.cat || 'Mağaza'} - 3D baskı ürünleri`}
        description="Figür, dekor, konsol aksesuarı ve ev aparatı: PLA ve PETG ile basılan 3D baskı ürünlerini kategoriye, fiyata ve puana göre filtrele."
        noIndex={Boolean(filters.search || extraFilterCount || filters.sort)}
      />

      <div className="sf-container">
        <header className="sf-shop-head">
          <h1>{title}</h1>
          <p className="sf-shop-count" aria-live="polite">
            {query.isLoading || filters.pending ? 'Ürünler yükleniyor…' : `${total} ürün`}
          </p>
        </header>

        {/* Kategori ve alt kategori hapları + filtre/sıralama */}
        <div className="sf-filterbar">
          <nav className="sf-filter-pills" aria-label="Kategori">
            <button
              type="button"
              className={`sf-fpill ${!filters.cat ? 'is-active' : ''}`}
              aria-pressed={!filters.cat}
              onClick={() => update({ cat: '', sub: '' })}
            >
              Tümü
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                className={`sf-fpill ${filters.cat === c.name ? 'is-active' : ''}`}
                aria-pressed={filters.cat === c.name}
                onClick={() => update({ cat: c.slug, sub: '' })}
              >
                {c.name}
              </button>
            ))}
          </nav>

          <div className="sf-filter-actions">
            <label className="sf-sort">
              <span className="sf-visually-hidden">Sıralama</span>
              <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <FiChevronDown aria-hidden="true" />
            </label>
            <button type="button" className="sf-filter-btn" onClick={() => setSheetOpen(true)}>
              <FiSliders aria-hidden="true" />
              Filtreler
              {extraFilterCount > 0 && <span className="sf-filter-count">{extraFilterCount}</span>}
            </button>
          </div>
        </div>

        {activeCat && (
          <nav className="sf-subpills" aria-label={`${activeCat.name} alt kategorileri`}>
            {activeCat.children.map((s) => (
              <button
                key={s._id}
                type="button"
                className={`sf-subpill ${filters.sub === s.name ? 'is-active' : ''}`}
                aria-pressed={filters.sub === s.name}
                onClick={() => update({ cat: activeCat.slug, sub: filters.sub === s.name ? '' : s.slug })}
              >
                {s.name}
              </button>
            ))}
          </nav>
        )}

        {/* Aktif filtreler */}
        {(filters.search || extraFilterCount > 0) && (
          <div className="sf-active-filters" aria-label="Uygulanan filtreler">
            {filters.search && (
              <button type="button" className="sf-tag" onClick={() => update({ search: '' })}>
                Arama: {filters.search} <FiX aria-hidden="true" />
              </button>
            )}
            {(filters.min || filters.max) && (
              <button type="button" className="sf-tag" onClick={() => update({ min: '', max: '' })}>
                {filters.min || 0} ₺ – {filters.max ? `${filters.max} ₺` : 'üstü'} <FiX aria-hidden="true" />
              </button>
            )}
            {filters.badges.map((b) => (
              <button key={b} type="button" className="sf-tag" onClick={() => update({ badge: filters.badges.filter((x) => x !== b) })}>
                {b} <FiX aria-hidden="true" />
              </button>
            ))}
            <button type="button" className="sf-link-btn" onClick={clearAll}>Tümünü temizle</button>
          </div>
        )}

        {query.isError ? (
          <div className="sf-empty" role="alert">
            <h2>Ürünler yüklenemedi.</h2>
            <p>Bağlantını kontrol edip tekrar dene.</p>
            <button type="button" className="sf-btn sf-btn--ink" onClick={() => query.refetch()}>Tekrar dene</button>
          </div>
        ) : query.isLoading || filters.pending ? (
          <div className="sf-grid" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="sf-empty">
            <VoxelMark size={40} />
            <h2>Bu filtrelerle ürün bulamadık.</h2>
            <p>
              {filters.search
                ? 'Farklı bir kelime dene ya da filtreleri kaldır. Aradığını bulamazsan biz basabiliriz.'
                : 'Filtreleri gevşetmeyi dene.'}
            </p>
            <div className="sf-empty-actions">
              {anyFilter && <button type="button" className="sf-btn sf-btn--ink" onClick={clearAll}>Filtreleri kaldır</button>}
              <Link to="/custom" className="sf-btn sf-btn--ghost">Özel baskı iste</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="sf-grid">
              {products.map((p, i) => <ProductCard key={p._id} product={p} priority={i < 6} />)}
            </div>

            <div className="sf-more">
              <p className="sf-mono">{products.length} / {total}</p>
              {query.hasNextPage && (
                <button
                  type="button"
                  className="sf-btn sf-btn--ghost"
                  onClick={() => query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                >
                  {query.isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla göster'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {sheetOpen && (
        <FilterSheet
          filters={filters}
          onClose={() => setSheetOpen(false)}
          onApply={(patch) => { update(patch); setSheetOpen(false) }}
        />
      )}
    </div>
  )
}

export default ShopPage

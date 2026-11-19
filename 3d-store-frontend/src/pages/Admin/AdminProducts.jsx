import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  FiPlus, FiSearch, FiUploadCloud, FiEdit2, FiCopy, FiTrash2, FiPackage,
  FiChevronLeft, FiChevronRight, FiRefreshCw,
} from 'react-icons/fi'
import {
  getProductsAdminApi, updateProductApi, deleteProductApi, duplicateProductApi,
} from '../../api/productApi'
import { getAllCategoriesAdminApi } from '../../api/categoryApi'
import { buildCategoryTree } from '../../storefront/useCategories'
import { formatPrice } from '../../storefront/catalog'
import './AdminProducts.css'

const STATUS_TABS = [
  { id: '', label: 'Tümü' },
  { id: 'active', label: 'Yayında' },
  { id: 'draft', label: 'Taslak' },
]
const STOCK_FILTERS = [
  { id: '', label: 'Tüm stoklar' },
  { id: 'made', label: 'Siparişe özel' },
  { id: 'low', label: 'Az kalan' },
  { id: 'out', label: 'Tükenen' },
]
const SORTS = [
  { id: 'newest', label: 'En yeni' },
  { id: 'updated', label: 'Son düzenlenen' },
  { id: 'name', label: 'Ada göre' },
  { id: 'priceAsc', label: 'Fiyat (artan)' },
  { id: 'priceDesc', label: 'Fiyat (azalan)' },
  { id: 'stock', label: 'Stok (az önce)' },
]

/** Seçeneklere göre fiyat aralığı: "299 ₺ – 549 ₺" */
const priceLabel = (p) => {
  let min = Number(p.price) || 0
  let max = min
  for (const g of p.optionGroups || []) {
    const d = (g.values || []).map((v) => Number(v.priceDelta) || 0)
    if (!d.length) continue
    min += Math.min(...d)
    max += Math.max(...d)
  }
  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`
}

const AdminProducts = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()

  const filters = {
    keyword: params.get('q') || '',
    status: params.get('status') || '',
    stock: params.get('stock') || '',
    categoryId: params.get('cat') || '',
    sort: params.get('sort') || 'newest',
    page: Number(params.get('page')) || 1,
  }
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  // Arama kutusu: yazarken URL'yi her tuşta değiştirmemek için gecikmeli
  const [search, setSearch] = useState(filters.keyword)
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (params.get('q') || '')) setFilter('q', search.trim())
    }, 350)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const listQuery = useQuery({
    queryKey: ['admin', 'products', filters],
    queryFn: () => getProductsAdminApi({
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
      stock: filters.stock || undefined,
      categoryId: filters.categoryId || undefined,
      sort: filters.sort,
      page: filters.page,
      limit: 20,
    }),
    placeholderData: keepPreviousData,
  })
  const categoriesQuery = useQuery({ queryKey: ['admin', 'categories'], queryFn: getAllCategoriesAdminApi })
  const categories = useMemo(() => buildCategoryTree(categoriesQuery.data?.data || []), [categoriesQuery.data])

  const products = listQuery.data?.data || []
  const total = listQuery.data?.total || 0
  const pages = listQuery.data?.pages || 1

  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState(null)
  const [priceModal, setPriceModal] = useState(false)
  const [pricePct, setPricePct] = useState('')

  const visibleIds = products.map((p) => p._id)
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id))
  const toggleAll = () => setSelected(allSelected ? selected.filter((id) => !visibleIds.includes(id)) : [...new Set([...selected, ...visibleIds])])
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })

  const run = async (label, fn, done) => {
    setBusy(label)
    setMessage(null)
    try {
      await fn()
      setMessage({ type: 'ok', text: done })
      setSelected([])
      refresh()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'İşlem tamamlanamadı.' })
      refresh()
    } finally {
      setBusy('')
    }
  }

  const setActive = (ids, isActive) => run(
    'status',
    () => Promise.all(ids.map((id) => updateProductApi(id, { isActive }))),
    `${ids.length} ürün ${isActive ? 'yayına alındı' : 'taslağa alındı'}.`,
  )

  const removeMany = (ids) => {
    if (!window.confirm(`${ids.length} ürün kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return
    run('delete', () => Promise.all(ids.map((id) => deleteProductApi(id))), `${ids.length} ürün silindi.`)
  }

  const applyPrice = () => {
    const pct = Number(pricePct)
    if (!Number.isFinite(pct) || pct === 0 || pct <= -100) return
    const targets = products.filter((p) => selected.includes(p._id))
    const missing = selected.length - targets.length
    setPriceModal(false)
    run(
      'price',
      () => Promise.all(targets.map((p) => updateProductApi(p._id, {
        price: Math.max(0, Math.round(Number(p.price) * (1 + pct / 100))),
      }))),
      `${targets.length} ürünün fiyatı %${pct > 0 ? '+' : ''}${pct} güncellendi${missing ? ` (başka sayfadaki ${missing} ürün atlandı)` : ''}.`,
    )
    setPricePct('')
  }

  const duplicate = (id) => run('dup', async () => {
    const res = await duplicateProductApi(id)
    navigate(`/admin/products/${res.data._id}`)
  }, 'Kopya oluşturuldu.')

  const hasFilters = filters.keyword || filters.status || filters.stock || filters.categoryId

  return (
    <div className="ap">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Ürünler</h1>
          <p className="admin-page-sub">{total.toLocaleString('tr-TR')} ürün{hasFilters ? ' (filtreli)' : ''}</p>
        </div>
        <div className="ap-head-actions">
          <Link to="/admin/products/import" className="ap-btn"><FiUploadCloud size={15} /> Toplu yükle</Link>
          <Link to="/admin/products/new" className="ap-btn ap-btn--primary"><FiPlus size={15} /> Yeni ürün</Link>
        </div>
      </div>

      <div className="ap-toolbar">
        <div className="ap-tabs" role="tablist" aria-label="Durum">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id || 'all'}
              type="button"
              role="tab"
              aria-selected={filters.status === t.id}
              className={filters.status === t.id ? 'is-active' : ''}
              onClick={() => setFilter('status', t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="ap-search">
          <FiSearch size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün adı veya SKU ara" aria-label="Ürün ara" />
        </label>
        <select className="ap-select" value={filters.categoryId} onChange={(e) => setFilter('cat', e.target.value)} aria-label="Kategori">
          <option value="">Tüm kategoriler</option>
          {categories.map((c) => (
            <optgroup key={c._id} label={c.name}>
              <option value={c._id}>{c.name} (tümü)</option>
              {c.children.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </optgroup>
          ))}
        </select>
        <select className="ap-select" value={filters.stock} onChange={(e) => setFilter('stock', e.target.value)} aria-label="Stok">
          {STOCK_FILTERS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className="ap-select" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value === 'newest' ? '' : e.target.value)} aria-label="Sırala">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {selected.length > 0 && (
        <div className="ap-bulk" role="region" aria-label="Toplu işlemler">
          <strong>{selected.length} seçili</strong>
          <button type="button" onClick={() => setActive(selected, true)} disabled={Boolean(busy)}>Yayınla</button>
          <button type="button" onClick={() => setActive(selected, false)} disabled={Boolean(busy)}>Taslağa al</button>
          <button type="button" onClick={() => setPriceModal(true)} disabled={Boolean(busy)}>Fiyat değiştir</button>
          <button type="button" className="is-danger" onClick={() => removeMany(selected)} disabled={Boolean(busy)}>Sil</button>
          <button type="button" className="ap-bulk-clear" onClick={() => setSelected([])}>Seçimi kaldır</button>
        </div>
      )}

      {message && <div className={`ap-msg ${message.type === 'ok' ? 'is-ok' : 'is-error'}`} role="status">{message.text}</div>}

      <div className="admin-card ap-card">
        {listQuery.isPending ? (
          <div className="ap-empty"><FiRefreshCw className="spin" /> Yükleniyor…</div>
        ) : listQuery.isError ? (
          <div className="ap-empty">Ürünler alınamadı. <button type="button" className="ap-link" onClick={() => listQuery.refetch()}>Tekrar dene</button></div>
        ) : products.length === 0 ? (
          <div className="ap-empty">
            <FiPackage size={28} />
            {hasFilters ? (
              <>
                <p>Bu filtrelere uyan ürün yok.</p>
                <button type="button" className="ap-link" onClick={() => { setSearch(''); setParams({}, { replace: true }) }}>Filtreleri temizle</button>
              </>
            ) : (
              <>
                <p>Henüz ürün yok.</p>
                <div className="ap-head-actions">
                  <Link to="/admin/products/new" className="ap-btn ap-btn--primary"><FiPlus size={15} /> İlk ürünü ekle</Link>
                  <Link to="/admin/products/import" className="ap-btn"><FiUploadCloud size={15} /> Excel ile toplu yükle</Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table ap-table">
              <thead>
                <tr>
                  <th className="ap-check"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Sayfadakilerin tümünü seç" /></th>
                  <th>Ürün</th>
                  <th>Kategori</th>
                  <th className="ap-num">Fiyat</th>
                  <th>Stok</th>
                  <th>Durum</th>
                  <th className="ap-actions-col"><span className="sr-only">İşlemler</span></th>
                </tr>
              </thead>
              <tbody className={listQuery.isFetching ? 'is-fetching' : ''}>
                {products.map((p) => (
                  <tr key={p._id} className={selected.includes(p._id) ? 'is-selected' : ''}>
                    <td className="ap-check">
                      <input type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleOne(p._id)} aria-label={`${p.name} seç`} />
                    </td>
                    <td>
                      <Link to={`/admin/products/${p._id}`} className="ap-product">
                        {p.images?.[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : <span className="ap-thumb"><FiPackage /></span>}
                        <span>
                          <strong>{p.name}</strong>
                          <small>{p.sku || 'SKU yok'}{p.optionGroups?.length ? ` · ${p.optionGroups.map((g) => g.name).join(', ')}` : ''}</small>
                        </span>
                      </Link>
                    </td>
                    <td className="ap-cat">{p.subcategory ? <>{p.category} <small>› {p.subcategory}</small></> : p.category}</td>
                    <td className="ap-num">
                      {priceLabel(p)}
                      {p.oldPrice > p.price && <s>{formatPrice(p.oldPrice)}</s>}
                    </td>
                    <td>
                      {p.madeToOrder
                        ? <span className="ap-tag">Siparişe özel</span>
                        : <span className={`ap-tag ${p.stock <= 0 ? 'is-out' : p.stock <= 5 ? 'is-low' : 'is-ok'}`}>{p.stock <= 0 ? 'Tükendi' : `${p.stock} adet`}</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`ap-status ${p.isActive ? 'is-live' : ''}`}
                        onClick={() => setActive([p._id], !p.isActive)}
                        disabled={Boolean(busy)}
                        title={p.isActive ? 'Taslağa almak için tıklayın' : 'Yayınlamak için tıklayın'}
                      >
                        <i /> {p.isActive ? 'Yayında' : 'Taslak'}
                      </button>
                    </td>
                    <td className="ap-actions">
                      <Link to={`/admin/products/${p._id}`} title="Düzenle" aria-label="Düzenle"><FiEdit2 size={15} /></Link>
                      <button type="button" onClick={() => duplicate(p._id)} title="Kopyala" aria-label="Kopyala" disabled={Boolean(busy)}><FiCopy size={15} /></button>
                      <button type="button" onClick={() => removeMany([p._id])} title="Sil" aria-label="Sil" disabled={Boolean(busy)} className="is-danger"><FiTrash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="ap-pager">
            <button type="button" onClick={() => setFilter('page', String(filters.page - 1))} disabled={filters.page <= 1} aria-label="Önceki sayfa"><FiChevronLeft /></button>
            <span>{filters.page} / {pages}</span>
            <button type="button" onClick={() => setFilter('page', String(filters.page + 1))} disabled={filters.page >= pages} aria-label="Sonraki sayfa"><FiChevronRight /></button>
          </div>
        )}
      </div>

      {priceModal && (
        <div className="admin-modal-overlay" onClick={() => setPriceModal(false)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ap-price-title">
            <div className="admin-modal-header"><h3 id="ap-price-title">Toplu fiyat değişikliği</h3></div>
            <div className="admin-modal-body">
              <p className="ap-modal-text">Seçili ürünlerin satış fiyatı yüzde olarak değişir ve tam liraya yuvarlanır. İndirim için eksi girin (ör. -10).</p>
              <div className="ap-pct">
                <input className="admin-input" type="number" value={pricePct} onChange={(e) => setPricePct(e.target.value)} placeholder="ör. 10" autoFocus />
                <span>%</span>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="admin-cancel-btn" onClick={() => setPriceModal(false)}>Vazgeç</button>
              <button type="button" className="admin-add-btn" onClick={applyPrice} disabled={!Number(pricePct) || Number(pricePct) <= -100}>Uygula</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminProducts

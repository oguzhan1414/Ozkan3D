import { useState, useEffect, useCallback } from 'react'
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch,
  FiCheck, FiX, FiEyeOff, FiPackage,
  FiAlertTriangle, FiGrid, FiList, FiUpload,
  FiTag, FiRefreshCw
} from 'react-icons/fi'
import {
  getProductsApi, createProductApi, updateProductApi,
  deleteProductApi, updateStockApi, uploadProductImageApi
} from '../../api/productApi'
import './AdminProducts.css'

const emptyForm = {
  name: '', category: '', subcategory: '', description: '', shortDesc: '',
  price: '', oldPrice: '', stock: '', sku: '',
  material: ['PLA'], colors: ['#ffffff'],
  badge: '', featured: false, isNew: false, onSale: false,
  width: '', height: '', depth: '', weight: '',
  printTime: '', difficulty: 'Orta',
  metaTitle: '', metaDesc: '', tags: '',
  images: [],
}

const categories = ['Figürler', 'Hediyelik / Dekor', 'Konsol & Oyun']
const subcategories = {
  'Figürler': ['Katana', 'Ejderha Koleksiyonu', 'Fantastik Yaratıklar'],
  'Hediyelik / Dekor': ['Kulaklık Tutucular', 'Masa Dekorasyonu', 'Ev Dekorasyon', 'Anahtarlıklar'],
  'Konsol & Oyun': ['PS5 Aksesuarlar', 'Xbox Aksesuarlar', 'Joystick Tutucular', 'Kablo Düzenleyici']
}
const materialOptions = ['PLA']
const difficultyOptions = ['Kolay', 'Orta', 'Zor']

const REQUIRED_FIELD_TAB = {
  name: 'basic',
  category: 'basic',
  description: 'basic',
  shortDesc: 'basic',
  price: 'price',
  stock: 'price',
  material: 'variants',
}

const normalizeAdminDescription = (value) => {
  if (typeof value !== 'string') return ''

  return value
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[•●◦▪▫►▶]/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const validateProductForm = (form) => {
  const errors = {}

  if (!form.name?.trim()) errors.name = 'Ürün adı zorunludur.'
  if (!form.category) errors.category = 'Kategori seçimi zorunludur.'

  const normalizedDescription = normalizeAdminDescription(form.description)
  const normalizedShortDesc = normalizeAdminDescription(form.shortDesc)

  if (!normalizedDescription) errors.description = 'Açıklama alanı boş bırakılamaz.'
  if (!normalizedShortDesc) errors.shortDesc = 'Kısa açıklama alanı boş bırakılamaz.'

  if (form.price === '' || Number.isNaN(Number(form.price)) || Number(form.price) <= 0) {
    errors.price = 'Geçerli bir fiyat giriniz.'
  }

  if (form.stock === '' || Number.isNaN(Number(form.stock)) || Number(form.stock) < 0) {
    errors.stock = 'Stok alanı 0 veya daha büyük olmalıdır.'
  }

  if (!form.material?.includes('PLA')) errors.material = 'Malzeme otomatik olarak PLA olmalıdır.'

  return errors
}

const AdminProducts = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [view, setView] = useState('grid')
  const [catFilter, setCatFilter] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [activeTab, setActiveTab] = useState('basic')
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stockModal, setStockModal] = useState(null)
  const [newStock, setNewStock] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  const fetchProducts = useCallback(async ({ page = 1, category = 'all', searchTerm = '' } = {}) => {
    setLoading(true)
    try {
      const params = { page, limit: 12 }
      if (category !== 'all') params.category = category
      if (searchTerm) params.keyword = searchTerm

      const res = await getProductsApi(params)
      setProducts(res.data || [])
      setTotal(res.total || 0)
      setPages(res.pages || 1)
    } catch (err) {
      console.log('Ürünler yüklenemedi:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts({ page: currentPage, category: catFilter, searchTerm: debouncedSearch })
  }, [currentPage, catFilter, debouncedSearch, fetchProducts])

  const lowStock = products.filter(p => p.stock < 10).length

  const clearFieldError = (fieldName) => {
    setFormErrors(prev => {
      if (!prev[fieldName]) return prev
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
    if (submitError) setSubmitError('')
  }

  const updateFormField = (fieldName, value) => {
    setForm(prev => ({ ...prev, [fieldName]: value }))
    clearFieldError(fieldName)
  }

  const handleEdit = (product) => {
    setEditProduct(product)
    setForm({
      ...emptyForm,
      name: product.name || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      description: normalizeAdminDescription(product.description || ''),
      shortDesc: normalizeAdminDescription(product.shortDesc || ''),
      price: product.price || '',
      oldPrice: product.oldPrice || '',
      stock: product.stock || '',
      sku: product.sku || '',
      material: ['PLA'],
      colors: product.colors?.length ? product.colors : ['#ffffff'],
      badge: product.badge || '',
      featured: product.featured || false,
      weight: product.weight || '',
      printTime: product.printTime || '',
      difficulty: product.difficulty || 'Orta',
      metaTitle: product.metaTitle || '',
      metaDesc: product.metaDesc || '',
      tags: product.tags?.join(', ') || '',
    })
    setFormErrors({})
    setSubmitError('')
    setActiveTab('basic')
    setShowForm(true)
  }

  const handleToggleActive = async (product) => {
    try {
      const res = await updateProductApi(product._id, { isActive: !product.isActive })
      setProducts(prev => prev.map(p => p._id === product._id ? res.data : p))
    } catch (err) {
      console.log('Durum güncellenemedi:', err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteProductApi(id)
      setProducts(prev => prev.filter(p => p._id !== id))
      setDeleteConfirm(null)
    } catch (err) {
      console.log('Silme hatası:', err.message)
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return
    if (!window.confirm(`Seçilen ${selectedIds.length} ürün silinsin mi?`)) return
    setBulkDeleting(true)
    try {
      await Promise.all(selectedIds.map(id => deleteProductApi(id)))
      setProducts(prev => prev.filter(p => !selectedIds.includes(p._id)))
      setSelectedIds([])
    } catch (err) {
      console.log('Toplu silme hatası:', err.message)
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(products.map(p => p._id))
    }
  }

  const handleStockUpdate = async () => {
    if (!newStock) return
    try {
      await updateStockApi(stockModal._id, Number(newStock))
      setProducts(prev => prev.map(p => p._id === stockModal._id ? { ...p, stock: Number(newStock) } : p))
      setStockModal(null)
      setNewStock('')
    } catch (err) {
      console.log('Stok güncellenemedi:', err.message)
    }
  }

  const addColor = () => {
    setForm(prev => ({ ...prev, colors: [...prev.colors, '#000000'] }))
    if (submitError) setSubmitError('')
  }

  const removeColor = (i) => {
    setForm(prev => ({ ...prev, colors: prev.colors.filter((_, ci) => ci !== i) }))
    if (submitError) setSubmitError('')
  }

  const updateColor = (i, val) => {
    setForm(prev => ({ ...prev, colors: prev.colors.map((c, ci) => ci === i ? val : c) }))
    if (submitError) setSubmitError('')
  }

  const handleImageDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    const newImages = files.map(f => ({ name: f.name, url: URL.createObjectURL(f), file: f }))
    setForm(prev => ({ ...prev, images: [...prev.images, ...newImages] }))
    if (submitError) setSubmitError('')
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    const newImages = files.map(f => ({ name: f.name, url: URL.createObjectURL(f), file: f }))
    setForm(prev => ({ ...prev, images: [...prev.images, ...newImages] }))
    if (submitError) setSubmitError('')
  }

  const handleSubmit = async () => {
    const validationErrors = validateProductForm(form)

    if (Object.keys(validationErrors).length) {
      setFormErrors(validationErrors)
      setSubmitError('Bazı zorunlu alanlar eksik veya hatalı. Lütfen işaretli alanları düzeltin.')
      const firstErrorField = Object.keys(validationErrors)[0]
      setActiveTab(REQUIRED_FIELD_TAB[firstErrorField] || 'basic')
      return
    }

    if (submitError) setSubmitError('')

    setSaving(true)
    try {
      const normalizedDescription = normalizeAdminDescription(form.description)
      const normalizedShortDesc = normalizeAdminDescription(form.shortDesc)

      const productData = {
        name: form.name,
        category: form.category,
        subcategory: form.subcategory,
        description: normalizedDescription,
        shortDesc: normalizedShortDesc,
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : undefined,
        stock: Number(form.stock) || 0,
        sku: form.sku || undefined,
        material: ['PLA'],
        colors: form.colors,
        badge: form.badge || undefined,
        featured: form.featured,
        weight: form.weight ? Number(form.weight) : undefined,
        printTime: form.printTime ? Number(form.printTime) : undefined,
        difficulty: form.difficulty,
        metaTitle: form.metaTitle,
        metaDesc: form.metaDesc,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      }

      let savedProduct
      if (editProduct) {
        const res = await updateProductApi(editProduct._id, productData)
        savedProduct = res.data
        setProducts(prev => prev.map(p => p._id === editProduct._id ? savedProduct : p))
      } else {
        const res = await createProductApi(productData)
        savedProduct = res.data
        setProducts(prev => [savedProduct, ...prev])
      }

      // Yeni resimler varsa yükle
      if (form.images.some(img => img.file)) {
        for (const img of form.images.filter(i => i.file)) {
          try {
            const formData = new FormData()
            formData.append('image', img.file)
            await uploadProductImageApi(savedProduct._id, formData)
          } catch (err) {
            console.log('Resim yüklenemedi:', err.message)
          }
        }
      }

      setShowForm(false)
      setEditProduct(null)
      setForm(emptyForm)
      setFormErrors({})
      setSubmitError('')
      fetchProducts({ page: currentPage, category: catFilter, searchTerm: debouncedSearch })
    } catch (err) {
      const backendError = err.response?.data?.message || 'Kaydetme sırasında bir hata oluştu.'
      setSubmitError(backendError)
      console.log('Kaydetme hatası:', backendError)
    } finally {
      setSaving(false)
    }
  }

  const formTabs = [
    { id: 'basic', label: 'Temel' },
    { id: 'images', label: 'Görseller' },
    { id: 'price', label: 'Fiyat & Stok' },
    { id: 'variants', label: 'Varyantlar' },
    { id: 'details', label: 'Teknik' },
    { id: 'seo', label: 'SEO' },
  ]

  const closeProductModal = () => {
    setShowForm(false)
    setEditProduct(null)
    setFormErrors({})
    setSubmitError('')
  }

  const openNewProductModal = () => {
    setEditProduct(null)
    setForm(emptyForm)
    setActiveTab('basic')
    setFormErrors({})
    setSubmitError('')
    setShowForm(true)
  }

  return (
    <div className="admin-products">

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Ürünler</h1>
          <p className="admin-page-sub">
            {total} ürün
            {lowStock > 0 && (
              <span className="low-stock-warning">
                <FiAlertTriangle size={12} /> {lowStock} kritik stok
              </span>
            )}
          </p>
        </div>
        <div className="products-header-actions">
          <div className="view-toggle">
            <button className={`view-btn ${view === 'grid' ? 'view-btn-active' : ''}`} onClick={() => setView('grid')}>
              <FiGrid size={15} />
            </button>
            <button className={`view-btn ${view === 'list' ? 'view-btn-active' : ''}`} onClick={() => setView('list')}>
              <FiList size={15} />
            </button>
          </div>
          <button className="admin-add-btn" onClick={openNewProductModal}>
            <FiPlus size={16} /> Ürün Ekle
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <FiSearch size={15} className="admin-search-icon" />
          <input
            type="text"
            placeholder="Ürün ara..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            className="admin-search-input"
          />
        </div>
        <div className="products-cat-tabs">
          <button className={`admin-filter-tab ${catFilter === 'all' ? 'admin-filter-active' : ''}`} onClick={() => { setCatFilter('all'); setCurrentPage(1) }}>
            Tümü
          </button>
          {categories.map(c => (
            <button
              key={c}
              className={`admin-filter-tab ${catFilter === c ? 'admin-filter-active' : ''}`}
              onClick={() => { setCatFilter(c); setCurrentPage(1) }}
            >
              {c}
            </button>
          ))}
        </div>
        {/* Bulk Select Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer', color: '#666' }}>
            <input type="checkbox"
              checked={selectedIds.length === products.length && products.length > 0}
              onChange={toggleSelectAll}
            />
            Tümünü Seç
          </label>
          {selectedIds.length > 0 && (
            <button
              className="admin-bulk-delete-btn"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              <FiTrash2 size={14} />
              {bulkDeleting ? 'Siliniyor...' : `Toplu Sil (${selectedIds.length})`}
            </button>
          )}
        </div>

      </div>

      {/* Bulk Actions */}
      <div className="products-bulk-actions">
        <button
          className="bulk-btn"
          onClick={() => fetchProducts({ page: currentPage, category: catFilter, searchTerm: debouncedSearch })}
        >
          <FiRefreshCw size={14} /> Yenile
        </button>
        <button className="bulk-btn"><FiTag size={14} /> Toplu Fiyat</button>
        <button className="bulk-btn"><FiPackage size={14} /> Toplu Stok</button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="admin-table-loading">
          <FiRefreshCw size={20} className="spin" />
          <span>Yükleniyor...</span>
        </div>
      ) : (
        <>
          {/* Grid View */}
          {view === 'grid' && (
            <div className="products-grid">
              {products.map((product) => (
                <div key={product._id} className={`product-admin-card ${!product.isActive ? 'product-inactive' : ''}`}>
                  <div className="product-admin-img">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className="product-admin-placeholder">3D</div>
                    )}
                    {/* Select Checkbox Overlay */}
                    <div className="product-select-overlay">
                      <input type="checkbox"
                        checked={selectedIds.includes(product._id)}
                        onChange={() => toggleSelect(product._id)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    {product.badge && (
                      <span className={`product-badge-sm badge-${product.badge === 'İndirim' ? 'sale' : product.badge === 'Yeni' ? 'new' : 'hot'}`}>
                        {product.badge}
                      </span>
                    )}
                    {product.stock < 10 && (
                      <span className="low-stock-badge">
                        <FiAlertTriangle size={10} /> Düşük Stok
                      </span>
                    )}
                  </div>
                  <div className="product-admin-body">
                    <p className="product-admin-cat">{product.category}</p>
                    <h4 className="product-admin-name">{product.name}</h4>
                    <p className="product-admin-desc">{product.shortDesc || product.description || 'Açıklama eklenmemiş.'}</p>
                    <div className="product-admin-meta">
                      <span className="product-admin-price">{product.price}₺</span>
                      <span className={`product-admin-stock ${product.stock < 10 ? 'stock-critical' : ''}`}>
                        Stok: {product.stock}
                      </span>
                    </div>
                    <div className="product-admin-stats">
                      <span>⭐ {product.rating?.toFixed(1) || '0.0'} ({product.reviewCount || 0})</span>
                      <div className="product-colors-mini">
                        {product.colors?.slice(0, 3).map((c, ci) => (
                          <span key={ci} className="color-dot-mini" style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="product-admin-actions">
                    <button className="product-action-btn" onClick={() => handleEdit(product)} title="Düzenle">
                      <FiEdit2 size={13} />
                    </button>
                    <button className="product-action-btn" onClick={() => { setStockModal(product); setNewStock(product.stock.toString()) }} title="Stok">
                      <FiPackage size={13} />
                    </button>
                    <button className="product-action-btn" onClick={() => handleToggleActive(product)} title={product.isActive ? 'Devre Dışı' : 'Aktif Et'}>
                      <FiEyeOff size={13} />
                    </button>
                    <button className="product-action-btn product-delete-btn" onClick={() => setDeleteConfirm(product._id)} title="Sil">
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {view === 'list' && (
            <div className="admin-card">
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Kategori</th>
                      <th>Fiyat</th>
                      <th>Stok</th>
                      <th>Puan</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product._id} className={!product.isActive ? 'row-inactive' : ''}>
                        <td>
                          <div className="td-product-cell">
                            <div className="td-product-img">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                              ) : '3D'}
                            </div>
                            <div className="td-product-text">
                              <strong>{product.name}</strong>
                              <span className="td-product-desc">{product.shortDesc || product.description || 'Açıklama eklenmemiş.'}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className="category-badge">{product.category}</span></td>
                        <td>
                          <div className="td-price-cell">
                            {product.oldPrice && <span className="price-old-small">{product.oldPrice}₺</span>}
                            <strong>{product.price}₺</strong>
                          </div>
                        </td>
                        <td>
                          <span className={`stock-badge ${product.stock < 10 ? 'stock-low' : 'stock-ok'}`}>
                            {product.stock < 10 && <FiAlertTriangle size={11} />}
                            {product.stock}
                          </span>
                        </td>
                        <td>⭐ {product.rating?.toFixed(1) || '0.0'}</td>
                        <td>
                          <span className={`active-badge ${!product.isActive ? 'badge-inactive' : 'badge-active'}`}>
                            {product.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td>
                          <div className="td-actions">
                            <button className="td-action-btn" onClick={() => handleEdit(product)}><FiEdit2 size={14} /></button>
                            <button className="td-action-btn" onClick={() => { setStockModal(product); setNewStock(product.stock.toString()) }}><FiPackage size={14} /></button>
                            <button className="td-action-btn td-delete-btn" onClick={() => setDeleteConfirm(product._id)}><FiTrash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="admin-pagination">
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  className={`pagination-btn ${currentPage === i + 1 ? 'pagination-active' : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Stock Modal */}
      {stockModal && (
        <div className="admin-modal-overlay" onClick={() => setStockModal(null)}>
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Stok Güncelle</h3>
              <button className="admin-modal-close" onClick={() => setStockModal(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>{stockModal.name}</label>
                <input
                  type="number"
                  className="admin-input"
                  value={newStock}
                  onChange={e => setNewStock(e.target.value)}
                  placeholder="Yeni stok miktarı"
                  autoFocus
                />
                <small className="input-hint">Mevcut stok: {stockModal.stock}</small>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setStockModal(null)}>İptal</button>
              <button className="admin-save-btn" onClick={handleStockUpdate}>
                <FiCheck size={14} /> Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="admin-modal-overlay" onClick={closeProductModal}>
          <div className="admin-modal admin-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h3>
              <button className="admin-modal-close" onClick={closeProductModal}>✕</button>
            </div>

            <div className="form-tabs">
              {formTabs.map(t => (
                <button
                  key={t.id}
                  className={`form-tab ${activeTab === t.id ? 'form-tab-active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="admin-modal-body">

              {activeTab === 'basic' && (
                <div className="admin-form">
                  <p className="admin-required-note">* işaretli alanlar zorunludur.</p>
                  <div className="admin-form-group">
                    <label>Ürün Adı *</label>
                    <input
                      value={form.name}
                      onChange={e => updateFormField('name', e.target.value)}
                      placeholder="Ürün adı"
                      className={`admin-input ${formErrors.name ? 'admin-input-error' : ''}`}
                    />
                    {formErrors.name && <small className="admin-field-error">{formErrors.name}</small>}
                  </div>
                  <div className="admin-form-group">
                    <label>Kategori *</label>
                    <select
                      value={form.category}
                      onChange={e => {
                        updateFormField('category', e.target.value)
                        setForm(p => ({ ...p, subcategory: '' }))
                      }}
                      className={`admin-input ${formErrors.category ? 'admin-input-error' : ''}`}
                    >
                      <option value="">Seçin</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {formErrors.category && <small className="admin-field-error">{formErrors.category}</small>}
                  </div>
                  {form.category && subcategories[form.category] && (
                    <div className="admin-form-group">
                      <label>Alt Kategori</label>
                      <select value={form.subcategory} onChange={e => setForm(p => ({ ...p, subcategory: e.target.value }))} className="admin-input">
                        <option value="">Seçin</option>
                        {subcategories[form.category].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="admin-form-group">
                    <label>Açıklama *</label>
                    <textarea
                      value={form.description}
                      onChange={e => updateFormField('description', normalizeAdminDescription(e.target.value))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') e.preventDefault()
                      }}
                      className={`admin-textarea ${formErrors.description ? 'admin-textarea-error' : ''}`}
                      rows={3}
                    />
                    {formErrors.description && <small className="admin-field-error">{formErrors.description}</small>}
                    <small className="input-hint">Satır kırılması ve ikonlar otomatik temizlenir</small>
                  </div>
                  <div className="admin-form-group">
                    <label>Kısa Açıklama *</label>
                    <input
                      value={form.shortDesc}
                      onChange={e => updateFormField('shortDesc', normalizeAdminDescription(e.target.value))}
                      className={`admin-input ${formErrors.shortDesc ? 'admin-input-error' : ''}`}
                    />
                    {formErrors.shortDesc && <small className="admin-field-error">{formErrors.shortDesc}</small>}
                    <small className="input-hint">Tek satır düzeninde tutulur</small>
                  </div>
                  <div className="admin-form-group">
                    <label>Rozet</label>
                    <select value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))} className="admin-input">
                      <option value="">Yok</option>
                      <option value="Yeni">Yeni</option>
                      <option value="İndirim">İndirim</option>
                      <option value="Çok Satan">Çok Satan</option>
                    </select>
                  </div>
                  <div className="product-options-grid">
                    <label className="product-option-check">
                      <input type="checkbox" checked={form.featured} onChange={e => setForm(p => ({ ...p, featured: e.target.checked }))} />
                      <span className="check-custom" />
                      <span>Öne Çıkan</span>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'images' && (
                <div className="admin-form">
                  <div
                    className={`image-drop-zone ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleImageDrop}
                    onClick={() => document.getElementById('product-images').click()}
                  >
                    <FiUpload size={28} />
                    <p>Görselleri sürükle & bırak</p>
                    <span>veya tıklayarak seç</span>
                    <small>PNG, JPG, WEBP — Maks 5MB</small>
                    <input id="product-images" type="file" multiple accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                  </div>
                  {form.images.length > 0 && (
                    <div className="image-preview-grid">
                      {form.images.map((img, i) => (
                        <div key={i} className="image-preview-item">
                          <img src={img.url || img} alt="" />
                          {i === 0 && <span className="main-image-badge">Ana</span>}
                          <button className="image-remove-btn" onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, ii) => ii !== i) }))}>
                            <FiX size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {editProduct?.images?.length > 0 && (
                    <div>
                      <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: '8px' }}>Mevcut Görseller:</p>
                      <div className="image-preview-grid">
                        {editProduct.images.map((img, i) => (
                          <div key={i} className="image-preview-item">
                            <img src={img} alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'price' && (
                <div className="admin-form">
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Fiyat (₺) *</label>
                      <input
                        type="number"
                        value={form.price}
                        onChange={e => updateFormField('price', e.target.value)}
                        placeholder="299"
                        className={`admin-input ${formErrors.price ? 'admin-input-error' : ''}`}
                      />
                      {formErrors.price && <small className="admin-field-error">{formErrors.price}</small>}
                    </div>
                    <div className="admin-form-group">
                      <label>Eski Fiyat (₺)</label>
                      <input type="number" value={form.oldPrice} onChange={e => setForm(p => ({ ...p, oldPrice: e.target.value }))} placeholder="399" className="admin-input" />
                    </div>
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Stok *</label>
                      <input
                        type="number"
                        value={form.stock}
                        onChange={e => updateFormField('stock', e.target.value)}
                        placeholder="50"
                        className={`admin-input ${formErrors.stock ? 'admin-input-error' : ''}`}
                      />
                      {formErrors.stock && <small className="admin-field-error">{formErrors.stock}</small>}
                    </div>
                    <div className="admin-form-group">
                      <label>SKU</label>
                      <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="SKU-001" className="admin-input" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'variants' && (
                <div className="admin-form">
                  <div className="admin-form-group">
                    <label>Malzemeler *</label>
                    <div className="material-checkboxes">
                      {materialOptions.map(m => (
                        <button
                          key={m}
                          className={`material-checkbox-btn ${form.material.includes(m) ? 'material-selected' : ''}`}
                          type="button"
                          disabled
                        >
                          {form.material.includes(m) && <FiCheck size={12} />} {m}
                        </button>
                      ))}
                    </div>
                    <small className="input-hint">Şu anda tüm ürünlerde malzeme otomatik olarak PLA seçilir.</small>
                    {formErrors.material && <small className="admin-field-error">{formErrors.material}</small>}
                  </div>
                  <div className="admin-form-group">
                    <label>Renkler</label>
                    <div className="color-options-wrap">
                      {form.colors.map((c, i) => (
                        <div key={i} className="color-option-item">
                          <input type="color" value={c} onChange={e => updateColor(i, e.target.value)} className="color-input" />
                          <span className="color-hex">{c.toUpperCase()}</span>
                          {form.colors.length > 1 && (
                            <button className="color-remove-btn" onClick={() => removeColor(i)}><FiX size={12} /></button>
                          )}
                        </div>
                      ))}
                      <button className="add-color-btn" onClick={addColor}><FiPlus size={14} /> Renk Ekle</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="admin-form">
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Ağırlık (g)</label>
                      <input type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} className="admin-input" />
                    </div>
                    <div className="admin-form-group">
                      <label>Baskı Süresi (saat)</label>
                      <input type="number" value={form.printTime} onChange={e => setForm(p => ({ ...p, printTime: e.target.value }))} className="admin-input" />
                    </div>
                  </div>
                  <div className="admin-form-group">
                    <label>Zorluk</label>
                    <select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))} className="admin-input">
                      {difficultyOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'seo' && (
                <div className="admin-form">
                  <div className="admin-form-group">
                    <label>Meta Başlık</label>
                    <input value={form.metaTitle} onChange={e => setForm(p => ({ ...p, metaTitle: e.target.value }))} className="admin-input" />
                    <small className="input-hint">{form.metaTitle.length}/60</small>
                  </div>
                  <div className="admin-form-group">
                    <label>Meta Açıklama</label>
                    <textarea value={form.metaDesc} onChange={e => setForm(p => ({ ...p, metaDesc: e.target.value }))} className="admin-textarea" rows={3} />
                    <small className="input-hint">{form.metaDesc.length}/160</small>
                  </div>
                  <div className="admin-form-group">
                    <label>Etiketler</label>
                    <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="figür, ejderha, dekor" className="admin-input" />
                    <small className="input-hint">Virgülle ayırın</small>
                  </div>
                </div>
              )}

            </div>

            <div className="admin-modal-footer">
              {submitError && <div className="admin-form-error-summary">{submitError}</div>}
              <button className="admin-cancel-btn" onClick={closeProductModal}>İptal</button>
              <button className="admin-save-btn" onClick={handleSubmit} disabled={saving}>
                <FiCheck size={15} />
                {saving ? 'Kaydediliyor...' : editProduct ? 'Güncelle' : 'Ürün Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Ürünü Sil</h3>
              <button className="admin-modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <p className="delete-confirm-text">Bu ürünü silmek istediğinizden emin misiniz?</p>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setDeleteConfirm(null)}>İptal</button>
              <button className="admin-delete-btn" onClick={() => handleDelete(deleteConfirm)}>
                <FiTrash2 size={15} /> Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminProducts
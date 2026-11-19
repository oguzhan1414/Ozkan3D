import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiPlus, FiRefreshCw, FiEdit2, FiTrash2, FiX, FiEye, FiEyeOff, FiCornerDownRight, FiAlertTriangle, FiImage,
} from 'react-icons/fi'
import {
  getAllCategoriesAdminApi, createCategoryApi, updateCategoryApi, deleteCategoryApi,
  uploadCategoryImageApi, removeCategoryImageApi,
} from '../../api/categoryApi'
import './AdminCategories.css'

const emptyForm = { name: '', parent: '', order: 0, isActive: true, imageAlt: '' }
const MAX_IMAGE = 4 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Düz listeden iki seviyeli ağaç */
const toTree = (rows) => {
  const mains = rows.filter((c) => !c.parent).map((c) => ({ ...c, children: [] }))
  const byId = new Map(mains.map((m) => [m._id, m]))
  const orphans = []
  for (const c of rows) {
    if (!c.parent) continue
    if (byId.has(c.parent)) byId.get(c.parent).children.push(c)
    else orphans.push(c)
  }
  const sort = (a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, 'tr')
  mains.sort(sort).forEach((m) => m.children.sort(sort))
  return { mains, orphans }
}

const StatusBadge = ({ active }) => (
  <span className={`cat-status ${active ? 'is-on' : 'is-off'}`}>{active ? 'Aktif' : 'Pasif'}</span>
)

const AdminCategories = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: getAllCategoriesAdminApi,
  })

  const rows = useMemo(() => data?.data || [], [data])
  const { mains, orphans } = useMemo(() => toTree(rows), [rows])

  const [modal, setModal] = useState(null) // { mode: 'create'|'edit', category? }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [pageError, setPageError] = useState('')
  // Kapak görseli: seçilen yeni dosya, önizleme adresi, kaldırma isteği
  const [image, setImage] = useState({ file: null, preview: '', remove: false })

  const resetImage = () => {
    setImage((prev) => {
      if (prev.preview) URL.revokeObjectURL(prev.preview)
      return { file: null, preview: '', remove: false }
    })
  }

  const pickImage = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) return setFormError('Sadece JPG, PNG ya da WebP yükleyebilirsin.')
    if (file.size > MAX_IMAGE) return setFormError('Görsel en fazla 4 MB olabilir.')
    setFormError('')
    setImage((prev) => {
      if (prev.preview) URL.revokeObjectURL(prev.preview)
      return { file, preview: URL.createObjectURL(file), remove: false }
    })
  }

  const closeModal = () => {
    resetImage()
    setModal(null)
  }

  // Değişiklik mağazaya da yansısın
  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
    ])
  }

  const openCreate = (parentId = '') => {
    const siblings = parentId ? mains.find((m) => m._id === parentId)?.children || [] : mains
    setForm({ ...emptyForm, parent: parentId, order: siblings.length + 1 })
    setFormError('')
    resetImage()
    setModal({ mode: 'create' })
  }

  const openEdit = (category) => {
    setForm({
      name: category.name,
      parent: category.parent || '',
      order: category.order || 0,
      isActive: category.isActive !== false,
      imageAlt: category.imageAlt || '',
    })
    setFormError('')
    resetImage()
    setModal({ mode: 'edit', category })
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('Kategori adı gerekli.')
      return
    }
    setSaving(true)
    setFormError('')
    const isMain = !form.parent
    const payload = {
      name: form.name.trim(),
      parent: form.parent || null,
      order: Number(form.order) || 0,
      isActive: form.isActive,
      ...(isMain ? { imageAlt: form.imageAlt.trim() } : {}),
    }
    try {
      const res = modal.mode === 'edit'
        ? await updateCategoryApi(modal.category._id, payload)
        : await createCategoryApi(payload)
      const id = res.data?._id || modal.category?._id

      // Görsel: önce kategori kaydedilir, sonra (yeni kategoride kimlik oluşunca) görsel yüklenir
      if (isMain && image.file) {
        await uploadCategoryImageApi(id, image.file, form.imageAlt.trim())
      } else if (image.remove && modal.category?.imageUrl) {
        await removeCategoryImageApi(id)
      }

      await refreshAll()
      closeModal()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (category) => {
    setPageError('')
    try {
      await updateCategoryApi(category._id, { isActive: category.isActive === false })
      await refreshAll()
    } catch (err) {
      setPageError(err.response?.data?.message || 'Durum değiştirilemedi.')
    }
  }

  const confirmDelete = async () => {
    setPageError('')
    try {
      await deleteCategoryApi(deleteTarget._id)
      await refreshAll()
      setDeleteTarget(null)
    } catch (err) {
      setDeleteTarget((t) => ({ ...t, error: err.response?.data?.message || 'Silinemedi.' }))
    }
  }

  const subCount = rows.filter((c) => c.parent).length
  const editing = modal?.mode === 'edit' ? modal.category : null
  const editingHasChildren = editing && mains.find((m) => m._id === editing._id)?.children.length > 0
  const shownImage = image.preview || (!image.remove && editing?.imageUrl) || ''

  const Actions = ({ category, canAddChild }) => (
    <div className="cat-actions">
      {canAddChild && (
        <button type="button" className="cat-btn" onClick={() => openCreate(category._id)} title="Alt kategori ekle">
          <FiPlus size={14} /> <span>Alt kategori</span>
        </button>
      )}
      <button type="button" className="cat-icon-btn" onClick={() => openEdit(category)} aria-label={`${category.name} düzenle`} title="Düzenle">
        <FiEdit2 size={14} />
      </button>
      <button
        type="button"
        className="cat-icon-btn"
        onClick={() => toggleActive(category)}
        aria-label={category.isActive === false ? `${category.name} aktif yap` : `${category.name} pasif yap`}
        title={category.isActive === false ? 'Aktif yap' : 'Pasif yap (mağazada gizlenir)'}
      >
        {category.isActive === false ? <FiEye size={14} /> : <FiEyeOff size={14} />}
      </button>
      <button
        type="button"
        className="cat-icon-btn is-danger"
        onClick={() => setDeleteTarget(category)}
        aria-label={`${category.name} sil`}
        title="Sil"
      >
        <FiTrash2 size={14} />
      </button>
    </div>
  )

  return (
    <div className="admin-categories">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Kategoriler</h1>
          <p className="admin-page-sub">
            {mains.length} ana, {subCount} alt kategori · Pasif kategoriler mağazada görünmez
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="admin-add-btn" style={{ background: '#f0f0f0', color: '#555' }} onClick={() => refetch()} aria-label="Yenile">
            <FiRefreshCw size={15} className={isFetching ? 'spin' : ''} />
          </button>
          <button className="admin-add-btn" onClick={() => openCreate('')}>
            <FiPlus size={16} /> Ana kategori ekle
          </button>
        </div>
      </div>

      {pageError && <div className="cat-alert" role="alert"><FiAlertTriangle /> {pageError}</div>}
      {isError && <div className="cat-alert" role="alert"><FiAlertTriangle /> Kategoriler yüklenemedi.</div>}

      {isLoading ? (
        <div className="admin-card cat-empty">Yükleniyor…</div>
      ) : mains.length === 0 ? (
        <div className="admin-card cat-empty">
          <p>Henüz kategori yok.</p>
          <button className="admin-add-btn" onClick={() => openCreate('')}><FiPlus size={16} /> İlk kategoriyi ekle</button>
        </div>
      ) : (
        <div className="cat-list">
          {mains.map((m) => (
            <section key={m._id} className={`admin-card cat-card ${m.isActive === false ? 'is-inactive' : ''}`}>
              <header className="cat-main">
                <div className="cat-main-info">
                  <span className="cat-order" title="Sıra">{m.order || 0}</span>
                  <span className={`cat-thumb ${m.imageUrl ? '' : 'is-empty'}`} title={m.imageUrl ? 'Kapak görseli' : 'Kapak görseli yok'}>
                    {m.imageUrl ? <img src={m.imageUrl} alt="" loading="lazy" /> : <FiImage aria-hidden="true" />}
                  </span>
                  <div>
                    <h2>{m.name}</h2>
                    <p>
                      {m.productCount} ürün · {m.children.length} alt kategori
                      {!m.imageUrl && <span className="cat-missing"> · Kapak görseli yok</span>}
                    </p>
                  </div>
                  <StatusBadge active={m.isActive !== false} />
                </div>
                <Actions category={m} canAddChild />
              </header>

              {m.children.length > 0 ? (
                <ul className="cat-subs">
                  {m.children.map((s) => (
                    <li key={s._id} className={s.isActive === false ? 'is-inactive' : ''}>
                      <FiCornerDownRight className="cat-sub-icon" aria-hidden="true" />
                      <span className="cat-order is-sm" title="Sıra">{s.order || 0}</span>
                      <span className="cat-sub-name">{s.name}</span>
                      <span className="cat-sub-count">{s.productCount} ürün</span>
                      <StatusBadge active={s.isActive !== false} />
                      <Actions category={s} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cat-subs-empty">Alt kategori yok.</p>
              )}
            </section>
          ))}

          {orphans.length > 0 && (
            <section className="admin-card cat-card">
              <header className="cat-main"><div className="cat-main-info"><h2>Üst kategorisi bulunamayanlar</h2></div></header>
              <ul className="cat-subs">
                {orphans.map((s) => (
                  <li key={s._id}>
                    <span className="cat-sub-name">{s.name}</span>
                    <span className="cat-sub-count">{s.productCount} ürün</span>
                    <Actions category={s} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Ekle / düzenle */}
      {modal && (
        <div className="admin-modal-overlay" onClick={() => !saving && closeModal()}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cat-modal-title">
            <div className="admin-modal-header">
              <h3 id="cat-modal-title">{editing ? 'Kategoriyi düzenle' : form.parent ? 'Alt kategori ekle' : 'Ana kategori ekle'}</h3>
              <button className="admin-modal-close" onClick={closeModal} aria-label="Kapat"><FiX size={18} /></button>
            </div>
            <form onSubmit={save}>
              <div className="admin-modal-body admin-form">
                <div className="admin-form-group">
                  <label htmlFor="cat-name">Ad</label>
                  <input id="cat-name" className="admin-input" value={form.name} maxLength={60} autoFocus
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  {editing && editing.productCount > 0 && form.name.trim() !== editing.name && (
                    <small className="cat-hint">Bu kategorideki {editing.productCount} ürün yeni adla otomatik güncellenir.</small>
                  )}
                </div>

                <div className="admin-form-group">
                  <label htmlFor="cat-parent">Üst kategori</label>
                  <select id="cat-parent" className="admin-input" value={form.parent}
                    disabled={editingHasChildren}
                    onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}>
                    <option value="">Yok (ana kategori)</option>
                    {mains.filter((m) => m._id !== editing?._id).map((m) => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                  {editingHasChildren && <small className="cat-hint">Alt kategorileri olduğu için ana kategori olarak kalmalı.</small>}
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="cat-order">Sıra</label>
                    <input id="cat-order" type="number" className="admin-input" value={form.order}
                      onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="cat-active">Durum</label>
                    <label className="cat-switch">
                      <input id="cat-active" type="checkbox" checked={form.isActive}
                        onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                      <span>{form.isActive ? 'Mağazada görünür' : 'Gizli (pasif)'}</span>
                    </label>
                  </div>
                </div>

                {!form.parent && (
                  <div className="admin-form-group">
                    <label>Kapak görseli <small className="cat-hint">· Anasayfadaki kategori karosunda görünür</small></label>
                    <div className="cat-image-picker">
                      <div className={`cat-image-preview ${shownImage ? '' : 'is-empty'}`}>
                        {shownImage ? <img src={shownImage} alt="" /> : <><FiImage aria-hidden="true" /><span>Görsel yok</span></>}
                      </div>
                      <div className="cat-image-actions">
                        <label className="cat-btn cat-file-btn">
                          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} className="cat-file-input" />
                          <FiImage size={14} /> {shownImage ? 'Değiştir' : 'Görsel seç'}
                        </label>
                        {shownImage && (
                          <button
                            type="button"
                            className="cat-btn"
                            onClick={() => {
                              if (image.file) resetImage()
                              else setImage({ file: null, preview: '', remove: true })
                            }}
                          >
                            Kaldır
                          </button>
                        )}
                        <small className="cat-hint">Yatay (4:3) görsel önerilir · JPG, PNG, WebP · en fazla 4 MB</small>
                      </div>
                    </div>
                    <input
                      className="admin-input"
                      value={form.imageAlt}
                      maxLength={200}
                      placeholder="Görselin kısa açıklaması (erişilebilirlik ve SEO için)"
                      onChange={(e) => setForm((f) => ({ ...f, imageAlt: e.target.value }))}
                      aria-label="Görsel açıklaması"
                    />
                  </div>
                )}

                {formError && <div className="cat-alert" role="alert"><FiAlertTriangle /> {formError}</div>}
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-cancel-btn" onClick={closeModal} disabled={saving}>Vazgeç</button>
                <button type="submit" className="admin-save-btn" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Silme onayı */}
      {deleteTarget && (
        <div className="admin-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="cat-del-title">
            <div className="admin-modal-header">
              <h3 id="cat-del-title">Kategoriyi sil</h3>
              <button className="admin-modal-close" onClick={() => setDeleteTarget(null)} aria-label="Kapat"><FiX size={18} /></button>
            </div>
            <div className="admin-modal-body">
              <p className="delete-confirm-text">
                <strong>{deleteTarget.name}</strong> kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </p>
              {(deleteTarget.productCount > 0) && (
                <p className="cat-hint is-warn">
                  Bu kategoride {deleteTarget.productCount} ürün var, silinemez. Ürünleri başka kategoriye taşı ya da kategoriyi pasif yap.
                </p>
              )}
              {deleteTarget.error && <div className="cat-alert" role="alert"><FiAlertTriangle /> {deleteTarget.error}</div>}
            </div>
            <div className="admin-modal-footer">
              <button className="admin-cancel-btn" onClick={() => setDeleteTarget(null)}>Vazgeç</button>
              <button className="admin-delete-btn" onClick={confirmDelete} disabled={deleteTarget.productCount > 0}>Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCategories

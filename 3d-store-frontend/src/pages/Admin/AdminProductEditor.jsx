import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiArrowLeft, FiUploadCloud, FiX, FiPlus, FiTrash2, FiStar, FiExternalLink,
  FiCopy, FiCheck, FiAlertCircle, FiRefreshCw, FiMove,
} from 'react-icons/fi'
import {
  getProductAdminApi, createProductApi, updateProductApi, uploadProductImageApi,
  duplicateProductApi, deleteProductApi,
} from '../../api/productApi'
import { getAllCategoriesAdminApi } from '../../api/categoryApi'
import { createColorApi } from '../../api/colorApi'
import { buildCategoryTree } from '../../storefront/useCategories'
import usePalette, { formatLeadDays } from '../../storefront/usePalette'
import { formatPrice, discountPercent, toSlug } from '../../storefront/catalog'
import { prepareImage, isImageFile } from '../../utils/prepareImage'
import './AdminProductEditor.css'

const MATERIAL_SUGGESTIONS = ['PLA', 'PETG', 'Reçine', 'TPU', 'ABS']
const GROUP_PRESETS = [
  { name: 'Boyut', values: ['Küçük', 'Orta', 'Büyük'] },
  { name: 'Boya', values: ['Boyasız', 'Elle boyanmış'] },
]
const BADGES = ['', 'Yeni', 'İndirim', 'Çok Satan']

let keySeq = 0
const newKey = () => `k${Date.now().toString(36)}${(keySeq++).toString(36)}`

const emptyForm = {
  name: '', shortDesc: '', description: '', categoryId: '',
  price: '', oldPrice: '', madeToOrder: true, stock: '', sku: '',
  leadMinDays: '', leadMaxDays: '',
  colors: [], material: ['PLA'], optionGroups: [],
  personalization: { enabled: false, label: 'Yazılacak isim', maxLength: 20, required: true, priceDelta: '' },
  width: '', height: '', depth: '', weight: '', printTime: '', difficulty: 'Orta',
  isActive: false, featured: false, badge: '', metaTitle: '', metaDesc: '', tags: '',
}

const str = (v) => (v === null || v === undefined ? '' : String(v))

/** API ürünü -> form durumu */
const fromProduct = (p) => ({
  form: {
    ...emptyForm,
    name: p.name || '',
    shortDesc: p.shortDesc || '',
    description: p.description || '',
    categoryId: p.subcategoryId || p.categoryId || '',
    price: str(p.price),
    oldPrice: str(p.oldPrice),
    madeToOrder: p.madeToOrder !== false,
    stock: str(p.stock),
    sku: p.sku || '',
    leadMinDays: str(p.leadMinDays),
    leadMaxDays: str(p.leadMaxDays),
    colors: (p.colors || []).map((c) => c.toLowerCase()),
    material: p.material || [],
    optionGroups: (p.optionGroups || []).map((g) => ({
      ...g, key: newKey(), values: (g.values || []).map((v) => ({ ...v, key: newKey(), priceDelta: str(v.priceDelta) })),
    })),
    personalization: p.personalization?.enabled
      ? { ...emptyForm.personalization, ...p.personalization, priceDelta: str(p.personalization.priceDelta) }
      : emptyForm.personalization,
    width: str(p.dimensions?.width),
    height: str(p.dimensions?.height),
    depth: str(p.dimensions?.depth),
    weight: str(p.weight),
    printTime: str(p.printTime),
    difficulty: p.difficulty || 'Orta',
    isActive: Boolean(p.isActive),
    featured: Boolean(p.featured),
    badge: p.badge || '',
    metaTitle: p.metaTitle || '',
    metaDesc: p.metaDesc || '',
    tags: (p.tags || []).join(', '),
  },
  images: (p.imageVariants?.length ? p.imageVariants : (p.images || []).map((url) => ({ url, color: null })))
    .map((v) => ({ key: newKey(), url: v.url, preview: v.url, color: v.color || null })),
})

const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

/** Form durumu -> API gövdesi */
const toPayload = (form, categories, imageList) => {
  const parent = categories.find((c) => c._id === form.categoryId)
  const sub = parent ? null : categories.flatMap((c) => c.children.map((s) => ({ ...s, parentId: c._id }))).find((s) => s._id === form.categoryId)
  const dims = [form.width, form.height, form.depth]
  return {
    name: form.name.trim(),
    shortDesc: form.shortDesc.trim(),
    description: form.description.trim(),
    categoryId: parent ? parent._id : sub?.parentId || null,
    subcategoryId: sub ? sub._id : null,
    price: Number(form.price) || 0,
    oldPrice: numOrNull(form.oldPrice),
    madeToOrder: form.madeToOrder,
    stock: form.madeToOrder ? 0 : Math.max(0, Math.trunc(Number(form.stock) || 0)),
    sku: form.sku.trim() || null,
    leadMinDays: numOrNull(form.leadMinDays),
    leadMaxDays: numOrNull(form.leadMaxDays),
    colors: form.colors,
    material: form.material,
    optionGroups: form.optionGroups.map((g) => ({
      id: g.id, name: g.name, values: g.values.map((v) => ({ id: v.id, label: v.label, priceDelta: Number(v.priceDelta) || 0 })),
    })),
    personalization: form.personalization.enabled
      ? { ...form.personalization, priceDelta: Number(form.personalization.priceDelta) || 0 }
      : null,
    dimensions: dims.every((d) => d !== '') ? { width: Number(form.width), height: Number(form.height), depth: Number(form.depth) } : null,
    weight: numOrNull(form.weight),
    printTime: numOrNull(form.printTime),
    difficulty: form.difficulty,
    isActive: form.isActive,
    featured: form.featured,
    badge: form.badge || null,
    metaTitle: form.metaTitle.trim(),
    metaDesc: form.metaDesc.trim(),
    tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    images: imageList.filter((i) => i.url).map((i) => i.url),
    imageVariants: imageList.filter((i) => i.url).map((i) => ({ url: i.url, color: i.color })),
  }
}

const validate = (form, images) => {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Ürün adı zorunlu.'
  if (!form.categoryId) errors.categoryId = 'Kategori seçin.'
  if (form.price === '' || Number(form.price) < 0) errors.price = 'Geçerli bir fiyat girin.'
  if (form.oldPrice !== '' && Number(form.oldPrice) <= Number(form.price)) errors.oldPrice = 'Eski fiyat, satış fiyatından yüksek olmalı.'
  if (!form.madeToOrder && (form.stock === '' || Number(form.stock) < 0)) errors.stock = 'Stok adedi girin.'
  if (form.leadMinDays !== '' && form.leadMaxDays !== '' && Number(form.leadMinDays) > Number(form.leadMaxDays)) {
    errors.lead = 'En az süre, en fazla süreden büyük olamaz.'
  }
  form.optionGroups.forEach((g, i) => {
    if (!g.name.trim()) errors[`group${i}`] = 'Seçenek adı boş olamaz.'
    else if (!g.values.some((v) => v.label.trim())) errors[`group${i}`] = 'En az bir değer ekleyin.'
  })
  // Yayına alınacak ürün eksiksiz olmalı; taslak serbest
  if (form.isActive) {
    if (!images.length) errors.images = 'Yayındaki ürünün en az bir görseli olmalı.'
    if (!form.description.trim()) errors.description = 'Yayındaki ürünün açıklaması olmalı.'
  }
  return errors
}

/* ================================================================ Görseller */
const ImageManager = ({ images, setImages, colors, colorName, error }) => {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const dragIndex = useRef(null)

  const addFiles = (fileList) => {
    const files = [...fileList].filter(isImageFile).slice(0, 20)
    if (!files.length) return
    setImages((prev) => [
      ...prev,
      ...files.map((file) => ({ key: newKey(), file, preview: URL.createObjectURL(file), color: null })),
    ])
  }

  const move = (from, to) => {
    if (from === to || to < 0 || to >= images.length) return
    setImages((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const remove = (key) => setImages((prev) => prev.filter((i) => i.key !== key))
  const setColor = (key, color) => setImages((prev) => prev.map((i) => (i.key === key ? { ...i, color: color || null } : i)))

  return (
    <div>
      <div
        className={`pe-drop ${dragging ? 'is-over' : ''} ${error ? 'has-error' : ''}`}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true) } }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files?.length) return
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
      >
        <FiUploadCloud size={22} />
        <strong>Görselleri sürükleyip bırakın</strong>
        <span>ya da seçmek için tıklayın · JPG, PNG, WebP · birden fazla seçebilirsiniz</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
        />
      </div>
      {error && <p className="pe-error">{error}</p>}

      {images.length > 0 && (
        <ul className="pe-images">
          {images.map((img, i) => (
            <li
              key={img.key}
              className={`pe-image ${i === 0 ? 'is-cover' : ''}`}
              draggable
              onDragStart={(e) => { dragIndex.current = i; e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={(e) => { if (dragIndex.current !== null) e.preventDefault() }}
              onDrop={(e) => {
                if (dragIndex.current === null) return
                e.preventDefault()
                e.stopPropagation()
                move(dragIndex.current, i)
                dragIndex.current = null
              }}
              onDragEnd={() => { dragIndex.current = null }}
            >
              <img src={img.preview} alt="" />
              {i === 0 && <span className="pe-cover-tag">Kapak</span>}
              {!img.url && <span className="pe-new-tag">Yeni</span>}
              <span className="pe-image-move" aria-hidden="true"><FiMove size={12} /></span>
              <div className="pe-image-actions">
                {i !== 0 && (
                  <button type="button" onClick={() => move(i, 0)} title="Kapak yap" aria-label="Kapak yap"><FiStar size={13} /></button>
                )}
                <button type="button" onClick={() => remove(img.key)} title="Kaldır" aria-label="Görseli kaldır"><FiX size={14} /></button>
              </div>
              {colors.length > 0 && (
                <select
                  className="pe-image-color"
                  value={img.color || ''}
                  onChange={(e) => setColor(img.key, e.target.value)}
                  aria-label="Bu görsel hangi renk için"
                  style={img.color ? { '--dot': img.color } : undefined}
                >
                  <option value="">Tüm renkler</option>
                  {colors.map((c) => <option key={c} value={c}>{colorName(c)}</option>)}
                </select>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="pe-hint">İlk görsel kapaktır; sürükleyerek sıralayın. Renge özel görseller, müşteri o rengi seçince öne gelir.</p>
    </div>
  )
}

/* ================================================================ Renkler */
const ColorPicker = ({ selected, onChange, palette, onCreated }) => {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#888888')
  const [state, setState] = useState({ saving: false, error: '' })

  const toggle = (h) => onChange(selected.includes(h) ? selected.filter((c) => c !== h) : [...selected, h])

  const create = async () => {
    if (!name.trim()) { setState({ saving: false, error: 'Renk adı girin.' }); return }
    setState({ saving: true, error: '' })
    try {
      const res = await createColorApi({ name: name.trim(), hex })
      await onCreated()
      onChange([...selected, res.data.hex])
      setAdding(false)
      setName('')
      setState({ saving: false, error: '' })
    } catch (err) {
      setState({ saving: false, error: err.response?.data?.message || 'Renk eklenemedi.' })
    }
  }

  return (
    <div>
      <div className="pe-swatches">
        {palette.map((c) => {
          const on = selected.includes(c.hex)
          return (
            <button
              key={c._id}
              type="button"
              className={`pe-swatch ${on ? 'is-on' : ''}`}
              onClick={() => toggle(c.hex)}
              aria-pressed={on}
              title={c.name}
            >
              <i style={{ background: c.hex }} />
              {c.name}
              {on && <FiCheck size={12} />}
            </button>
          )
        })}
        <button type="button" className="pe-swatch pe-swatch--add" onClick={() => setAdding((v) => !v)}>
          <FiPlus size={12} /> Yeni renk
        </button>
      </div>
      {adding && (
        <div className="pe-inline-add">
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} aria-label="Renk" />
          <input className="admin-input" placeholder="Renk adı (ör. Zeytin yeşili)" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <button type="button" className="pe-btn" onClick={create} disabled={state.saving}>{state.saving ? 'Ekleniyor…' : 'Palete ekle'}</button>
        </div>
      )}
      {state.error && <p className="pe-error">{state.error}</p>}
    </div>
  )
}

/* ================================================================ Etiket girişi (malzeme) */
const ChipInput = ({ values, onChange, suggestions, placeholder }) => {
  const [text, setText] = useState('')
  const add = (v) => {
    const clean = v.trim()
    if (!clean || values.some((x) => x.toLowerCase() === clean.toLowerCase())) return
    onChange([...values, clean])
    setText('')
  }
  return (
    <div>
      <div className="pe-chips">
        {values.map((v) => (
          <span key={v} className="pe-chip">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`${v} kaldır`}><FiX size={12} /></button>
          </span>
        ))}
        <input
          className="pe-chip-input"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text) }
            if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1))
          }}
          onBlur={() => add(text)}
        />
      </div>
      <div className="pe-suggest">
        {suggestions.filter((s) => !values.includes(s)).map((s) => (
          <button key={s} type="button" onClick={() => add(s)}>+ {s}</button>
        ))}
      </div>
    </div>
  )
}

/* ================================================================ Fiyatlı seçenekler */
const OptionGroups = ({ groups, onChange, basePrice, errors }) => {
  const update = (key, patch) => onChange(groups.map((g) => (g.key === key ? { ...g, ...patch } : g)))
  const addGroup = (preset) => onChange([
    ...groups,
    {
      key: newKey(),
      name: preset?.name || '',
      values: (preset?.values || ['']).map((label) => ({ key: newKey(), label, priceDelta: '' })),
    },
  ])

  return (
    <div className="pe-groups">
      {groups.map((g, gi) => (
        <div key={g.key} className="pe-group">
          <div className="pe-group-head">
            <input
              className="admin-input"
              placeholder="Seçenek adı (ör. Boyut)"
              value={g.name}
              onChange={(e) => update(g.key, { name: e.target.value })}
              maxLength={40}
            />
            <button type="button" className="pe-icon-btn" onClick={() => onChange(groups.filter((x) => x.key !== g.key))} aria-label="Seçeneği sil">
              <FiTrash2 size={14} />
            </button>
          </div>
          <div className="pe-values">
            <div className="pe-values-head"><span>Değer</span><span>Fiyat farkı</span><span>Satış fiyatı</span><span /></div>
            {g.values.map((v) => {
              const final = (Number(basePrice) || 0) + (Number(v.priceDelta) || 0)
              const setValue = (patch) => update(g.key, { values: g.values.map((x) => (x.key === v.key ? { ...x, ...patch } : x)) })
              return (
                <div key={v.key} className="pe-value">
                  <input className="admin-input" placeholder="ör. 18 cm" value={v.label} onChange={(e) => setValue({ label: e.target.value })} maxLength={60} />
                  <div className="pe-money">
                    <input
                      className="admin-input"
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={v.priceDelta}
                      onChange={(e) => setValue({ priceDelta: e.target.value })}
                    />
                    <span>₺</span>
                  </div>
                  <span className="pe-final">{formatPrice(final)}</span>
                  <button
                    type="button"
                    className="pe-icon-btn"
                    onClick={() => update(g.key, { values: g.values.filter((x) => x.key !== v.key) })}
                    disabled={g.values.length === 1}
                    aria-label="Değeri sil"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              className="pe-link-btn"
              onClick={() => update(g.key, { values: [...g.values, { key: newKey(), label: '', priceDelta: '' }] })}
            >
              <FiPlus size={13} /> Değer ekle
            </button>
          </div>
          {errors[`group${gi}`] && <p className="pe-error">{errors[`group${gi}`]}</p>}
        </div>
      ))}

      <div className="pe-group-add">
        {GROUP_PRESETS.filter((p) => !groups.some((g) => g.name === p.name)).map((p) => (
          <button key={p.name} type="button" className="pe-btn pe-btn--ghost" onClick={() => addGroup(p)}>
            <FiPlus size={13} /> {p.name}
          </button>
        ))}
        <button type="button" className="pe-btn pe-btn--ghost" onClick={() => addGroup()}>
          <FiPlus size={13} /> Özel seçenek
        </button>
      </div>
      <p className="pe-hint">
        Müşteri her seçenekten birini seçer; fiyat farkları satış fiyatına eklenir (indirim için eksi girin).
        İlk değer varsayılan seçili gelir.
      </p>
    </div>
  )
}

/* ================================================================ Form */
const Field = ({ label, hint, error, children, htmlFor }) => (
  <div className={`pe-field ${error ? 'has-error' : ''}`}>
    {label && <label htmlFor={htmlFor}>{label}</label>}
    {children}
    {error ? <p className="pe-error">{error}</p> : hint && <p className="pe-hint">{hint}</p>}
  </div>
)

const ProductForm = ({ productId, initial }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !productId

  const [form, setForm] = useState(initial.form)
  const [images, setImages] = useState(initial.images)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(null) // null | 'Kaydediliyor…' | 'Görsel 2/5…'
  const [notice, setNotice] = useState(null)
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial))

  const palette = usePalette()
  const categoriesQuery = useQuery({ queryKey: ['admin', 'categories'], queryFn: getAllCategoriesAdminApi })
  const categories = useMemo(() => buildCategoryTree(categoriesQuery.data?.data || []), [categoriesQuery.data])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const bind = (name) => ({ id: `pe-${name}`, value: form[name], onChange: (e) => set({ [name]: e.target.value }) })

  const dirty = JSON.stringify({ form, images: images.map(({ key, url, color }) => ({ key, url, color })) })
    !== JSON.stringify({ form: JSON.parse(savedSnapshot).form, images: JSON.parse(savedSnapshot).images.map(({ key, url, color }) => ({ key, url, color })) })

  // Kaydedilmemiş değişiklikle sekme kapatılırsa uyar
  useEffect(() => {
    if (!dirty) return undefined
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Önizleme URL'lerini temizle
  useEffect(() => () => images.forEach((i) => i.file && URL.revokeObjectURL(i.preview)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const off = discountPercent(form.price, form.oldPrice)
  const lead = formatLeadDays(
    form.leadMinDays === '' ? palette.leadDays.min : Number(form.leadMinDays),
    form.leadMaxDays === '' ? palette.leadDays.max : Number(form.leadMaxDays),
  )
  const priceRange = useMemo(() => {
    const base = Number(form.price) || 0
    let min = base
    let max = base
    for (const g of form.optionGroups) {
      const deltas = g.values.map((v) => Number(v.priceDelta) || 0)
      if (!deltas.length) continue
      min += Math.min(...deltas)
      max += Math.max(...deltas)
    }
    return { min, max }
  }, [form.price, form.optionGroups])

  const suggestSku = () => {
    const cat = categories.find((c) => c._id === form.categoryId || c.children.some((s) => s._id === form.categoryId))
    const prefix = toSlug(cat?.name || 'URN').replace(/-/g, '').slice(0, 3).toUpperCase()
    const word = toSlug(form.name).split('-')[0]?.slice(0, 4).toUpperCase() || 'X'
    set({ sku: `${prefix}-${word}-${Math.floor(100 + Math.random() * 900)}` })
  }

  const save = async (publish) => {
    const nextForm = publish === undefined ? form : { ...form, isActive: publish }
    const errs = validate(nextForm, images)
    setErrors(errs)
    setNotice(null)
    if (Object.keys(errs).length) {
      setNotice({ type: 'error', text: 'Kaydetmeden önce işaretli alanları düzeltin.' })
      document.querySelector('.pe-field.has-error, .pe-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSaving('Kaydediliyor…')
    try {
      const existing = images.filter((i) => i.url)
      const payload = toPayload(nextForm, categories, existing)
      const res = isNew ? await createProductApi(payload) : await updateProductApi(productId, payload)
      const id = res.data._id

      // Yeni görselleri sırayla yükle (küçültülerek)
      const pending = images.filter((i) => i.file)
      const uploaded = new Map()
      for (const [n, img] of pending.entries()) {
        setSaving(`Görsel yükleniyor ${n + 1}/${pending.length}…`)
        const file = await prepareImage(img.file)
        const fd = new FormData()
        fd.append('image', file)
        if (img.color) fd.append('imageColor', img.color)
        const up = await uploadProductImageApi(id, fd)
        uploaded.set(img.key, up.data.images[up.data.images.length - 1])
      }

      let finalProduct = res.data
      if (pending.length) {
        // Kullanıcının belirlediği sıra ve renk eşleşmeleriyle son hali yaz
        const ordered = images.map((i) => ({ ...i, url: i.url || uploaded.get(i.key) })).filter((i) => i.url)
        const fin = await updateProductApi(id, {
          images: ordered.map((i) => i.url),
          imageVariants: ordered.map((i) => ({ url: i.url, color: i.color })),
          colors: nextForm.colors,
        })
        finalProduct = fin.data
      }

      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', id] })
      const fresh = fromProduct(finalProduct)
      setForm(fresh.form)
      setImages(fresh.images)
      setSavedSnapshot(JSON.stringify(fresh))
      setNotice({ type: 'ok', text: nextForm.isActive ? 'Kaydedildi, ürün mağazada yayında.' : 'Taslak kaydedildi.' })
      if (isNew) navigate(`/admin/products/${id}`, { replace: true })
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.' })
    } finally {
      setSaving(null)
    }
  }

  const duplicate = async () => {
    if (dirty && !window.confirm('Kaydedilmemiş değişiklikler kopyaya aktarılmaz. Devam edilsin mi?')) return
    try {
      const res = await duplicateProductApi(productId)
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      navigate(`/admin/products/${res.data._id}`)
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Kopyalanamadı.' })
    }
  }

  const remove = async () => {
    if (!window.confirm(`"${form.name}" kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return
    try {
      await deleteProductApi(productId)
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      navigate('/admin/products')
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Silinemedi.' })
    }
  }

  const pers = form.personalization
  const setPers = (patch) => set({ personalization: { ...pers, ...patch } })
  const storeSlug = initial.slug

  return (
    <div className="pe">
      {/* Üst çubuk */}
      <div className="pe-bar">
        <Link to="/admin/products" className="pe-back"><FiArrowLeft size={16} /> Ürünler</Link>
        <div className="pe-bar-title">
          <h1>{isNew ? 'Yeni ürün' : form.name || 'Ürün'}</h1>
          <span className={`pe-status ${form.isActive ? 'is-live' : ''}`}>{form.isActive ? 'Yayında' : 'Taslak'}</span>
          {dirty && <span className="pe-dirty">Kaydedilmemiş değişiklik</span>}
        </div>
        <div className="pe-bar-actions">
          {!isNew && storeSlug && form.isActive && (
            <a className="pe-btn pe-btn--ghost" href={`/product/${storeSlug}`} target="_blank" rel="noreferrer">
              <FiExternalLink size={14} /> Mağazada gör
            </a>
          )}
          {form.isActive ? (
            <button type="button" className="pe-btn pe-btn--ghost" onClick={() => save(false)} disabled={Boolean(saving)}>Taslağa al</button>
          ) : (
            <button type="button" className="pe-btn pe-btn--ghost" onClick={() => save(false)} disabled={Boolean(saving)}>Taslak kaydet</button>
          )}
          <button type="button" className="pe-btn pe-btn--primary" onClick={() => save(true)} disabled={Boolean(saving)}>
            {saving || (form.isActive ? 'Kaydet' : 'Kaydet ve yayınla')}
          </button>
        </div>
      </div>

      {notice && (
        <div className={`pe-notice ${notice.type === 'ok' ? 'is-ok' : 'is-error'}`} role={notice.type === 'ok' ? 'status' : 'alert'}>
          {notice.type === 'ok' ? <FiCheck /> : <FiAlertCircle />} {notice.text}
        </div>
      )}

      <div className="pe-layout">
        <div className="pe-main">
          <section className="pe-card">
            <h2>Ürün bilgisi</h2>
            <Field label="Ürün adı *" error={errors.name} htmlFor="pe-name">
              <input className="admin-input" {...bind('name')} placeholder="ör. Ork Savaşçı Figürü" maxLength={120} />
            </Field>
            <Field label="Kısa açıklama" hint="Başlığın altında tek satır: ölçü, öne çıkan özellik." htmlFor="pe-shortDesc">
              <input className="admin-input" {...bind('shortDesc')} placeholder="ör. Baltalı ork savaşçı, 18 cm yükseklik." maxLength={160} />
            </Field>
            <Field label="Açıklama" error={errors.description} htmlFor="pe-description">
              <textarea className="admin-textarea" rows={6} {...bind('description')} placeholder="Ürünü, kullanım alanını, baskı detaylarını anlatın." />
            </Field>
          </section>

          <section className="pe-card">
            <h2>Görseller</h2>
            <ImageManager
              images={images}
              setImages={setImages}
              colors={form.colors}
              colorName={palette.colorName}
              error={errors.images}
            />
          </section>

          <section className="pe-card">
            <h2>Fiyat</h2>
            <div className="pe-grid-3">
              <Field label="Satış fiyatı *" error={errors.price} htmlFor="pe-price">
                <div className="pe-money"><input className="admin-input" type="number" min="0" step="0.01" {...bind('price')} /><span>₺</span></div>
              </Field>
              <Field label="İndirimden önceki fiyat" error={errors.oldPrice} hint="Doluysa üstü çizili gösterilir." htmlFor="pe-oldPrice">
                <div className="pe-money"><input className="admin-input" type="number" min="0" step="0.01" {...bind('oldPrice')} /><span>₺</span></div>
              </Field>
              <div className="pe-price-preview">
                <span>Müşteri görür</span>
                <strong>
                  {priceRange.min !== priceRange.max
                    ? `${formatPrice(priceRange.min)} – ${formatPrice(priceRange.max)}`
                    : formatPrice(form.price)}
                </strong>
                {off && <em>%{off} indirim</em>}
              </div>
            </div>
          </section>

          <section className="pe-card">
            <h2>Stok ve hazırlık</h2>
            <div className="pe-toggle-row" role="radiogroup" aria-label="Stok türü">
              <button type="button" role="radio" aria-checked={form.madeToOrder} className={`pe-choice ${form.madeToOrder ? 'is-on' : ''}`} onClick={() => set({ madeToOrder: true })}>
                <strong>Siparişe özel basılır</strong>
                <span>Stok sınırı yok, her zaman satılabilir.</span>
              </button>
              <button type="button" role="radio" aria-checked={!form.madeToOrder} className={`pe-choice ${!form.madeToOrder ? 'is-on' : ''}`} onClick={() => set({ madeToOrder: false })}>
                <strong>Stoktan satılır</strong>
                <span>Elde hazır adet kadar satılır; bitince “Stokta yok”.</span>
              </button>
            </div>
            <div className="pe-grid-3">
              {!form.madeToOrder && (
                <Field label="Stok adedi *" error={errors.stock} htmlFor="pe-stock">
                  <input className="admin-input" type="number" min="0" step="1" {...bind('stock')} />
                </Field>
              )}
              <Field label="Stok kodu (SKU)" hint="Toplu yüklemede görselleri eşleştirmek için kullanılır." htmlFor="pe-sku">
                <div className="pe-with-btn">
                  <input className="admin-input" {...bind('sku')} placeholder="ör. FIG-ORK-01" maxLength={40} />
                  <button type="button" className="pe-icon-btn" onClick={suggestSku} title="Otomatik oluştur" aria-label="SKU oluştur"><FiRefreshCw size={14} /></button>
                </div>
              </Field>
              <Field label="Kargoya veriliş (iş günü)" error={errors.lead} hint={`Müşteri görür: ${lead}. Boş bırakılırsa varsayılan kullanılır.`}>
                <div className="pe-range">
                  <input className="admin-input" type="number" min="0" max="60" placeholder={String(palette.leadDays.min)} {...bind('leadMinDays')} aria-label="En az gün" />
                  <span>–</span>
                  <input className="admin-input" type="number" min="0" max="60" placeholder={String(palette.leadDays.max)} {...bind('leadMaxDays')} aria-label="En fazla gün" />
                </div>
              </Field>
            </div>
          </section>

          <section className="pe-card">
            <h2>Renk ve malzeme</h2>
            <Field label="Renkler" hint="Fiyatı etkilemez. Seçili renkler ürün sayfasında renk düğmesi olarak çıkar.">
              <ColorPicker
                selected={form.colors}
                onChange={(colors) => set({ colors })}
                palette={palette.colors}
                onCreated={palette.refetch}
              />
            </Field>
            <Field label="Malzemeler" hint="Fiyatı etkilemez. Fiyat farkı varsa aşağıda “Malzeme” adında fiyatlı seçenek açın.">
              <ChipInput values={form.material} onChange={(material) => set({ material })} suggestions={MATERIAL_SUGGESTIONS} placeholder="Malzeme yazıp Enter" />
            </Field>
          </section>

          <section className="pe-card">
            <h2>Fiyatlı seçenekler <span className="pe-optional">isteğe bağlı</span></h2>
            <OptionGroups
              groups={form.optionGroups}
              onChange={(optionGroups) => set({ optionGroups })}
              basePrice={form.price}
              errors={errors}
            />
          </section>

          <section className="pe-card">
            <h2>Kişiselleştirme <span className="pe-optional">isteğe bağlı</span></h2>
            <label className="pe-switch">
              <input type="checkbox" checked={pers.enabled} onChange={(e) => setPers({ enabled: e.target.checked })} />
              <span>Müşteri ürüne yazı/isim ekleyebilsin</span>
            </label>
            {pers.enabled && (
              <div className="pe-grid-3 pe-mt">
                <Field label="Alan başlığı" htmlFor="pe-pers-label">
                  <input id="pe-pers-label" className="admin-input" value={pers.label} onChange={(e) => setPers({ label: e.target.value })} maxLength={60} />
                </Field>
                <Field label="En fazla karakter" htmlFor="pe-pers-max">
                  <input id="pe-pers-max" className="admin-input" type="number" min="1" max="120" value={pers.maxLength} onChange={(e) => setPers({ maxLength: e.target.value })} />
                </Field>
                <Field label="Ek ücret" htmlFor="pe-pers-price">
                  <div className="pe-money"><input id="pe-pers-price" className="admin-input" type="number" min="0" step="0.01" placeholder="0" value={pers.priceDelta} onChange={(e) => setPers({ priceDelta: e.target.value })} /><span>₺</span></div>
                </Field>
                <label className="pe-switch">
                  <input type="checkbox" checked={pers.required} onChange={(e) => setPers({ required: e.target.checked })} />
                  <span>Zorunlu</span>
                </label>
              </div>
            )}
          </section>

          <section className="pe-card">
            <h2>Baskı künyesi</h2>
            <div className="pe-grid-3">
              <Field label="Genişlik (cm)" htmlFor="pe-width"><input className="admin-input" type="number" min="0" step="0.1" {...bind('width')} /></Field>
              <Field label="Yükseklik (cm)" htmlFor="pe-height"><input className="admin-input" type="number" min="0" step="0.1" {...bind('height')} /></Field>
              <Field label="Derinlik (cm)" htmlFor="pe-depth"><input className="admin-input" type="number" min="0" step="0.1" {...bind('depth')} /></Field>
              <Field label="Ağırlık (g)" htmlFor="pe-weight"><input className="admin-input" type="number" min="0" {...bind('weight')} /></Field>
              <Field label="Baskı süresi (saat)" htmlFor="pe-printTime"><input className="admin-input" type="number" min="0" step="0.5" {...bind('printTime')} /></Field>
              <Field label="Zorluk" htmlFor="pe-difficulty">
                <select className="admin-input" {...bind('difficulty')}>
                  {['Kolay', 'Orta', 'Zor'].map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
            </div>
            <p className="pe-hint">Ölçülerin üçü de doluysa ürün sayfasında gösterilir.</p>
          </section>
        </div>

        {/* Yan sütun */}
        <aside className="pe-side">
          <section className="pe-card">
            <h2>Kategori *</h2>
            <Field error={errors.categoryId}>
              <select className="admin-input" {...bind('categoryId')} aria-label="Kategori">
                <option value="">Seçin…</option>
                {categories.map((c) => (
                  <optgroup key={c._id} label={c.name}>
                    <option value={c._id}>{c.name} (genel)</option>
                    {c.children.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Link to="/admin/categories" className="pe-link-btn">Kategorileri yönet →</Link>
          </section>

          <section className="pe-card">
            <h2>Vitrin</h2>
            <label className="pe-switch">
              <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} />
              <span>Ana sayfada öne çıkar</span>
            </label>
            <Field label="Rozet" htmlFor="pe-badge">
              <select className="admin-input" {...bind('badge')}>
                {BADGES.map((b) => <option key={b} value={b}>{b || 'Yok'}</option>)}
              </select>
            </Field>
          </section>

          <section className="pe-card">
            <h2>Arama ve SEO</h2>
            <Field label="Etiketler" hint="Virgülle ayırın; mağaza aramasında kullanılır." htmlFor="pe-tags">
              <input className="admin-input" {...bind('tags')} placeholder="ork, figür, warhammer" />
            </Field>
            <Field label="SEO başlığı" hint={`${form.metaTitle.length}/60 · boşsa ürün adı kullanılır`} htmlFor="pe-metaTitle">
              <input className="admin-input" {...bind('metaTitle')} maxLength={70} />
            </Field>
            <Field label="SEO açıklaması" hint={`${form.metaDesc.length}/160 · boşsa kısa açıklama kullanılır`} htmlFor="pe-metaDesc">
              <textarea className="admin-textarea" rows={3} {...bind('metaDesc')} maxLength={170} />
            </Field>
          </section>

          {!isNew && (
            <section className="pe-card pe-danger">
              <button type="button" className="pe-btn pe-btn--ghost" onClick={duplicate}><FiCopy size={14} /> Kopyasını oluştur</button>
              <button type="button" className="pe-btn pe-btn--danger" onClick={remove}><FiTrash2 size={14} /> Ürünü sil</button>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

const AdminProductEditor = () => {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const query = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => getProductAdminApi(id).then((r) => r.data),
    enabled: !isNew,
    staleTime: 0,
  })

  if (isNew) {
    return <ProductForm key="new" initial={{ form: emptyForm, images: [] }} />
  }
  if (query.isPending) return <div className="pe-loading"><FiRefreshCw className="spin" /> Ürün yükleniyor…</div>
  if (query.isError) {
    return (
      <div className="pe-loading">
        Ürün bulunamadı. <Link to="/admin/products">Ürünlere dön</Link>
      </div>
    )
  }
  return <ProductForm key={id} productId={id} initial={{ ...fromProduct(query.data), slug: query.data.slug }} />
}

export default AdminProductEditor

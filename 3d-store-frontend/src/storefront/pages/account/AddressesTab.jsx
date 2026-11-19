import { useState } from 'react'
import { FiPlus, FiMapPin } from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext'
import { addAddressApi, updateAddressApi, deleteAddressApi } from '../../../api/authApi'
import { TR_CITIES } from '../../trCities'

const TITLES = ['Ev', 'İş', 'Diğer']

const AddressForm = ({ initial, onCancel, onSaved, isFirst }) => {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [state, setState] = useState({ saving: false, error: '' })

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!form.fullName.trim()) er.fullName = 'Ad soyad gerekli.'
    if (form.phone.replace(/\D/g, '').length < 10) er.phone = 'Geçerli bir telefon gir.'
    if (!form.city) er.city = 'İl seç.'
    if (!form.district.trim()) er.district = 'İlçe gerekli.'
    if (form.address.trim().length < 10) er.address = 'Sokak, bina ve daire bilgisini yaz.'
    setErrors(er)
    if (Object.keys(er).length) return

    setState({ saving: true, error: '' })
    try {
      const payload = {
        ...form,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        district: form.district.trim(),
        neighborhood: form.neighborhood.trim(),
        address: form.address.trim(),
      }
      const res = form._id ? await updateAddressApi(form._id, payload) : await addAddressApi(payload)
      onSaved(res.data, form._id ? 'Adres güncellendi.' : 'Adres eklendi.')
    } catch (err) {
      setState({ saving: false, error: err.response?.data?.message || 'Adres kaydedilemedi.' })
    }
  }

  return (
    <form className="ac-panel" onSubmit={submit} noValidate>
      <h3>{form._id ? 'Adresi düzenle' : 'Yeni adres'}</h3>
      <div className="sf-chips ac-titles" role="radiogroup" aria-label="Adres başlığı">
        {TITLES.map((t) => (
          <button key={t} type="button" role="radio" aria-checked={form.title === t}
            className={`sf-chip ${form.title === t ? 'is-active' : ''}`} onClick={() => setForm((f) => ({ ...f, title: t }))}>
            {t}
          </button>
        ))}
      </div>
      <div className="sf-form-grid">
        <label className={`sf-field ${errors.fullName ? 'has-error' : ''}`}>
          <span className="sf-field-label">Ad soyad</span>
          <input value={form.fullName} onChange={set('fullName')} autoComplete="name" />
          {errors.fullName && <span className="sf-field-error">{errors.fullName}</span>}
        </label>
        <label className={`sf-field ${errors.phone ? 'has-error' : ''}`}>
          <span className="sf-field-label">Telefon</span>
          <input value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" placeholder="05xx xxx xx xx" />
          {errors.phone && <span className="sf-field-error">{errors.phone}</span>}
        </label>
        <label className={`sf-field ${errors.city ? 'has-error' : ''}`}>
          <span className="sf-field-label">İl</span>
          <select value={form.city} onChange={set('city')} autoComplete="address-level1">
            <option value="">Seç</option>
            {/* Eski serbest metin adreslerde il listede yoksa kaybolmasın */}
            {form.city && !TR_CITIES.includes(form.city) && <option value={form.city}>{form.city}</option>}
            {TR_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.city && <span className="sf-field-error">{errors.city}</span>}
        </label>
        <label className={`sf-field ${errors.district ? 'has-error' : ''}`}>
          <span className="sf-field-label">İlçe</span>
          <input value={form.district} onChange={set('district')} autoComplete="address-level2" />
          {errors.district && <span className="sf-field-error">{errors.district}</span>}
        </label>
        <label className="sf-field is-wide">
          <span className="sf-field-label">Mahalle (isteğe bağlı)</span>
          <input value={form.neighborhood} onChange={set('neighborhood')} />
        </label>
        <label className={`sf-field is-wide ${errors.address ? 'has-error' : ''}`}>
          <span className="sf-field-label">Adres</span>
          <textarea rows={3} value={form.address} onChange={set('address')} autoComplete="street-address" placeholder="Sokak, bina no, daire" />
          {errors.address && <span className="sf-field-error">{errors.address}</span>}
        </label>
        {!isFirst && (
          <label className="sf-check is-wide">
            <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} />
            <span>Varsayılan teslimat adresim olsun</span>
          </label>
        )}
      </div>
      {state.error && <p className="sf-submit-error" role="alert">{state.error}</p>}
      <div className="ac-panel-actions">
        <button type="submit" className="sf-btn sf-btn--ink" disabled={state.saving}>{state.saving ? 'Kaydediliyor…' : 'Adresi kaydet'}</button>
        <button type="button" className="sf-link-btn" onClick={onCancel}>Vazgeç</button>
      </div>
    </form>
  )
}

const AddressesTab = ({ notify }) => {
  const { user, setUser } = useAuth()
  const addresses = user?.addresses || []
  const [editing, setEditing] = useState(null) // adres nesnesi ya da 'new'
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [busy, setBusy] = useState(null)

  const blank = {
    title: 'Ev',
    fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    phone: user?.phone || '',
    city: '', district: '', neighborhood: '', address: '',
    isDefault: addresses.length === 0,
  }

  const saved = (list, msg) => {
    setUser((prev) => ({ ...prev, addresses: list || [] }))
    setEditing(null)
    notify(msg)
  }

  const makeDefault = async (addr) => {
    setBusy(addr._id)
    try {
      const res = await updateAddressApi(addr._id, { ...addr, isDefault: true })
      saved(res.data, 'Varsayılan adres değişti.')
    } catch (err) {
      notify(err.response?.data?.message || 'Adres güncellenemedi.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (addr) => {
    setBusy(addr._id)
    try {
      const res = await deleteAddressApi(addr._id)
      setUser((prev) => ({ ...prev, addresses: res.data || [] }))
      setConfirmDelete(null)
      notify('Adres silindi.')
    } catch (err) {
      notify(err.response?.data?.message || 'Adres silinemedi.', 'error')
    } finally {
      setBusy(null)
    }
  }

  if (editing) {
    return (
      <AddressForm
        initial={editing === 'new' ? blank : { neighborhood: '', title: 'Ev', ...editing }}
        isFirst={addresses.length === 0}
        onCancel={() => setEditing(null)}
        onSaved={saved}
      />
    )
  }

  return (
    <div className="ac-addresses">
      {addresses.map((a) => (
        <article key={a._id} className={`ac-address ${a.isDefault ? 'is-default' : ''}`}>
          <header>
            <strong>{a.title || 'Adres'}</strong>
            {a.isDefault && <span className="ac-pill">Varsayılan</span>}
          </header>
          <p>
            {a.fullName} · <span className="sf-mono">{a.phone}</span><br />
            {a.address}{a.neighborhood ? `, ${a.neighborhood}` : ''}<br />
            {a.district} / {a.city}
          </p>

          {confirmDelete === a._id ? (
            <div className="ac-inline-confirm">
              <span>Bu adres silinsin mi?</span>
              <button type="button" className="sf-link-btn ac-danger" onClick={() => remove(a)} disabled={busy === a._id}>Sil</button>
              <button type="button" className="sf-link-btn" onClick={() => setConfirmDelete(null)}>Vazgeç</button>
            </div>
          ) : (
            <div className="ac-address-actions">
              <button type="button" className="sf-link-btn" onClick={() => setEditing(a)}>Düzenle</button>
              {!a.isDefault && (
                <button type="button" className="sf-link-btn" onClick={() => makeDefault(a)} disabled={busy === a._id}>Varsayılan yap</button>
              )}
              <button type="button" className="sf-link-btn ac-muted" onClick={() => setConfirmDelete(a._id)}>Sil</button>
            </div>
          )}
        </article>
      ))}

      <button type="button" className="ac-address ac-address--new" onClick={() => setEditing('new')}>
        {addresses.length === 0 ? <FiMapPin aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
        <strong>{addresses.length === 0 ? 'İlk adresini ekle' : 'Yeni adres ekle'}</strong>
        <span>Ödeme sırasında tek tıkla seçersin.</span>
      </button>
    </div>
  )
}

export default AddressesTab

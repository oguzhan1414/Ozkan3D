import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiCreditCard, FiImage, FiTruck, FiBell, FiShield, FiPlus, FiTrash2, FiArrowUp, FiArrowDown,
  FiUpload, FiX, FiRefreshCw, FiSearch, FiUserPlus,
} from 'react-icons/fi'
import { getSettingsFreshApi, updateSettingsApi, uploadHeroImageApi } from '../../api/settingsApi'
import { getUsersApi, updateUserApi } from '../../api/userApi'
import { useAuth } from '../../context/AuthContext'
import { prepareImage, isImageFile } from '../../utils/prepareImage'
import {
  PageHeader, Segment, Empty, useToast, useConfirm, useDebounced, errorText, dateOnly,
} from './ui/AdminUI'
import './AdminSettings.css'

const TABS = [
  { id: 'store', label: 'Mağaza', icon: FiCreditCard },
  { id: 'home', label: 'Ana sayfa', icon: FiImage },
  { id: 'shipping', label: 'Kargo', icon: FiTruck },
  { id: 'notify', label: 'Bildirimler', icon: FiBell },
  { id: 'admins', label: 'Yöneticiler', icon: FiShield },
]

// Formda düzenlenen alanlar (diğer ayar sütunları gönderilmez)
const FIELDS = [
  'bankName', 'bankOwner', 'bankIban', 'defaultLeadMinDays', 'defaultLeadMaxDays', 'lowStockThreshold',
  'heroSlides', 'localShippingCost', 'nearShippingCost', 'standardShippingCost', 'farShippingCost',
  'expressShippingSurcharge', 'carriers', 'notifyNewOrder', 'notifyNewCustomer',
]
const pick = (s) => Object.fromEntries(FIELDS.map((k) => [k, s?.[k] ?? (k === 'heroSlides' || k === 'carriers' ? [] : '')]))

const Money = ({ id, value, onChange }) => (
  <div className="ak-money">
    <input id={id} className="ak-input" type="number" min="0" step="1" value={value} onChange={(e) => onChange(e.target.value)} />
    <span>₺</span>
  </div>
)

/* ================================================================ Slider */
const HeroSlides = ({ slides, onChange }) => {
  const toast = useToast()
  const [uploading, setUploading] = useState(null)
  const inputs = useRef({})

  const update = (i, patch) => onChange(slides.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const move = (i, dir) => {
    const next = [...slides]
    const [item] = next.splice(i, 1)
    next.splice(i + dir, 0, item)
    onChange(next.map((s, j) => ({ ...s, sortOrder: j })))
  }
  const upload = async (i, file) => {
    if (!file || !isImageFile(file)) return
    setUploading(i)
    try {
      const res = await uploadHeroImageApi(await prepareImage(file))
      update(i, { imageUrl: res.url })
      toast.info('Görsel yüklendi. Kalıcı olması için “Kaydet”e basın.')
    } catch (err) {
      toast.error(err, 'Görsel yüklenemedi.')
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="st-slides">
      {slides.length === 0 && <Empty icon={FiImage} title="Henüz slider görseli yok" />}
      {slides.map((s, i) => (
        <div key={s._id || i} className={`st-slide ${s.isActive === false ? 'is-off' : ''}`}>
          <button
            type="button"
            className="st-slide-img"
            onClick={() => inputs.current[i]?.click()}
            aria-label="Görsel seç"
          >
            {s.imageUrl ? <img src={s.imageUrl} alt="" /> : <span><FiUpload /> Görsel seç</span>}
            {uploading === i && <span className="st-slide-busy"><FiRefreshCw className="spin" /></span>}
          </button>
          <input ref={(el) => { inputs.current[i] = el }} type="file" accept="image/*" hidden onChange={(e) => { upload(i, e.target.files?.[0]); e.target.value = '' }} />

          <div className="st-slide-fields">
            <div className="ak-grid-2">
              <div className="ak-field">
                <label htmlFor={`st-title-${i}`}>Başlık</label>
                <input id={`st-title-${i}`} className="ak-input" value={s.title || ''} maxLength={80} onChange={(e) => update(i, { title: e.target.value })} placeholder="ör. Katman katman, siparişe özel" />
              </div>
              <div className="ak-field">
                <label htmlFor={`st-alt-${i}`}>Görsel açıklaması (erişilebilirlik)</label>
                <input id={`st-alt-${i}`} className="ak-input" value={s.altText || ''} maxLength={140} onChange={(e) => update(i, { altText: e.target.value })} placeholder="Görselde ne var?" />
              </div>
            </div>
            <div className="ak-field">
              <label htmlFor={`st-sub-${i}`}>Alt yazı</label>
              <input id={`st-sub-${i}`} className="ak-input" value={s.subtitle || ''} maxLength={160} onChange={(e) => update(i, { subtitle: e.target.value })} />
            </div>
            <div className="ak-grid-2">
              <div className="ak-field">
                <label htmlFor={`st-cta-${i}`}>Buton yazısı</label>
                <input id={`st-cta-${i}`} className="ak-input" value={s.ctaLabel || ''} maxLength={40} onChange={(e) => update(i, { ctaLabel: e.target.value })} placeholder="ör. Mağazayı gez" />
              </div>
              <div className="ak-field">
                <label htmlFor={`st-href-${i}`}>Buton bağlantısı</label>
                <input id={`st-href-${i}`} className="ak-input" value={s.ctaHref || ''} maxLength={300} onChange={(e) => update(i, { ctaHref: e.target.value })} placeholder="/shop ya da https://…" />
              </div>
            </div>
          </div>

          <div className="st-slide-tools">
            <label className="ak-check"><input type="checkbox" checked={s.isActive !== false} onChange={(e) => update(i, { isActive: e.target.checked })} /> Yayında</label>
            <button type="button" className="ak-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Yukarı taşı"><FiArrowUp /></button>
            <button type="button" className="ak-icon-btn" onClick={() => move(i, 1)} disabled={i === slides.length - 1} aria-label="Aşağı taşı"><FiArrowDown /></button>
            <button type="button" className="ak-icon-btn st-del" onClick={() => onChange(slides.filter((_, j) => j !== i))} aria-label="Slaytı sil"><FiTrash2 /></button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="ak-btn"
        onClick={() => onChange([...slides, { imageUrl: '', altText: '', title: '', subtitle: '', ctaLabel: '', ctaHref: '/shop', isActive: true, sortOrder: slides.length }])}
      >
        <FiPlus /> Slayt ekle
      </button>
      <p className="ak-hint">Görseller yüklenirken küçültülüp WebP’ye çevrilir. Yatay (16:9) görseller en iyi sonucu verir.</p>
    </div>
  )
}

/* ================================================================ Yöneticiler */
const Admins = () => {
  const toast = useToast()
  const confirm = useConfirm()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const term = useDebounced(search.trim())

  const adminsQuery = useQuery({ queryKey: ['admin', 'admins'], queryFn: () => getUsersApi({ role: 'admin', limit: 50 }) })
  const candidatesQuery = useQuery({
    queryKey: ['admin', 'admin-candidates', term],
    queryFn: () => getUsersApi({ role: 'user', search: term, limit: 5 }),
    enabled: term.length >= 3,
  })

  const setRole = async (u, role) => {
    const ok = await confirm(role === 'admin'
      ? { title: `${u.fullName || u.email} yönetici yapılsın mı?`, message: 'Bu kişi siparişleri, müşterileri ve tüm ayarları görebilir ve değiştirebilir.', confirmLabel: 'Yönetici yap' }
      : { title: `${u.fullName || u.email} yöneticilikten çıkarılsın mı?`, message: 'Hesabı normal müşteri hesabına döner.', confirmLabel: 'Yetkiyi kaldır', danger: true })
    if (!ok) return
    try {
      await updateUserApi(u._id, { role })
      toast.ok(role === 'admin' ? 'Yönetici eklendi.' : 'Yönetici yetkisi kaldırıldı.')
      setSearch('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'admin-candidates'] })
    } catch (err) {
      toast.error(err)
    }
  }

  const admins = adminsQuery.data?.data || []
  const candidates = candidatesQuery.data?.data || []

  return (
    <div className="st-admins">
      <ul className="st-admin-list">
        {admins.map((a) => (
          <li key={a._id}>
            <span className="st-avatar">{`${a.firstName?.[0] || ''}${a.lastName?.[0] || ''}`.toUpperCase()}</span>
            <span className="st-admin-info">
              <strong>{a.fullName}{a._id === user?._id && <span className="ak-tag">Siz</span>}</strong>
              <span className="ak-sub">{a.email} · {dateOnly(a.createdAt)}</span>
            </span>
            {a._id !== user?._id && (
              <button type="button" className="ak-btn ak-btn--sm ak-btn--ghost-danger" onClick={() => setRole(a, 'user')}>Yetkiyi kaldır</button>
            )}
          </li>
        ))}
      </ul>

      <div className="ak-field st-add-admin">
        <label htmlFor="st-admin-search"><FiUserPlus /> Yönetici ekle</label>
        <label className="ak-search">
          <FiSearch />
          <input id="st-admin-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Müşterinin e-postası veya adı (en az 3 harf)" />
        </label>
        {term.length >= 3 && (
          <ul className="st-candidates">
            {candidatesQuery.isPending && <li className="ak-muted">Aranıyor…</li>}
            {!candidatesQuery.isPending && candidates.length === 0 && <li className="ak-muted">Eşleşen müşteri yok. Kişinin önce siteye üye olması gerekir.</li>}
            {candidates.map((c) => (
              <li key={c._id}>
                <span><strong>{c.fullName}</strong> <span className="ak-sub">{c.email}</span></span>
                <button type="button" className="ak-btn ak-btn--sm" onClick={() => setRole(c, 'admin')}>Yönetici yap</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ================================================================ Sayfa */
const AdminSettings = () => {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('store')
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(null)
  const [saving, setSaving] = useState(false)
  const [carrierText, setCarrierText] = useState('')

  const query = useQuery({ queryKey: ['admin', 'settings'], queryFn: getSettingsFreshApi, staleTime: 0 })

  // Sunucudan gelen ilk değerler forma bir kez aktarılır
  useEffect(() => {
    if (query.data?.data && !form) {
      const initial = pick(query.data.data)
      setForm(initial)
      setSaved(JSON.stringify(initial))
    }
  }, [query.data, form])

  if (query.isPending || !form) {
    return <div className="ak-page"><PageHeader title="Ayarlar" /><div className="ak-card ak-loading"><FiRefreshCw className="spin" /> Yükleniyor…</div></div>
  }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const dirty = JSON.stringify(form) !== saved

  const save = async () => {
    setSaving(true)
    try {
      const res = await updateSettingsApi({
        ...form,
        heroSlides: form.heroSlides.filter((s) => s.imageUrl),
      })
      const next = pick(res.data)
      setForm(next)
      setSaved(JSON.stringify(next))
      queryClient.setQueryData(['admin', 'settings'], res)
      queryClient.setQueryData(['settings'], res)
      queryClient.invalidateQueries({ queryKey: ['home-bootstrap'] })
      queryClient.invalidateQueries({ queryKey: ['colors'] })
      toast.ok('Ayarlar kaydedildi.')
    } catch (err) {
      toast.error(errorText(err, 'Ayarlar kaydedilemedi.'))
    } finally {
      setSaving(false)
    }
  }

  const addCarrier = () => {
    const name = carrierText.trim()
    if (!name || form.carriers.includes(name)) return
    set({ carriers: [...form.carriers, name] })
    setCarrierText('')
  }

  return (
    <div className="ak-page st-page">
      <PageHeader title="Ayarlar" sub="Mağaza, ana sayfa, kargo ve yönetici ayarları">
        {tab !== 'admins' && (
          <>
            {dirty && <span className="st-dirty">Kaydedilmemiş değişiklik var</span>}
            <button type="button" className="ak-btn" onClick={() => setForm(JSON.parse(saved))} disabled={!dirty || saving}>Vazgeç</button>
            <button type="button" className="ak-btn ak-btn--primary" onClick={save} disabled={!dirty || saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </>
        )}
      </PageHeader>

      <Segment items={TABS} value={tab} onChange={setTab} label="Ayar bölümü" />

      {tab === 'store' && (
        <div className="st-grid">
          <section className="ak-card ak-card-pad st-card">
            <h3>Havale / EFT bilgileri</h3>
            <p className="ak-hint">Ödeme sayfasında, sipariş sonucunda ve müşterinin siparişlerinde gösterilir.</p>
            <div className="ak-field"><label htmlFor="st-bank">Banka</label><input id="st-bank" className="ak-input" value={form.bankName} onChange={(e) => set({ bankName: e.target.value })} maxLength={80} /></div>
            <div className="ak-field"><label htmlFor="st-owner">Hesap sahibi</label><input id="st-owner" className="ak-input" value={form.bankOwner} onChange={(e) => set({ bankOwner: e.target.value })} maxLength={80} /></div>
            <div className="ak-field"><label htmlFor="st-iban">IBAN</label><input id="st-iban" className="ak-input st-mono" value={form.bankIban} onChange={(e) => set({ bankIban: e.target.value.toUpperCase() })} placeholder="TR00 0000 0000 0000 0000 0000 00" maxLength={40} /></div>
          </section>

          <section className="ak-card ak-card-pad st-card">
            <h3>Hazırlık ve stok</h3>
            <div className="ak-field">
              <span className="ak-label">Varsayılan kargoya veriliş süresi (iş günü)</span>
              <div className="st-range">
                <input className="ak-input" type="number" min="0" max="60" value={form.defaultLeadMinDays} onChange={(e) => set({ defaultLeadMinDays: e.target.value })} aria-label="En az gün" />
                <span>–</span>
                <input className="ak-input" type="number" min="0" max="60" value={form.defaultLeadMaxDays} onChange={(e) => set({ defaultLeadMaxDays: e.target.value })} aria-label="En fazla gün" />
              </div>
              <p className="ak-hint">Ürüne özel süre girilmemişse ürün sayfasında bu gösterilir.</p>
            </div>
            <div className="ak-field">
              <label htmlFor="st-low">Düşük stok uyarı eşiği</label>
              <input id="st-low" className="ak-input" type="number" min="0" value={form.lowStockThreshold} onChange={(e) => set({ lowStockThreshold: e.target.value })} />
              <p className="ak-hint">Stoktan satılan ürünlerde bu adet ve altı Genel Bakış’ta uyarı olarak görünür.</p>
            </div>
          </section>
        </div>
      )}

      {tab === 'home' && (
        <section className="ak-card ak-card-pad st-card">
          <h3>Ana sayfa slider</h3>
          <HeroSlides slides={form.heroSlides} onChange={(heroSlides) => set({ heroSlides })} />
        </section>
      )}

      {tab === 'shipping' && (
        <div className="st-grid">
          <section className="ak-card ak-card-pad st-card">
            <h3>Kargo ücretleri</h3>
            <p className="ak-hint">Ücret, alıcının şehrinin Bolu’ya uzaklığına göre seçilir.</p>
            <div className="ak-grid-2">
              <div className="ak-field"><label htmlFor="st-local">Bolu içi</label><Money id="st-local" value={form.localShippingCost} onChange={(v) => set({ localShippingCost: v })} /></div>
              <div className="ak-field"><label htmlFor="st-near">Yakın bölge</label><Money id="st-near" value={form.nearShippingCost} onChange={(v) => set({ nearShippingCost: v })} /></div>
              <div className="ak-field"><label htmlFor="st-std">Orta bölge</label><Money id="st-std" value={form.standardShippingCost} onChange={(v) => set({ standardShippingCost: v })} /></div>
              <div className="ak-field"><label htmlFor="st-far">Uzak bölge</label><Money id="st-far" value={form.farShippingCost} onChange={(v) => set({ farShippingCost: v })} /></div>
            </div>
            <div className="ak-field"><label htmlFor="st-express">Ekspres kargo ek ücreti</label><Money id="st-express" value={form.expressShippingSurcharge} onChange={(v) => set({ expressShippingSurcharge: v })} /></div>
          </section>

          <section className="ak-card ak-card-pad st-card">
            <h3>Kargo firmaları</h3>
            <p className="ak-hint">Siparişi kargoya verirken bu listeden seçilir.</p>
            <ul className="st-chips">
              {form.carriers.map((c) => (
                <li key={c}>{c}<button type="button" onClick={() => set({ carriers: form.carriers.filter((x) => x !== c) })} aria-label={`${c} kaldır`}><FiX size={13} /></button></li>
              ))}
            </ul>
            <div className="st-add-row">
              <input className="ak-input" value={carrierText} onChange={(e) => setCarrierText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCarrier() } }} placeholder="Firma adı" maxLength={40} />
              <button type="button" className="ak-btn" onClick={addCarrier}><FiPlus /> Ekle</button>
            </div>
          </section>
        </div>
      )}

      {tab === 'notify' && (
        <section className="ak-card ak-card-pad st-card st-narrow">
          <h3>E-posta bildirimleri</h3>
          <p className="ak-hint">Bildirimler mağaza e-posta adresine gider.</p>
          <label className="st-toggle">
            <input type="checkbox" checked={form.notifyNewOrder !== false} onChange={(e) => set({ notifyNewOrder: e.target.checked })} />
            <span><strong>Yeni sipariş</strong><small>Her yeni siparişte özetiyle birlikte e-posta gönderilir.</small></span>
          </label>
          <label className="st-toggle">
            <input type="checkbox" checked={Boolean(form.notifyNewCustomer)} onChange={(e) => set({ notifyNewCustomer: e.target.checked })} />
            <span><strong>Yeni üye</strong><small>Biri üyeliğini doğruladığında haber verilir.</small></span>
          </label>
        </section>
      )}

      {tab === 'admins' && (
        <section className="ak-card ak-card-pad st-card st-narrow">
          <h3>Yöneticiler</h3>
          <p className="ak-hint">Yöneticiler bu panele girip her şeyi değiştirebilir. Sadece güvendiğiniz kişileri ekleyin.</p>
          <Admins />
        </section>
      )}
    </div>
  )
}

export default AdminSettings

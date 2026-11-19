import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiSearch, FiCopy, FiEdit2, FiTrash2, FiTag, FiRefreshCw, FiShuffle } from 'react-icons/fi'
import { getCouponsApi, createCouponApi, updateCouponApi, deleteCouponApi } from '../../api/couponApi'
import {
  PageHeader, Segment, Drawer, Empty, useToast, useConfirm, errorText, tl, dateOnly,
} from './ui/AdminUI'
import './AdminCoupons.css'

const TYPES = [
  { id: 'percent', label: 'Yüzde indirim' },
  { id: 'fixed', label: 'Tutar indirimi' },
  { id: 'shipping', label: 'Ücretsiz kargo' },
]

// Kuponun şu anki gerçek durumu (veritabanında sadece Aktif/Pasif var)
const stateOf = (c, now = Date.now()) => {
  if (c.status !== 'Aktif') return { id: 'passive', label: 'Pasif', color: '#888' }
  if (c.endDate && new Date(c.endDate).getTime() < now) return { id: 'expired', label: 'Süresi doldu', color: '#d97706' }
  if (c.maxUse > 0 && c.used >= c.maxUse) return { id: 'used-up', label: 'Limit doldu', color: '#dc2626' }
  if (c.startDate && new Date(c.startDate).getTime() > now) return { id: 'scheduled', label: 'Planlı', color: '#2563eb' }
  return { id: 'active', label: 'Aktif', color: '#16a34a' }
}

const ymd = (iso) => (iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date(iso)) : '')

const discountText = (c) => {
  if (c.type === 'shipping') return 'Ücretsiz kargo'
  if (c.type === 'percent') return `%${Number(c.value)} indirim`
  return `${tl(c.value)} indirim`
}

/** "500 ₺ üzeri siparişlerde %10 indirim · kişi başı 1 kez · 31 Ara'ya kadar" */
const summaryText = (c) => [
  `${Number(c.minOrder) > 0 ? `${tl(c.minOrder)} ve üzeri siparişlerde ` : ''}${discountText(c)}`,
  Number(c.perUserLimit) > 0 ? `kişi başı ${c.perUserLimit} kez` : 'kişi başı sınırsız',
  Number(c.maxUse) > 0 ? `toplam ${c.maxUse} kullanım` : null,
  c.startDate ? `${dateOnly(c.startDate)}’den` : null,
  c.endDate ? `${dateOnly(c.endDate)}’e kadar` : null,
].filter(Boolean).join(' · ')

const randomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // karışan 0/O, 1/I yok
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const emptyForm = {
  code: '', type: 'percent', value: '', minOrder: '', maxUse: '', perUserLimit: '1',
  startDate: '', endDate: '', description: '', status: 'Aktif',
}

/* ================================================================ Form paneli */
const CouponForm = ({ coupon, onClose, onSaved }) => {
  const toast = useToast()
  const [form, setForm] = useState(() => (coupon ? {
    code: coupon.code,
    type: coupon.type,
    value: coupon.type === 'shipping' ? '' : String(Number(coupon.value)),
    minOrder: Number(coupon.minOrder) ? String(Number(coupon.minOrder)) : '',
    maxUse: coupon.maxUse ? String(coupon.maxUse) : '',
    perUserLimit: String(coupon.perUserLimit ?? 1),
    startDate: ymd(coupon.startDate),
    endDate: ymd(coupon.endDate),
    description: coupon.description || '',
    status: coupon.status,
  } : { ...emptyForm, code: randomCode() }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setError('') }
  const bind = (k) => ({ id: `cp-${k}`, value: form[k], onChange: (e) => set({ [k]: e.target.value }) })

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const body = {
        ...form,
        value: form.type === 'shipping' ? 0 : Number(form.value),
        minOrder: Number(form.minOrder) || 0,
        maxUse: Number(form.maxUse) || 0,
        perUserLimit: Number(form.perUserLimit) || 0,
      }
      const res = coupon ? await updateCouponApi(coupon._id, body) : await createCouponApi(body)
      toast.ok(coupon ? 'Kupon güncellendi.' : `${res.data.code} oluşturuldu.`)
      onSaved()
      onClose()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setSaving(false)
    }
  }

  const preview = summaryText({
    ...form,
    value: Number(form.value) || 0,
    perUserLimit: Number(form.perUserLimit) || 0,
    maxUse: Number(form.maxUse) || 0,
    startDate: form.startDate ? `${form.startDate}T00:00:00+03:00` : null,
    endDate: form.endDate ? `${form.endDate}T23:59:59+03:00` : null,
  })

  return (
    <Drawer
      open
      onClose={onClose}
      title={coupon ? `${coupon.code} düzenle` : 'Yeni kupon'}
      footer={(
        <>
          <button type="button" className="ak-btn" onClick={onClose}>Vazgeç</button>
          <button type="button" className="ak-btn ak-btn--primary" onClick={save} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </>
      )}
    >
      <div className="ak-field">
        <label htmlFor="cp-code">Kupon kodu</label>
        <div className="cp-code-row">
          <input className="ak-input cp-code-input" {...bind('code')} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, '') })} maxLength={30} />
          <button type="button" className="ak-btn" onClick={() => set({ code: randomCode() })} title="Rastgele kod"><FiShuffle size={14} /> Üret</button>
        </div>
        <p className="ak-hint">Müşteri sepette bu kodu yazar. Harf, rakam, - ve _ kullanılabilir.</p>
      </div>

      <div className="ak-field">
        <span className="ak-label">İndirim türü</span>
        <Segment items={TYPES} value={form.type} onChange={(type) => set({ type })} label="İndirim türü" />
      </div>

      <div className="ak-grid-2">
        {form.type !== 'shipping' && (
          <div className="ak-field">
            <label htmlFor="cp-value">{form.type === 'percent' ? 'İndirim oranı' : 'İndirim tutarı'}</label>
            <div className="ak-money">
              <input className="ak-input" type="number" min="0" max={form.type === 'percent' ? 100 : undefined} step="0.01" {...bind('value')} />
              <span>{form.type === 'percent' ? '%' : '₺'}</span>
            </div>
          </div>
        )}
        <div className="ak-field">
          <label htmlFor="cp-minOrder">En az sepet tutarı</label>
          <div className="ak-money"><input className="ak-input" type="number" min="0" placeholder="Sınır yok" {...bind('minOrder')} /><span>₺</span></div>
        </div>
        <div className="ak-field">
          <label htmlFor="cp-perUserLimit">Kişi başı kullanım</label>
          <input className="ak-input" type="number" min="0" {...bind('perUserLimit')} />
          <p className="ak-hint">0 = sınırsız. Hoş geldin kuponu için 1 önerilir.</p>
        </div>
        <div className="ak-field">
          <label htmlFor="cp-maxUse">Toplam kullanım limiti</label>
          <input className="ak-input" type="number" min="0" placeholder="Sınırsız" {...bind('maxUse')} />
          {coupon && <p className="ak-hint">Şu ana kadar {coupon.used} kez kullanıldı.</p>}
        </div>
        <div className="ak-field">
          <label htmlFor="cp-startDate">Başlangıç</label>
          <input className="ak-input" type="date" {...bind('startDate')} />
        </div>
        <div className="ak-field">
          <label htmlFor="cp-endDate">Bitiş (gün sonuna kadar)</label>
          <input className="ak-input" type="date" min={form.startDate || undefined} {...bind('endDate')} />
        </div>
      </div>

      <div className="ak-field">
        <label htmlFor="cp-description">Not (sadece adminde görünür)</label>
        <input className="ak-input" {...bind('description')} placeholder="ör. Instagram kampanyası" maxLength={200} />
      </div>

      <label className="ak-check">
        <input type="checkbox" checked={form.status === 'Aktif'} onChange={(e) => set({ status: e.target.checked ? 'Aktif' : 'Pasif' })} />
        Kupon kullanıma açık
      </label>

      <div className="cp-preview">
        <FiTag /> <span><strong>{form.code || 'KOD'}</strong> · {preview}</span>
      </div>
      {error && <p className="ak-error" role="alert">{error}</p>}
    </Drawer>
  )
}

/* ================================================================ Sayfa */
const AdminCoupons = () => {
  const toast = useToast()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | coupon

  const query = useQuery({ queryKey: ['admin', 'coupons'], queryFn: getCouponsApi })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })

  const coupons = useMemo(() => (query.data?.data || []).map((c) => ({ ...c, state: stateOf(c) })), [query.data])
  const counts = coupons.reduce((acc, c) => ({ ...acc, [c.state.id]: (acc[c.state.id] || 0) + 1 }), {})
  const tabs = [
    { id: '', label: 'Tümü' },
    { id: 'active', label: 'Aktif', count: counts.active },
    { id: 'scheduled', label: 'Planlı', count: counts.scheduled },
    { id: 'expired', label: 'Süresi doldu', count: counts.expired },
    { id: 'used-up', label: 'Limit doldu', count: counts['used-up'] },
    { id: 'passive', label: 'Pasif', count: counts.passive },
  ]

  const q = search.trim().toLowerCase()
  const list = coupons.filter((c) =>
    (!tab || c.state.id === tab)
    && (!q || c.code.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)))

  const totals = coupons.reduce((acc, c) => ({
    orders: acc.orders + (c.stats?.orders || 0),
    discount: acc.discount + (c.stats?.discountTotal || 0),
    revenue: acc.revenue + (c.stats?.revenue || 0),
  }), { orders: 0, discount: 0, revenue: 0 })

  const toggle = async (c) => {
    try {
      await updateCouponApi(c._id, { status: c.status === 'Aktif' ? 'Pasif' : 'Aktif' })
      toast.ok(c.status === 'Aktif' ? `${c.code} kapatıldı.` : `${c.code} açıldı.`)
      refresh()
    } catch (err) {
      toast.error(err)
    }
  }

  const remove = async (c) => {
    const ok = await confirm({
      title: `${c.code} silinsin mi?`,
      message: c.stats?.orders
        ? `Bu kupon ${c.stats.orders} siparişte kullanıldı. Silinse de o siparişler etkilenmez. Sadece kapatmak isterseniz “Pasif” yapın.`
        : 'Bu işlem geri alınamaz.',
      confirmLabel: 'Sil',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteCouponApi(c._id)
      toast.ok(`${c.code} silindi.`)
      refresh()
    } catch (err) {
      toast.error(err)
    }
  }

  const copy = (code) => {
    navigator.clipboard?.writeText(code)
    toast.info(`${code} kopyalandı`)
  }

  return (
    <div className="ak-page">
      <PageHeader title="Kuponlar" sub="İndirim kodları ve kullanım takibi">
        <button type="button" className="ak-btn ak-btn--primary" onClick={() => setEditing('new')}><FiPlus size={15} /> Yeni kupon</button>
      </PageHeader>

      <div className="ak-stats">
        <div className="ak-stat"><span>Kullanımda</span><strong>{counts.active || 0}</strong><small>aktif kupon</small></div>
        <div className="ak-stat"><span>Kuponlu sipariş</span><strong>{totals.orders}</strong><small>iptaller hariç</small></div>
        <div className="ak-stat"><span>Verilen indirim</span><strong>{tl(totals.discount)}</strong><small>toplam</small></div>
        <div className="ak-stat"><span>Kuponlu ciro</span><strong>{tl(totals.revenue)}</strong><small>ödenmiş siparişler</small></div>
      </div>

      <div className="ak-toolbar">
        <Segment items={tabs} value={tab} onChange={setTab} label="Durum" />
        <label className="ak-search">
          <FiSearch size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kod veya not ara" aria-label="Kupon ara" />
        </label>
      </div>

      <div className="ak-card">
        {query.isPending ? (
          <div className="ak-loading"><FiRefreshCw className="spin" /> Yükleniyor…</div>
        ) : list.length === 0 ? (
          <Empty icon={FiTag} title={coupons.length ? 'Bu filtrede kupon yok' : 'Henüz kupon yok'}>
            {!coupons.length && <button type="button" className="ak-btn ak-btn--primary" onClick={() => setEditing('new')}><FiPlus size={14} /> İlk kuponu oluştur</button>}
          </Empty>
        ) : (
          <div className="ak-table-wrap">
            <table className="ak-table">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Kural</th>
                  <th>Kullanım</th>
                  <th>Getiri</th>
                  <th>Durum</th>
                  <th><span className="sr-only">İşlemler</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const pct = c.maxUse > 0 ? Math.min(100, Math.round((c.used / c.maxUse) * 100)) : null
                  return (
                    <tr key={c._id}>
                      <td>
                        <button type="button" className="cp-code" onClick={() => copy(c.code)} title="Kopyala">
                          {c.code} <FiCopy size={12} />
                        </button>
                        {c.description && <span className="ak-sub">{c.description}</span>}
                      </td>
                      <td className="cp-rule">
                        <span className="ak-strong">{discountText(c)}</span>
                        <span className="ak-sub">{summaryText(c).split(' · ').slice(1).join(' · ') || 'Koşul yok'}</span>
                      </td>
                      <td>
                        <span className="ak-strong">{c.used}</span>{c.maxUse > 0 && <span className="ak-muted"> / {c.maxUse}</span>}
                        {pct !== null && <span className="cp-bar"><span style={{ width: `${pct}%` }} /></span>}
                      </td>
                      <td>
                        {tl(c.stats?.revenue)}
                        <span className="ak-sub">−{tl(c.stats?.discountTotal)} indirim</span>
                      </td>
                      <td>
                        <button type="button" className="cp-state" style={{ '--c': c.state.color }} onClick={() => toggle(c)} title={c.status === 'Aktif' ? 'Kapatmak için tıklayın' : 'Açmak için tıklayın'}>
                          <i /> {c.state.label}
                        </button>
                      </td>
                      <td className="cp-actions">
                        <button type="button" className="ak-icon-btn" onClick={() => setEditing(c)} aria-label="Düzenle"><FiEdit2 size={15} /></button>
                        <button type="button" className="ak-icon-btn cp-del" onClick={() => remove(c)} aria-label="Sil"><FiTrash2 size={15} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <CouponForm
          key={editing === 'new' ? 'new' : editing._id}
          coupon={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

export default AdminCoupons

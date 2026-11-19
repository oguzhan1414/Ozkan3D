import { useMemo, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FiDownload, FiRefreshCw, FiArrowUpRight, FiArrowDownRight, FiPackage } from 'react-icons/fi'
import { getReportApi, downloadOrdersCsvApi } from '../../api/reportApi'
import { PageHeader, Segment, Empty, useToast, tl, ORDER_STATUS } from './ui/AdminUI'
import './AdminReports.css'

// Türkiye saatine göre bugünün tarihi (YYYY-MM-DD)
const trToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date())
const shift = (ymd, days) => {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const PRESETS = [
  { id: '7', label: '7 gün', range: (t) => [shift(t, -6), t] },
  { id: '30', label: '30 gün', range: (t) => [shift(t, -29), t] },
  { id: '90', label: '90 gün', range: (t) => [shift(t, -89), t] },
  { id: 'month', label: 'Bu ay', range: (t) => [`${t.slice(0, 8)}01`, t] },
  { id: 'lastMonth', label: 'Geçen ay', range: (t) => {
    const first = `${t.slice(0, 8)}01`
    const lastDay = shift(first, -1)
    return [`${lastDay.slice(0, 8)}01`, lastDay]
  } },
  { id: 'year', label: 'Bu yıl', range: (t) => [`${t.slice(0, 4)}-01-01`, t] },
  { id: 'custom', label: 'Özel' },
]

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const fmtBucket = (d) => {
  const p = d.split('-')
  return p.length === 3 ? `${Number(p[2])} ${MONTHS[Number(p[1]) - 1]}` : `${MONTHS[Number(p[1]) - 1]} ${p[0].slice(2)}`
}
const compact = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 })

const Change = ({ value }) => {
  if (value === null || value === undefined) return <span className="rp-change">önceki dönem boş</span>
  const up = value >= 0
  return (
    <span className={`rp-change ${value === 0 ? '' : up ? 'is-up' : 'is-down'}`}>
      {value !== 0 && (up ? <FiArrowUpRight /> : <FiArrowDownRight />)}%{Math.abs(value)} önceki döneme göre
    </span>
  )
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rp-tip">
      <span>{label}</span>
      <strong>{tl(row.revenue)}</strong>
      <span>{row.orders} sipariş</span>
    </div>
  )
}

/** Yatay çubuklu basit tablo */
const BarList = ({ rows, valueKey, format = (v) => v, label, sub }) => {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0))
  return (
    <ul className="rp-bars">
      {rows.map((r) => (
        <li key={label(r)}>
          <div className="rp-bars-row">
            <span className="rp-bars-label">{label(r)}</span>
            <span className="rp-bars-value">{format(r[valueKey])}</span>
          </div>
          <span className="rp-bars-track"><span style={{ width: `${(Number(r[valueKey]) / max) * 100}%` }} /></span>
          {sub && <span className="ak-sub">{sub(r)}</span>}
        </li>
      ))}
    </ul>
  )
}

const AdminReports = () => {
  const toast = useToast()
  const today = trToday()
  const [preset, setPreset] = useState('30')
  const [custom, setCustom] = useState({ from: shift(today, -29), to: today })
  const [downloading, setDownloading] = useState(false)

  const [from, to] = useMemo(() => {
    if (preset === 'custom') return [custom.from, custom.to]
    return PRESETS.find((p) => p.id === preset).range(today)
  }, [preset, custom, today])

  const query = useQuery({
    queryKey: ['admin', 'report', from, to],
    queryFn: () => getReportApi({ from, to }).then((r) => r.data),
    placeholderData: keepPreviousData,
    enabled: Boolean(from && to && from <= to),
  })
  const d = query.data

  const download = async () => {
    setDownloading(true)
    try {
      await downloadOrdersCsvApi({ from, to })
    } catch (err) {
      toast.error(err, 'Dosya indirilemedi.')
    } finally {
      setDownloading(false)
    }
  }

  const series = (d?.series || []).map((s) => ({ ...s, label: fmtBucket(s.date) }))
  const statusTotal = Object.values(d?.statusCounts || {}).reduce((a, b) => a + b, 0)
  const methodLabel = { card: 'Kredi kartı', transfer: 'Havale / EFT' }

  return (
    <div className="ak-page rp">
      <PageHeader title="Raporlar" sub={d ? `${fmtBucket(d.range.from)} – ${fmtBucket(d.range.to)} · ${d.range.days} gün` : 'Satış ve sipariş analizi'}>
        <button type="button" className="ak-btn" onClick={() => query.refetch()} aria-label="Yenile"><FiRefreshCw className={query.isFetching ? 'spin' : ''} /> Yenile</button>
        <button type="button" className="ak-btn ak-btn--primary" onClick={download} disabled={downloading}>
          <FiDownload /> {downloading ? 'Hazırlanıyor…' : 'Siparişleri indir (Excel)'}
        </button>
      </PageHeader>

      <div className="ak-toolbar">
        <Segment items={PRESETS} value={preset} onChange={setPreset} label="Dönem" />
        {preset === 'custom' && (
          <div className="rp-dates">
            <input type="date" className="ak-input" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label="Başlangıç" />
            <span>–</span>
            <input type="date" className="ak-input" value={custom.to} min={custom.from} max={today} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label="Bitiş" />
          </div>
        )}
      </div>

      {query.isPending ? (
        <div className="ak-card ak-loading"><FiRefreshCw className="spin" /> Rapor hazırlanıyor…</div>
      ) : query.isError ? (
        <div className="ak-card"><Empty title="Rapor alınamadı"><button type="button" className="ak-link" onClick={() => query.refetch()}>Tekrar dene</button></Empty></div>
      ) : (
        <div className={`rp-body ${query.isFetching ? 'is-fetching' : ''}`}>
          <div className="rp-kpis">
            <div className="ak-stat rp-kpi-main">
              <span>Ciro</span>
              <strong>{tl(d.summary.revenue)}</strong>
              <Change value={d.summary.revenueChange} />
            </div>
            <div className="ak-stat">
              <span>Sipariş</span>
              <strong>{d.summary.orders}</strong>
              <Change value={d.summary.ordersChange} />
            </div>
            <div className="ak-stat"><span>Ortalama sepet</span><strong>{tl(d.summary.avgOrder)}</strong><small>{d.summary.paidOrders} ödenmiş sipariş</small></div>
            <div className="ak-stat"><span>Yeni müşteri</span><strong>{d.summary.newCustomers}</strong><Change value={d.summary.newCustomersChange} /></div>
            <div className="ak-stat"><span>Tekrar alan müşteri</span><strong>%{d.summary.repeatRate}</strong><small>{d.summary.buyers} alıcıdan</small></div>
            <div className="ak-stat"><span>İndirim / kargo</span><strong>{tl(d.summary.discountTotal)}</strong><small>{tl(d.summary.shippingTotal)} kargo geliri</small></div>
          </div>

          <section className="ak-card">
            <div className="ak-card-head">
              <h3>{d.range.granularity === 'month' ? 'Aylık' : 'Günlük'} satış</h3>
              <span className="ak-muted">Çubuk: sipariş · Alan: ödenmiş ciro</span>
            </div>
            <div className="rp-chart">
              {series.some((s) => s.orders || s.revenue) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={series} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rpRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff385c" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#ff385c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f1f1" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} minTickGap={18} />
                    <YAxis yAxisId="r" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} width={46} tickFormatter={(v) => compact.format(v)} />
                    <YAxis yAxisId="o" orientation="right" hide />
                    <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                    <Bar yAxisId="o" dataKey="orders" fill="#e9e9e9" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Area yAxisId="r" type="monotone" dataKey="revenue" stroke="#ff385c" strokeWidth={2} fill="url(#rpRevenue)" dot={false} activeDot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <Empty title="Bu dönemde satış yok" />
              )}
            </div>
          </section>

          <div className="rp-grid">
            <section className="ak-card">
              <div className="ak-card-head"><h3>En çok kazandıran ürünler</h3><span className="ak-muted">Ödenmiş siparişler</span></div>
              {d.topProducts.length ? (
                <ol className="rp-products">
                  {d.topProducts.map((p, i) => (
                    <li key={p.product || p.name}>
                      <span className="rp-rank">{i + 1}</span>
                      {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span className="rp-thumb"><FiPackage /></span>}
                      <span className="rp-product-name">{p.name}<span className="ak-sub">{p.quantity} adet</span></span>
                      <strong className="ak-num">{tl(p.revenue)}</strong>
                    </li>
                  ))}
                </ol>
              ) : <Empty title="Satış yok" />}
            </section>

            <section className="ak-card">
              <div className="ak-card-head"><h3>Kategoriler</h3></div>
              <div className="rp-pad">
                {d.categories.length ? (
                  <BarList rows={d.categories} valueKey="revenue" format={tl} label={(r) => r.name} sub={(r) => `${r.quantity} adet`} />
                ) : <Empty title="Satış yok" />}
              </div>
            </section>

            <section className="ak-card">
              <div className="ak-card-head"><h3>Ödeme yöntemi</h3></div>
              <div className="rp-pad">
                <BarList
                  rows={d.payments}
                  valueKey="orders"
                  format={(v) => `${v} sipariş`}
                  label={(r) => methodLabel[r.method] || r.method}
                  sub={(r) => `${r.paidOrders} ödendi · ${tl(r.revenue)}`}
                />
              </div>
            </section>

            <section className="ak-card">
              <div className="ak-card-head"><h3>Sipariş durumları</h3><span className="ak-muted">{statusTotal} sipariş</span></div>
              <div className="rp-pad">
                <ul className="rp-status">
                  {ORDER_STATUS.map((s) => {
                    const n = d.statusCounts[s.key] || 0
                    return (
                      <li key={s.key}>
                        <span><i style={{ background: s.color }} />{s.key}</span>
                        <strong>{n}</strong>
                        <span className="rp-bars-track"><span style={{ width: `${statusTotal ? (n / statusTotal) * 100 : 0}%`, background: s.color }} /></span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>

            <section className="ak-card">
              <div className="ak-card-head"><h3>Şehirler</h3></div>
              <div className="rp-pad">
                {d.cities.length ? (
                  <BarList rows={d.cities} valueKey="orders" format={(v) => `${v} sipariş`} label={(r) => r.city} sub={(r) => tl(r.revenue)} />
                ) : <Empty title="Sipariş yok" />}
              </div>
            </section>

            <section className="ak-card">
              <div className="ak-card-head"><h3>Kupon kullanımı</h3></div>
              {d.coupons.length ? (
                <div className="ak-table-wrap">
                  <table className="ak-table">
                    <thead><tr><th>Kod</th><th className="ak-num">Sipariş</th><th className="ak-num">İndirim</th><th className="ak-num">Ciro</th></tr></thead>
                    <tbody>
                      {d.coupons.map((c) => (
                        <tr key={c.code}>
                          <td className="rp-code">{c.code}</td>
                          <td className="ak-num">{c.orders}</td>
                          <td className="ak-num">−{tl(c.discount)}</td>
                          <td className="ak-num ak-strong">{tl(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty title="Bu dönemde kupon kullanılmadı" />}
            </section>
          </div>

          <p className="ak-hint rp-note">
            Ciro yalnızca ödemesi alınmış siparişlerden hesaplanır; iptal edilen siparişler hiçbir rakama dahil edilmez.
            Karşılaştırmalar, seçilen dönemle aynı uzunluktaki bir önceki dönemle yapılır.
          </p>
        </div>
      )}
    </div>
  )
}

export default AdminReports

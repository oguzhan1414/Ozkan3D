import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { FiCheck, FiAlertCircle, FiX, FiInfo } from 'react-icons/fi'
import './adminKit.css'

/* ================================================================ Bildirim (toast) + onay penceresi
 * Kullanım:
 *   const toast = useToast();   toast.ok('Kaydedildi')  toast.error(err)
 *   const confirm = useConfirm(); if (await confirm({ title, message, danger: true })) ...
 */

const UICtx = createContext(null)

/** API hatasından okunabilir mesaj */
export const errorText = (err, fallback = 'İşlem tamamlanamadı.') =>
  (typeof err === 'string' ? err : err?.response?.data?.message || err?.message) || fallback

let toastSeq = 0

export const AdminUIProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback((type, text) => {
    const id = ++toastSeq
    setToasts((t) => [...t.slice(-3), { id, type, text }])
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500)
  }, [dismiss])

  const toast = useRef(null)
  toast.current = {
    ok: (text) => push('ok', text),
    info: (text) => push('info', text),
    error: (err, fallback) => push('error', errorText(err, fallback)),
  }

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve
    setDialog({ confirmLabel: 'Onayla', cancelLabel: 'Vazgeç', ...opts })
  }), [])

  const close = useCallback((value) => {
    resolver.current?.(value)
    resolver.current = null
    setDialog(null)
  }, [])

  useEffect(() => {
    if (!dialog) return undefined
    const onKey = (e) => { if (e.key === 'Escape') close(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog, close])

  return (
    <UICtx.Provider value={{ getToast: () => toast.current, confirm }}>
      {children}

      <div className="ak-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ak-toast ak-toast--${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            {t.type === 'ok' ? <FiCheck /> : t.type === 'error' ? <FiAlertCircle /> : <FiInfo />}
            <span>{t.text}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Kapat"><FiX size={14} /></button>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="ak-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false) }}>
          <div className="ak-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ak-dialog-title">
            <h3 id="ak-dialog-title">{dialog.title}</h3>
            {dialog.message && <p>{dialog.message}</p>}
            <div className="ak-dialog-actions">
              <button type="button" className="ak-btn" onClick={() => close(false)}>{dialog.cancelLabel}</button>
              <button
                type="button"
                className={`ak-btn ${dialog.danger ? 'ak-btn--danger' : 'ak-btn--primary'}`}
                onClick={() => close(true)}
                autoFocus
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </UICtx.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(UICtx)
  return {
    ok: (t) => ctx.getToast().ok(t),
    info: (t) => ctx.getToast().info(t),
    error: (e, f) => ctx.getToast().error(e, f),
  }
}

export const useConfirm = () => useContext(UICtx).confirm

/* ================================================================ Küçük yapı taşları */

export const PageHeader = ({ title, sub, children }) => (
  <div className="ak-head">
    <div>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
    {children && <div className="ak-head-actions">{children}</div>}
  </div>
)

/** Sekmeli filtre: items=[{id,label,count}] */
export const Segment = ({ items, value, onChange, label }) => (
  <div className="ak-segment" role="tablist" aria-label={label}>
    {items.map((it) => (
      <button
        key={it.id || 'all'}
        type="button"
        role="tab"
        aria-selected={value === it.id}
        className={value === it.id ? 'is-active' : ''}
        onClick={() => onChange(it.id)}
      >
        {it.label}
        {it.count > 0 && <span className="ak-count">{it.count}</span>}
      </button>
    ))}
  </div>
)

/** Sağdan açılan detay paneli */
export const Drawer = ({ open, onClose, title, sub, children, footer, wide }) => {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="ak-overlay ak-overlay--drawer" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside className={`ak-drawer ${wide ? 'ak-drawer--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="ak-drawer-title">
        <header className="ak-drawer-head">
          <div>
            <h2 id="ak-drawer-title">{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button type="button" className="ak-icon-btn" onClick={onClose} aria-label="Kapat"><FiX size={18} /></button>
        </header>
        <div className="ak-drawer-body">{children}</div>
        {footer && <footer className="ak-drawer-foot">{footer}</footer>}
      </aside>
    </div>
  )
}

export const Pager = ({ page, pages, onChange }) => {
  if (pages <= 1) return null
  return (
    <div className="ak-pager">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Önceki sayfa">‹</button>
      <span>{page} / {pages}</span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Sonraki sayfa">›</button>
    </div>
  )
}

export const Empty = ({ icon: Icon, title, children }) => (
  <div className="ak-empty">
    {Icon && <Icon size={26} />}
    {title && <p className="ak-empty-title">{title}</p>}
    {children}
  </div>
)

/** Gecikmeli arama değeri */
export const useDebounced = (value, delay = 350) => {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

export const ORDER_STATUS = [
  { key: 'Bekliyor', color: '#d97706' },
  { key: 'Basımda', color: '#7c3aed' },
  { key: 'Hazırlanıyor', color: '#2563eb' },
  { key: 'Kargoda', color: '#0891b2' },
  { key: 'Teslim Edildi', color: '#16a34a' },
  { key: 'İptal', color: '#dc2626' },
]
export const orderStatusColor = (s) => ORDER_STATUS.find((x) => x.key === s)?.color || '#777'

export const StatusPill = ({ status, color }) => (
  <span className="ak-pill" style={{ '--c': color || orderStatusColor(status) }}>{status}</span>
)

const tlFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })
export const tl = (v) => `${tlFmt.format(Number(v) || 0)} ₺`
const dtFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const dFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
export const dateTime = (v) => (v ? dtFmt.format(new Date(v)) : '—')
export const dateOnly = (v) => (v ? dFmt.format(new Date(v)) : '—')

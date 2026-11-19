import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { FiSearch, FiUsers, FiMail, FiPhone, FiMapPin, FiRefreshCw, FiSlash, FiTrash2, FiSend } from 'react-icons/fi'
import { getUsersApi, getUserApi, updateUserApi, deleteUserApi, sendUserEmailApi } from '../../api/userApi'
import { getOrdersApi } from '../../api/orderApi'
import {
  PageHeader, Drawer, Pager, Empty, StatusPill, useToast, useConfirm, useDebounced, errorText,
  tl, dateOnly, dateTime,
} from './ui/AdminUI'
import './AdminCustomers.css'

const initials = (u) => `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || '?'

/* ================================================================ E-posta formu */
const EmailForm = ({ customer, onDone }) => {
  const toast = useToast()
  const [subject, setSubject] = useState('Ozkan3d')
  const [message, setMessage] = useState(`Merhaba ${customer.firstName || ''},\n\n`)
  const [state, setState] = useState({ sending: false, error: '' })

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      setState({ sending: false, error: 'Konu ve mesaj zorunlu.' })
      return
    }
    setState({ sending: true, error: '' })
    try {
      await sendUserEmailApi(customer._id, { subject: subject.trim(), message: message.trim() })
      toast.ok(`E-posta gönderildi: ${customer.email}`)
      onDone()
    } catch (err) {
      setState({ sending: false, error: errorText(err, 'E-posta gönderilemedi.') })
    }
  }

  return (
    <div className="cu-email">
      <div className="ak-field">
        <label htmlFor="cu-subject">Konu</label>
        <input id="cu-subject" className="ak-input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} />
      </div>
      <div className="ak-field">
        <label htmlFor="cu-message">Mesaj</label>
        <textarea id="cu-message" className="ak-textarea" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} />
      </div>
      {state.error && <p className="ak-error">{state.error}</p>}
      <div className="cu-email-actions">
        <button type="button" className="ak-btn" onClick={onDone}>Vazgeç</button>
        <button type="button" className="ak-btn ak-btn--primary" onClick={send} disabled={state.sending}>
          <FiSend size={14} /> {state.sending ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </div>
    </div>
  )
}

/* ================================================================ Müşteri detayı */
const CustomerDetail = ({ customer, onClose, onChanged }) => {
  const toast = useToast()
  const confirm = useConfirm()
  const [emailOpen, setEmailOpen] = useState(false)

  const detailQuery = useQuery({ queryKey: ['admin', 'customer', customer._id], queryFn: () => getUserApi(customer._id).then((r) => r.data) })
  const ordersQuery = useQuery({
    queryKey: ['admin', 'customer-orders', customer._id],
    queryFn: () => getOrdersApi({ userId: customer._id, limit: 10, sort: 'createdAt', order: 'desc' }),
  })
  const u = detailQuery.data || customer
  const stats = detailQuery.data?.stats
  const orders = ordersQuery.data?.data || []
  const blocked = u.isActive === false

  const toggleBlock = async () => {
    const ok = await confirm({
      title: blocked ? 'Hesap tekrar açılsın mı?' : `${u.fullName || u.email} engellensin mi?`,
      message: blocked ? 'Müşteri yeniden giriş yapabilir.' : 'Müşteri giriş yapamaz ve sipariş veremez. Geçmiş siparişleri silinmez.',
      confirmLabel: blocked ? 'Hesabı aç' : 'Engelle',
      danger: !blocked,
    })
    if (!ok) return
    try {
      await updateUserApi(u._id, { isActive: blocked })
      toast.ok(blocked ? 'Hesap açıldı.' : 'Hesap engellendi.')
      detailQuery.refetch()
      onChanged()
    } catch (err) {
      toast.error(err)
    }
  }

  const remove = async () => {
    const ok = await confirm({
      title: `${u.fullName || u.email} kalıcı olarak silinsin mi?`,
      message: 'Hesap, adresleri, sepeti ve favorileri silinir. Siparişleri raporlarda kalır ama müşteriye bağlı görünmez. Geri alınamaz.',
      confirmLabel: 'Kalıcı olarak sil',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteUserApi(u._id)
      toast.ok('Müşteri silindi.')
      onChanged()
      onClose()
    } catch (err) {
      toast.error(err)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={u.fullName || u.email}
      sub={`Üye: ${dateOnly(u.createdAt)}${blocked ? ' · Engelli' : ''}`}
      footer={(
        <>
          <button type="button" className="ak-btn ak-btn--ghost-danger" onClick={remove}><FiTrash2 size={14} /> Sil</button>
          <button type="button" className="ak-btn" onClick={toggleBlock}><FiSlash size={14} /> {blocked ? 'Hesabı aç' : 'Engelle'}</button>
          <button type="button" className="ak-btn ak-btn--primary" onClick={() => setEmailOpen(true)}><FiMail size={14} /> E-posta gönder</button>
        </>
      )}
    >
      {emailOpen && <EmailForm customer={u} onDone={() => setEmailOpen(false)} />}

      <div className="ak-stats">
        <div className="ak-stat"><span>Sipariş</span><strong>{stats?.orderCount ?? customer.orderCount ?? 0}</strong></div>
        <div className="ak-stat"><span>Harcama</span><strong>{tl(stats?.totalSpent ?? customer.totalSpent)}</strong></div>
        <div className="ak-stat"><span>Ort. sepet</span><strong>{tl(stats?.avgOrder)}</strong></div>
      </div>

      <section className="ak-section">
        <h4>İletişim</h4>
        <div className="cu-contact">
          <a href={`mailto:${u.email}`}><FiMail size={14} /> {u.email}</a>
          {u.phone && <a href={`tel:${u.phone}`}><FiPhone size={14} /> {u.phone}</a>}
          <span className={`ak-tag ${u.emailVerified ? 'ak-tag--ok' : 'ak-tag--warn'}`}>{u.emailVerified ? 'E-posta doğrulandı' : 'E-posta doğrulanmadı'}</span>
        </div>
      </section>

      {u.addresses?.length > 0 && (
        <section className="ak-section">
          <h4>Adresler</h4>
          <ul className="cu-addresses">
            {u.addresses.map((a) => (
              <li key={a._id}>
                <strong>{a.title || 'Adres'}{a.isDefault && <span className="ak-tag">Varsayılan</span>}</strong>
                <span><FiMapPin size={12} /> {a.address}, {[a.neighborhood, a.district, a.city].filter(Boolean).join(' / ')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ak-section">
        <h4>Son siparişler</h4>
        {ordersQuery.isPending ? (
          <p className="ak-muted">Yükleniyor…</p>
        ) : orders.length === 0 ? (
          <p className="ak-muted">Henüz siparişi yok.</p>
        ) : (
          <ul className="cu-orders">
            {orders.map((o) => (
              <li key={o._id}>
                <Link to={`/admin/orders?q=${encodeURIComponent(o.orderNo)}`}>
                  <span><strong>{o.orderNo}</strong><small>{dateTime(o.createdAt)}</small></span>
                  <StatusPill status={o.status} />
                  <span className="ak-num">{tl(o.totalPrice)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Drawer>
  )
}

/* ================================================================ Liste */
const AdminCustomers = () => {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page')) || 1
  const [search, setSearch] = useState('')
  const keyword = useDebounced(search.trim())
  const [open, setOpen] = useState(null)

  const query = useQuery({
    queryKey: ['admin', 'customers', { page, keyword }],
    queryFn: () => getUsersApi({ page, limit: 20, search: keyword || undefined, role: 'user' }),
    placeholderData: keepPreviousData,
  })
  const customers = query.data?.data || []

  return (
    <div className="ak-page">
      <PageHeader title="Müşteriler" sub={`${(query.data?.total || 0).toLocaleString('tr-TR')} kayıtlı müşteri`} />

      <div className="ak-toolbar">
        <label className="ak-search">
          <FiSearch size={15} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (page !== 1) setParams({}, { replace: true }) }}
            placeholder="Ad, e-posta veya telefon"
            aria-label="Müşteri ara"
          />
        </label>
      </div>

      <div className="ak-card">
        {query.isPending ? (
          <div className="ak-loading"><FiRefreshCw className="spin" /> Yükleniyor…</div>
        ) : customers.length === 0 ? (
          <Empty icon={FiUsers} title={keyword ? 'Eşleşen müşteri yok' : 'Henüz müşteri yok'} />
        ) : (
          <div className="ak-table-wrap">
            <table className="ak-table">
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th>Telefon</th>
                  <th>Üyelik</th>
                  <th className="ak-num">Sipariş</th>
                  <th className="ak-num">Harcama</th>
                  <th>Son sipariş</th>
                </tr>
              </thead>
              <tbody className={query.isFetching ? 'is-fetching' : ''}>
                {customers.map((c) => (
                  <tr key={c._id} className="is-clickable" onClick={() => setOpen(c)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(c) }}>
                    <td>
                      <span className="cu-person">
                        <span className="cu-avatar">{initials(c)}</span>
                        <span>
                          <span className="ak-strong">{c.fullName || '—'}</span>
                          {c.isActive === false && <span className="ak-tag ak-tag--danger cu-blocked">Engelli</span>}
                          <span className="ak-sub">{c.email}</span>
                        </span>
                      </span>
                    </td>
                    <td>{c.phone || <span className="ak-muted">—</span>}</td>
                    <td>{dateOnly(c.createdAt)}</td>
                    <td className="ak-num">{c.orderCount || 0}</td>
                    <td className="ak-num ak-strong">{tl(c.totalSpent)}</td>
                    <td>{c.lastOrderAt ? dateOnly(c.lastOrderAt) : <span className="ak-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} pages={query.data?.pages || 1} onChange={(p) => setParams({ page: String(p) }, { replace: true })} />
      </div>

      {open && (
        <CustomerDetail
          key={open._id}
          customer={open}
          onClose={() => setOpen(null)}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })}
        />
      )}
    </div>
  )
}

export default AdminCustomers

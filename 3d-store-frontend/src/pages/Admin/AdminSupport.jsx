import { useState } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { FiSearch, FiLifeBuoy, FiPaperclip, FiSend, FiRefreshCw, FiMail, FiPhone } from 'react-icons/fi'
import { getSupportAdminApi, getSupportAttachmentApi, updateSupportApi } from '../../api/supportApi'
import {
  PageHeader, Segment, Drawer, Pager, Empty, useToast, useDebounced, errorText, dateTime,
} from './ui/AdminUI'
import './AdminSupport.css'

const STATUS = {
  new: { label: 'Yeni', color: '#dc2626' },
  'in-progress': { label: 'İnceleniyor', color: '#d97706' },
  resolved: { label: 'Çözüldü', color: '#16a34a' },
}

const Pill = ({ status }) => (
  <span className="ak-pill" style={{ '--c': STATUS[status]?.color || '#777' }}>{STATUS[status]?.label || status}</span>
)

/* ================================================================ Talep detayı */
const TicketDetail = ({ ticket, onClose, onChanged }) => {
  const toast = useToast()
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const user = ticket.user
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ')

  const save = async (body, okText, key) => {
    setBusy(key)
    setError('')
    try {
      const res = await updateSupportApi(ticket._id, body)
      toast.ok(okText)
      onChanged(res.data)
      if (body.reply) setReply('')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy('')
    }
  }

  const openAttachment = async () => {
    // Pencereyi tıklama anında aç (açılır pencere engelleyicisine takılmasın)
    const win = window.open('', '_blank')
    try {
      const res = await getSupportAttachmentApi(ticket._id)
      if (win) win.location.href = res.url
      else window.location.href = res.url
    } catch (err) {
      win?.close()
      toast.error(err, 'Ek açılamadı.')
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={ticket.subject}
      sub={`${dateTime(ticket.createdAt)} · ${name || ticket.email}`}
      footer={(
        <>
          {ticket.status !== 'resolved' ? (
            <button type="button" className="ak-btn" onClick={() => save({ status: 'resolved' }, 'Talep çözüldü olarak işaretlendi.', 'resolve')} disabled={Boolean(busy)}>
              Çözüldü olarak işaretle
            </button>
          ) : (
            <button type="button" className="ak-btn" onClick={() => save({ status: 'in-progress' }, 'Talep yeniden açıldı.', 'reopen')} disabled={Boolean(busy)}>
              Yeniden aç
            </button>
          )}
          <button
            type="button"
            className="ak-btn ak-btn--primary"
            onClick={() => save({ reply: reply.trim() }, `Yanıt ${ticket.email} adresine gönderildi.`, 'reply')}
            disabled={Boolean(busy) || !reply.trim()}
          >
            <FiSend size={14} /> {busy === 'reply' ? 'Gönderiliyor…' : 'Yanıtı e-postayla gönder'}
          </button>
        </>
      )}
    >
      <div className="sp-meta">
        <Pill status={ticket.status} />
        <a href={`mailto:${ticket.email}`}><FiMail size={13} /> {ticket.email}</a>
        {user?.phone && <a href={`tel:${user.phone}`}><FiPhone size={13} /> {user.phone}</a>}
      </div>

      <section className="ak-section">
        <h4>Müşterinin mesajı</h4>
        <p className="sp-message">{ticket.message}</p>
        {ticket.attachmentUrl && (
          <button type="button" className="ak-btn ak-btn--sm" onClick={openAttachment}>
            <FiPaperclip size={13} /> {ticket.attachmentName || 'Eki aç'}
          </button>
        )}
      </section>

      {ticket.adminReply && (
        <section className="ak-section">
          <h4>Son yanıtınız · {dateTime(ticket.repliedAt)}</h4>
          <p className="sp-message sp-message--reply">{ticket.adminReply}</p>
        </section>
      )}

      <section className="ak-section">
        <h4>{ticket.adminReply ? 'Yeni yanıt' : 'Yanıt yaz'}</h4>
        <textarea
          className="ak-textarea"
          rows={7}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Müşteriye e-postayla gidecek yanıt. Müşteri bunu Hesabım > Destek bölümünde de görür."
          maxLength={3000}
        />
        {error && <p className="ak-error" role="alert">{error}</p>}
      </section>
    </Drawer>
  )
}

/* ================================================================ Liste */
const AdminSupport = () => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('new')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const keyword = useDebounced(search.trim())
  const [open, setOpen] = useState(null)

  const query = useQuery({
    queryKey: ['admin', 'support', { status, page, keyword }],
    queryFn: () => getSupportAdminApi({ status: status || undefined, page, keyword: keyword || undefined }),
    placeholderData: keepPreviousData,
  })
  const tickets = query.data?.data || []
  const counts = query.data?.counts || {}

  const tabs = [
    { id: 'new', label: 'Yeni', count: counts.new },
    { id: 'in-progress', label: 'İnceleniyor', count: counts['in-progress'] },
    { id: 'resolved', label: 'Çözüldü' },
    { id: '', label: 'Tümü' },
  ]

  const onChanged = (updated) => {
    setOpen((prev) => (prev ? { ...prev, ...updated } : prev))
    queryClient.invalidateQueries({ queryKey: ['admin', 'support'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  return (
    <div className="ak-page">
      <PageHeader title="Destek talepleri" sub="Müşterilerin Hesabım > Destek bölümünden gönderdiği talepler" />

      <div className="ak-toolbar">
        <Segment items={tabs} value={status} onChange={(v) => { setStatus(v); setPage(1) }} label="Durum" />
        <label className="ak-search">
          <FiSearch size={15} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Konu, e-posta veya mesaj" aria-label="Talep ara" />
        </label>
      </div>

      <div className="ak-card">
        {query.isPending ? (
          <div className="ak-loading"><FiRefreshCw className="spin" /> Yükleniyor…</div>
        ) : tickets.length === 0 ? (
          <Empty icon={FiLifeBuoy} title={status === 'new' ? 'Yeni talep yok' : 'Talep bulunamadı'} />
        ) : (
          <ul className="sp-list">
            {tickets.map((t) => {
              const name = [t.user?.firstName, t.user?.lastName].filter(Boolean).join(' ')
              return (
                <li key={t._id}>
                  <button type="button" onClick={() => setOpen(t)}>
                    <span className="sp-row-main">
                      <span className="ak-strong">{t.subject}</span>
                      <span className="sp-snippet">{t.message}</span>
                    </span>
                    <span className="sp-row-side">
                      <Pill status={t.status} />
                      <span className="ak-sub">{name || t.email} · {dateTime(t.createdAt)}</span>
                      {t.attachmentUrl && <FiPaperclip size={13} className="ak-muted" aria-label="Ekli dosya var" />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <Pager page={page} pages={query.data?.pages || 1} onChange={setPage} />
      </div>

      {open && <TicketDetail key={open._id} ticket={open} onClose={() => setOpen(null)} onChanged={onChanged} />}
    </div>
  )
}

export default AdminSupport

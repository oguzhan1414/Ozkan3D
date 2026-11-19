import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPaperclip, FiX } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import { createSupportRequestApi, getMySupportRequestsApi } from '../../../api/supportApi'
import { formatDateTime } from './accountUtils'

const MAX_FILE = 4 * 1024 * 1024 // Vercel istek sınırı nedeniyle 4 MB
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx'
const STATUS = {
  new: { label: 'Alındı', cls: 'is-new' },
  'in-progress': { label: 'İnceleniyor', cls: 'is-progress' },
  resolved: { label: 'Çözüldü', cls: 'is-done' },
}

const SupportTab = ({ notify }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const fileRef = useRef(null)
  const { data, isLoading } = useQuery({ queryKey: ['my-support'], queryFn: getMySupportRequestsApi })
  const tickets = data?.data || []

  const [form, setForm] = useState({ email: user?.email || '', subject: '', message: '' })
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const pickFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_FILE) {
      setErrors((er) => ({ ...er, file: 'Dosya en fazla 4 MB olabilir.' }))
      e.target.value = ''
      return
    }
    setErrors((er) => ({ ...er, file: undefined }))
    setFile(f)
  }

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) er.email = 'Geçerli bir e-posta gir.'
    if (!form.subject.trim()) er.subject = 'Konu gerekli.'
    if (!form.message.trim()) er.message = 'Ne olduğunu kısaca anlat.'
    setErrors(er)
    if (Object.keys(er).length) return

    setSending(true)
    try {
      const fd = new FormData()
      fd.append('email', form.email.trim())
      fd.append('subject', form.subject.trim())
      fd.append('message', form.message.trim())
      if (file) fd.append('attachment', file)
      await createSupportRequestApi(fd)
      await queryClient.invalidateQueries({ queryKey: ['my-support'] })
      setForm((f) => ({ ...f, subject: '', message: '' }))
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      notify('Talebin bize ulaştı. E-postana dönüş yapacağız.')
    } catch (err) {
      notify(err.response?.data?.message || 'Talep gönderilemedi.', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="ac-support">
      <form className="ac-panel" onSubmit={submit} noValidate>
        <h3>Yeni destek talebi</h3>
        <p className="ac-panel-lead">Sipariş, iade ya da ürünle ilgili her konuda yazabilirsin. Acil durumlar için WhatsApp daha hızlı.</p>
        <div className="sf-form-grid">
          <label className={`sf-field ${errors.subject ? 'has-error' : ''}`}>
            <span className="sf-field-label">Konu</span>
            <input value={form.subject} onChange={set('subject')} maxLength={140} placeholder="Örn. OZ261112M10 siparişim hakkında" />
            {errors.subject && <span className="sf-field-error">{errors.subject}</span>}
          </label>
          <label className={`sf-field ${errors.email ? 'has-error' : ''}`}>
            <span className="sf-field-label">Dönüş e-postası</span>
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email" />
            {errors.email && <span className="sf-field-error">{errors.email}</span>}
          </label>
          <label className={`sf-field is-wide ${errors.message ? 'has-error' : ''}`}>
            <span className="sf-field-label">Mesaj</span>
            <textarea rows={5} value={form.message} onChange={set('message')} maxLength={3000} />
            {errors.message && <span className="sf-field-error">{errors.message}</span>}
          </label>
          <div className="is-wide ac-file">
            <input ref={fileRef} id="ac-file" type="file" accept={ACCEPT} onChange={pickFile} className="sf-visually-hidden" />
            {file ? (
              <span className="ac-file-chip">
                <FiPaperclip aria-hidden="true" /> {file.name}
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }} aria-label="Dosyayı kaldır"><FiX /></button>
              </span>
            ) : (
              <label htmlFor="ac-file" className="sf-link-btn ac-file-btn"><FiPaperclip aria-hidden="true" /> Dosya ekle</label>
            )}
            <span className="ac-file-hint">Fotoğraf, PDF ya da belge · en fazla 4 MB</span>
            {errors.file && <span className="sf-field-error">{errors.file}</span>}
          </div>
        </div>
        <div className="ac-panel-actions">
          <button type="submit" className="sf-btn sf-btn--ink" disabled={sending}>{sending ? 'Gönderiliyor…' : 'Talebi gönder'}</button>
          <a href="https://wa.me/905411190626" target="_blank" rel="noopener noreferrer" className="sf-link-btn ac-wa">
            <FaWhatsapp aria-hidden="true" /> WhatsApp'tan yaz
          </a>
        </div>
      </form>

      <section className="ac-tickets" aria-labelledby="ac-tickets-title">
        <h3 id="ac-tickets-title">Önceki talepler</h3>
        {isLoading ? (
          <p className="ac-muted-text">Yükleniyor…</p>
        ) : tickets.length === 0 ? (
          <p className="ac-muted-text">Henüz destek talebin yok.</p>
        ) : (
          <ul>
            {tickets.map((t) => {
              const st = STATUS[t.status] || STATUS.new
              return (
                <li key={t._id}>
                  <div className="ac-ticket-top">
                    <strong>{t.subject}</strong>
                    <span className={`ac-status ${st.cls}`}>{st.label}</span>
                  </div>
                  <p>{t.message}</p>
                  <p className="ac-ticket-meta">
                    <time className="sf-mono">{formatDateTime(t.createdAt)}</time>
                    {t.attachmentName && <span><FiPaperclip aria-hidden="true" /> {t.attachmentName}</span>}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default SupportTab

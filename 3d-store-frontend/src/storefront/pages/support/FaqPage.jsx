import { useState } from 'react'
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi'
import SEO from '../../../components/SEO'
import SupportLayout from './SupportLayout'
import { FAQS } from './faqData'

const FILTERS = [{ id: 'all', label: 'Tümü' }, { id: 'siparis', label: 'Sipariş' }, { id: 'kargo', label: 'Kargo ve teslimat' }, { id: 'ozel', label: 'Özel baskı' }, { id: 'iade', label: 'İade ve değişim' }]
const normalize = (value) => value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/ı/g, 'i')

const FaqPage = () => {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const query = normalize(search.trim())
  const visible = FAQS.filter((faq) => (filter === 'all' || faq.filter === filter) && normalize(`${faq.q} ${faq.a}`).includes(query))
  return (
    <SupportLayout current="Sıkça sorulan sorular" title="Sıkça sorulan sorular" intro="Sipariş, kargo, özel baskı ve iade hakkında merak edilenler.">
      <SEO title="Sıkça Sorulan Sorular" description="Sipariş, kargo, özel 3D baskı ve iade süreçleri hakkında sıkça sorulan soruların yanıtları." url="/faq" structuredData={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map((faq) => ({ '@type': 'Question', name: faq.q, acceptedAnswer: { '@type': 'Answer', text: faq.a } })) }} />
      <div className="sf-support-faq-tools">
        <div className="sf-support-search"><FiSearch aria-hidden="true" /><label className="sf-visually-hidden" htmlFor="sf-faq-search">Sorularda ve yanıtlarda ara</label><input id="sf-faq-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Bir kelime veya konu ara…" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Aramayı temizle"><FiX /></button>}</div>
        <div className="sf-support-filters" role="group" aria-label="Soru kategorileri">{FILTERS.map((item) => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={filter === item.id ? 'is-active' : ''}>{item.label}</button>)}</div>
      </div>
      <div className="sf-support-results" role="status">{visible.length} soru{search.trim() && <> · “{search.trim()}” için</>}</div>
      <div className="sf-support-questions">{visible.map((faq) => <details key={faq.id}><summary>{faq.q}<FiChevronDown aria-hidden="true" /></summary><p>{faq.a}</p></details>)}</div>
      {visible.length === 0 && <div className="sf-support-empty"><FiSearch aria-hidden="true" /><h2>Bu aramada bir yanıt bulamadık.</h2><p>Başka bir kelime deneyebilir veya tüm sorulara dönebilirsin.</p><button type="button" className="sf-btn sf-btn--ghost" onClick={() => { setFilter('all'); setSearch('') }}>Tüm soruları göster</button></div>}
      <p className="sf-support-updated">İçerik güncellemesi: 9 Nisan 2026</p>
    </SupportLayout>
  )
}

export default FaqPage

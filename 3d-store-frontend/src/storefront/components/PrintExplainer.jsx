import { useEffect, useId, useState } from 'react'
import { FiCheck, FiChevronLeft, FiChevronRight, FiPause, FiPlay, FiRotateCcw } from 'react-icons/fi'
import examplesImage from '../../images/custom-print-examples.webp'

const STAGES = [
  { title: 'Ne istediğini anlat', text: '“Telefonumu masada dik tutacak mercan renkli bir stand istiyorum.” Bir cümle, fotoğraf veya çizimle başlayabilirsin.' },
  { title: 'Modeli ve fiyatı netleştirelim', text: 'Ölçüleri, rengi ve adedi konuşalım. Basılacak dijital modeli ve fiyat teklifini netleştirelim. Onayın olmadan üretime geçmeyelim.' },
  { title: 'Yazıcı katman katman üretsin', text: '3D yazıcı, plastik malzemeyi ince katmanlar halinde biriktirir. Ekrandaki model böylece eline alabileceğin bir parçaya dönüşür.' },
  { title: 'Parçan sana ulaşsın', text: 'Üretilen parçayı kontrol edip paketleyelim. Başta anlattığın fikir, kullanabileceğin fiziksel bir ürün olsun.' },
]

const STAND = 'M100 260 L146 91 Q149 82 158 84 L180 91 L222 230 L278 230 L278 208 Q278 201 286 201 L297 205 L297 269 Q297 278 287 278 L113 278 Q104 278 100 270Z'

const PrintExplainer = () => {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [animatePrint, setAnimatePrint] = useState(false)
  const id = useId()
  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => {
      if (step === STAGES.length - 1) setPlaying(false)
      else {
        if (step === 1) setAnimatePrint(true)
        setStep((value) => value + 1)
      }
    }, 5500)
    return () => window.clearTimeout(timer)
  }, [playing, step])
  const choose = (index) => { setPlaying(false); setAnimatePrint(false); setStep(index) }

  return (
    <section className="sf-print-explainer" id="sf-print-how" aria-labelledby="sf-print-how-title">
      <div className="sf-service-section-head"><div><p className="sf-service-eyebrow">BİR TELEFON STANDI ÜZERİNDEN</p><h2 id="sf-print-how-title">Bir cümleden, elindeki ürüne.</h2></div><p>Örnek süreci oynat veya adımları kendin seç.</p></div>
      <div className="sf-print-demo">
        <div className={`sf-print-scene sf-print-scene--${step} ${playing ? 'is-playing' : ''} ${animatePrint ? 'is-animated' : ''}`}>
          <span className="sf-print-scene-label">0{step + 1} / 04 <span>Temsili anlatım</span></span>
          {step === 3 ? <img src={examplesImage} alt="Üretilebilecek ürünlere temsili örnekler: telefon standı, isimlik ve bağlantı parçası." width="1536" height="1024" loading="lazy" /> : (
            <svg viewBox="0 0 400 330" role="img" aria-label={['Telefon standının basit bir çizimi', 'Ölçüleri ve rengi belirlenen dijital telefon standı modeli', 'Telefon standının baskı katmanlarıyla oluşması'][step]}>
              <defs><pattern id={`${id}-layers`} width="4" height="6" patternUnits="userSpaceOnUse"><path d="M0 5H4" stroke="#d94052" strokeWidth="1" /></pattern></defs>
              <ellipse cx="205" cy="288" rx="124" ry="11" fill="#eadbd1" />
              <path d={STAND} fill="none" stroke="#cfb2a2" strokeWidth="1.5" strokeDasharray="5 5" />
              <g className={step === 2 ? 'sf-print-building' : ''} key={step}>
                <path d={STAND} fill={step === 0 ? '#fffaf6' : '#f77b63'} stroke={step === 0 ? '#8d7668' : '#c64d4b'} strokeWidth="2" strokeLinejoin="round" />
                {step === 2 && <path d={STAND} fill={`url(#${id}-layers)`} />}
              </g>
              {step === 0 && <g fill="none" stroke="#9f897a" strokeWidth="1.3"><path d="M80 90V278M74 90H86M74 278H86M110 307H297M110 302V312M297 302V312" /><path d="M180 119L213 135M180 119L195 149" /></g>}
              {step === 1 && <g fill="none" stroke="#a6554d" strokeWidth="1.1"><path d="M118 262L156 111 190 238 118 262ZM156 111L222 230M118 262L278 230M156 111L297 269M190 238L287 278" /><circle cx="156" cy="111" r="4" fill="#fff" /><circle cx="222" cy="230" r="4" fill="#fff" /><circle cx="118" cy="262" r="4" fill="#fff" /></g>}
              {step === 2 && <g className="sf-print-nozzle"><rect x="137" y="36" width="48" height="21" rx="3" fill="#524941" /><path d="M145 61H177L164 82H158Z" fill="#ad7c53" /></g>}
            </svg>
          )}
          <div className="sf-print-scene-foot">{step === 0 ? 'Bir çizim veya fotoğraf da yeterli.' : step === 1 ? <><span className="sf-print-color" /> Renk, ölçü ve teklif birlikte belirlenir.</> : step === 2 ? 'Dijital model → ince katmanlar → fiziksel parça' : 'Görseldeki ürünler temsili örneklerdir.'}</div>
        </div>
        <div className="sf-print-demo-copy">
          <div className="sf-print-stage-buttons" role="group" aria-label="Üretim süreci adımları">{STAGES.map((stage, index) => <button type="button" key={stage.title} aria-pressed={step === index} onClick={() => choose(index)} className={step === index ? 'is-active' : ''}><span>0{index + 1}</span>{stage.title}{index < step && <FiCheck aria-hidden="true" />}</button>)}</div>
          <div className="sf-print-stage-description" aria-live={playing ? 'off' : 'polite'}><h3>{STAGES[step].title}</h3><p>{STAGES[step].text}</p></div>
          <div className="sf-print-controls">
            <button type="button" className="sf-btn sf-btn--ink" onClick={() => { if (!playing && step === 3) { setStep(0); setAnimatePrint(false) } if (!playing && step === 2) setAnimatePrint(true); setPlaying((value) => !value) }}>{playing ? <><FiPause /> Duraklat</> : step === 3 ? <><FiRotateCcw /> Baştan oynat</> : <><FiPlay /> Süreci oynat</>}</button>
            <button type="button" className="sf-icon-btn" onClick={() => choose(step - 1)} disabled={step === 0} aria-label="Önceki adım"><FiChevronLeft /></button>
            <button type="button" className="sf-icon-btn" onClick={() => choose(step + 1)} disabled={step === 3} aria-label="Sonraki adım"><FiChevronRight /></button>
          </div>
          <p className="sf-print-demo-note">Bu bir süreç animasyonudur; gerçek üretim kaydı veya süre göstergesi değildir.</p>
        </div>
      </div>
    </section>
  )
}

export default PrintExplainer

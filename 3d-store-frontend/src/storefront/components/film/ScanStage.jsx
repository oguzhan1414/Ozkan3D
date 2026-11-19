import { FiCheck, FiGlobe, FiMail, FiPackage, FiCamera } from 'react-icons/fi'
import { FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { SCENE_META, TOTAL, BOUNDARIES, TRANSITION, CHAPTERS, SIZE_TEXT, TYPE_WINDOW, SHOTS, SCAN } from './scanTimeline'
import {
  clamp, seg, out, back, lerp, typed, track, pressed, rippleAt, BODY_TOP, Cursor, Win, LogoOpen, StageFrame,
} from './kit'
import './ScanStage.css'

/* ==================================================================
   3D tarama anlatım filmi (Remotion ile videoya render edilir).
   Örnek obje: eski bir radyonun kırık düğmesi.
   ================================================================== */

export const LAYOUTS = {
  land: {
    w: 1280, h: 720, title: 84,
    phone: { x: 150, y: 46, w: 300, h: 590 },
    card: { x: 540, y: 104, w: 580, h: 430 },
    quoteTop: 92,
    scan: { cx: 400, cy: 400, panel: { x: 760, y: 96, w: 420, h: 440 } },
    clean: { view: { x: 210, y: 56, w: 540, h: 540 }, list: { x: 820, y: 190 } },
    deliver: { mail: { x: 100, y: 150, w: 500 }, knobs: { cx: 900, cy: 340 } },
  },
  port: {
    w: 720, h: 1280, title: 80,
    phone: { x: 210, y: 70, w: 300, h: 540 },
    card: { x: 60, y: 640, w: 600, h: 430 },
    quoteTop: 330,
    scan: { cx: 360, cy: 400, panel: { x: 150, y: 680, w: 420, h: 360 } },
    clean: { view: { x: 110, y: 110, w: 500, h: 500 }, list: { x: 150, y: 680 } },
    deliver: { mail: { x: 60, y: 150, w: 600 }, knobs: { cx: 360, cy: 760 } },
  },
}

/* --------------------------------------------------------------- Obje
   Radyo düğmesi: silindir. rot: dönüş açısı (radyan), broken: kırık parça. */
const RX = 80
const RY = 24
const HALF = 35
const Knob = ({ rot = 0, broken = false, hole = '#f5f5f3', body = '#2b2b2b', top = '#3d3d3d', accent = '#ff385c', mesh = 0, showIndicator = true }) => {
  const cx = 100
  const cy = 75
  const stripes = []
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + rot
    const c = Math.cos(a)
    if (c <= 0.05) continue
    const x = cx + RX * Math.sin(a)
    stripes.push(<line key={i} x1={x} y1={cy - HALF + RY * c} x2={x} y2={cy + HALF + RY * c} stroke="#161616" strokeOpacity={0.35 + 0.4 * c} strokeWidth="2.6" />)
  }
  const ix = cx + 52 * Math.sin(rot + 0.6)
  const iy = cy - HALF + 15 * Math.cos(rot + 0.6)
  return (
    <svg viewBox="0 0 200 140" width="100%" height="100%" aria-hidden="true" overflow="visible">
      <ellipse cx={cx} cy={cy + HALF + 10} rx={RX + 10} ry={RY * 0.6} fill="#000" opacity=".12" />
      <path d={`M${cx - RX} ${cy - HALF} V${cy + HALF} A${RX} ${RY} 0 0 0 ${cx + RX} ${cy + HALF} V${cy - HALF} Z`} fill={body} />
      {stripes}
      <ellipse cx={cx} cy={cy - HALF} rx={RX} ry={RY} fill={top} />
      <ellipse cx={cx} cy={cy - HALF} rx={RX * 0.68} ry={RY * 0.68} fill="#323232" />
      {showIndicator && <line x1={cx} y1={cy - HALF} x2={ix} y2={iy} stroke={accent} strokeWidth="5" strokeLinecap="round" />}
      {broken && (
        // Kopmuş parça: üst-sağ kenarda kırık çentik
        <path d={`M${cx + 34} ${cy - HALF - RY - 2} l10 14 l-6 6 l14 10 l-4 9 l22 4 V${cy - HALF - RY - 8} Z`} fill={hole} />
      )}
      {mesh > 0 && (
        <g stroke={accent} strokeWidth="0.9" fill="none" opacity={mesh}>
          {[-HALF, -HALF / 2, 0, HALF / 2, HALF].map((dy) => (
            <path key={dy} d={`M${cx - RX} ${cy + dy} A${RX} ${RY} 0 0 0 ${cx + RX} ${cy + dy}`} />
          ))}
          {[-1, -0.7, -0.35, 0, 0.35, 0.7, 1].map((k) => {
            const x = cx + RX * k
            const yo = RY * Math.sqrt(1 - k * k)
            return <line key={k} x1={x} y1={cy - HALF + yo} x2={x} y2={cy + HALF + yo} />
          })}
          <ellipse cx={cx} cy={cy - HALF} rx={RX} ry={RY} />
          <ellipse cx={cx} cy={cy - HALF} rx={RX * 0.68} ry={RY * 0.68} />
          <ellipse cx={cx} cy={cy - HALF} rx={RX * 0.34} ry={RY * 0.34} />
        </g>
      )}
    </svg>
  )
}

// Nokta bulutu: düğme yüzeyinden deterministik örnekler (alttan üste dizili)
const CLOUD = (() => {
  let seed = 7
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const pts = []
  for (let i = 0; i < 520; i++) {
    if (r() < 0.36) {
      const a = r() * Math.PI * 2
      const k = Math.sqrt(r())
      pts.push({ x: 100 + RX * k * Math.cos(a), y: 75 - HALF + RY * k * Math.sin(a), top: true })
    } else {
      const k = r() * 2 - 1
      const yo = RY * Math.sqrt(1 - k * k)
      pts.push({ x: 100 + RX * k, y: 75 - HALF + yo + r() * HALF * 2, top: false, depth: Math.sqrt(1 - k * k) })
    }
  }
  return pts.sort((p, q) => q.y - p.y)
})()

// Düzenleme sahnesindeki gürültü noktaları
const NOISE = (() => {
  let seed = 99
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  return Array.from({ length: 46 }, () => ({ x: 10 + r() * 180, y: 6 + r() * 128, s: 1.5 + r() * 2.5 }))
})()

/* ================================================================ Sahneler */
const Logo = (props) => <LogoOpen {...props} tag="3D tarama hizmeti" />

const Intro = ({ lt, L }) => {
  const lines = [['Elindeki objeyi'], ['dijital modele', 'çevirelim.']]
  const chips = seg(lt, 1.3, 1.8)
  const portrait = L.w < L.h
  let k = 0
  return (
    <div className="pf-center">
      <h3 className="sc-intro-title" style={{ fontSize: L.title }}>
        {lines.map((line, li) => (
          <span key={li} className={`sc-intro-line ${portrait ? 'is-col' : ''}`}>
            {line.map((w) => {
              const p = out(seg(lt, 0.1 + k * 0.18, 0.6 + k * 0.18))
              k += 1
              return <span key={w} className={w === 'çevirelim.' ? 'is-accent' : ''} style={{ opacity: p, transform: `translateY(${(1 - p) * 36}px)` }}>{w}</span>
            })}
          </span>
        ))}
      </h3>
      <div className={`pf-intro-paths ${portrait ? 'is-col' : ''}`} style={{ opacity: chips, transform: `translateY(${(1 - out(chips)) * 18}px)` }}>
        <span className="pf-pill pf-pill--ink">Kopyasını bastır</span>
        <span className="pf-pill pf-pill--line">Ölçeğini değiştir</span>
        <span className="pf-pill pf-pill--line">Arşivle</span>
      </div>
    </div>
  )
}

/* Fotoğraf: telefonla üç açıdan çekim + ölçü + gönder */
const Photo = ({ lt, L }) => {
  const { phone, card } = L
  const shot = SHOTS.filter((s) => lt >= s).length
  const flash = Math.max(0, ...SHOTS.map((s) => (lt >= s ? 1 - seg(lt, s, s + 0.3) : 0)))
  const rot = shot * 0.9 + lt * 0.08
  const send = { x: card.x + card.w / 2, y: card.y + BODY_TOP + 267 }
  const keys = [[0, L.w - 80, L.h - 60], [3.9, L.w - 120, L.h - 90], [4.4, send.x, send.y], [5.5, send.x + 70, send.y + 80]]
  const c = track(lt, keys)
  const sent = lt >= 4.55
  const cardIn = out(seg(lt, 0, 0.5))
  return (
    <>
      <div className="sc-phone" style={{ left: phone.x, top: phone.y, width: phone.w, height: phone.h }}>
        <div className="sc-phone-screen">
          <span className="sc-viewfinder" />
          <div className="sc-phone-obj" style={{ transform: `scale(${1 + shot * 0.06})` }}>
            <Knob rot={rot} broken hole="#3a3a3a" />
          </div>
          <span className="sc-phone-count"><FiCamera /> {shot}/3</span>
          <span className="sc-shutter" style={{ transform: `scale(${flash > 0.7 ? 0.88 : 1})` }} />
          <span className="sc-flash" style={{ opacity: flash * 0.9 }} />
        </div>
      </div>

      <Win box={card} url="ozkan3d.com.tr/scan" title="Tarama talebi" className="pf-win--brand" style={{ opacity: cardIn, transform: `translateY(${(1 - cardIn) * 24}px)` }}>
        <span className="sc-label">Fotoğraflar</span>
        <div className="sc-thumbs">
          {[0, 1, 2].map((i) => {
            const p = back(seg(lt, SHOTS[i] + 0.15, SHOTS[i] + 0.5))
            return (
              <span key={i} className="sc-thumb">
                {p > 0 && <span className="sc-thumb-in" style={{ transform: `scale(${clamp(p)})` }}><Knob rot={0.9 * (i + 1)} broken hole="#3a3a3a" /></span>}
              </span>
            )
          })}
        </div>
        <span className="sc-label">Yaklaşık ölçü ve yüzey</span>
        <span className="pf-field sc-field">{typed(SIZE_TEXT, seg(lt, ...TYPE_WINDOW)) || <em>ör. 4 × 4 × 2 cm</em>}</span>
        <button type="button" tabIndex={-1} className={`pf-btn pf-btn--accent pf-btn--wide ${pressed(lt, [4.5]) ? 'is-down' : ''}`}>
          {sent ? <><FiCheck /> Gönderildi</> : 'Tarama için teklif iste'}
        </button>
      </Win>
      <Cursor {...c} down={pressed(lt, [4.5])} ripple={rippleAt(lt, [4.5])} visible={lt > 3.6} />
    </>
  )
}

/* Teklif ve gönderim */
const Quote = ({ lt, L }) => {
  const cx = L.w / 2
  const approve = { x: cx - 103, y: L.quoteTop + 371 }
  const keys = [[0, L.w - 130, L.h - 70], [1.1, approve.x, approve.y], [1.9, approve.x, approve.y], [3.5, approve.x + 160, approve.y + 140]]
  const card = back(seg(lt, 0, 0.55))
  const approved = lt >= 1.65
  const chip = back(seg(lt, 2.3, 2.7))
  const c = track(lt, keys)
  return (
    <>
      <div className="pf-quote" style={{ top: L.quoteTop, transform: `translate(-50%, ${lerp(L.h - L.quoteTop, 0, clamp(card))}px)` }}>
        <div className="pf-quote-head"><span className="pf-bell"><FiMail /></span><div><strong>Tarama teklifin</strong><span>Ozkan3d · fotoğraflar incelendi</span></div></div>
        <dl>
          <div><dt>Obje</dt><dd>Radyo düğmesi</dd></div>
          <div><dt>Hizmet</dt><dd>Tarama + düzenleme</dd></div>
          <div><dt>Teslim</dt><dd>STL dosyası</dd></div>
          <div><dt>Süre</dt><dd>2 iş günü</dd></div>
        </dl>
        <div className="pf-quote-total"><span>Toplam</span><strong>650 ₺</strong></div>
        <div className="pf-quote-actions">
          <button type="button" tabIndex={-1} className={`pf-btn ${approved ? 'pf-btn--ok' : 'pf-btn--accent'} ${pressed(lt, [1.6]) ? 'is-down' : ''}`}>
            {approved ? <><FiCheck /> Onaylandı</> : 'Onayla'}
          </button>
          <button type="button" tabIndex={-1} className="pf-btn pf-btn--line">Soru sor</button>
        </div>
      </div>
      <div className="sc-ship-chip" style={{ top: L.quoteTop + 470, opacity: clamp(chip), transform: `translate(-50%, ${(1 - clamp(chip)) * 14}px)` }}>
        <FiPackage /> Objeni kargoyla gönder ya da atölyeye bırak
      </div>
      <Cursor {...c} down={pressed(lt, [1.6])} ripple={rippleAt(lt, [1.6])} />
    </>
  )
}

/* Tarama: döner tabla, mercan ışık süpürmesi, nokta bulutu */
const Scan = ({ lt, L }) => {
  const S = L.scan
  const appear = out(seg(lt, 0, 0.45))
  const p = seg(lt, SCAN.start, SCAN.end)
  const rot = lt * 1.6
  const beamY = Math.sin(lt * 3.2) * 46
  const shown = Math.floor(p * CLOUD.length)
  const done = p >= 1
  const P = S.panel
  return (
    <div style={{ opacity: appear }}>
      {/* tarayıcı + tabla */}
      <div className="sc-rig" style={{ left: S.cx - 260, top: S.cy - 220 }}>
        <svg width="520" height="380" viewBox="0 0 520 380" aria-hidden="true">
          <defs>
            <linearGradient id="sc-beam" x1="0" x2="1"><stop offset="0" stopColor="#ff385c" stopOpacity=".55" /><stop offset="1" stopColor="#ff385c" stopOpacity=".05" /></linearGradient>
          </defs>
          {/* tripod ve tarayıcı başlığı */}
          <path d="M70 360 L96 230 L122 360" stroke="#2b2b2b" strokeWidth="6" fill="none" strokeLinecap="round" />
          <rect x="91" y="150" width="10" height="90" fill="#2b2b2b" />
          <rect x="52" y="112" width="96" height="58" rx="12" fill="#222" />
          <circle cx="132" cy="141" r="14" fill="#3a3a3a" />
          <circle cx="132" cy="141" r="7" fill="#ff385c" opacity={!done ? 0.6 + 0.4 * Math.sin(lt * 20) : 0.4} />
          {/* ışın: mercan yelpaze */}
          {!done && <path d={`M140 141 L${300} ${190 + beamY} L${300} ${236 + beamY} Z`} fill="url(#sc-beam)" />}
          {!done && <line x1="236" x2="364" y1={213 + beamY} y2={213 + beamY} stroke="#ff385c" strokeWidth="3" opacity=".85" />}
          {/* döner tabla */}
          <ellipse cx="300" cy="300" rx="130" ry="30" fill="#c9c9c4" />
          <ellipse cx="300" cy="294" rx="130" ry="30" fill="#e2e2de" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2 + rot
            return Math.sin(a) > 0 ? <circle key={i} cx={300 + 118 * Math.cos(a)} cy={294 + 26 * Math.sin(a)} r="3" fill="#a3a39d" /> : null
          })}
        </svg>
        <div className="sc-rig-obj"><Knob rot={rot} broken /></div>
      </div>

      {/* nokta bulutu paneli */}
      <div className="sc-cloud" style={{ left: P.x, top: P.y, width: P.w, height: P.h }}>
        <div className="sc-cloud-head"><span>Nokta bulutu</span><strong>{done ? 'Tamam' : `%${Math.round(p * 100)}`}</strong></div>
        <svg viewBox="-10 -10 220 160" className="sc-cloud-svg" aria-hidden="true">
          {CLOUD.slice(0, shown).map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r={pt.top ? 1.6 : 1.4} fill={pt.top ? '#ff385c' : '#222'} opacity={pt.top ? 0.9 : 0.35 + 0.55 * (pt.depth ?? 1)} />
          ))}
        </svg>
        <span className="pf-bar"><i style={{ width: `${p * 100}%` }} /></span>
        <span className="sc-cloud-count">{(shown * 412).toLocaleString('tr-TR')} nokta</span>
      </div>
    </div>
  )
}

/* Düzenleme: gürültü silinir, boşluk dolar, yüzey düzelir */
const Clean = ({ lt, L }) => {
  const C = L.clean
  const appear = out(seg(lt, 0, 0.4))
  const noise = 1 - seg(lt, 0.8, 1.2)
  const fill = seg(lt, 1.8, 2.2)
  const smooth = seg(lt, 2.6, 3.0)
  const steps = [
    { t: 1.2, label: 'Gürültü temizlendi' },
    { t: 2.2, label: 'Boşluklar dolduruldu' },
    { t: 3.0, label: 'Yüzey düzeltildi' },
  ]
  return (
    <div style={{ opacity: appear }}>
      <div className="sc-view" style={{ left: C.view.x, top: C.view.y, width: C.view.w, height: C.view.h }}>
        <span className="sc-view-tag">model_v2.stl</span>
        <div className="sc-view-obj">
          <svg viewBox="0 0 200 140" width="100%" height="100%" aria-hidden="true" overflow="visible">
            {NOISE.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r={n.s} fill="#ff385c" opacity={noise * 0.7} />)}
          </svg>
          <div className="sc-view-knob" style={{ opacity: 1 }}>
            <Knob rot={0.5} broken mesh={1 - smooth} body={smooth > 0 ? '#2b2b2b' : '#3a3a3a'} hole="#fff" />
          </div>
          {/* boşluk: gövdede eksik yüzey */}
          <span className="sc-hole" style={{ opacity: 1 - fill }} />
        </div>
      </div>
      <ul className="sc-steps" style={{ left: C.list.x, top: C.list.y }}>
        {steps.map((s, i) => {
          const on = lt >= s.t
          const p = back(seg(lt, s.t - 0.6 + i * 0.05, s.t - 0.2))
          return (
            <li key={s.label} className={on ? 'is-done' : ''} style={{ opacity: clamp(p * 2), transform: `translateX(${(1 - clamp(p)) * 20}px)` }}>
              <span>{on ? <FiCheck /> : i + 1}</span>{s.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* Teslim: STL e-postada, obje geri kargoda, istersen kopyası basılır */
const Deliver = ({ lt, L }) => {
  const D = L.deliver
  const mail = back(seg(lt, 0, 0.5))
  const file = back(seg(lt, 0.3, 0.7))
  const box = back(seg(lt, 0.9, 1.3))
  const old = back(seg(lt, 2.1, 2.5))
  const neu = back(seg(lt, 2.5, 2.9))
  const portrait = L.w < L.h
  return (
    <>
      <div className="sc-mail" style={{ left: D.mail.x, top: D.mail.y, width: D.mail.w, opacity: clamp(mail), transform: `translateY(${(1 - clamp(mail)) * 30}px)` }}>
        <div className="sc-mail-head"><span className="pf-bell"><FiMail /></span><div><strong>Modelin hazır</strong><span>Ozkan3d · gelen kutusu</span></div></div>
        <p>Merhaba, radyo düğmesinin 3D modeli ektedir. Objeni bugün kargoya verdik.</p>
        <span className="sc-mail-file" style={{ transform: `scale(${clamp(file)})` }}><span className="pf-file-ico">STL</span> radyo-dugmesi.stl · 2,4 MB</span>
        <span className="sc-mail-ship" style={{ opacity: clamp(box), transform: `scale(${lerp(0.8, 1, clamp(box))})` }}><FiPackage /> Objen geri kargoda</span>
      </div>
      <div className={`sc-compare ${portrait ? 'is-port' : ''}`} style={{ left: D.knobs.cx, top: D.knobs.cy }}>
        <p className="sc-compare-title" style={{ opacity: clamp(old) }}>İstersen kopyasını da basarız</p>
        <div className="sc-compare-row">
          <figure style={{ opacity: clamp(old), transform: `scale(${clamp(old)})` }}>
            <div className="sc-compare-obj"><Knob rot={0.5} broken /></div>
            <figcaption>Eski · kırık</figcaption>
          </figure>
          <span className="sc-compare-arrow" style={{ opacity: clamp(neu) }}>→</span>
          <figure style={{ opacity: clamp(neu), transform: `scale(${clamp(neu)})` }}>
            <div className="sc-compare-obj"><Knob rot={0.5} /></div>
            <figcaption className="is-new">Yeni baskı</figcaption>
          </figure>
        </div>
      </div>
    </>
  )
}

const Outro = ({ lt, L, assets }) => {
  const a = out(seg(lt, 0.1, 0.7))
  const b = out(seg(lt, 0.6, 1.1))
  const c = out(seg(lt, 1.0, 1.5))
  const portrait = L.w < L.h
  return (
    <div className="pf-center">
      <img className="pf-outro-logo" src={assets.wordmark} alt="Ozkan3d" style={{ opacity: a, transform: `scale(${lerp(0.9, 1, a)})` }} />
      <p className="pf-outro-tag" style={{ opacity: b }}>Elindeki objeyi dijital modele çevirelim.</p>
      <div className="pf-intro-paths" style={{ opacity: b, transform: `translateY(${(1 - b) * 16}px)` }}>
        <span className="pf-pill pf-pill--accent">Tarama için teklif iste</span>
      </div>
      <ul className={`pf-contact ${portrait ? 'is-col' : ''}`} style={{ opacity: c, transform: `translateY(${(1 - c) * 14}px)` }}>
        <li><FiGlobe /> ozkan3d.com.tr/scan</li>
        <li><FaInstagram /> @ozkan3d.design</li>
        <li><FaWhatsapp /> 0541 119 06 26</li>
      </ul>
    </div>
  )
}

const COMPONENTS = { logo: Logo, intro: Intro, photo: Photo, quote: Quote, scan: Scan, clean: Clean, deliver: Deliver, outro: Outro }
const TIMELINE = {
  meta: SCENE_META, total: TOTAL, chapters: CHAPTERS, boundaries: BOUNDARIES,
  sceneAt: (t) => SCENE_META.find((s) => t >= s.start && t < s.start + s.dur) || SCENE_META[SCENE_META.length - 1],
}

/** Tarama filminin bir karesi */
const ScanStage = ({ t, layout = 'land', assets }) => (
  <StageFrame t={t} layout={layout} L={LAYOUTS[layout]} timeline={TIMELINE} components={COMPONENTS} assets={assets} transition={TRANSITION} />
)

export default ScanStage

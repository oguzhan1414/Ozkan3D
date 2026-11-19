import { FiCheck, FiPaperclip, FiSend, FiBell, FiUploadCloud, FiGlobe } from 'react-icons/fi'
import { FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { SCENE_META, TOTAL, BOUNDARIES, TRANSITION, IDEA, TYPE_WINDOW, PRINT, CHAPTERS } from './filmTimeline'
import {
  clamp, seg, ease, out, back, lerp, typed, track, pressed, rippleAt, BODY_TOP, BODY_PAD, Cursor, Win, LogoOpen, StageFrame,
} from './kit'

/* ==================================================================
   Filmin tek karesi: verilen t (saniye) için sahneyi çizer.
   Site oynatıcısı (ProcessFilm) ve Remotion videosu bunu kullanır.
   layout: 'land' (1280×720) | 'port' (720×1280)
   ================================================================== */

// ---------------------------------------------------------------- Yerleşimler
export const LAYOUTS = {
  land: {
    w: 1280, h: 720,
    lib: { x: 70, y: 70, w: 640, h: 520 },
    form: { x: 740, y: 96, w: 470, h: 470, fromX: 1320, fromY: 96 },
    chat: { x: 290, y: 60, w: 700, h: 530 },
    quoteTop: 92,
    print: { svgTop: 0, svgH: 720, view: '0 0 1280 720', panel: { left: 90, top: 210 } },
    ship: { cx: 640, top: 300, ground: 560, chip: 600 },
    title: 96,
  },
  port: {
    w: 720, h: 1280,
    lib: { x: 40, y: 110, w: 640, h: 500 },
    form: { x: 60, y: 650, w: 600, h: 470, fromX: 60, fromY: 1340 },
    chat: { x: 30, y: 230, w: 660, h: 640 },
    quoteTop: 360,
    print: { svgTop: 210, svgH: 530, view: '340 110 760 560', panel: { left: 80, top: 790, wide: true } },
    ship: { cx: 360, top: 470, ground: 730, chip: 800 },
    title: 104,
  },
}

export const STAND = 'M10 190 H190 V176 H150 L84 40 Q80 30 70 34 L58 40 Q50 44 54 54 L114 176 H44 V150 Q44 142 36 142 H28 Q20 142 20 150 V176 H10 Z'
const StandShape = ({ size = 100, color = '#ff385c', style }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" style={style} aria-hidden="true"><path d={STAND} fill={color} /></svg>
)

const MODEL_ICONS = {
  stand: (c) => <path d={STAND} fill={c} transform="translate(30 20) scale(.7)" />,
  vase: (c) => (
    <g fill={c}>
      <path d="M75 30 h50 q-6 30 10 60 q20 40 -10 80 h-50 q-30 -40 -10 -80 q16 -30 10 -60z" />
      <path d="M70 70 h60 M64 100 h72 M66 130 h68" stroke="#fff" strokeWidth="5" opacity=".35" />
    </g>
  ),
  cat: (c) => (
    <g fill={c}>
      <ellipse cx="100" cy="135" rx="48" ry="42" />
      <circle cx="100" cy="78" r="32" />
      <path d="M72 58 L76 28 L96 50 Z M128 58 L124 28 L104 50 Z" />
    </g>
  ),
  pot: (c) => (
    <g>
      <path d="M100 95 q-30 -50 -8 -70 q20 30 8 70 q-2 -45 40 -55 q-6 40 -40 55" fill="#3d8b5a" />
      <path d="M58 95 h84 l-12 85 h-60 z" fill={c} />
      <rect x="52" y="90" width="96" height="16" rx="4" fill={c} />
    </g>
  ),
  clip: (c) => (
    <g fill={c}>
      <rect x="40" y="70" width="120" height="60" rx="16" />
      <circle cx="75" cy="100" r="12" fill="#fff" />
      <circle cx="125" cy="100" r="12" fill="#fff" />
    </g>
  ),
  key: (c) => (
    <g>
      <circle cx="70" cy="70" r="26" fill="none" stroke="#999" strokeWidth="8" />
      <rect x="78" y="78" width="80" height="96" rx="14" transform="rotate(-12 118 126)" fill={c} />
    </g>
  ),
}
const MODELS = [
  { id: 'stand', name: 'Telefon standı', color: '#ff385c' },
  { id: 'vase', name: 'Spiral vazo', color: '#222' },
  { id: 'cat', name: 'Kedi figürü', color: '#b9b9b4' },
  { id: 'pot', name: 'Mini saksı', color: '#e8e4dc' },
  { id: 'clip', name: 'Kablo klipsi', color: '#222' },
  { id: 'key', name: 'Anahtarlık', color: '#ff385c' },
]
const ModelIcon = ({ id, color, size = 90 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">{MODEL_ICONS[id](color)}</svg>
)

/* ================================================================ Sahneler */

/* 0 · Logo açılışı */
const Logo = (props) => <LogoOpen {...props} tag="Siparişe özel 3D baskı" />

/* 1 · Giriş */
const Intro = ({ lt, L }) => {
  const words = ['Aklındaki', 'parçayı', 'basalım.']
  const chips = seg(lt, 1.5, 2.1)
  const portrait = L.w < L.h
  return (
    <div className="pf-center">
      <h3 className={`pf-intro-title ${portrait ? 'is-col' : ''}`} style={{ fontSize: L.title }}>
        {words.map((w, i) => {
          const p = out(seg(lt, 0.1 + i * 0.2, 0.7 + i * 0.2))
          return <span key={w} style={{ opacity: p, transform: `translateY(${(1 - p) * 40}px)` }} className={i === 2 ? 'is-accent' : ''}>{w}</span>
        })}
      </h3>
      <div className={`pf-intro-paths ${portrait ? 'is-col' : ''}`} style={{ opacity: chips, transform: `translateY(${(1 - out(chips)) * 20}px)` }}>
        <span className="pf-pill pf-pill--ink">Hazır bir model</span>
        <span className="pf-intro-or">ya da</span>
        <span className="pf-pill pf-pill--line">Kendi fikrin</span>
      </div>
    </div>
  )
}

/* 2 · Yol A: hazır model → STL → Ozkan3d formu */
const PathA = ({ lt, L }) => {
  const { lib, form } = L
  // Hedef noktalar pencere konumlarından hesaplanır
  const cardW = (lib.w - BODY_PAD * 2 - 28) / 3
  const card0 = { x: lib.x + BODY_PAD + cardW / 2, y: lib.y + BODY_TOP + 69 }
  const panelTop = lib.y + lib.h - 24 - 182
  const stl = { x: lib.x + BODY_PAD + 22 + 150 + 20 + 68, y: panelTop + 119 }
  const right = form.x + form.w - BODY_PAD
  const drop = { x: form.x + form.w / 2, y: form.y + BODY_TOP + 48 }
  const swatch = { x: right - 135, y: form.y + 297 }
  const plus = { x: right - 22, y: form.y + 351 }
  const submit = { x: form.x + form.w / 2, y: form.y + 415 }

  const cursorKeys = [
    [0, L.w / 2, L.h - 40], [1.4, card0.x, card0.y], [2.4, card0.x, card0.y], [3.4, stl.x, stl.y], [4.1, stl.x, stl.y],
    [6.8, drop.x, drop.y + 40], [7.6, swatch.x, swatch.y], [8.2, swatch.x, swatch.y], [8.6, plus.x, plus.y],
    [9.4, plus.x, plus.y], [9.9, submit.x, submit.y], [12.5, submit.x + 80, submit.y + 90],
  ]
  const clicks = [2.0, 3.8, 8.0, 8.8, 10.0]

  const libIn = out(seg(lt, 0, 0.5))
  const detail = back(seg(lt, 2.15, 2.6))
  const formIn = out(seg(lt, 4.4, 5.2))
  const fly = seg(lt, 4.6, 6.6)
  const landed = lt >= 6.6
  const fx = lerp(stl.x - 120, drop.x - 110, ease(fly))
  const fy = lerp(stl.y - 20, drop.y - 20, ease(fly)) - Math.sin(Math.PI * fly) * 160
  const material = typed('PLA', seg(lt, 7.1, 7.5))
  const qty = lt >= 8.8 ? 2 : 1
  const sent = lt >= 10.05
  const toast = out(seg(lt, 10.35, 10.8))
  const c = track(lt, cursorKeys)

  return (
    <>
      <Win
        box={lib}
        url="makerworld.com · printables.com · …"
        title="3D model kütüphanesi"
        style={{ opacity: libIn, transform: `translateY(${(1 - libIn) * 30}px) scale(${lerp(1, 0.95, formIn)})`, transformOrigin: 'left top' }}
      >
        <div className="pf-grid">
          {MODELS.map((m, i) => (
            <div key={m.id} className={`pf-card ${i === 0 && lt > 1.5 ? 'is-hover' : ''}`}>
              <ModelIcon id={m.id} color={m.color} />
              <span>{m.name}</span>
            </div>
          ))}
        </div>
        <div className="pf-detail" style={{ opacity: clamp(detail), transform: `translateY(${(1 - clamp(detail)) * 60}px)` }}>
          <ModelIcon id="stand" color="#ff385c" size={150} />
          <div>
            <strong>Telefon standı</strong>
            <span>Ücretsiz · 1,2 MB</span>
            <button type="button" tabIndex={-1} className={`pf-btn pf-btn--ink ${pressed(lt, [3.8]) ? 'is-down' : ''}`}>STL indir</button>
          </div>
        </div>
      </Win>

      <Win
        box={{ ...form, x: lerp(form.fromX, form.x, formIn), y: lerp(form.fromY, form.y, formIn) }}
        url="ozkan3d.com.tr/custom"
        title="Özel baskı talebi"
        className="pf-win--brand"
      >
        <div className={`pf-drop ${fly > 0.75 && !landed ? 'is-over' : ''} ${landed ? 'is-filled' : ''}`}>
          {landed
            ? <span className="pf-file-row"><span className="pf-file-ico">STL</span> telefon-standi.stl <FiCheck /></span>
            : <span><FiUploadCloud /> Dosyanı buraya bırak</span>}
        </div>
        <div className="pf-form">
          <label>Malzeme<span className="pf-field">{material || <em>Seç</em>}</span></label>
          <label>Renk
            <span className="pf-swatches">
              {['#222', '#ff385c', '#f5f5f3', '#3b82f6', '#16a34a'].map((sw, i) => (
                <i key={sw} style={{ background: sw }} className={lt >= 8.0 && i === 1 ? 'is-on' : ''} />
              ))}
            </span>
          </label>
          <label>Adet
            <span className="pf-stepper"><b>−</b><span>{qty}</span><b className={pressed(lt, [8.8]) ? 'is-down' : ''}>+</b></span>
          </label>
          <button type="button" tabIndex={-1} className={`pf-btn pf-btn--accent pf-btn--wide ${pressed(lt, [10.0]) ? 'is-down' : ''}`}>
            {sent ? <><FiCheck /> Gönderildi</> : 'Teklif iste'}
          </button>
        </div>
      </Win>

      {fly > 0 && !landed && (
        <div className="pf-flyfile" style={{ transform: `translate(${fx}px, ${fy}px) rotate(${lerp(-8, 6, fly)}deg)` }}>
          <span className="pf-file-ico">STL</span> telefon-standi.stl
        </div>
      )}

      <div className="pf-toast" style={{ left: submit.x, top: form.y + form.h + 16, opacity: toast, transform: `translate(-50%, ${(1 - toast) * 20}px)` }}>
        <FiCheck /> Talebin bize ulaştı
      </div>

      <Cursor {...c} down={pressed(lt, clicks)} ripple={rippleAt(lt, clicks)} />
    </>
  )
}

/* 3 · Yol B: fikrini anlat */
const Sketch = () => (
  <svg viewBox="0 0 120 80" width="120" height="80" aria-hidden="true">
    <rect width="120" height="80" rx="8" fill="#fff" />
    <path d="M20 66 h80 M30 66 V20 q0 -8 8 -8 h44 q8 0 8 8 v10" fill="none" stroke="#222" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 3" />
    <path d="M90 30 q12 0 12 12" fill="none" stroke="#ff385c" strokeWidth="3" strokeLinecap="round" />
    <text x="60" y="78" fontSize="9" textAnchor="middle" fill="#888">≈ 20 cm</text>
  </svg>
)
const PathB = ({ lt, L }) => {
  const box = L.chat
  const send = { x: box.x + box.w - BODY_PAD - 8 - 23, y: box.y + box.h - 22 - 31 }
  const keys = [[0, L.w - 120, L.h - 60], [4.6, send.x, send.y], [5.4, send.x + 1, send.y + 1], [8, send.x + 80, send.y + 90]]
  const winIn = out(seg(lt, 0, 0.5))
  const greet = back(seg(lt, 0.2, 0.55))
  const text = typed(IDEA, seg(lt, ...TYPE_WINDOW))
  const attach = back(seg(lt, 4.3, 4.65))
  const sent = lt >= 5.75
  const bubble = back(seg(lt, 5.8, 6.2))
  const dots = lt >= 6.3 && lt < 7.0
  const reply = back(seg(lt, 7.0, 7.35))
  const c = track(lt, keys)
  return (
    <>
      <Win box={box} url="ozkan3d.com.tr/custom" title="Fikrini anlat" className="pf-win--brand" style={{ opacity: winIn, transform: `translateY(${(1 - winIn) * 30}px)` }}>
        <div className="pf-chat">
          <div className="pf-bubble pf-bubble--them" style={{ opacity: clamp(greet), transform: `scale(${lerp(0.8, 1, clamp(greet))})` }}>
            Merhaba! Ne bastırmak istiyorsun? Fotoğraf ya da çizim de ekleyebilirsin.
          </div>
          {sent && (
            <div className="pf-bubble pf-bubble--me" style={{ opacity: clamp(bubble), transform: `scale(${lerp(0.8, 1, clamp(bubble))})` }}>
              {IDEA}
              <span className="pf-sketch-thumb"><Sketch /></span>
            </div>
          )}
          {dots && (
            <div className="pf-bubble pf-bubble--them pf-typing">
              {[0, 1, 2].map((k) => <i key={k} style={{ transform: `translateY(${-5 * Math.max(0, Math.sin((lt * 7) - k * 0.9))}px)` }} />)}
            </div>
          )}
          {lt >= 7.0 && (
            <div className="pf-bubble pf-bubble--them" style={{ opacity: clamp(reply), transform: `scale(${lerp(0.8, 1, clamp(reply))})` }}>
              Harika, ölçüyü netleştirip teklifini hazırlıyoruz.
            </div>
          )}
        </div>
        <div className="pf-compose">
          {attach > 0 && !sent && <span className="pf-attach" style={{ transform: `scale(${clamp(attach)})` }}><FiPaperclip /> eskiz.jpg</span>}
          <span className="pf-input">{sent ? <em>Mesaj yaz…</em> : <>{text}<i className="pf-caret" style={{ opacity: Math.floor(lt * 2.2) % 2 ? 0.15 : 1 }} /></>}</span>
          <span className={`pf-send ${pressed(lt, [5.6]) ? 'is-down' : ''}`}><FiSend /></span>
        </div>
      </Win>
      <Cursor {...c} down={pressed(lt, [5.6])} ripple={rippleAt(lt, [5.6])} visible={lt > 4.2} />
    </>
  )
}

/* 4 · Teklif ve onay */
const Quote = ({ lt, L }) => {
  const cx = L.w / 2
  const approve = { x: cx - 103, y: L.quoteTop + 371 }
  const keys = [[0, L.w - 130, L.h - 70], [1.4, L.w - 180, L.h - 120], [2.6, approve.x, approve.y], [3.4, approve.x, approve.y], [5.5, approve.x + 160, approve.y + 140]]
  const card = back(seg(lt, 0, 0.6))
  const approved = lt >= 3.05
  const burst = seg(lt, 3.05, 4.0)
  const c = track(lt, keys)
  return (
    <>
      <div className="pf-quote" style={{ top: L.quoteTop, transform: `translate(-50%, ${lerp(L.h - L.quoteTop, 0, clamp(card))}px)` }}>
        <div className="pf-quote-head"><span className="pf-bell"><FiBell /></span><div><strong>Teklifin hazır</strong><span>Ozkan3d · az önce</span></div></div>
        <dl>
          <div><dt>Ürün</dt><dd>Telefon standı</dd></div>
          <div><dt>Malzeme</dt><dd>PLA · <i className="pf-dot" /> Mercan</dd></div>
          <div><dt>Adet</dt><dd>2</dd></div>
          <div><dt>Hazırlık</dt><dd>3 iş günü</dd></div>
        </dl>
        <div className="pf-quote-total"><span>Toplam</span><strong>449 ₺</strong></div>
        <div className="pf-quote-actions">
          <button type="button" tabIndex={-1} className={`pf-btn ${approved ? 'pf-btn--ok' : 'pf-btn--accent'} ${pressed(lt, [3.0]) ? 'is-down' : ''}`}>
            {approved ? <><FiCheck /> Onaylandı</> : 'Onayla'}
          </button>
          <button type="button" tabIndex={-1} className="pf-btn pf-btn--line">Soru sor</button>
        </div>
        {burst > 0 && burst < 1 && (
          <div className="pf-burst" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2
              const r = out(burst) * 130
              return <i key={i} style={{ transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px) rotate(${a}rad)`, opacity: 1 - burst, background: i % 3 ? '#ff385c' : '#222' }} />
            })}
          </div>
        )}
      </div>
      <Cursor {...c} down={pressed(lt, [3.0])} ripple={rippleAt(lt, [3.0])} />
    </>
  )
}

/* 5 · Baskı: derinlikli yazıcı, sıcak uç parıltısı, bitince parça kalkıp döner */
const Print = ({ lt, L }) => {
  const appear = out(seg(lt, 0, 0.5))
  const p = seg(lt, PRINT.start, PRINT.end)
  const layers = 240
  const layer = Math.floor(p * layers)
  const progress = layer / layers
  const objH = 300
  const objTop = 578 - objH
  const revealY = 578 - objH * progress
  const nozzleX = 640 + Math.sin(lt * 9) * 140
  const done = p >= 1
  // Bitince köprü yukarı çekilir, parça kalkar ve döner
  const park = ease(seg(lt, PRINT.end, PRINT.end + 0.4))
  const gantryY = lerp(revealY - 58, 190, park)
  const lift = ease(seg(lt, ...PRINT.lift))
  const spin = Math.cos(lift * Math.PI * 2)
  const glow = 0.55 + 0.45 * Math.sin(lt * 26)
  const pr = L.print
  return (
    <div className="pf-print" style={{ opacity: appear, transform: `translateY(${(1 - appear) * 30}px)` }}>
      <svg className="pf-print-svg" style={{ top: pr.svgTop, height: pr.svgH }} width={L.w} viewBox={pr.view} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <clipPath id="pf-reveal"><rect x="0" y={revealY} width="1280" height="720" /></clipPath>
          <pattern id="pf-layers" width="8" height="5" patternUnits="userSpaceOnUse"><rect width="8" height="1.4" fill="#fff" opacity=".2" /></pattern>
          <radialGradient id="pf-glow"><stop offset="0" stopColor="#ffb199" stopOpacity=".95" /><stop offset="1" stopColor="#ff385c" stopOpacity="0" /></radialGradient>
          <linearGradient id="pf-post" x1="0" x2="1"><stop offset="0" stopColor="#3a3a3a" /><stop offset=".6" stopColor="#2a2a2a" /><stop offset="1" stopColor="#1c1c1c" /></linearGradient>
          <linearGradient id="pf-part" x1="0" x2="1"><stop offset="0" stopColor="#ff5a76" /><stop offset="1" stopColor="#e3264a" /></linearGradient>
        </defs>
        {/* zemin gölgesi */}
        <ellipse cx="640" cy="654" rx="320" ry="18" fill="#000" opacity=".08" />
        {/* gövde: üst yüzü açık tonlu taban, yan direkler gradyanlı */}
        <path d="M372 600 h536 l-14 -10 h-508 z" fill="#3a3a3a" />
        <rect x="372" y="600" width="536" height="46" rx="8" fill="#222" />
        <rect x="400" y="618" width="80" height="8" rx="4" fill="#ff385c" opacity=".8" />
        <rect x="418" y="146" width="22" height="456" rx="5" fill="url(#pf-post)" />
        <rect x="840" y="146" width="22" height="456" rx="5" fill="url(#pf-post)" />
        <rect x="406" y="132" width="468" height="24" rx="7" fill="#262626" />
        <rect x="406" y="132" width="468" height="6" rx="3" fill="#3d3d3d" />
        {/* makara */}
        <g transform="translate(965 232)">
          <circle r="80" fill="#262626" />
          <circle r="66" fill="#ff385c" />
          <circle r="66" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="2" strokeDasharray="3 6" transform={`rotate(${lt * 50})`} />
          <circle r="24" fill="#262626" />
          <circle r="8" fill="#555" />
        </g>
        {/* tabla: ön yüzü ve üst yüzü */}
        <path d="M455 578 h370 l-12 -8 h-346 z" fill="#a3a39d" />
        <rect x="455" y="578" width="370" height="14" rx="3" fill="#7d7d78" />
        {/* parça */}
        {!done || lift === 0 ? (
          <>
            <g clipPath="url(#pf-reveal)">
              <g transform={`translate(490 ${objTop}) scale(1.5)`}>
                <path d={STAND} fill="url(#pf-part)" />
                <path d={STAND} fill="url(#pf-layers)" />
              </g>
            </g>
            {!done && (
              <g transform={`translate(490 ${objTop}) scale(1.5)`} opacity=".14">
                <path d={STAND} fill="none" stroke="#222" strokeWidth="1.4" strokeDasharray="4 4" />
              </g>
            )}
          </>
        ) : (
          <g transform={`translate(640 ${428 - lift * 80}) scale(${1.5 * spin} 1.5) translate(-100 -100)`}>
            <path d={STAND} fill="url(#pf-part)" />
            <path d={STAND} fill="url(#pf-layers)" />
          </g>
        )}
        {/* filament */}
        <path d={`M965 312 C 965 390, ${nozzleX + 40} ${gantryY - 90}, ${nozzleX} ${gantryY - 4}`} fill="none" stroke="#ff385c" strokeWidth="4" opacity={1 - park} />
        {/* köprü ve baskı kafası */}
        <rect x="428" y={gantryY} width="424" height="14" rx="4" fill="#3a3a3a" />
        <g transform={`translate(${lerp(nozzleX, 640, park)} ${gantryY})`}>
          <rect x="-36" y="-20" width="72" height="50" rx="11" fill="#222" />
          <rect x="-36" y="-20" width="72" height="8" rx="4" fill="#333" />
          <rect x="-18" y="-8" width="36" height="6" rx="3" fill="#ff385c" />
          <path d="M-9 30 h18 l-9 14 z" fill="#c9c9c4" />
          {!done && <circle cx="0" cy="48" r="22" fill="url(#pf-glow)" opacity={glow} />}
        </g>
        {done && (
          <g transform={`translate(${lerp(640, 760, lift)} ${lerp(220, 250, lift)}) scale(${back(seg(lt, PRINT.end + 0.05, PRINT.end + 0.45))})`}>
            <circle r="32" fill="#16a34a" />
            <path d="M-13 0 l8 8 l17 -17" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>
      <div className={`pf-print-panel ${pr.panel.wide ? 'is-wide' : ''}`} style={{ left: pr.panel.left, top: pr.panel.top }}>
        <span>Bolu atölyesi · Yazıcı 2</span>
        <strong>{done ? 'Bitti' : `%${Math.round(progress * 100)}`}</strong>
        <span className="pf-bar"><i style={{ width: `${progress * 100}%` }} /></span>
        <span>{done ? 'Kalite kontrol ✓' : `Katman ${layer}/${layers}`}</span>
      </div>
    </div>
  )
}

/* 6 · Kargo */
const Ship = ({ lt, L, assets }) => {
  const S = L.ship
  const drop = out(seg(lt, 0.2, 0.75))
  const flaps = ease(seg(lt, 1.0, 1.5))
  const stamp = back(seg(lt, 1.6, 1.95))
  const go = ease(seg(lt, 2.4, 3.6))
  const chip = back(seg(lt, 2.5, 2.9))
  const dx = go * (L.w * 0.75)
  return (
    <>
      <div className="pf-ground" style={{ top: S.ground }} />
      {go > 0.05 && go < 0.95 && (
        <div className="pf-speed" style={{ left: S.cx - 120 + dx - 330, top: S.top + 80, opacity: 1 - go }}><i /><i /><i /></div>
      )}
      <div className="pf-box" style={{ left: S.cx - 120, top: S.top, transform: `translateX(${dx}px) rotate(${go * 4}deg)` }}>
        {flaps < 1 && (
          <div className="pf-box-part" style={{ transform: `translate(-50%, ${lerp(-320, 10, drop)}px)` }}>
            <StandShape size={120} />
          </div>
        )}
        <div className="pf-box-body">
          <span className="pf-box-flap is-l" style={{ transform: `rotate(${lerp(-110, 0, flaps)}deg)` }} />
          <span className="pf-box-flap is-r" style={{ transform: `rotate(${lerp(110, 0, flaps)}deg)` }} />
          <span className="pf-box-tape" style={{ opacity: flaps }} />
          <span className="pf-box-label" style={{ transform: `scale(${clamp(stamp)}) rotate(-4deg)` }}>
            <img src={assets.wordmark} alt="" />
          </span>
        </div>
      </div>
      <div className="pf-track-chip" style={{ top: S.chip, opacity: clamp(chip), transform: `translate(-50%, ${(1 - clamp(chip)) * 16}px)` }}>
        <FiCheck /> Kargoda · takip no e-postanda
      </div>
    </>
  )
}

/* 7 · Kapanış: logo + iki yol + iletişim */
const Outro = ({ lt, L, assets }) => {
  const a = out(seg(lt, 0.1, 0.7))
  const b = out(seg(lt, 0.6, 1.1))
  const c = out(seg(lt, 1.0, 1.5))
  const portrait = L.w < L.h
  return (
    <div className="pf-center">
      <img className="pf-outro-logo" src={assets.wordmark} alt="Ozkan3d" style={{ opacity: a, transform: `scale(${lerp(0.9, 1, a)})` }} />
      <p className="pf-outro-tag" style={{ opacity: b }}>Katman katman, siparişe özel.</p>
      <div className={`pf-intro-paths ${portrait ? 'is-col' : ''}`} style={{ opacity: b, transform: `translateY(${(1 - b) * 16}px)` }}>
        <span className="pf-pill pf-pill--accent">Dosyanı gönder</span>
        <span className="pf-pill pf-pill--line">Fikrini anlat</span>
      </div>
      <ul className={`pf-contact ${portrait ? 'is-col' : ''}`} style={{ opacity: c, transform: `translateY(${(1 - c) * 14}px)` }}>
        <li><FiGlobe /> ozkan3d.com.tr/custom</li>
        <li><FaInstagram /> @ozkan3d.design</li>
        <li><FaWhatsapp /> 0541 119 06 26</li>
      </ul>
    </div>
  )
}

const COMPONENTS = { logo: Logo, intro: Intro, a: PathA, b: PathB, quote: Quote, print: Print, ship: Ship, outro: Outro }

/* ================================================================ Kare */
const TIMELINE = { meta: SCENE_META, total: TOTAL, chapters: CHAPTERS, boundaries: BOUNDARIES, sceneAt: (t) => SCENE_META.find((s) => t >= s.start && t < s.start + s.dur) || SCENE_META[SCENE_META.length - 1] }
export const sceneAt = TIMELINE.sceneAt

/**
 * Filmin bir karesi. Kapsayıcının ölçeklemesi dışarıdan yapılır.
 * @param t      saniye (0..TOTAL)
 * @param layout 'land' | 'port'
 * @param assets { wordmark }
 */
const FilmStage = ({ t, layout = 'land', assets }) => (
  <StageFrame t={t} layout={layout} L={LAYOUTS[layout]} timeline={TIMELINE} components={COMPONENTS} assets={assets} transition={TRANSITION} />
)

export default FilmStage

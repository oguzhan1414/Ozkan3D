// Anlatım filmlerinin ortak parçaları: zaman yardımcıları, imleç, pencere,
// logo açılışı, geçiş bandı ve sahne çerçevesi. Özel baskı (FilmStage) ve
// 3D tarama (ScanStage) filmleri bunları paylaşır.
import './FilmStage.css'

/* ------------------------------------------------------------ Yardımcılar */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const seg = (t, a, b) => clamp((t - a) / (b - a))
export const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
export const out = (x) => 1 - (1 - x) ** 3
export const back = (x) => { const c = 1.6; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2 }
export const lerp = (a, b, p) => a + (b - a) * p
export const typed = (text, p) => text.slice(0, Math.round(text.length * clamp(p)))

/** Anahtar karelerden konum: [[t, x, y], ...] */
export const track = (t, keys) => {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] }
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, y1] = keys[i]
    const [t0, x0, y0] = keys[i - 1]
    if (t <= t1) {
      const p = ease(seg(t, t0, t1))
      return { x: lerp(x0, x1, p), y: lerp(y0, y1, p) }
    }
  }
  const last = keys[keys.length - 1]
  return { x: last[1], y: last[2] }
}
export const pressed = (t, clicks) => clicks.some((c) => t >= c && t < c + 0.18)
/** Son tıklamadan bu yana geçen oran (dalga efekti için), yoksa null */
export const rippleAt = (t, clicks) => {
  const c = clicks.find((x) => t >= x && t < x + 0.4)
  return c === undefined ? null : (t - c) / 0.4
}

/** Sahne listesine başlangıç zamanlarını ekler, toplam süre ve bölümleri döner */
export const makeTimeline = (meta) => {
  let acc = 0
  for (const s of meta) {
    s.start = acc
    acc += s.dur
  }
  return {
    meta,
    total: acc,
    startOf: (id) => meta.find((s) => s.id === id).start,
    chapters: meta.filter((s) => s.step),
    boundaries: meta.slice(1).map((s) => s.start),
    sceneAt: (t) => meta.find((s) => t >= s.start && t < s.start + s.dur) || meta[meta.length - 1],
  }
}

// Pencere içi ölçüler (CSS ile aynı tutulmalı): çubuk 46, başlık 50, gövde boşluğu 14/24
export const BODY_TOP = 46 + 50 + 14
export const BODY_PAD = 24

/* ------------------------------------------------------------ Parçalar */
export const Cursor = ({ x, y, down, ripple = null, visible = true }) => (
  <div className="pf-cursor" style={{ transform: `translate(${x}px, ${y}px) scale(${down ? 0.86 : 1})`, opacity: visible ? 1 : 0 }}>
    {ripple !== null && <span className="pf-ripple" style={{ transform: `scale(${lerp(0.2, 1.3, out(ripple))})`, opacity: 1 - ripple }} />}
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 2.5 L4 19 L8.6 14.8 L11.6 21.4 L14.4 20.1 L11.5 13.6 L17.8 13.6 Z" fill="#222" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  </div>
)

export const Win = ({ box, url, title, children, style, className = '' }) => (
  <div className={`pf-win ${className}`} style={{ left: box.x, top: box.y, width: box.w, height: box.h, ...style }}>
    <div className="pf-win-bar">
      <span className="pf-dots"><i /><i /><i /></span>
      <span className="pf-url">{url}</span>
    </div>
    {title && <div className="pf-win-title">{title}</div>}
    <div className="pf-win-body">{children}</div>
  </div>
)

/** Logo açılışı: logo katman katman basılır */
export const LogoOpen = ({ lt, L, assets, tag }) => {
  const p = seg(lt, 0.15, 1.6)
  const layers = 28
  const shown = Math.floor(p * layers) / layers
  const logoW = L.w === 1280 ? 640 : 600
  const logoH = logoW * (121 / 720)
  const settle = out(seg(lt, 1.7, 2.3))
  return (
    <div className="pf-center">
      <div className="pf-logo-print" style={{ width: logoW, height: logoH, transform: `scale(${lerp(1, 1.04, settle)})` }}>
        <img src={assets.wordmark} alt="" style={{ clipPath: `inset(${(1 - shown) * 100}% 0 0 0)` }} />
        <img src={assets.wordmark} alt="" className="pf-logo-ghost" />
        {p < 1 && (
          <span className="pf-logo-nozzle" style={{ top: `${(1 - shown) * 100}%`, left: `${50 + Math.sin(lt * 14) * 46}%` }} />
        )}
        <span className="pf-logo-layers" style={{ clipPath: `inset(${(1 - shown) * 100}% 0 0 0)` }} />
      </div>
      <p className="pf-logo-tag" style={{ opacity: settle, transform: `translateY(${(1 - settle) * 12}px)` }}>{tag}</p>
    </div>
  )
}

/** Sahne geçişi: siyah + mercan kesik köşeli bant ekranı süpürür */
export const Wipe = ({ t, L, boundaries, duration = 0.9 }) => {
  for (const b of boundaries) {
    const q = seg(t, b - duration / 2, b + duration / 2)
    if (q <= 0 || q >= 1) continue
    const band = (lag, color, width) => {
      const qq = clamp((q - lag) / (1 - lag))
      const left = lerp(-1.75 * L.w, 1.15 * L.w, ease(qq))
      return <div className="pf-wipe" style={{ left, width: width * L.w, background: color }} />
    }
    return (
      <>
        {band(0, '#222', 1.6)}
        {band(0.1, '#ff385c', 1.45)}
      </>
    )
  }
  return null
}

/**
 * Filmin bir karesi: arka plan, sahne (kamera yakınlaşmasıyla), altyazı ve geçiş.
 * @param timeline makeTimeline çıktısı
 * @param components { sahneId: Bileşen }
 */
export const StageFrame = ({ t, layout, L, timeline, components, assets, transition = 0.9 }) => {
  const scene = timeline.sceneAt(clamp(t, 0, timeline.total - 0.0001))
  const lt = t - scene.start
  const Scene = components[scene.id]
  const zoom = 1 + 0.035 * ease(seg(lt, 0, scene.dur))
  const firstFade = scene.start === 0 ? seg(lt, 0, 0.25) : 1
  const captionIn = Math.min(seg(lt, 0.5, 0.95), 1 - seg(lt, scene.dur - 0.55, scene.dur - 0.2))
  const stepNo = timeline.chapters.findIndex((c) => c.id === scene.id) + 1
  return (
    <div className={`pf-stage pf-stage--${layout}`} style={{ width: L.w, height: L.h }}>
      <div className="pf-bg">
        <i className="pf-blob pf-blob--a" style={{ transform: `translate(${Math.sin(t / 4) * 50}px, ${Math.cos(t / 5) * 30}px)` }} />
        <i className="pf-blob pf-blob--b" style={{ transform: `translate(${Math.cos(t / 6) * 50}px, ${Math.sin(t / 4.5) * 30}px)` }} />
      </div>
      <div className="pf-scene" style={{ opacity: firstFade, transform: `scale(${zoom})` }}>
        <Scene lt={lt} L={L} assets={assets} />
      </div>
      {scene.caption && (
        <div className={`pf-caption ${layout === 'port' ? 'is-wrap' : ''}`} style={{ opacity: captionIn, transform: `translate(-50%, ${(1 - captionIn) * 12}px)` }}>
          <span className="pf-caption-step">{stepNo}</span>
          <span>{scene.caption}</span>
        </div>
      )}
      <Wipe t={t} L={L} boundaries={timeline.boundaries} duration={transition} />
    </div>
  )
}

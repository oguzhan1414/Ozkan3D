import { useRef, useState } from 'react'
import { FiPlay, FiVolume2 } from 'react-icons/fi'
import { CHAPTERS as PRINT_CHAPTERS, TOTAL as PRINT_TOTAL } from './film/filmTimeline'
import { CHAPTERS as SCAN_CHAPTERS, TOTAL as SCAN_TOTAL } from './film/scanTimeline'
import './ProcessVideo.css'

// Videolar Remotion ile üretilir (npm run video:render) ve public/video altına konur.
const base = `${import.meta.env.BASE_URL}video/`
const VIDEOS = {
  print: {
    src: `${base}ozel-baski.mp4`, poster: `${base}ozel-baski-poster.webp`, chapters: PRINT_CHAPTERS, total: PRINT_TOTAL,
    title: 'Özel baskı nasıl çalışır? (video)', label: 'Özel baskı süreci: hazır model ya da fikir, teklif, baskı ve kargo',
  },
  scan: {
    src: `${base}3d-tarama.mp4`, poster: `${base}3d-tarama-poster.webp`, chapters: SCAN_CHAPTERS, total: SCAN_TOTAL,
    title: '3D tarama nasıl çalışır? (video)', label: '3D tarama süreci: fotoğraf, teklif, tarama, düzenleme ve teslim',
  },
}
const clamp = (v) => Math.min(1, Math.max(0, v))
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Özel baskı sürecini anlatan video: kapak + oynat, tam kontroller, bölümler */
const ProcessVideo = ({ film = 'print', tone = 'light' }) => {
  const { src, poster, chapters: CHAPTERS, total, title, label } = VIDEOS[film]
  const videoRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [time, setTime] = useState(0)
  const [error, setError] = useState(false)

  const play = (at) => {
    const v = videoRef.current
    if (!v) return
    if (typeof at === 'number') {
      v.currentTime = at
      setTime(at)
    }
    v.play().catch(() => { /* Native controls remain available if playback is interrupted. */ })
  }

  const active = CHAPTERS.findLast?.((c) => time >= c.start) ?? [...CHAPTERS].reverse().find((c) => time >= c.start)

  return (
    <section className={`pv ${tone === 'dark' ? 'pv--dark' : ''}`} aria-labelledby={`pv-title-${film}`}>
      <h2 id={`pv-title-${film}`} className="sf-visually-hidden">{title}</h2>
      <div className="pv-topline">
        <span><i aria-hidden="true" /> ATÖLYEDEN EKRANINA</span>
        <span><FiVolume2 aria-hidden="true" /> Sesli anlatım <span className="pv-duration">{fmt(total)}</span></span>
      </div>
      <div className={`pv-frame ${started ? 'is-started' : ''}`}>
        <video
          ref={videoRef}
          className="pv-video"
          src={src}
          poster={poster}
          preload="metadata"
          playsInline
          controls={started || error}
          onPlay={() => setStarted(true)}
          onError={() => setError(true)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          aria-label={label}
        >
          Tarayıcın video oynatmayı desteklemiyor.
        </video>

        {!started && !error && (
          <button type="button" className="pv-start" onClick={() => play()} aria-label="Videoyu oynat">
            <span className="pv-start-btn"><FiPlay aria-hidden="true" /></span>
            <span className="pv-start-label">
              <strong>Süreci keşfet</strong>
              <span>{fmt(total)} içinde baştan sona</span>
            </span>
          </button>
        )}
      </div>
      {error && <p className="pv-error" role="status">Video yüklenemedi. <a href={src}>Videoyu doğrudan aç</a> veya aşağıdaki süreç adımlarını incele.</p>}

      {/* Bölümler: tıklayınca videonun o anına gider */}
      <div className="pv-chapters-head"><span>SÜREÇ ADIMLARI</span><span>Bir adıma dokun, oradan izle <FiPlay aria-hidden="true" /></span></div>
      <ol className="pv-chapters">
        {CHAPTERS.map((ch, i) => {
          const isActive = started && active?.id === ch.id
          const p = clamp((time - ch.start) / ch.dur)
          return (
            <li key={ch.id}>
              <button type="button" onClick={() => play(ch.start)} className={isActive ? 'is-active' : ''} aria-current={isActive ? 'step' : undefined}>
                <span className="pv-ch-bar"><i style={{ width: `${started ? p * 100 : 0}%` }} /></span>
                <span className="pv-ch-label"><b>{i + 1}</b> {ch.step}<em>{fmt(ch.start)}</em></span>
              </button>
            </li>
          )
        })}
      </ol>

      {/* Ekran okuyucular için videonun metin karşılığı */}
      <ol className="sf-visually-hidden">
        {CHAPTERS.map((ch) => <li key={ch.id}>{ch.step}: {ch.caption}</li>)}
      </ol>
    </section>
  )
}

export default ProcessVideo

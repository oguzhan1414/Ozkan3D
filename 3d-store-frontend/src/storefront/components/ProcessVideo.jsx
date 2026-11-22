import { useRef, useState } from 'react'
import { FiPlay, FiPause } from 'react-icons/fi'
import { CHAPTERS as PRINT_CHAPTERS, TOTAL as PRINT_TOTAL } from './film/filmTimeline'
import { CHAPTERS as SCAN_CHAPTERS, TOTAL as SCAN_TOTAL } from './film/scanTimeline'
import './ProcessVideo.css'

// Videolar Remotion ile üretilir (npm run video:render) ve public/video altına konur.
const base = `${import.meta.env.BASE_URL}video/`
const VIDEOS = {
  print: {
    src: `${base}ozel-baski.mp4`, poster: `${base}ozel-baski-poster.webp`, chapters: PRINT_CHAPTERS, total: PRINT_TOTAL,
    label: 'Özel baskı süreci: hazır model ya da fikir, teklif, baskı ve kargo',
  },
  scan: {
    src: `${base}3d-tarama.mp4`, poster: `${base}3d-tarama-poster.webp`, chapters: SCAN_CHAPTERS, total: SCAN_TOTAL,
    label: '3D tarama süreci: fotoğraf, teklif, tarama, düzenleme ve teslim',
  },
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Süreç videosu: sade beyaz çerçeve. Dururken sol altta "Süreci izle" hapı, oynarken köşede küçük durdur düğmesi. */
const ProcessVideo = ({ film = 'print' }) => {
  const { src, poster, chapters, total, label } = VIDEOS[film]
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused || v.ended) v.play().catch(() => setPlaying(false))
    else v.pause()
  }

  return (
    <figure className={`pv ${playing ? 'is-playing' : ''}`}>
      <div className="pv-frame">
        <video
          ref={videoRef}
          className="pv-video"
          src={src}
          poster={poster}
          preload="metadata"
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setError(true)}
          onClick={toggle}
          aria-label={label}
        >
          Tarayıcın video oynatmayı desteklemiyor.
        </video>

        {!error && (
          <button
            type="button"
            className="pv-toggle"
            onClick={toggle}
            aria-label={playing ? 'Videoyu durdur' : 'Videoyu oynat'}
          >
            {playing ? <FiPause aria-hidden="true" /> : (
              <>
                <span className="pv-play-dot"><FiPlay aria-hidden="true" /></span>
                <span className="pv-play-text">Süreci izle <small>{fmt(total)}</small></span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <figcaption className="pv-error" role="status">
          Video yüklenemedi. <a href={src}>Videoyu doğrudan aç</a>.
        </figcaption>
      )}

      {/* Ekran okuyucular için videonun metin karşılığı */}
      <ol className="sf-visually-hidden">
        {chapters.map((ch) => <li key={ch.id}>{ch.step}: {ch.caption}</li>)}
      </ol>
    </figure>
  )
}

export default ProcessVideo

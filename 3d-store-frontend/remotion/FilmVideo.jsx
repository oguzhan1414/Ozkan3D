import { useEffect, useState } from 'react'
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import FilmStage, { LAYOUTS as PRINT_LAYOUTS } from '../src/storefront/components/film/FilmStage'
import ScanStage, { LAYOUTS as SCAN_LAYOUTS } from '../src/storefront/components/film/ScanStage'
import '../src/storefront/storefront.css'

const ASSETS = { wordmark: staticFile('brand/ozkan3d-wordmark.png') }
const FILMS = {
  print: { Stage: FilmStage, layouts: PRINT_LAYOUTS, audio: 'audio/film-audio.wav' },
  scan: { Stage: ScanStage, layouts: SCAN_LAYOUTS, audio: 'audio/scan-audio.wav' },
}

/** Sitedeki sahnelerin aynısı; zaman Remotion karesinden gelir */
export const FilmVideo = ({ film = 'print', layout }) => {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const { Stage, layouts, audio } = FILMS[film]
  const L = layouts[layout]

  // Google fontları yüklenmeden kare çekilmesin
  const [handle] = useState(() => delayRender('Fontlar yükleniyor'))
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(handle))
  }, [handle])

  return (
    <AbsoluteFill style={{ background: '#f5f5f3' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${width / L.w})`, transformOrigin: '0 0' }}>
        <Stage t={frame / fps} layout={layout} assets={ASSETS} />
      </div>
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  )
}

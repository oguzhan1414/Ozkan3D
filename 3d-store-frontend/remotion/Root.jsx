import { Composition } from 'remotion'
import { FilmVideo } from './FilmVideo'
import { TOTAL as PRINT_TOTAL } from '../src/storefront/components/film/filmTimeline'
import { TOTAL as SCAN_TOTAL } from '../src/storefront/components/film/scanTimeline'

export const FPS = 30
const frames = (s) => Math.round(s * FPS)

// Her film iki formatta: yatay (site, YouTube) ve dikey (Reels, TikTok, durum)
export const RemotionRoot = () => (
  <>
    <Composition id="OzelBaski-Yatay" component={FilmVideo} durationInFrames={frames(PRINT_TOTAL)} fps={FPS} width={1920} height={1080} defaultProps={{ film: 'print', layout: 'land' }} />
    <Composition id="OzelBaski-Dikey" component={FilmVideo} durationInFrames={frames(PRINT_TOTAL)} fps={FPS} width={1080} height={1920} defaultProps={{ film: 'print', layout: 'port' }} />
    <Composition id="Tarama-Yatay" component={FilmVideo} durationInFrames={frames(SCAN_TOTAL)} fps={FPS} width={1920} height={1080} defaultProps={{ film: 'scan', layout: 'land' }} />
    <Composition id="Tarama-Dikey" component={FilmVideo} durationInFrames={frames(SCAN_TOTAL)} fps={FPS} width={1080} height={1920} defaultProps={{ film: 'scan', layout: 'port' }} />
  </>
)

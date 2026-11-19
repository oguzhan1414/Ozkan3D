// Render edilen yatay videoları site için hazırlar: sıkıştırma (faststart) + kapak görseli.
// Kullanım: node remotion/publish.mjs   (ffmpeg gerekir)
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = (f) => path.join(root, 'remotion', 'out', f)
const pub = (f) => path.join(root, 'public', 'video', f)

// [kaynak, site videosu, kapak, kapak saniyesi (giriş başlığının tamamlandığı an)]
const VIDEOS = [
  ['ozkan3d-ozel-baski-yatay.mp4', 'ozel-baski.mp4', 'ozel-baski-poster.webp', 5.6],
  ['ozkan3d-3d-tarama-yatay.mp4', '3d-tarama.mp4', '3d-tarama-poster.webp', 4.3],
]

for (const [src, video, poster, at] of VIDEOS) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out(src), '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', pub(video)], { stdio: 'inherit' })
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(at), '-i', out(src), '-frames:v', '1', '-vf', 'scale=1280:-1',
    '-c:v', 'libwebp', '-quality', '82', pub(poster)], { stdio: 'inherit' })
  console.log(`Siteye hazır: public/video/${video} + ${poster}`)
}

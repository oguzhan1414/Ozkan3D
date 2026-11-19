// 3D tarama anlatım filminin zaman çizelgesi (saniye). JSX yok:
// site, Remotion ve ses betiği aynı veriyi okur.

export const SIZE_TEXT = '4 × 4 × 2 cm · mat siyah'
export const TYPE_WINDOW = [3.0, 3.9] // fotoğraf sahnesinde ölçü yazımı
export const SHOTS = [0.7, 1.5, 2.3] // deklanşör anları
export const SCAN = { start: 0.5, end: 5.4 }
export const TRANSITION = 0.8

export const SCENE_META = [
  { id: 'logo', dur: 2.2 },
  { id: 'intro', dur: 2.6 },
  { id: 'photo', dur: 5.5, step: 'Fotoğraf', caption: 'Objenin birkaç açıdan fotoğrafını ve yaklaşık ölçüsünü gönder.' },
  { id: 'quote', dur: 3.5, step: 'Teklif', caption: 'Fiyatı, süreyi ve objeyi nasıl göndereceğini yazılı iletiyoruz.' },
  { id: 'scan', dur: 6, step: 'Tarama', caption: 'Objeyi tarayıp yüzeyini binlerce noktayla dijitale aktarıyoruz.' },
  { id: 'clean', dur: 4, step: 'Düzenleme', caption: 'Boşlukları ve gürültüyü temizleyip modeli kullanıma hazırlıyoruz.' },
  { id: 'deliver', dur: 4.5, step: 'Teslim', caption: 'Model dosyanı gönderir, objeni geri kargolarız. İstersen kopyasını da basarız.' },
  { id: 'outro', dur: 3.5 },
]

let acc = 0
for (const s of SCENE_META) {
  s.start = acc
  acc += s.dur
}
export const TOTAL = acc
export const startOf = (id) => SCENE_META.find((s) => s.id === id).start
export const CHAPTERS = SCENE_META.filter((s) => s.step)
export const BOUNDARIES = SCENE_META.slice(1).map((s) => s.start)

export const CUES = (() => {
  const L = startOf('logo')
  const i = startOf('intro')
  const ph = startOf('photo')
  const q = startOf('quote')
  const sc = startOf('scan')
  const cl = startOf('clean')
  const d = startOf('deliver')
  const o = startOf('outro')
  const list = [
    [L + 0.1, 'riser'], [L + 1.6, 'done'],
    ...BOUNDARIES.map((t) => [t - 0.38, 'whoosh']),
    [i + 1.4, 'pop'],
    ...SHOTS.map((s) => [ph + s, 'shutter']),
    [ph + 4.5, 'click'], [ph + 4.7, 'chime'],
    [q + 0.15, 'pop'], [q + 1.6, 'click'], [q + 1.65, 'chime'], [q + 2.3, 'pop'],
    [sc + SCAN.end, 'done'],
    [cl + 1.2, 'pop'], [cl + 2.2, 'pop'], [cl + 3.0, 'chime'],
    [d + 0.3, 'pop'], [d + 1.0, 'whoosh'], [d + 2.3, 'pop'], [d + 2.6, 'pop'],
    [o + 0.2, 'chime'],
  ]
  const [t0, t1] = TYPE_WINDOW
  for (let k = 1; k <= SIZE_TEXT.length; k += 1) {
    if (SIZE_TEXT[k - 1] !== ' ') list.push([ph + t0 + ((t1 - t0) * k) / SIZE_TEXT.length, 'type'])
  }
  return list.sort((x, y) => x[0] - y[0])
})()

/** Tarayıcı vızıltısının çaldığı aralık */
export const HUM = [startOf('scan') + SCAN.start, startOf('scan') + SCAN.end]
export const HUM_KIND = 'scanner'

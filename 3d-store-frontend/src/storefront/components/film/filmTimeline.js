// Anlatım filminin zaman çizelgesi (saniye). JSX yok: site oynatıcısı,
// Remotion video kompozisyonu ve ses (WAV) betiği aynı veriyi okur.

export const IDEA = 'Masama kulaklık askısı lazım. Siyah olsun, yaklaşık 20 cm.'
export const TYPE_WINDOW = [0.8, 4.0] // B sahnesinde yazma aralığı
export const PRINT = { dur: 8, start: 0.6, end: 5.8, lift: [6.0, 7.4] }
export const TRANSITION = 0.9 // sahne geçişi (silme) süresi

export const SCENE_META = [
  { id: 'logo', dur: 2.6 },
  { id: 'intro', dur: 3.4 },
  { id: 'a', dur: 12.5, step: 'Hazır model', caption: 'MakerWorld gibi sitelerden beğendiğin modeli bul, STL dosyasını bize gönder.' },
  { id: 'b', dur: 8, step: 'Fikrini anlat', caption: 'Modelin yok mu? Ne istediğini yaz; fotoğraf ya da çizim de ekleyebilirsin.' },
  { id: 'quote', dur: 5.5, step: 'Teklif', caption: 'Ölçü, malzeme ve fiyatla yazılı teklif. Onayın olmadan baskıya başlamayız.' },
  { id: 'print', dur: PRINT.dur, step: 'Baskı', caption: 'Bolu’daki atölyemizde parçanı katman katman basıyoruz.' },
  { id: 'ship', dur: 4, step: 'Kargo', caption: 'Paketleyip kargoya veriyoruz; takip numarası e-postana gelir.' },
  { id: 'outro', dur: 5 },
]

let acc = 0
for (const s of SCENE_META) {
  s.start = acc
  acc += s.dur
}
export const TOTAL = acc
export const startOf = (id) => SCENE_META.find((s) => s.id === id).start
export const CHAPTERS = SCENE_META.filter((s) => s.step)
/** Sahne sınırları (geçiş efektleri için) */
export const BOUNDARIES = SCENE_META.slice(1).map((s) => s.start)

// Ses işaretleri: [genel zaman, tür]
export const CUES = (() => {
  const L = startOf('logo')
  const i = startOf('intro')
  const a = startOf('a')
  const b = startOf('b')
  const q = startOf('quote')
  const p = startOf('print')
  const s = startOf('ship')
  const o = startOf('outro')
  const list = [
    [L + 0.1, 'riser'], [L + 1.7, 'done'],
    ...BOUNDARIES.map((t) => [t - 0.42, 'whoosh']),
    [i + 1.7, 'pop'],
    [a + 2.0, 'click'], [a + 2.2, 'pop'], [a + 3.8, 'click'], [a + 4.6, 'whoosh'],
    [a + 6.6, 'pop'], [a + 8.0, 'click'], [a + 8.8, 'click'], [a + 10.0, 'click'], [a + 10.35, 'chime'],
    [b + 0.25, 'pop'], [b + 4.3, 'pop'], [b + 5.6, 'click'], [b + 5.8, 'whoosh'], [b + 7.0, 'pop'],
    [q + 0.15, 'pop'], [q + 3.0, 'click'], [q + 3.05, 'chime'],
    [p + PRINT.end, 'done'], [p + PRINT.lift[0] + 0.1, 'whoosh'],
    [s + 0.75, 'pop'], [s + 1.5, 'click'], [s + 1.65, 'pop'], [s + 2.4, 'whoosh'],
    [o + 0.2, 'chime'],
  ]
  const [t0, t1] = TYPE_WINDOW
  for (let k = 1; k <= IDEA.length; k += 1) {
    if (IDEA[k - 1] !== ' ') list.push([b + t0 + ((t1 - t0) * k) / IDEA.length, 'type'])
  }
  return list.sort((x, y) => x[0] - y[0])
})()

/** Yazıcı uğultusunun çaldığı aralık */
export const HUM = [startOf('print') + PRINT.start, startOf('print') + PRINT.end]
export const HUM_KIND = 'printer'

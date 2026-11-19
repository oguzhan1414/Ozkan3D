// Filmin ses kuşağını (müzik + efektler) WAV dosyası olarak üretir.
// Sitedeki canlı ses motorunun (filmAudio.js) Node'daki karşılığı:
// aynı akorlar, aynı efektler, aynı zaman çizelgesi. Dış dosya yok → telif yok.
// Kullanım: node remotion/renderAudio.mjs [print|scan]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const FILMS = {
  print: { timeline: 'filmTimeline.js', out: 'film-audio.wav' },
  scan: { timeline: 'scanTimeline.js', out: 'scan-audio.wav' },
}
const film = FILMS[process.argv[2] || 'print']
if (!film) throw new Error(`Bilinmeyen film: ${process.argv[2]} (print | scan)`)
const here = path.dirname(fileURLToPath(import.meta.url))
const { TOTAL, CUES, HUM, HUM_KIND } = await import(pathToFileURL(path.join(here, '..', 'src', 'storefront', 'components', 'film', film.timeline)).href)

const SR = 44100
const N = Math.ceil((TOTAL + 0.5) * SR)
const music = new Float32Array(N)
const sfx = new Float32Array(N)

const BPM = 92
const BEAT = 60 / BPM
const BAR = BEAT * 4
const CHORDS = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 57, 60, 65], [46, 53, 57, 62]]
const freq = (m) => 440 * 2 ** ((m - 69) / 12)

// Tekrarlanabilir gürültü (her çalıştırmada aynı ses)
let seed = 12345
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1 }

const wave = (type, ph) => {
  const x = ph - Math.floor(ph)
  if (type === 'sine') return Math.sin(2 * Math.PI * x)
  if (type === 'triangle') return 1 - 4 * Math.abs(x - 0.5)
  if (type === 'sawtooth') return 2 * x - 1
  return 0
}

/** RBJ biquad (frekans örnek başına güncellenebilir) */
const biquad = (type) => {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  let b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0
  return {
    set(f, Q = 0.707) {
      const w = (2 * Math.PI * Math.min(f, SR / 2.2)) / SR
      const cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Q)
      let B0, B1, B2
      if (type === 'lowpass') { B0 = (1 - cs) / 2; B1 = 1 - cs; B2 = (1 - cs) / 2 }
      else if (type === 'highpass') { B0 = (1 + cs) / 2; B1 = -(1 + cs); B2 = (1 + cs) / 2 }
      else { B0 = al; B1 = 0; B2 = -al } // bandpass
      const A0 = 1 + al
      b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = (-2 * cs) / A0; a2 = (1 - al) / A0
    },
    run(x) {
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
      x2 = x1; x1 = x; y2 = y1; y1 = y
      return y
    },
  }
}

const expRamp = (a, b, p) => a * (b / a) ** p

/** Ton: f0→f1 kayan frekans, 8 ms atak, üstel sönüm */
const tone = (buf, t, f0, f1, dur, gain, type = 'sine') => {
  const s0 = Math.floor(t * SR)
  const len = Math.floor((dur + 0.02) * SR)
  let ph = 0
  for (let i = 0; i < len && s0 + i < N; i++) {
    const u = i / SR
    const f = f0 === f1 ? f0 : expRamp(f0, f1, Math.min(1, u / dur))
    ph += f / SR
    const env = u < 0.008 ? (gain * u) / 0.008 : expRamp(gain, 0.0001, Math.min(1, (u - 0.008) / (dur - 0.008)))
    buf[s0 + i] += wave(type, ph) * env
  }
}

/** Filtrelenmiş gürültü vuruşu */
const noiseHit = (buf, t, { gain = 0.1, hp, bp, dur = 0.05 }) => {
  const f = biquad(bp ? 'bandpass' : 'highpass')
  f.set(bp || hp || 1000, bp ? 1.2 : 0.707)
  const s0 = Math.floor(t * SR)
  const len = Math.floor((dur + 0.02) * SR)
  for (let i = 0; i < len && s0 + i < N; i++) {
    const u = i / SR
    buf[s0 + i] += f.run(rand()) * expRamp(gain, 0.0001, Math.min(1, u / dur))
  }
}

/** Bant geçiren süpürme (whoosh / riser) */
const sweep = (buf, t, { f0, f1, dur, peak, peakAt, Q = 1.2 }) => {
  const f = biquad('bandpass')
  const s0 = Math.floor(t * SR)
  const len = Math.floor(dur * SR)
  for (let i = 0; i < len && s0 + i < N; i++) {
    const u = i / SR
    if (i % 32 === 0) f.set(expRamp(f0, f1, Math.min(1, u / (dur * 0.8))), Q)
    const env = u < peakAt ? expRamp(0.0001, peak, u / peakAt) : expRamp(peak, 0.0001, Math.min(1, (u - peakAt) / (dur - peakAt)))
    buf[s0 + i] += f.run(rand()) * env
  }
}

/* ------------------------------------------------------------- Müzik */
const scheduleBar = (t0, chord) => {
  // Pad: iki hafif akortsuz üçgen dalga
  for (const m of chord) {
    for (const cents of [-6, 6]) {
      const f = freq(m) * 2 ** (cents / 1200)
      const s0 = Math.floor(t0 * SR)
      const len = Math.floor((BAR + 2) * SR)
      let ph = 0
      for (let i = 0; i < len && s0 + i < N; i++) {
        const u = i / SR
        ph += f / SR
        let env
        if (u < 0.6) env = (0.022 * u) / 0.6
        else if (u < BAR - 0.4) env = 0.022
        else env = 0.022 * Math.exp(-(u - (BAR - 0.4)) / 0.5)
        music[s0 + i] += wave('triangle', ph) * env
      }
    }
  }
  // Arpej
  ;[0, 1, 2, 3, 2, 1, 2, 3].forEach((idx, k) => tone(music, t0 + k * (BEAT / 2), freq(chord[idx] + 12), freq(chord[idx] + 12), 0.45, 0.03))
  // Vuruş ve tıslama
  for (let b = 0; b < 4; b++) {
    const t = t0 + b * BEAT
    if (b % 2 === 0) tone(music, t, 110, 45, 0.22, 0.16)
    noiseHit(music, t + BEAT / 2, { gain: 0.012, hp: 7000, dur: 0.05 })
  }
}
for (let t = 0.1, k = 0; t < TOTAL; t += BAR, k++) scheduleBar(t, CHORDS[k % CHORDS.length])

// Müzik kanalı: 2400 Hz alçak geçiren, kazanç 0.55
{
  const lp = biquad('lowpass')
  lp.set(2400)
  for (let i = 0; i < N; i++) music[i] = lp.run(music[i]) * 0.55
}

/* ----------------------------------------------------------- Efektler */
const play = (t, type) => {
  switch (type) {
    case 'click':
      noiseHit(sfx, t, { gain: 0.18, hp: 2500, dur: 0.025 })
      tone(sfx, t, 1900, 1400, 0.05, 0.08)
      break
    case 'type':
      noiseHit(sfx, t, { gain: 0.06, bp: 2500 + (rand() + 1) * 1250, dur: 0.02 })
      break
    case 'pop':
      tone(sfx, t, 640, 240, 0.14, 0.18)
      break
    case 'whoosh':
      sweep(sfx, t, { f0: 350, f1: 2600, dur: 0.5, peak: 0.22, peakAt: 0.12 })
      break
    case 'riser':
      tone(sfx, t, 220, 880, 1.5, 0.08, 'triangle')
      sweep(sfx, t, { f0: 300, f1: 4000, dur: 1.8, peak: 0.12, peakAt: 1.4 })
      break
    case 'chime':
      tone(sfx, t, 880, 880, 0.6, 0.12)
      tone(sfx, t + 0.11, 1318.5, 1318.5, 0.8, 0.1)
      break
    case 'shutter':
      // Deklanşör: iki kısa mekanik tık + kısa hava
      noiseHit(sfx, t, { gain: 0.25, hp: 1800, dur: 0.03 })
      noiseHit(sfx, t + 0.06, { gain: 0.18, hp: 2600, dur: 0.04 })
      tone(sfx, t, 2600, 1200, 0.05, 0.05)
      break
    case 'done':
      tone(sfx, t, 659.3, 659.3, 0.5, 0.1)
      tone(sfx, t + 0.09, 987.8, 987.8, 0.5, 0.09)
      tone(sfx, t + 0.18, 1318.5, 1318.5, 0.9, 0.09)
      break
    default:
  }
}
for (const [t, type] of CUES) play(t, type)

// Yazıcı uğultusu (step motor titreşimiyle) ya da tarayıcı vızıltısı (bip'li)
if (HUM_KIND === 'scanner') {
  const [h0, h1] = HUM
  const s0 = Math.floor(h0 * SR)
  const s1 = Math.floor((h1 + 0.5) * SR)
  let ph = 0
  for (let i = s0; i < s1 && i < N; i++) {
    const u = i / SR
    ph += (520 + 40 * Math.sin(2 * Math.PI * 0.8 * (u - h0))) / SR
    const env = u < h1 ? 0.03 * (1 - Math.exp(-(u - h0) / 0.2)) : 0.03 * Math.exp(-(u - h1) / 0.12)
    sfx[i] += wave('sine', ph) * env * (0.7 + 0.3 * Math.sin(2 * Math.PI * 3.2 * (u - h0)))
  }
  // Tarama ışığı her süpürüşte kısa bip
  for (let t = h0 + 0.3; t < h1; t += 0.98) tone(sfx, t, 1760, 1760, 0.08, 0.035)
} else {
  const lp = biquad('lowpass')
  lp.set(420)
  const [h0, h1] = HUM
  const s0 = Math.floor(h0 * SR)
  const s1 = Math.floor((h1 + 0.8) * SR)
  const ph = [0, 0, 0]
  for (let i = s0; i < s1 && i < N; i++) {
    const u = i / SR
    ph[0] += 72 / SR; ph[1] += 144 / SR; ph[2] += 216 / SR
    const x = wave('sawtooth', ph[0]) + wave('triangle', ph[1]) + wave('triangle', ph[2])
    const target = u < h1 ? 0.035 * (1 - Math.exp(-(u - h0) / 0.2)) : 0.035 * Math.exp(-(u - h1) / 0.15)
    const g = Math.max(0, target + 0.012 * Math.sin(2 * Math.PI * 7 * (u - h0)) * (target / 0.035))
    sfx[i] += lp.run(x) * g
  }
}

/* ------------------------------------------------------ Karışım + WAV */
const out = new Float32Array(N)
let peak = 0
for (let i = 0; i < N; i++) {
  const u = i / SR
  const fade = u > TOTAL - 1.5 ? Math.max(0, (TOTAL - u) / 1.5) : 1 // sonda yumuşak bitiş
  out[i] = (music[i] * fade + sfx[i] * 0.7) * 0.9
  peak = Math.max(peak, Math.abs(out[i]))
}
const norm = peak > 0 ? 0.89 / peak : 1 // video için standart seviye (-1 dBFS civarı)

const data = Buffer.alloc(N * 4)
for (let i = 0; i < N; i++) {
  const v = Math.max(-1, Math.min(1, out[i] * norm))
  const s = Math.round(v * 32767)
  data.writeInt16LE(s, i * 4)
  data.writeInt16LE(s, i * 4 + 2)
}
const header = Buffer.alloc(44)
header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8)
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22)
header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34)
header.write('data', 36); header.writeUInt32LE(data.length, 40)

const dir = path.join(here, 'public', 'audio')
fs.mkdirSync(dir, { recursive: true })
const file = path.join(dir, film.out)
fs.writeFileSync(file, Buffer.concat([header, data]))
console.log(`Ses hazır: ${file} · ${TOTAL.toFixed(1)} sn · tepe ${peak.toFixed(2)}${norm < 1 ? ' (normalize edildi)' : ''}`)

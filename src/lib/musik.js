// Musik latar layar fasilitator, disintesis langsung di browser (Web Audio API).
// Tanpa file audio dan tanpa lisensi pihak ketiga: semua nada dibuat oleh kode ini.

const KUNCI = 'ai_musik'
let ctx = null
let master = null
let noise = null
let mode = null
let langkah = 0
let waktuBerikut = 0
let timer = null
const pendengar = new Set()

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12)

export function musikNyala() {
  try { return localStorage.getItem(KUNCI) !== 'mati' } catch { return true }
}

function siapkan() {
  if (ctx) return
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0
  const kompres = ctx.createDynamicsCompressor()
  master.connect(kompres).connect(ctx.destination)
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  // Browser baru mengizinkan suara setelah ada sentuhan/klik pertama.
  const bangun = () => { ctx.resume(); if (ctx.state === 'running') document.removeEventListener('pointerdown', bangun) }
  document.addEventListener('pointerdown', bangun)
}

function nada(t, midi, dur, { tipe = 'triangle', vol = 0.2, filter = 0 } = {}) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = tipe
  o.frequency.value = hz(midi)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let ujung = g
  if (filter) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = filter
    g.connect(f); ujung = f
  }
  o.connect(g); ujung.connect(master)
  o.start(t); o.stop(t + dur + 0.05)
}

function kick(t, vol = 0.55) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.setValueAtTime(140, t)
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
  o.connect(g).connect(master)
  o.start(t); o.stop(t + 0.22)
}

function hat(t, vol = 0.06, panjang = 0.04) {
  const s = ctx.createBufferSource()
  s.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = 'highpass'; f.frequency.value = 7000
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + panjang)
  s.connect(f).connect(g).connect(master)
  s.start(t); s.stop(t + panjang + 0.02)
}

function clap(t, vol = 0.12) {
  const s = ctx.createBufferSource()
  s.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'; f.frequency.value = 1500
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
  s.connect(f).connect(g).connect(master)
  s.start(t); s.stop(t + 0.15)
}

// Akor per birama: [akar bass, nada akor]
const LAGU = {
  lobi: { bpm: 112, akor: [[48, [60, 64, 67]], [43, [59, 62, 67]], [45, [60, 64, 69]], [41, [60, 65, 69]]] },
  skor: { bpm: 124, akor: [[41, [60, 65, 69]], [43, [59, 62, 67]], [48, [60, 64, 67]], [48, [60, 64, 67]]] },
  soal: { bpm: 138, akor: [[45, [57, 60, 64]], [41, [57, 60, 65]], [43, [59, 62, 67]], [40, [56, 59, 64]]] },
}

function mainkanLangkah(t, n) {
  const lagu = LAGU[mode]
  const s16 = 60 / lagu.bpm / 4
  const birama = Math.floor(n / 16) % lagu.akor.length
  const pos = n % 16
  const [akar, akor] = lagu.akor[birama]
  if (mode === 'soal') {
    kick(t, pos % 4 === 0 ? 0.5 : 0.0001)
    if (pos % 2 === 1) hat(t, 0.05)
    if (pos === 4 || pos === 12) clap(t, 0.1)
    if (pos % 2 === 0) nada(t, akar + (pos % 4 === 2 ? 12 : 0), s16 * 1.8, { tipe: 'sawtooth', vol: 0.09, filter: 600 })
    const motif = [0, null, 2, null, 1, null, 2, 0, null, 2, null, 1, 2, null, 1, null]
    if (motif[pos] !== null) nada(t, akor[motif[pos]] + 12, s16 * 0.9, { tipe: 'square', vol: 0.035, filter: 2500 })
  } else {
    if (pos === 0 || pos === 8) kick(t, 0.4)
    if (pos === 4 || pos === 12) clap(t, 0.07)
    if (pos % 4 === 2) hat(t, 0.045)
    if (pos % 4 === 0) nada(t, akar, s16 * 3.5, { tipe: 'triangle', vol: 0.18 })
    const arp = [0, 1, 2, 1]
    if (pos % 2 === 0) nada(t, akor[arp[(pos / 2) % 4]] + 12, s16 * 1.6, { tipe: 'triangle', vol: mode === 'skor' ? 0.08 : 0.06 })
    if (mode === 'skor' && pos === 0) nada(t, akor[2] + 24, s16 * 6, { tipe: 'sine', vol: 0.05 })
  }
}

function jadwal() {
  if (!mode || !LAGU[mode]) return
  const s16 = 60 / LAGU[mode].bpm / 4
  while (waktuBerikut < ctx.currentTime + 0.15) {
    mainkanLangkah(waktuBerikut, langkah)
    waktuBerikut += s16
    langkah++
  }
}

function sting(jenis) {
  const t = ctx.currentTime + 0.05
  const urut = jenis === 'juara'
    ? [[60, 0], [64, 0.15], [67, 0.3], [72, 0.45], [76, 0.6], [79, 0.75]]
    : [[67, 0], [72, 0.1], [76, 0.2]]
  urut.forEach(([m, d]) => nada(t + d, m, jenis === 'juara' ? 0.5 : 0.35, { tipe: 'square', vol: 0.14, filter: 3000 }))
  if (jenis === 'juara') {
    ;[60, 64, 67, 72].forEach((m) => nada(t + 0.9, m, 1.8, { tipe: 'triangle', vol: 0.12 }))
    kick(t + 0.9, 0.5)
  }
}

// mode: 'lobi' | 'soal' | 'skor' | 'diam'; sekali bunyi: 'benar' | 'juara'
export function putar(m) {
  if (!musikNyala()) { mode = null; return }
  siapkan()
  if (!ctx) return
  if (m === 'benar' || m === 'juara') {
    hentikanLoop()
    sting(m)
    return
  }
  if (m === mode) return
  hentikanLoop()
  if (m === 'diam' || !LAGU[m]) return
  mode = m
  langkah = 0
  waktuBerikut = ctx.currentTime + 0.1
  master.gain.cancelScheduledValues(ctx.currentTime)
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
  master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.6)
  timer = setInterval(jadwal, 25)
}

function hentikanLoop() {
  mode = null
  if (timer) { clearInterval(timer); timer = null }
  if (ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.setValueAtTime(0.5, ctx.currentTime)
  }
}

export function henti() {
  if (timer) { clearInterval(timer); timer = null }
  mode = null
  if (ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
  }
}

export function aturMusik(nyala) {
  try { localStorage.setItem(KUNCI, nyala ? 'nyala' : 'mati') } catch {}
  if (!nyala) henti()
  pendengar.forEach((f) => f(nyala))
}

export function dengarkanMusik(f) { pendengar.add(f); return () => pendengar.delete(f) }

import { useEffect, useState } from 'react'

const BENTUK = {
  lingkaran: <circle cx="20" cy="20" r="17" />,
  segitiga: <path d="M20 3 L37 35 H3 Z" />,
  kotak: <rect x="4" y="4" width="32" height="32" rx="4" />,
  ketupat: <path d="M20 2 L38 20 L20 38 L2 20 Z" />,
}

export function Bentuk({ jenis, size = 32 }) {
  if (!BENTUK[jenis]) return null
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="currentColor" aria-hidden="true">{BENTUK[jenis]}</svg>
}

export function Ikon({ nama, size = 20 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (nama === 'benar') return <svg {...p}><path d="M4 12l5 5L20 6" /></svg>
  if (nama === 'salah') return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
  if (nama === 'kiri') return <svg {...p}><path d="M15 6l-6 6 6 6" /></svg>
  if (nama === 'kanan') return <svg {...p}><path d="M9 6l6 6-6 6" /></svg>
  if (nama === 'orang') return <svg {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-6 7-6s7 2 7 6" /><path d="M17 11a3 3 0 1 0 0-6" /><path d="M22 21c0-3-1.5-5-4-5.6" /></svg>
  if (nama === 'api') return <svg {...p}><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-8z" /></svg>
  if (nama === 'jam') return <svg {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></svg>
  return null
}

/** Ubah soal menjadi daftar tombol jawaban yang seragam untuk semua game pilihan tunggal. */
export function daftarOpsi(q) {
  if (!q) return []
  const pl = q.payload || {}
  if (q.game === 'kuis_live') {
    if (pl.tipe === 'bs') {
      return [
        { key: 'BENAR', label: 'Benar', huruf: '', kelas: 'a', ikon: 'benar' },
        { key: 'SALAH', label: 'Salah', huruf: '', kelas: 'd', ikon: 'salah' },
      ]
    }
    const meta = { A: ['a', 'lingkaran'], B: ['b', 'segitiga'], C: ['c', 'kotak'], D: ['d', 'ketupat'] }
    return Object.entries(pl.opsi || {}).map(([k, v]) => ({ key: k, label: v, huruf: k, kelas: meta[k]?.[0], bentuk: meta[k]?.[1] }))
  }
  if (q.game === 'terima_tolak') {
    return [
      { key: 'TOLAK-LAPOR', label: 'Tolak / Lapor', huruf: '', kelas: 'd', ikon: 'kiri' },
      { key: 'AMAN', label: 'Aman diterima', huruf: '', kelas: 'a', ikon: 'kanan' },
    ]
  }
  if (q.game === 'dilema') {
    const meta = [['a', 'lingkaran'], ['b', 'segitiga'], ['c', 'kotak']]
    return (pl.pilihan || []).map((p, i) => ({ key: p.id, label: p.teks, huruf: 'ABC'[i], kelas: meta[i]?.[0], bentuk: meta[i]?.[1], next: p.next }))
  }
  if (q.game === 'tebak_delik') {
    return (pl.opsi || []).map((v, i) => ({ key: v, label: v, huruf: String(i + 1), kelas: 'netral' }))
  }
  return []
}

export function TombolOpsi({ o, onClick, disabled, redup, dipilih, children }) {
  return (
    <button type="button" className={`opsi tekan ${o.kelas || ''} ${redup ? 'redup' : ''} ${dipilih ? 'dipilih' : ''}`}
      onClick={onClick} disabled={disabled} aria-pressed={dipilih || undefined}>
      {o.bentuk && <Bentuk jenis={o.bentuk} />}
      {o.ikon && <Ikon nama={o.ikon} size={26} />}
      {o.huruf && <span className="huruf">{o.huruf}</span>}
      <span style={{ flex: 1 }}>{o.label}</span>
      {children}
    </button>
  )
}

/** Sisa detik sejak `mulai` (ms, jam lokal saat soal diterima). Server tetap jadi penentu batas waktu. */
export function useSisaWaktu(mulai, durasiDetik) {
  const hitung = () => (mulai ? Math.max(0, Math.ceil(durasiDetik - (Date.now() - mulai) / 1000)) : durasiDetik)
  const [sisa, setSisa] = useState(hitung)
  useEffect(() => {
    setSisa(hitung())
    if (!mulai) return
    const t = setInterval(() => setSisa(hitung()), 250)
    return () => clearInterval(t)
  }, [mulai, durasiDetik])
  return sisa
}

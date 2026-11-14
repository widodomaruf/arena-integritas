import { useState } from 'react'
import { Ikon } from './Opsi.jsx'

/** Detektif SPJ (peserta): tandai elemen dokumen yang janggal, lalu kirim. */
export function PilihJanggal({ q, onKirim, sibuk }) {
  const [pilih, setPilih] = useState([])
  const elemen = q.payload?.elemen || []
  const toggle = (no) => setPilih((p) => (p.includes(no) ? p.filter((x) => x !== no) : [...p, no]))
  return (
    <>
      {q.payload?.konteks && <p className="muted" style={{ fontWeight: 700, lineHeight: 1.45 }}>{q.payload.konteks}</p>}
      <p style={{ fontWeight: 700 }}>Ketuk semua bagian yang menurutmu janggal:</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {elemen.map((e) => {
          const on = pilih.includes(e.no)
          return (
            <button key={e.no} type="button" className="opsi tekan" aria-pressed={on} onClick={() => toggle(e.no)}
              style={{ border: `2px solid ${on ? 'var(--salah)' : 'var(--line)'}`, background: on ? 'var(--salah)' : 'var(--surface)', color: on ? 'var(--on-accent)' : 'var(--ink)', boxShadow: 'none', minHeight: 56, fontSize: 16 }}>
              <span aria-hidden="true" style={{ width: 26, height: 26, flex: 'none', borderRadius: 8, border: `2px solid ${on ? 'var(--on-accent)' : 'var(--ink-muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {on && <Ikon nama="salah" size={16} />}
              </span>
              <span style={{ flex: 1 }}><b>{e.no}.</b> {e.teks}</span>
            </button>
          )
        })}
      </div>
      <button className="btn tekan" disabled={sibuk || pilih.length === 0} onClick={() => onKirim({ pilihan: [...pilih].sort((a, b) => a - b) })}>
        Kirim temuan ({pilih.length})
      </button>
    </>
  )
}

/** Susun Alur (peserta): atur urutan langkah dengan tombol naik/turun. */
export function SusunUrutan({ q, onKirim, sibuk }) {
  const [urut, setUrut] = useState(q.payload?.langkah || [])
  const geser = (i, d) => setUrut((u) => {
    const j = i + d
    if (j < 0 || j >= u.length) return u
    const b = [...u]; [b[i], b[j]] = [b[j], b[i]]; return b
  })
  return (
    <>
      <p style={{ fontWeight: 700 }}>Susun dari langkah pertama sampai terakhir:</p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {urut.map((l, i) => (
          <li key={l.id} className="kartu" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px 10px 14px' }}>
            <span style={{ width: 28, height: 28, flex: 'none', borderRadius: 999, background: 'var(--kuning)', color: '#14284B', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 15, lineHeight: 1.35 }}>{l.teks}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button type="button" className="btn sekunder" style={{ minHeight: 44, width: 44, padding: 0 }} aria-label={`Naikkan: ${l.teks}`} disabled={i === 0} onClick={() => geser(i, -1)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
              </button>
              <button type="button" className="btn sekunder" style={{ minHeight: 44, width: 44, padding: 0 }} aria-label={`Turunkan: ${l.teks}`} disabled={i === urut.length - 1} onClick={() => geser(i, 1)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>
            </span>
          </li>
        ))}
      </ol>
      <button className="btn tekan" disabled={sibuk} onClick={() => onKirim({ urutan: urut.map((l) => l.id) })}>Kirim urutan</button>
    </>
  )
}

/** Teks langkah berdasarkan id, untuk menampilkan urutan yang benar. */
export function urutanBenar(q, kunci) {
  const peta = new Map((q.payload?.langkah || []).map((l) => [l.id, l.teks]))
  return (Array.isArray(kunci) ? kunci : []).map((id) => peta.get(id)).filter(Boolean)
}

export const tandaEfek = (n) => (n > 0 ? `+${n}` : `${n}`)

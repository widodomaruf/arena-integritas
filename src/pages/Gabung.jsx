import { Kredit } from '../components/Kredit.jsx'
import { useState } from 'react'
import { supabase, pastikanLoginAnonim, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'

export default function Gabung({ pinAwal }) {
  const [pin, setPin] = useState(pinAwal.replace(/\D/g, '').slice(0, 6))
  const [nama, setNama] = useState(() => { try { return localStorage.getItem('ai_nama') || '' } catch { return '' } })
  const [sibuk, setSibuk] = useState(false)
  const [err, setErr] = useState('')
  const [galat, setGalat] = useState({})

  async function kirim(e) {
    e.preventDefault()
    setErr('')
    if (pin.length !== 6) return setErr('PIN terdiri dari 6 angka.')
    if (!nama.trim()) return setErr('Isi nama panggilanmu dulu.')
    setSibuk(true)
    try {
      await pastikanLoginAnonim()
      const { data, error } = await supabase.rpc('join_session', { p_pin: pin, p_nama: nama.trim().slice(0, 30) })
      if (error) throw error
      try { localStorage.setItem('ai_nama', nama.trim()) } catch {}
      pindah(`/main/${data.session_id}`)
    } catch (e2) {
      setErr(/PIN tidak ditemukan/.test(e2.message) ? 'PIN tidak ditemukan. Cek lagi angka di layar depan.' : pesanError(e2))
    } finally { setSibuk(false) }
  }

  return (
    <div className="halaman">
      <main className="hp" style={{ paddingTop: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <h1 style={{ margin: 0 }}><img src="/logo-arnitas.svg" alt="Arnitas" width="218" height="54" /></h1>
          <p className="muted" style={{ fontSize: 15 }}>Arena Integritas · Seru mainnya, jujur sikapnya.</p>
        </div>
        <img src="/bening-senang.svg" alt="Bening menyapa" width="140" height="140" style={{ alignSelf: 'center' }} />
        <form onSubmit={kirim} className="kartu-besar" style={{ display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid var(--line)' }}>
          <label className="field">PIN SESI
            <input className="input pin" inputMode="numeric" autoComplete="off" maxLength={6} value={pin}
              aria-invalid={!!galat.pin} aria-describedby={galat.pin ? 'galat-pin' : undefined}
              onBlur={() => pin && pin.length !== 6 && setGalat((g) => ({ ...g, pin: 'PIN terdiri dari 6 angka. Cocokkan dengan layar depan.' }))}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setGalat((g) => ({ ...g, pin: '' })) }} placeholder="000000" />
          </label>
          {galat.pin && <p id="galat-pin" className="error">{galat.pin}</p>}
          <label className="field">NAMA PANGGILAN
            <input className="input" maxLength={30} value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Sari" />
          </label>
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn tekan" disabled={sibuk}>{sibuk ? 'Masuk…' : 'Gabung'}</button>
        </form>
        <p className="muted" style={{ marginTop: 'auto', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
          Tidak perlu daftar akun. Nama hanya dipakai di papan skor sesi ini.<br />
          Fasilitator? <a href="/host" onClick={(e) => { e.preventDefault(); pindah('/host') }} style={{ color: 'var(--toska-strong)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 6px' }}>Masuk di sini</a>
        </p>
        <Kredit />
      </main>
    </div>
  )
}

import { Kredit } from '../components/Kredit.jsx'
import { TombolInstal } from '../components/Instal.jsx'
import { useRef, useState } from 'react'
import { useMasuk, useMengambang } from '../lib/animasi.jsx'
import { supabase, pastikanLoginAnonim, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'
import { useTurnstile, PESAN_VERIFIKASI_BELUM } from '../components/Turnstile.jsx'

export default function Gabung({ pinAwal }) {
  const [pin, setPin] = useState(pinAwal.replace(/\D/g, '').slice(0, 6))
  const [nama, setNama] = useState(() => { try { return localStorage.getItem('ai_nama') || '' } catch { return '' } })
  const [sibuk, setSibuk] = useState(false)
  const [err, setErr] = useState('')
  const [galat, setGalat] = useState({})
  const akar = useRef(null)
  const maskot = useRef(null)
  useMasuk(akar)
  useMengambang(maskot)
  const ts = useTurnstile()

  async function kirim(e) {
    e.preventDefault()
    setErr('')
    if (pin.length !== 6) return setErr('PIN terdiri dari 6 angka.')
    if (!nama.trim()) return setErr('Isi nama panggilanmu dulu.')
    const { data: ada } = await supabase.auth.getSession()
    if (!ada.session && ts.aktif && !ts.token) return setErr(PESAN_VERIFIKASI_BELUM)
    setSibuk(true)
    try {
      await pastikanLoginAnonim(ts.token)
      const { data, error } = await supabase.rpc('join_session', { p_pin: pin, p_nama: nama.trim().slice(0, 30) })
      if (error) throw error
      try { localStorage.setItem('ai_nama', nama.trim()) } catch {}
      pindah(`/main/${data.session_id}`)
    } catch (e2) {
      setErr(/PIN tidak ditemukan/.test(e2.message) ? 'PIN tidak ditemukan. Cek lagi angka di layar depan.' : pesanError(e2))
    } finally { setSibuk(false); ts.reset() }
  }

  return (
    <div className="halaman" ref={akar}>
      <main className="hp" style={{ paddingTop: 48 }}>
        <div data-masuk style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <h1 style={{ margin: 0 }}><img src="/logo-arnitas.svg" alt="Arnitas" width="218" height="54" /></h1>
          <p className="muted" style={{ fontSize: 15 }}>Arena Integritas · Seru mainnya, jujur sikapnya.</p>
        </div>
        <img ref={maskot} data-masuk src="/bening-senang.svg" alt="Bening menyapa" width="140" height="140" style={{ alignSelf: 'center' }} />
        <form data-masuk onSubmit={kirim} className="kartu-besar" style={{ display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid var(--line)' }}>
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
          {ts.kotak}
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn tekan" disabled={sibuk}>{sibuk ? 'Masuk…' : 'Gabung'}</button>
        </form>
        <p data-masuk className="muted" style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
          Tidak perlu daftar akun. Nama hanya dipakai di papan skor sesi ini.
        </p>
        <section data-masuk aria-labelledby="judul-fasilitator" style={{ marginTop: 'auto', border: '2px solid var(--line)', borderRadius: 20, padding: 20, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 id="judul-fasilitator" style={{ fontSize: 17, fontWeight: 800 }}>Kamu fasilitator atau penyuluh?</h2>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>Masuk di sini untuk membuat sesi, menayangkan soal ke peserta, dan memandu pembahasan.</p>
          </div>
          <a href="/host" className="btn sekunder" onClick={(e) => { e.preventDefault(); pindah('/host') }}
            style={{ textDecoration: 'none', textAlign: 'center', fontSize: 17, whiteSpace: 'nowrap' }}>Masuk sebagai fasilitator →</a>
        </section>
        <div style={{ display: 'flex', justifyContent: 'center' }}><TombolInstal /></div>
        <Kredit />
      </main>
    </div>
  )
}

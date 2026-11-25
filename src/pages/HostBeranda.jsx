import { Kredit, URL_PANDUAN } from '../components/Kredit.jsx'
import { TombolInstal } from '../components/Instal.jsx'
import { Avatar } from '../components/Avatar.jsx'
import Profil, { ambilProfil } from './Profil.jsx'
import BuatSesi from './BuatSesi.jsx'
import SesiSaya from './SesiSaya.jsx'
import { useEffect, useId, useRef, useState } from 'react'
import { useMasuk } from '../lib/animasi.jsx'
import { supabase, GAMES, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'

export default function HostBeranda({ profil }) {
  const [user, setUser] = useState(undefined)
  const [pemulihan, setPemulihan] = useState(false)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user && !data.user.is_anonymous ? data.user : null))
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY') setPemulihan(true)
      setUser(s?.user && !s.user.is_anonymous ? s.user : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])
  if (user === undefined) return <div className="host"><p className="muted">Memuat…</p></div>
  if (user && pemulihan) return <SandiBaru onSelesai={() => setPemulihan(false)} />
  if (!user) return <Masuk />
  return profil ? <HalamanProfil user={user} /> : <Panel user={user} />
}

function ChipProfil({ user }) {
  const [p, setP] = useState(null)
  useEffect(() => { ambilProfil(user.id).then(setP).catch(() => {}) }, [user.id])
  return (
    <button type="button" className="chip-profil" onClick={() => pindah('/host/profil')}>
      <Avatar id={p?.avatar || 'p1'} size={36} />
      <span>{p?.nama || 'Lengkapi profil'}</span>
    </button>
  )
}

function KananPanel({ user, tanpaChip }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <TombolInstal gelap />
      <TautanPanduan />
      {!tanpaChip && <ChipProfil user={user} />}
      <button className="btn sekunder kecil" onClick={() => supabase.auth.signOut()}>Keluar</button>
    </div>
  )
}

function HalamanProfil({ user }) {
  return (
    <div className="host">
      <Kepala kanan={<KananPanel user={user} tanpaChip />} />
      <main style={{ flex: 1 }}><Profil user={user} /></main>
      <Kredit />
    </div>
  )
}

function Kepala({ kanan }) {
  return (
    <header data-masuk className="host-header">
      <div className="brand">
        <img src="/logo-arnitas-on-dark.svg" alt="Arnitas" style={{ width: 178, height: 44 }} />
        <span className="muted" style={{ fontSize: 14, fontWeight: 700, borderLeft: '2px solid var(--line)', paddingLeft: 14 }}>Ruang fasilitator</span>
      </div>
      {kanan}
    </header>
  )
}

function TautanPanduan() {
  return <a href={URL_PANDUAN} target="_blank" rel="noopener noreferrer" className="btn sekunder kecil">Buka panduan</a>
}

function TautanGabung() {
  return <>
    <TautanPanduan />
    <a href="/" onClick={(e) => { e.preventDefault(); pindah('/') }} className="btn sekunder kecil">← Kembali ke halaman PIN</a>
  </>
}

function InputSandi({ label, value, onChange, onBlur, autoComplete, galat }) {
  const [lihat, setLihat] = useState(false)
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input id={id} className="input" type={lihat ? 'text' : 'password'} required minLength={8} autoComplete={autoComplete}
          aria-invalid={!!galat} aria-describedby={galat ? `${id}-galat` : undefined}
          value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} style={{ paddingRight: 116 }} />
        <button type="button" onClick={() => setLihat(!lihat)} aria-pressed={lihat} aria-controls={id}
          aria-label={`${lihat ? 'Sembunyikan' : 'Lihat'} ${label.toLowerCase()}`}
          style={{ position: 'absolute', right: 6, top: 6, bottom: 6, minWidth: 100, border: 'none', borderRadius: 10, background: 'var(--line)', color: 'var(--ink)', font: 'inherit', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
          {lihat ? 'Sembunyikan' : 'Lihat'}
        </button>
      </div>
      {galat && <p id={`${id}-galat`} className="error" style={{ letterSpacing: 0 }}>{galat}</p>}
    </div>
  )
}

function Masuk() {
  const [mode, setMode] = useState('masuk')
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [ulang, setUlang] = useState('')
  const [ulangEmail, setUlangEmail] = useState('')
  const [pesan, setPesan] = useState('')
  const [err, setErr] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState({})
  const [perluKonfirmasi, setPerluKonfirmasi] = useState(false)
  const [jeda, setJeda] = useState(0)
  const akar = useRef(null)
  useMasuk(akar)
  useEffect(() => {
    if (jeda <= 0) return
    const t = setTimeout(() => setJeda((j) => j - 1), 1000)
    return () => clearTimeout(t)
  }, [jeda])
  const hapusGalat = (k) => setGalat((g) => ({ ...g, [k]: '' }))
  const cekBlur = (k) => {
    let m = ''
    if (k === 'email' && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) m = 'Format email belum lengkap, contoh nama@gmail.com.'
    if (k === 'ulangEmail' && ulangEmail && ulangEmail.trim().toLowerCase() !== email.trim().toLowerCase()) m = 'Belum sama dengan email di atas. Periksa lagi ejaannya.'
    if (k === 'sandi' && sandi && sandi.length < 8) m = `Kata sandi baru ${sandi.length} karakter. Tambah hingga minimal 8.`
    if (k === 'ulang' && ulang && ulang !== sandi) m = 'Belum sama dengan kata sandi di atas. Periksa dengan tombol Lihat.'
    setGalat((g) => ({ ...g, [k]: m }))
  }

  async function kirim(e) {
    e.preventDefault(); setErr(''); setPesan(''); setPerluKonfirmasi(false)
    if (mode === 'daftar' && ulangEmail.trim().toLowerCase() !== email.trim().toLowerCase()) { setErr('Kedua email belum sama. Periksa lagi ejaannya, karena tautan konfirmasi dikirim ke sana.'); return }
    if (mode === 'daftar' && sandi !== ulang) { setErr('Kedua kata sandi belum sama. Periksa lagi dengan tombol Lihat.'); return }
    setSibuk(true)
    try {
      const { data: cur } = await supabase.auth.getSession()
      if (cur.session?.user?.is_anonymous) await supabase.auth.signOut()
      if (mode === 'daftar') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: sandi, options: { emailRedirectTo: `${window.location.origin}/host` } })
        if (error) throw error
        if (data.user && data.user.identities?.length === 0) {
          setErr('Email ini sudah terdaftar. Pilih "Sudah punya akun? Masuk".')
        } else if (!data.session) {
          setPesan(`Kami mengirim tautan konfirmasi ke ${email}. Buka email itu (cek juga folder spam), klik tautannya, lalu masuk di halaman ini.`)
          setPerluKonfirmasi(true); setJeda(60)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: sandi })
        if (error) throw error
      }
    } catch (e2) {
      setErr(/Invalid login/i.test(e2.message) ? 'Email atau kata sandi belum cocok. Periksa dengan tombol Lihat, lalu masuk ulang.' : /not confirmed/i.test(e2.message) ? 'Email belum dikonfirmasi. Buka email dari Arnitas dan klik tautannya, atau kirim ulang di bawah.' : pesanError(e2))
      if (/not confirmed/i.test(e2.message)) setPerluKonfirmasi(true)
    } finally { setSibuk(false) }
  }

  async function lupaSandi() {
    setErr(''); setPesan('')
    const em = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setErr('Isi email kamu di atas dulu, lalu klik "Lupa kata sandi?".'); return }
    setSibuk(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: `${window.location.origin}/host` })
      if (error) throw error
      setPesan(`Jika ${em} terdaftar, tautan untuk membuat kata sandi baru sudah dikirim. Cek juga folder spam.`)
      setJeda(60)
    } catch (e3) { setErr(pesanError(e3)) } finally { setSibuk(false) }
  }

  async function kirimUlang() {
    setErr(''); setSibuk(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/host` } })
      if (error) throw error
      setPesan(`Tautan konfirmasi dikirim ulang ke ${email}. Cek juga folder spam.`)
      setJeda(60)
    } catch (e3) { setErr(pesanError(e3)) } finally { setSibuk(false) }
  }

  return (
    <div className="host" ref={akar}>
      <Kepala kanan={<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><TombolInstal gelap /><TautanGabung /></div>} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form data-masuk onSubmit={kirim} className="kartu-besar" style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{mode === 'masuk' ? 'Masuk sebagai fasilitator' : 'Daftar akun fasilitator'}</h1>
          <label className="field">EMAIL<input className="input" type="email" required autoComplete="email" value={email}
            aria-invalid={!!galat.email} aria-describedby={galat.email ? 'galat-email' : undefined}
            onBlur={() => cekBlur('email')} onChange={(e) => { setEmail(e.target.value); hapusGalat('email'); hapusGalat('ulangEmail') }} /></label>
          {galat.email && <p id="galat-email" className="error">{galat.email}</p>}
          {mode === 'daftar' && <>
            <label className="field">ULANGI EMAIL<input className="input" type="email" required autoComplete="off" value={ulangEmail}
              aria-invalid={!!galat.ulangEmail} aria-describedby={galat.ulangEmail ? 'galat-ulang-email' : undefined}
              onBlur={() => cekBlur('ulangEmail')} onChange={(e) => { setUlangEmail(e.target.value); hapusGalat('ulangEmail') }} /></label>
            {galat.ulangEmail
              ? <p id="galat-ulang-email" className="error">{galat.ulangEmail}</p>
              : <p className="muted" style={{ fontSize: 14, margin: 0 }} aria-live="polite">
                {ulangEmail && ulangEmail.trim().toLowerCase() === email.trim().toLowerCase() ? '✓ Email sudah sama.' : 'Ketik ulang email. Tautan konfirmasi dikirim ke alamat ini.'}
              </p>}
          </>}
          <InputSandi label="KATA SANDI" value={sandi} galat={mode === 'daftar' ? galat.sandi : ''} onBlur={() => cekBlur('sandi')}
            onChange={(v) => { setSandi(v); hapusGalat('sandi'); hapusGalat('ulang') }} autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'} />
          {mode === 'masuk' && (
            <button type="button" className="btn sekunder kecil" disabled={sibuk || jeda > 0} onClick={lupaSandi}>
              {jeda > 0 ? `Lupa kata sandi? Kirim ulang dalam ${jeda} dtk` : 'Lupa kata sandi?'}
            </button>
          )}
          {mode === 'daftar' && <>
            <InputSandi label="ULANGI KATA SANDI" value={ulang} galat={galat.ulang} onBlur={() => cekBlur('ulang')}
              onChange={(v) => { setUlang(v); hapusGalat('ulang') }} autoComplete="new-password" />
            {!galat.ulang && <p className="muted" style={{ fontSize: 14, margin: 0 }} aria-live="polite">
              {ulang && ulang === sandi && sandi.length >= 8 ? '✓ Kata sandi sudah sama.' : 'Minimal 8 karakter. Kalau lupa, kamu bisa mengaturnya ulang lewat email.'}
            </p>}
          </>}
          {err && <p className="error" role="alert">{err}</p>}
          {pesan && <p style={{ fontWeight: 700, color: 'var(--toska)' }} role="status">{pesan}</p>}
          {perluKonfirmasi && email && (
            <button type="button" className="btn sekunder kecil" disabled={sibuk || jeda > 0} onClick={kirimUlang}>
              {jeda > 0 ? `Kirim ulang email konfirmasi (${jeda} dtk)` : 'Kirim ulang email konfirmasi'}
            </button>
          )}
          <button className="btn tekan" disabled={sibuk}>{sibuk ? 'Sebentar…' : mode === 'masuk' ? 'Masuk' : 'Daftar'}</button>
          <button type="button" className="btn sekunder kecil" onClick={() => { setMode(mode === 'masuk' ? 'daftar' : 'masuk'); setUlang(''); setUlangEmail(''); setErr(''); setPesan(''); setPerluKonfirmasi(false); setGalat({}) }}>
            {mode === 'masuk' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        </form>
      </main>
      <Kredit />
    </div>
  )
}

// Akun dibuat sebelum verifikasi email aktif (25 Nov 2026, 08.00 WIB).
const BATAS_AKUN_LAMA = Date.parse('2026-11-25T01:00:00Z')
const KUNCI_TUTUP = 'arnitas-imbau-akun-lama'

function ImbauanAkunLama({ user }) {
  const [tutup, setTutup] = useState(() => { try { return sessionStorage.getItem(KUNCI_TUTUP) === '1' } catch { return false } })
  const [terkirim, setTerkirim] = useState(false)
  const [err, setErr] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const akunLama = Date.parse(user.created_at) < BATAS_AKUN_LAMA
  if (tutup || !akunLama || user.user_metadata?.kredensial_diperbarui || !user.email) return null
  async function kirim() {
    setErr(''); setSibuk(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/host` })
      if (error) throw error
      setTerkirim(true)
    } catch (e) { setErr(pesanError(e)) } finally { setSibuk(false) }
  }
  function nanti() { try { sessionStorage.setItem(KUNCI_TUTUP, '1') } catch { /* abaikan */ } setTutup(true) }
  return (
    <section className="kartu" role="region" aria-label="Imbauan keamanan akun" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800 }}>Amankan akun kamu</h2>
      <p style={{ lineHeight: 1.5 }}>
        Akun ini dibuat sebelum verifikasi email aktif. Demi keamanan, konfirmasi bahwa email <strong>{user.email}</strong> memang milikmu dan ganti kata sandi.
        Kami kirim tautan ke email itu. Klik tautannya, lalu isi kata sandi baru.
      </p>
      {terkirim && <p style={{ fontWeight: 700, color: 'var(--toska)' }} role="status">Tautan dikirim ke {user.email}. Cek juga folder spam.</p>}
      {err && <p className="error" role="alert">{err}</p>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn tekan" disabled={sibuk || terkirim} onClick={kirim}>{sibuk ? 'Sebentar…' : terkirim ? 'Tautan terkirim' : 'Kirim tautan ke email saya'}</button>
        <button type="button" className="btn sekunder kecil" onClick={nanti}>Nanti saja</button>
      </div>
    </section>
  )
}

function SandiBaru({ onSelesai }) {
  const [sandi, setSandi] = useState('')
  const [ulang, setUlang] = useState('')
  const [err, setErr] = useState('')
  const [sibuk, setSibuk] = useState(false)
  async function simpan(e) {
    e.preventDefault(); setErr('')
    if (sandi.length < 8) { setErr('Kata sandi minimal 8 karakter.'); return }
    if (sandi !== ulang) { setErr('Kedua kata sandi belum sama. Periksa dengan tombol Lihat.'); return }
    setSibuk(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: sandi, data: { kredensial_diperbarui: true } })
      if (error) throw error
      onSelesai()
    } catch (e2) { setErr(pesanError(e2)) } finally { setSibuk(false) }
  }
  return (
    <div className="host">
      <Kepala kanan={<TautanPanduan />} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={simpan} className="kartu-besar" style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Buat kata sandi baru</h1>
          <p className="muted" style={{ lineHeight: 1.5 }}>Email kamu sudah terkonfirmasi lewat tautan tadi. Pilih kata sandi baru, minimal 8 karakter.</p>
          <InputSandi label="KATA SANDI BARU" value={sandi} onChange={setSandi} autoComplete="new-password" />
          <InputSandi label="ULANGI KATA SANDI" value={ulang} onChange={setUlang} autoComplete="new-password" />
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn tekan" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan kata sandi'}</button>
        </form>
      </main>
      <Kredit />
    </div>
  )
}

function Panel({ user }) {
  const akar = useRef(null)
  useMasuk(akar)
  return (
    <div className="host" ref={akar}>
      <Kepala kanan={<KananPanel user={user} />} />
      <div data-masuk><ImbauanAkunLama user={user} /></div>
      <div data-masuk><BuatSesi user={user} /></div>
      <div data-masuk><SesiSaya user={user} /></div>
      <Kredit />
    </div>
  )
}

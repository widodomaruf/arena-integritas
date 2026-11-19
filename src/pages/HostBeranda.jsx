import { Kredit, URL_PANDUAN } from '../components/Kredit.jsx'
import { TombolInstal } from '../components/Instal.jsx'
import { Avatar } from '../components/Avatar.jsx'
import Profil, { ambilProfil } from './Profil.jsx'
import BuatSesi from './BuatSesi.jsx'
import SesiSaya from './SesiSaya.jsx'
import { useEffect, useId, useState } from 'react'
import { supabase, GAMES, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'

export default function HostBeranda({ profil }) {
  const [user, setUser] = useState(undefined)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user && !data.user.is_anonymous ? data.user : null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user && !s.user.is_anonymous ? s.user : null))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (user === undefined) return <div className="host"><p className="muted">Memuat…</p></div>
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
    <header className="host-header">
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
  const [pesan, setPesan] = useState('')
  const [err, setErr] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState({})
  const hapusGalat = (k) => setGalat((g) => ({ ...g, [k]: '' }))
  const cekBlur = (k) => {
    let m = ''
    if (k === 'email' && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) m = 'Format email belum lengkap, contoh nama@gmail.com.'
    if (k === 'sandi' && sandi && sandi.length < 8) m = `Kata sandi baru ${sandi.length} karakter. Tambah hingga minimal 8.`
    if (k === 'ulang' && ulang && ulang !== sandi) m = 'Belum sama dengan kata sandi di atas. Periksa dengan tombol Lihat.'
    setGalat((g) => ({ ...g, [k]: m }))
  }

  async function kirim(e) {
    e.preventDefault(); setErr(''); setPesan('')
    if (mode === 'daftar' && sandi !== ulang) { setErr('Kedua kata sandi belum sama. Periksa lagi dengan tombol Lihat.'); return }
    setSibuk(true)
    try {
      const { data: cur } = await supabase.auth.getSession()
      if (cur.session?.user?.is_anonymous) await supabase.auth.signOut()
      if (mode === 'daftar') {
        const { data, error } = await supabase.auth.signUp({ email, password: sandi, options: { emailRedirectTo: `${window.location.origin}/host` } })
        if (error) throw error
        if (!data.session) setPesan('Cek email kamu untuk konfirmasi akun, lalu kembali ke halaman ini dan masuk.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: sandi })
        if (error) throw error
      }
    } catch (e2) {
      setErr(/Invalid login/i.test(e2.message) ? 'Email atau kata sandi belum cocok. Periksa dengan tombol Lihat, lalu masuk ulang.' : /not confirmed/i.test(e2.message) ? 'Email belum dikonfirmasi. Cek kotak masuk email kamu.' : pesanError(e2))
    } finally { setSibuk(false) }
  }

  return (
    <div className="host">
      <Kepala kanan={<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><TombolInstal gelap /><TautanGabung /></div>} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={kirim} className="kartu-besar" style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{mode === 'masuk' ? 'Masuk sebagai fasilitator' : 'Daftar akun fasilitator'}</h1>
          <label className="field">EMAIL<input className="input" type="email" required autoComplete="email" value={email}
            aria-invalid={!!galat.email} aria-describedby={galat.email ? 'galat-email' : undefined}
            onBlur={() => cekBlur('email')} onChange={(e) => { setEmail(e.target.value); hapusGalat('email') }} /></label>
          {galat.email && <p id="galat-email" className="error">{galat.email}</p>}
          <InputSandi label="KATA SANDI" value={sandi} galat={mode === 'daftar' ? galat.sandi : ''} onBlur={() => cekBlur('sandi')}
            onChange={(v) => { setSandi(v); hapusGalat('sandi'); hapusGalat('ulang') }} autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'} />
          {mode === 'daftar' && <>
            <InputSandi label="ULANGI KATA SANDI" value={ulang} galat={galat.ulang} onBlur={() => cekBlur('ulang')}
              onChange={(v) => { setUlang(v); hapusGalat('ulang') }} autoComplete="new-password" />
            {!galat.ulang && <p className="muted" style={{ fontSize: 14, margin: 0 }} aria-live="polite">
              {ulang && ulang === sandi && sandi.length >= 8 ? '✓ Kata sandi sudah sama.' : 'Minimal 8 karakter. Simpan baik-baik, belum ada fitur lupa kata sandi.'}
            </p>}
          </>}
          {err && <p className="error" role="alert">{err}</p>}
          {pesan && <p style={{ fontWeight: 700, color: 'var(--toska)' }} role="status">{pesan}</p>}
          <button className="btn tekan" disabled={sibuk}>{sibuk ? 'Sebentar…' : mode === 'masuk' ? 'Masuk' : 'Daftar'}</button>
          <button type="button" className="btn sekunder kecil" onClick={() => { setMode(mode === 'masuk' ? 'daftar' : 'masuk'); setUlang(''); setErr(''); setGalat({}) }}>
            {mode === 'masuk' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        </form>
      </main>
      <Kredit />
    </div>
  )
}

function Panel({ user }) {
  return (
    <div className="host">
      <Kepala kanan={<KananPanel user={user} />} />
      <BuatSesi user={user} />
      <SesiSaya user={user} />
      <Kredit />
    </div>
  )
}

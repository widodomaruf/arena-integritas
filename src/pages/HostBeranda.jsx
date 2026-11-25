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
import { useTurnstile, PESAN_VERIFIKASI_BELUM } from '../components/Turnstile.jsx'

export default function HostBeranda({ profil, halaman }) {
  const [user, setUser] = useState(undefined)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user && !data.user.is_anonymous ? data.user : null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user && !s.user.is_anonymous ? s.user : null))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (halaman === '/host/lupa') return <LupaSandi />
  if (user === undefined) return <div className="host"><p className="muted">Memuat…</p></div>
  if (halaman === '/host/atur-sandi') return user ? <SandiBaru onSelesai={() => pindah('/host')} /> : <TautanTidakValid />
  if (!user) return <Masuk />
  if (halaman === '/host/baru') return <HalamanBaru user={user} />
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
  const ts = useTurnstile()
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
    if (ts.aktif && !ts.token) { setErr(PESAN_VERIFIKASI_BELUM); return }
    setSibuk(true)
    try {
      const { data: cur } = await supabase.auth.getSession()
      if (cur.session?.user?.is_anonymous) await supabase.auth.signOut()
      if (mode === 'daftar') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: sandi, options: { emailRedirectTo: `${window.location.origin}/host`, captchaToken: ts.token || undefined } })
        if (error) throw error
        if (data.user && data.user.identities?.length === 0) {
          setErr('Email ini sudah terdaftar. Pilih "Sudah punya akun? Masuk".')
        } else if (!data.session) {
          setPesan(`Kami mengirim tautan konfirmasi ke ${email}. Buka email itu (cek juga folder spam), klik tautannya, lalu masuk di halaman ini.`)
          setPerluKonfirmasi(true); setJeda(60)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: sandi, options: { captchaToken: ts.token || undefined } })
        if (error) throw error
      }
    } catch (e2) {
      setErr(/Invalid login/i.test(e2.message) ? 'Email atau kata sandi belum cocok. Periksa dengan tombol Lihat, lalu masuk ulang.' : /not confirmed/i.test(e2.message) ? 'Email belum dikonfirmasi. Buka email dari Arnitas dan klik tautannya, atau kirim ulang di bawah.' : pesanError(e2))
      if (/not confirmed/i.test(e2.message)) setPerluKonfirmasi(true)
    } finally { setSibuk(false); ts.reset() }
  }

  async function kirimUlang() {
    setErr('')
    if (ts.aktif && !ts.token) { setErr(PESAN_VERIFIKASI_BELUM); return }
    setSibuk(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/host`, captchaToken: ts.token || undefined } })
      if (error) throw error
      setPesan(`Tautan konfirmasi dikirim ulang ke ${email}. Cek juga folder spam.`)
      setJeda(60)
    } catch (e3) { setErr(pesanError(e3)) } finally { setSibuk(false); ts.reset() }
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
            <button type="button" className="btn sekunder kecil" onClick={() => pindah('/host/lupa')}>Lupa kata sandi?</button>
          )}
          {mode === 'daftar' && <>
            <InputSandi label="ULANGI KATA SANDI" value={ulang} galat={galat.ulang} onBlur={() => cekBlur('ulang')}
              onChange={(v) => { setUlang(v); hapusGalat('ulang') }} autoComplete="new-password" />
            {!galat.ulang && <p className="muted" style={{ fontSize: 14, margin: 0 }} aria-live="polite">
              {ulang && ulang === sandi && sandi.length >= 8 ? '✓ Kata sandi sudah sama.' : 'Minimal 8 karakter. Kalau lupa, kamu bisa mengaturnya ulang lewat email.'}
            </p>}
          </>}
          {ts.kotak}
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
const KUNCI_EMAIL_LUPA = 'arnitas-email-lupa'

function ImbauanAkunLama({ user }) {
  const [tutup, setTutup] = useState(() => { try { return sessionStorage.getItem(KUNCI_TUTUP) === '1' } catch { return false } })
  const akunLama = Date.parse(user.created_at) < BATAS_AKUN_LAMA
  if (tutup || !akunLama || user.user_metadata?.kredensial_diperbarui || !user.email) return null
  function mulai() {
    try { sessionStorage.setItem(KUNCI_EMAIL_LUPA, user.email) } catch { /* abaikan */ }
    pindah('/host/lupa')
  }
  function nanti() { try { sessionStorage.setItem(KUNCI_TUTUP, '1') } catch { /* abaikan */ } setTutup(true) }
  return (
    <section className="kartu" role="region" aria-label="Imbauan keamanan akun" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800 }}>Amankan akun kamu</h2>
      <p style={{ lineHeight: 1.5, fontSize: 15 }}>
        Akun ini dibuat sebelum verifikasi email aktif. Konfirmasi email <strong>{user.email}</strong> dan ganti kata sandi lewat tautan yang kami kirim.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn sekunder kecil" onClick={mulai}>Kirim tautan ke email saya</button>
        <button type="button" className="btn teks" onClick={nanti}>Nanti saja</button>
      </div>
    </section>
  )
}

function LupaSandi() {
  const [email, setEmail] = useState(() => { try { const e = sessionStorage.getItem(KUNCI_EMAIL_LUPA) || ''; sessionStorage.removeItem(KUNCI_EMAIL_LUPA); return e } catch { return '' } })
  const ts = useTurnstile()
  const [galat, setGalat] = useState('')
  const [err, setErr] = useState('')
  const [terkirim, setTerkirim] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [jeda, setJeda] = useState(0)
  const akar = useRef(null)
  useMasuk(akar)
  useEffect(() => {
    if (jeda <= 0) return
    const t = setTimeout(() => setJeda((j) => j - 1), 1000)
    return () => clearTimeout(t)
  }, [jeda])
  const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
  async function kirim(e) {
    e.preventDefault(); setErr('')
    if (!emailValid(email)) { setGalat('Format email belum lengkap, contoh nama@gmail.com.'); return }
    if (ts.aktif && !ts.token) { setErr(PESAN_VERIFIKASI_BELUM); return }
    setSibuk(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/host/atur-sandi`, captchaToken: ts.token || undefined })
      if (error) throw error
      setTerkirim(true); setJeda(60)
    } catch (e2) { setErr(pesanError(e2)) } finally { setSibuk(false); ts.reset() }
  }
  return (
    <div className="host" ref={akar}>
      <Kepala kanan={<TautanPanduan />} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form data-masuk onSubmit={kirim} className="kartu-besar" style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Lupa kata sandi</h1>
          {terkirim ? <>
            <p style={{ fontWeight: 700, color: 'var(--toska)', lineHeight: 1.5 }} role="status">
              Jika {email.trim()} terdaftar, tautan untuk membuat kata sandi baru sudah dikirim. Buka emailnya, cek juga folder spam.
            </p>
            <button type="button" className="btn sekunder kecil" disabled={sibuk || jeda > 0} onClick={kirim}>
              {jeda > 0 ? `Kirim ulang tautan (${jeda} dtk)` : 'Kirim ulang tautan'}
            </button>
            {ts.kotak}
            {err && <p className="error" role="alert">{err}</p>}
          </> : <>
            <p className="muted" style={{ lineHeight: 1.5 }}>Masukkan email akun fasilitator. Kami kirim tautan untuk membuat kata sandi baru.</p>
            <label className="field">EMAIL<input className="input" type="email" required autoComplete="email" autoFocus value={email}
              aria-invalid={!!galat} aria-describedby={galat ? 'galat-lupa-email' : undefined}
              onBlur={() => setGalat(email && !emailValid(email) ? 'Format email belum lengkap, contoh nama@gmail.com.' : '')}
              onChange={(e) => { setEmail(e.target.value); setGalat('') }} /></label>
            {galat && <p id="galat-lupa-email" className="error">{galat}</p>}
            {ts.kotak}
            {err && <p className="error" role="alert">{err}</p>}
            <button className="btn tekan" disabled={sibuk}>{sibuk ? 'Mengirim…' : 'Kirim tautan'}</button>
          </>}
          <button type="button" className="btn sekunder kecil" onClick={() => pindah('/host')}>← Kembali ke halaman masuk</button>
        </form>
      </main>
      <Kredit />
    </div>
  )
}

function TautanTidakValid() {
  return (
    <div className="host">
      <Kepala kanan={<TautanPanduan />} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="kartu-besar" style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Tautan sudah tidak berlaku</h1>
          <p className="muted" style={{ lineHeight: 1.5 }}>Tautan ganti kata sandi hanya berlaku sebentar dan sekali pakai. Minta tautan baru dengan email kamu.</p>
          <button type="button" className="btn tekan" onClick={() => pindah('/host/lupa')}>Minta tautan baru</button>
          <button type="button" className="btn sekunder kecil" onClick={() => pindah('/host')}>← Kembali ke halaman masuk</button>
        </div>
      </main>
      <Kredit />
    </div>
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

function MenuAkun({ user }) {
  const [buka, setBuka] = useState(false)
  const [p, setP] = useState(null)
  const akar = useRef(null)
  const id = useId()
  useEffect(() => { ambilProfil(user.id).then(setP).catch(() => {}) }, [user.id])
  useEffect(() => {
    if (!buka) return
    const tutup = (e) => { if (!akar.current?.contains(e.target)) setBuka(false) }
    const esc = (e) => { if (e.key === 'Escape') setBuka(false) }
    document.addEventListener('pointerdown', tutup)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', tutup); document.removeEventListener('keydown', esc) }
  }, [buka])
  return (
    <div className="menu-akun" ref={akar}>
      <button type="button" className="chip-profil" aria-expanded={buka} aria-controls={id} onClick={() => setBuka(!buka)}>
        <Avatar id={p?.avatar || 'p1'} size={36} />
        <span>{p?.nama || 'Akun saya'}</span>
        <span aria-hidden>▾</span>
      </button>
      {buka && (
        <div id={id} className="menu-akun-isi">
          <button type="button" className="btn sekunder kecil" onClick={() => { setBuka(false); pindah('/host/profil') }}>Profil saya</button>
          <TautanPanduan />
          <TombolInstal gelap />
          <button type="button" className="btn sekunder kecil" onClick={() => supabase.auth.signOut()}>Keluar</button>
        </div>
      )}
    </div>
  )
}

function Mulai({ kosong }) {
  return (
    <section className="kartu-besar hero-mulai" style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800 }}>{kosong ? 'Buat sesi pertamamu' : 'Mulai sesi baru'}</h1>
      <p className="muted" style={{ lineHeight: 1.5 }}>
        {kosong ? 'Pilih peserta dan paket, lalu bagikan PIN. Peserta gabung dari HP tanpa akun.' : 'Pilih peserta dan paket, lalu buka lobi.'}
      </p>
      <button type="button" className="btn tekan" onClick={() => pindah('/host/baru')}>+ Buat sesi baru</button>
    </section>
  )
}

function Panel({ user }) {
  const akar = useRef(null)
  useMasuk(akar)
  return (
    <div className="host" ref={akar}>
      <Kepala kanan={<MenuAkun user={user} />} />
      <main data-masuk style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1040, width: '100%', margin: '0 auto' }}>
        <ImbauanAkunLama user={user} />
        <SesiSaya user={user}>{({ kosong }) => <Mulai kosong={kosong} />}</SesiSaya>
      </main>
      <Kredit />
    </div>
  )
}

function HalamanBaru({ user }) {
  const akar = useRef(null)
  useMasuk(akar)
  return (
    <div className="host" ref={akar}>
      <Kepala kanan={<MenuAkun user={user} />} />
      <div data-masuk><BuatSesi user={user} /></div>
      <Kredit />
    </div>
  )
}
